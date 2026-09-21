import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  AppSpike,
  appSpikeRemoteConfig,
  LastFetchStatus,
  remoteConfig,
  RemoteConfigThrottledError,
  SDK_VERSION,
} from '@appspike/react-native-remote-config';

import {API_KEY, API_KEY_IS_PLACEHOLDER} from './apiKey';


// In-app defaults serve until a fetched template is activated, and as fallback for keys
// the template does not define. Strings, booleans and numbers are all accepted.
const sampleDefaults = {
  welcome_message: 'Hello from defaults',
  feature_enabled: false,
  max_retries: 3,
  price_multiplier: 1.0,
};

// The SDK's own settings defaults, restored by "Restore defaults".
const defaultMinFetchIntervalMillis = 12 * 60 * 60 * 1000;
const defaultFetchTimeoutMillis = 60_000;

interface DisplayedValue {
  key: string;
  value: string;
  source: string;
}

export default function App() {
  const [status, setStatus] = useState('Not initialized');
  const [values, setValues] = useState<DisplayedValue[]>([]);
  const [signalKey, setSignalKey] = useState('');
  const [signalValue, setSignalValue] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState('');
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [prefix, setPrefix] = useState('');
  const [screen, setScreen] = useState<'home' | 'values'>('home');

  const refreshValues = useCallback(() => {
    const all = remoteConfig().getAll();
    setValues(
      Object.entries(all).map(([key, value]) => ({
        key,
        value: value.asString(),
        source: value.getSource(),
      })),
    );
  }, []);

  useEffect(() => {
    if (API_KEY_IS_PLACEHOLDER) {
      setStatus('Set your API key in apiKey.ts (the API_KEY constant) before running.');
      return;
    }
    (async () => {
      await remoteConfig().setDefaults(sampleDefaults);
      const result = await AppSpike.initialize({
        apiKey: API_KEY,
        appVersion: '0.1.0', // matched by app_version conditions
        appBuild: '1', //       matched by app_build conditions
        modules: [appSpikeRemoteConfig],
      });
      setStatus(result.success ? 'Initialized' : `Init failed: ${result.message}`);
      // Wait for persisted state to load, then show the defaults (source=default).
      await remoteConfig().ensureInitialized();
      refreshValues();
      setSettingsRevision((revision) => revision + 1);
    })();
  }, [refreshValues]);

  const fetchAndActivate = useCallback(async () => {
    try {
      setStatus('Fetching…');
      const changed = await remoteConfig().fetchAndActivate();
      setStatus(changed ? 'Fetched — config changed' : 'Fetched — no change');
    } catch (error) {
      setStatus(`Fetch failed: ${String(error)}`);
    }
    refreshValues();
  }, [refreshValues]);

  const fetchRespectingCache = useCallback(async () => {
    // Plain fetch() honors minimumFetchIntervalMillis — inside the window it
    // throws RemoteConfigThrottledError and cached values stay live.
    try {
      setStatus('Fetching (respecting cache)…');
      await remoteConfig().fetch();
      const changed = await remoteConfig().activate();
      setStatus(changed ? 'Fetched — config changed' : 'Fetched — no change');
    } catch (error) {
      if (error instanceof RemoteConfigThrottledError) {
        setStatus('Throttled — inside the minimum fetch interval');
      } else {
        setStatus(`Fetch failed: ${String(error)}`);
      }
    }
    refreshValues();
  }, [refreshValues]);

  const bypassCacheAndActivate = useCallback(async () => {
    try {
      setStatus('Fetching (bypassing cache)…');
      await remoteConfig().fetch(0);
      const changed = await remoteConfig().activate();
      setStatus(changed ? 'Cache bypassed — config changed' : 'Cache bypassed — no change');
    } catch (error) {
      setStatus(`Fetch failed: ${String(error)}`);
    }
    refreshValues();
  }, [refreshValues]);

  const applySettings = useCallback(async () => {
    const minutes = Number(intervalMinutes);
    const seconds = Number(timeoutSeconds);
    if (!Number.isFinite(minutes) || minutes < 0 || !Number.isFinite(seconds) || seconds <= 0) {
      setStatus('Enter a fetch interval in minutes and a timeout in seconds');
      return;
    }
    // An omitted field would keep the value in effect (RNFB merge semantics); this
    // sample writes both so the pair on screen is exactly what is applied.
    await remoteConfig().setConfigSettings({
      minimumFetchIntervalMillis: minutes * 60_000,
      fetchTimeoutMillis: seconds * 1000,
    });
    setSettingsRevision((revision) => revision + 1);
    setStatus('Settings applied');
  }, [intervalMinutes, timeoutSeconds]);

  const restoreDefaultSettings = useCallback(async () => {
    await remoteConfig().setConfigSettings({
      minimumFetchIntervalMillis: defaultMinFetchIntervalMillis,
      fetchTimeoutMillis: defaultFetchTimeoutMillis,
    });
    setIntervalMinutes('');
    setTimeoutSeconds('');
    setSettingsRevision((revision) => revision + 1);
    setStatus('Settings restored to defaults');
  }, []);

  // Signals are evaluated on-device and never leave it. They apply at the next
  // non-throttled fetch, so apply/remove both fetch(0) and activate here.
  const refetchWithSignals = useCallback(
    async (message: string) => {
      try {
        await remoteConfig().fetch(0);
        await remoteConfig().activate();
        setStatus(message);
      } catch (error) {
        setStatus(`Fetch failed: ${String(error)}`);
      }
      refreshValues();
    },
    [refreshValues],
  );

  const applySignal = useCallback(async () => {
    const key = signalKey.trim();
    if (key === '') {
      setStatus('Enter a signal key');
      return;
    }
    const raw = signalValue.trim();
    // Numeric strings become number signals; anything else stays a string.
    const value = raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : raw;
    await remoteConfig().setCustomSignals({ [key]: value });
    await refetchWithSignals(`Signal ${key}=${String(value)} applied`);
  }, [refetchWithSignals, signalKey, signalValue]);

  const removeSignal = useCallback(async () => {
    const key = signalKey.trim();
    if (key === '') {
      setStatus('Enter a signal key');
      return;
    }
    await remoteConfig().setCustomSignals({ [key]: null }); // null removes the key
    await refetchWithSignals(`Signal ${key} removed`);
  }, [refetchWithSignals, signalKey]);

  const applyGoldPreset = useCallback(async () => {
    setSignalKey('tier');
    setSignalValue('gold');
    await remoteConfig().setCustomSignals({ tier: 'gold', session_count: 12 });
    await refetchWithSignals('Preset applied: tier=gold, session_count=12');
  }, [refetchWithSignals]);

  const resetConfig = useCallback(async () => {
    // reset() clears fetched, activated and default values (device identity survives),
    // so the sample re-registers its defaults afterwards — the all-values screen then
    // shows the defaults set with (default) sources and no remote rows.
    await remoteConfig().reset();
    await remoteConfig().setDefaults(sampleDefaults);
    setStatus('Reset — defaults re-applied');
    refreshValues();
  }, [refreshValues]);

  const openAllValues = useCallback(() => {
    refreshValues();
    setScreen('values');
  }, [refreshValues]);

  const lastFetchLabel = () => {
    const fetchStatus = remoteConfig().lastFetchStatus;
    if (fetchStatus === LastFetchStatus.NO_FETCH_YET) {
      return 'never fetched';
    }
    const at =
      remoteConfig().lastFetchTime > 0
        ? ` at ${new Date(remoteConfig().lastFetchTime).toLocaleTimeString()}`
        : '';
    return `${fetchStatus}${at}`;
  };

  const settingsLabel = () => {
    // Re-read on every settings write; settingsRevision is what re-renders this line.
    void settingsRevision;
    const applied = remoteConfig().settings;
    return (
      `Min fetch interval ${applied.minimumFetchIntervalMillis / 60_000}m · ` +
      `fetch timeout ${applied.fetchTimeoutMillis / 1000}s`
    );
  };

  if (screen === 'values') {
    // getKeysByPrefix('') returns every key (activated remote + defaults).
    const keys = remoteConfig().getKeysByPrefix(prefix);
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.row}>
          <Button title="‹ Back" onPress={() => setScreen('home')} />
          <Text style={styles.title}>All Key/Values</Text>
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.rowInput]}
            placeholder="Filter by key prefix"
            value={prefix}
            onChangeText={setPrefix}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {keys.map((key) => {
            const value = remoteConfig().getValue(key);
            return (
              <View key={key} style={styles.valueRow}>
                <Text style={styles.valueKey}>{key}</Text>
                <Text style={styles.valueText}>
                  {value.asString()}{' '}
                  <Text style={styles.valueSource}>({value.getSource()})</Text>
                </Text>
              </View>
            );
          })}
          {keys.length === 0 && <Text style={styles.meta}>No matching keys.</Text>}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>AppSpike Remote Config</Text>
          <Text style={styles.meta}>SDK {SDK_VERSION}</Text>
          <Text style={styles.status}>{status}</Text>
          <View style={styles.row}>
            <Button title="Fetch & Activate" onPress={fetchAndActivate} />
          </View>
          <View style={styles.row}>
            <Button title="Fetch (respect cache)" onPress={fetchRespectingCache} />
          </View>
          <View style={styles.row}>
            <Button title="Bypass Cache & Activate" onPress={bypassCacheAndActivate} />
          </View>
          <View style={styles.row}>
            <Button title="Reset" onPress={resetConfig} />
          </View>
          <View style={styles.row}>
            <Button title="View All Key/Values" onPress={openAllValues} />
          </View>

          <Text style={styles.sectionTitle}>Settings</Text>
          <Text style={styles.meta}>{settingsLabel()}</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.rowInput]}
              placeholder="Min fetch interval (minutes)"
              value={intervalMinutes}
              onChangeText={setIntervalMinutes}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.rowInput]}
              placeholder="Fetch timeout (seconds)"
              value={timeoutSeconds}
              onChangeText={setTimeoutSeconds}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.row}>
            <Button title="Apply settings" onPress={applySettings} />
            <Button title="Restore defaults" onPress={restoreDefaultSettings} />
          </View>

          <Text style={styles.sectionTitle}>Custom signals</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.rowInput]}
              placeholder="Signal key"
              value={signalKey}
              onChangeText={setSignalKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={[styles.input, styles.rowInput]}
              placeholder="Signal value"
              value={signalValue}
              onChangeText={setSignalValue}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.row}>
            <Button title="Apply signal" onPress={applySignal} />
            <Button title="Remove signal" onPress={removeSignal} />
            <Button title="Preset: tier=gold" onPress={applyGoldPreset} />
          </View>

          <Text style={styles.sectionTitle}>Typed getters</Text>
          {/* getString/getBoolean/getNumber reproduce Firebase's precedence: an
              activated value that does not convert falls through to the in-app
              default before the static zero. getValue(key).asBoolean() is the
              stricter per-value accessor. */}
          <Text style={styles.meta}>
            getString('welcome_message') = {remoteConfig().getString('welcome_message')}
          </Text>
          <Text style={styles.meta}>
            getBoolean('feature_enabled') = {String(remoteConfig().getBoolean('feature_enabled'))}
          </Text>
          <Text style={styles.meta}>
            getNumber('max_retries') = {remoteConfig().getNumber('max_retries')}
          </Text>
          <Text style={styles.meta}>
            getValue('price_multiplier').asNumber() ={' '}
            {remoteConfig().getValue('price_multiplier').asNumber()} (
            {remoteConfig().getValue('price_multiplier').getSource()})
          </Text>

          <Text style={styles.meta}>Last fetch: {lastFetchLabel()}</Text>
          {values.map((entry) => (
            <View key={entry.key} style={styles.valueRow}>
              <Text style={styles.valueKey}>{entry.key}</Text>
              <Text style={styles.valueText}>
                {entry.value} <Text style={styles.valueSource}>({entry.source})</Text>
              </Text>
            </View>
          ))}
          {values.length === 0 && <Text style={styles.meta}>No values yet.</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: '600', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  status: { fontSize: 14, color: '#555' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  // Inputs share a row with other controls; the flex lives here so a filter box that
  // stands alone in a row keeps the same height as every other field.
  rowInput: { flex: 1 },
  meta: { fontSize: 12, color: '#777' },
  valueRow: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  valueKey: { fontWeight: '600' },
  valueText: { color: '#333' },
  valueSource: { color: '#999', fontStyle: 'italic' },
});
