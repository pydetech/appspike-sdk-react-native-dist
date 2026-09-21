# AppSpike SDK for React Native

**The free Firebase Remote Config alternative.**

> **Firebase Remote Config is going paid.** Google's usage-based pricing took effect on
> September 1, 2026. Existing free-plan (Spark) projects hit enforcement on
> **December 1, 2026**: past 100K daily fetches they get a 30-day grace period and are
> then throttled. Existing Blaze projects are billed automatically from
> **February 1, 2027**. The dates come from
> [Firebase's own pricing schedule](https://firebase.google.com/docs/remote-config/pricing).
> The [migration schedule below](#when-to-migrate) fits inside that window.


React Native SDK for [AppSpike Remote Config](https://appspike.dev/remote-config). **Free** remote configuration, feature flags, and staged rollouts, with every condition evaluated **locally on-device**. AppSpike Remote Config is also a drop-in replacement for Firebase Remote Config (`@react-native-firebase/remote-config`): same fetch/activate lifecycle, same typed accessors, one-line dependency swap. No native build steps, no fetch limits, no usage fees.

[Product](https://appspike.dev/remote-config) · [Docs](https://appspike.dev/docs/remote-config)

## Installation

```sh
npm install github:pydetech/appspike-sdk-react-native-dist#1.4.5
npm install @react-native-async-storage/async-storage
```

or in `package.json`:

```json
{
  "dependencies": {
    "@appspike/react-native-remote-config": "github:pydetech/appspike-sdk-react-native-dist#1.4.5",
    "@react-native-async-storage/async-storage": "^2.0.0"
  }
}
```

`@react-native-async-storage/async-storage` is an optional peer dependency. Without it the SDK falls back to in-memory storage, and config does not survive an app restart. Any object implementing `getItem`/`setItem`/`removeItem`/`getAllKeys` can be passed as `storage` in `AppSpike.initialize` instead (MMKV, SQLite, secure storage).

## Quick Start

**1. Register your app.** Create your app at [console.appspike.dev](https://console.appspike.dev) and copy its `pk_live_…` API key.

**2. Initialize the SDK.** Pass Remote Config in as a module.

```ts
import {
  AppSpike,
  appSpikeRemoteConfig,
  remoteConfig,
} from '@appspike/react-native-remote-config';

const result = await AppSpike.initialize({
  apiKey: 'your-api-key',
  appVersion: '1.2.3', // your app's marketing version, for app_version targeting
  appBuild: '42',      // your build number, for app_build targeting
  modules: [appSpikeRemoteConfig],
});
if (!result.success) {
  console.warn('AppSpike init failed:', result.message);
}
```

**3. Set defaults.** These are served until a fetched config is activated.

```ts
await remoteConfig().setDefaults({
  welcome_message: 'Hello!',
  feature_enabled: false,
  max_retries: 3,
  price: 9.99,
});
```

**4. Fetch and activate**

```ts
try {
  const changed = await remoteConfig().fetchAndActivate();
  console.log('Config changed:', changed);
} catch (e) {
  // A failed fetch is an ordinary outcome — offline, or a backoff window.
  // Your defaults (or the last activated config) stay in place.
  console.warn('Fetch skipped:', e);
}
```

**5. Read values.** Typed accessors, with in-app defaults as the fallback.

```ts
const message = remoteConfig().getString('welcome_message');
const enabled = remoteConfig().getBoolean('feature_enabled');
const retries = remoteConfig().getNumber('max_retries');

// Or use ConfigValue for source info
const value = remoteConfig().getValue('welcome_message');
const source = value.getSource(); // 'remote', 'default', or 'static'
```

**6. Listen for updates.** Get notified when activated keys change.

```ts
const unsubscribe = remoteConfig().onConfigUpdated((event) => {
  console.log('Keys changed:', event?.updatedKeys);
});
// Later: unsubscribe()
```

**7. Custom signals for targeting.** Evaluated on-device, never transmitted.

```ts
await remoteConfig().setCustomSignals({ tier: 'gold', level: 5 });
```

## Why AppSpike Remote Config?

**A free, direct replacement for Firebase Remote Config.** Same fetch/activate lifecycle, same typed accessors, and no fetch metering or usage fees. Firebase Remote Config is free up to 100K fetches per day, then bills $0.06 per 10K. AppSpike Remote Config stays free at any scale.

**Your targeting data stays on the device.** Firebase Remote Config sends custom signals to Google's servers with every fetch and evaluates conditions there. AppSpike Remote Config downloads the template once and evaluates every condition locally. User tier, level, or any signal you set is never transmitted anywhere. If your privacy policy or DPA review has ever flagged Remote Config, this is the difference that closes the ticket.

**Pure TypeScript, no native code.** No pods to install, no Gradle plugin. Works with any React Native version, Expo (including Expo Go), and Hermes out of the box.

**Works offline.** The last activated config keeps serving with no network, and changed signals or crossed time boundaries take effect on the next fetch cycle even offline.

**Migration is mechanical.** The API mirrors `@react-native-firebase/remote-config` method-for-method. The [migration guide](#migrating-from-firebase-remote-config) below is mostly a find-and-replace, and there's an [AI prompt](#ai-assisted-migration) that does it for you.

**Battle tested.** It already serves millions of users in PokeRaid and PokeTrade.

Two things Firebase Remote Config still does that we don't: Google Analytics audience targeting (use custom signals instead) and managed A/B experiment dashboards (run A/B tests with percentage conditions). If Analytics audiences are load-bearing for you today, the two SDKs coexist in one app, so you can migrate everything else first. Everything else is covered:

## Migrating from Firebase Remote Config

The API is designed as a drop-in replacement for `@react-native-firebase/remote-config`. Move your config template in the console first. After that the changes are dependency and initialization, and the value access API maps directly.

### Feature comparison

| Feature | Firebase Remote Config | AppSpike Remote Config |
|---------|----------------------|----------------------|
| Fetch & activate lifecycle | ✅ | ✅ |
| Typed value access (string, boolean, number) | ✅ | ✅ |
| In-app defaults | ✅ | ✅ |
| Custom signals / targeting | ✅ | ✅ |
| Percent rollout | ✅ | ✅ |
| Country / language targeting | ✅ | ✅ |
| App version / build targeting | ✅ | ✅ |
| Date/time conditions | ✅ | ✅ |
| Regex matching | ✅ | ✅ |
| Config update listeners | ✅ | ✅ |
| `getKeysByPrefix` | ✅ | ✅ |
| `reset()` | ✅ | ✅ |
| `ensureInitialized()` | ✅ | ✅ |
| Minimum fetch interval | ✅ | ✅ |
| Exponential backoff on failure | ✅ | ✅ |
| Works in Expo Go (no native modules) | ❌ | ✅ |
| Price at scale | 100K fetches/day free, then $0.06 per 10K | Free, no fetch metering |
| Config import | ❌ No import path from other providers | ✅ One-click import from Firebase |
| Version history & rollback | ✅ | ✅ |
| Real-time config updates | ✅ Real-time Remote Config | ✅ (push setup required) |
| A/B testing | ✅ Firebase A/B Testing | ✅ Via percentage conditions |
| Analytics audience targeting | ✅ Google Analytics audiences | ❌ Use custom signals instead |
| Device targeting identity | Google Installation ID | AppSpike device ID |
| Custom signals stay on-device | ❌ (sent for server-side evaluation) | ✅ (never transmitted) |

### When to migrate

The two SDKs run side by side in the same app, so nothing forces a single cutover day. Two dates bound the plan: existing Spark projects face throttling enforcement from December 1, 2026, and existing Blaze projects are billed from February 1, 2027.

1. **Today.** Register your app at [console.appspike.dev](https://console.appspike.dev), import your Firebase Remote Config template, and publish. Nothing in your app changes yet.
2. **Next development cycle.** Make the code changes below in a branch. Debug builds can run both SDKs together and compare values.
3. **Before the cutover release.** Finish any in-flight percentage rollouts and experiments on Firebase Remote Config. Rollout groups are re-randomized on AppSpike, so a mid-rollout user can change groups. If your template changed since step 1, import it again.
4. **The cutover release.** Ship the swap as a normal app release. Keep your in-app defaults registered. They cover every device that has not fetched yet.
5. **After the rollout.** Once the release has reached most of your fleet, remove the `@react-native-firebase/remote-config` module.

### Step-by-step

The snippets below use React Native Firebase's current **modular** API (v22 removed the
namespaced one). If you are still on v21 or earlier, the namespaced `remoteConfig()` accessor
is exported from the AppSpike package too (see step 3), so those call sites port unchanged.

**1. Move your config template.** In the [AppSpike console](https://console.appspike.dev), register your app, import your Firebase Remote Config template (Firebase export upload is supported), review it, and publish. Your parameters and conditions exist on the AppSpike side before the app code changes.

**2. Replace the dependency**

```sh
npm uninstall @react-native-firebase/remote-config
npm install github:pydetech/appspike-sdk-react-native-dist#1.4.5
```

There are no pods to install and no Gradle plugin: the AppSpike package is pure TypeScript.

**3. Update imports.** The function names are identical, so only the module specifier changes.

```ts
// Before
import {
  activate,
  fetchAndActivate,
  fetchConfig,
  getAll,
  getBoolean,
  getNumber,
  getRemoteConfig,
  getString,
  getValue,
  onConfigUpdate,
  setCustomSignals,
} from '@react-native-firebase/remote-config';

// After — same names, plus the two symbols initialization needs
import {
  activate,
  AppSpike,
  appSpikeRemoteConfig,
  fetchAndActivate,
  fetchConfig,
  getAll,
  getBoolean,
  getNumber,
  getRemoteConfig,
  getString,
  getValue,
  onConfigUpdate,
  setCustomSignals,
} from '@appspike/react-native-remote-config';
```

Coming from v21 or earlier, `import { remoteConfig } from '@appspike/react-native-remote-config'`
gives you the namespaced accessor instead, with the same `remoteConfig().getString(…)` shape.
Both surfaces are exported, and they drive the same instance.

**4. Add initialization.** React Native Firebase self-initializes from `google-services.json`
and `GoogleService-Info.plist`, so there is no Firebase call to replace. This line is *added*,
once, at app startup before any Remote Config use.

```ts
// Before: nothing — Firebase initializes itself from the native config files

// After
const result = await AppSpike.initialize({
  apiKey: 'your-api-key',
  appVersion: '1.2.3', // your app's marketing version, for app_version targeting
  appBuild: '42',      // your build number, for app_build targeting
  modules: [appSpikeRemoteConfig],
});
if (!result.success) {
  console.warn('AppSpike init failed:', result.message);
}
```

Firebase read the app version from the native build. AppSpike takes it as an argument, so pass
`appVersion` / `appBuild` if your template has app-version or build conditions.

**5. Get the instance (unchanged)**

```ts
// Before and after — the same
const remoteConfig = getRemoteConfig();
```

**6. Defaults (unchanged)**

```ts
// Before and after — the same property assignment
remoteConfig.defaultConfig = {
  welcome_message: 'Hello!',
  feature_enabled: false,
  max_retries: 3,
};
```

`setDefaults(remoteConfig, {...})`, RNFB v21's spelling, is exported here too.
`setDefaultsFromResource(name)` is the one exception: it reads an Android XML / iOS plist
resource AppSpike has no equivalent for, so inline those values into the object instead.

**7. Settings (unchanged)**

```ts
// Before and after — the same
remoteConfig.settings = { minimumFetchIntervalMillis: 300000 };
```

**8. Fetch / activate (unchanged)**

```ts
// Before and after — the same
await fetchConfig(remoteConfig);
await activate(remoteConfig);
const changed = await fetchAndActivate(remoteConfig);
```

Keep whatever `try`/`catch` you had around the Firebase fetch. A failed fetch is an ordinary
outcome (offline, or a backoff window), and your defaults or the last activated config keep
serving:

```ts
try {
  await fetchAndActivate(remoteConfig);
} catch (e) {
  console.warn('Fetch skipped:', e);
}
```

**9. Read values (unchanged call sites)**

```ts
// Before and after — the same
getString(remoteConfig, 'welcome_message');
getBoolean(remoteConfig, 'feature_enabled');
getNumber(remoteConfig, 'max_retries');
getValue(remoteConfig, 'welcome_message').asString();
getValue(remoteConfig, 'welcome_message').getSource();
getAll(remoteConfig);
```

**10. Custom signals (unchanged)**

```ts
// Before and after — the same
await setCustomSignals(remoteConfig, { tier: 'gold', level: 5 });
```

Signals are evaluated on-device and never transmitted, so they take effect at the next
fetch + activate. `fetch(remoteConfig, 0)` bypasses the fetch interval to apply one now.

**11. Update listeners (unchanged)**

```ts
// Before and after — the same observer shape
const unsubscribe = onConfigUpdate(remoteConfig, {
  next: (configUpdate) => console.log(configUpdate.getUpdatedKeys()),
});
```

RNFB v21's deprecated `onConfigUpdated((event, error) => …)` callback is exported here as well,
with the same `(event?, error?)` pair, so those listeners port as-is. Either way only the event
half is delivered, on successful activation.

### API mapping reference

Spelled with the namespaced `remoteConfig()` accessor (React Native Firebase v21 and earlier).
Every row holds for the modular spelling too (`getString(remoteConfig, 'key')` and so on),
since AppSpike exports both surfaces under Firebase's own names.

| Firebase (`@react-native-firebase/remote-config`) | AppSpike | Change |
|----------|----------|--------|
| `remoteConfig()` | `remoteConfig()` | Import from AppSpike instead |
| `remoteConfig().getString('key')` | Same | Import only |
| `remoteConfig().getBoolean('key')` | Same | Import only |
| `remoteConfig().getNumber('key')` | Same | Import only |
| `remoteConfig().getValue('key')` | Same | Import only |
| `value.asString()` / `asBoolean()` / `asNumber()` | Same | Same |
| `value.getSource()` | Same | Same (`'remote'`, `'default'`, `'static'`) |
| `remoteConfig().getAll()` | Same | Import only |
| `remoteConfig().setDefaults(obj)` | Same | Import only |
| `remoteConfig().setDefaultsFromResource(name)` | n/a | Not supported. Pass the object to `setDefaults` |
| `remoteConfig().setConfigSettings(s)` | Same | Same shape (`minimumFetchIntervalMillis`, `fetchTimeMillis`) |
| `remoteConfig().setCustomSignals(obj)` | Same | Signals evaluated on-device, never transmitted |
| `remoteConfig().fetch(seconds?)` | Same | Import only |
| `remoteConfig().activate()` | Same | Import only |
| `remoteConfig().fetchAndActivate()` | Same | Import only |
| `remoteConfig().ensureInitialized()` | Same | Import only |
| `remoteConfig().onConfigUpdated(cb)` | Same | Same `(event?, error?)` shape, and only the event half fires |
| `remoteConfig().reset()` | Same | Import only |
| `remoteConfig().lastFetchTime` | Same | `-1` when never fetched |
| `remoteConfig().lastFetchStatus` | Same | Same values |
| `remoteConfig().settings` | Same | Same shape |
| `firebase.remoteConfig.LastFetchStatus` | `LastFetchStatus` export | Named export |
| `firebase.remoteConfig.ValueSource` | `ValueSource` export | Named export |
| n/a | `getKeysByPrefix(prefix)` | AppSpike extension (Firebase Android/iOS parity) |
| n/a | `AppSpike.initialize({...})` | Configured in code, not from a config file |

### AI-Assisted Migration

Copy the prompt below into your AI coding assistant (Claude, Cursor, Copilot, etc.) to migrate automatically:

<details>
<summary>Migration prompt</summary>

```
Migrate this React Native project from @react-native-firebase/remote-config to
@appspike/react-native-remote-config.

Rules:
1. Replace the dependencies. Remove @react-native-firebase/remote-config. Add:
   "@appspike/react-native-remote-config": "github:pydetech/appspike-sdk-react-native-dist#1.4.5"
   Ensure @react-native-async-storage/async-storage is installed.

2. Replace all imports — only the module specifier changes, the names are identical:
   - Modular (React Native Firebase v22+):
     import { getRemoteConfig, fetchAndActivate, getString, ... } from '@react-native-firebase/remote-config'
     → import { getRemoteConfig, fetchAndActivate, getString, ... } from '@appspike/react-native-remote-config'
   - Namespaced (v21 and earlier):
     import remoteConfig from '@react-native-firebase/remote-config'
     → import { remoteConfig } from '@appspike/react-native-remote-config'
   Either way, also import AppSpike and appSpikeRemoteConfig from the AppSpike package for
   initialization. Both surfaces are exported and drive the same instance; do not mix them
   within one file.

3. Add AppSpike initialization before any Remote Config usage (Firebase initialized
   itself from google-services.json; AppSpike is explicit):
   await AppSpike.initialize({
     apiKey: 'YOUR_API_KEY',
     appVersion: '<the app version>',
     modules: [appSpikeRemoteConfig],
   });

4. The following APIs are IDENTICAL and need only the import change:
   - Modular: getRemoteConfig, getString, getBoolean, getNumber, getValue, getAll,
     fetchConfig, fetch, activate, fetchAndActivate, ensureInitialized, reset,
     setCustomSignals, setLogLevel, isSupported, onConfigUpdate, settings,
     lastFetchStatus, fetchTimeMillis — plus setDefaults and setConfigSettings, which
     RNFB dropped from its modular surface but AppSpike still exports.
   - Instance properties: remoteConfig.defaultConfig = {...}, remoteConfig.settings = {...}
   - Namespaced: remoteConfig().getString / getBoolean / getNumber / getValue / getAll /
     setDefaults / setConfigSettings / setCustomSignals / fetch / activate /
     fetchAndActivate / ensureInitialized / reset / lastFetchTime / lastFetchStatus /
     settings
   - value.asString() / asBoolean() / asNumber() / getSource().

5. remoteConfig().setDefaultsFromResource(name) is not supported — inline the resource's
   values into a setDefaults({...}) call.

6. Update listeners port unchanged, in both spellings: onConfigUpdate(rc, { next }) with
   Firebase JS's ConfigUpdate (getUpdatedKeys()), and the deprecated onConfigUpdated with
   Firebase's (event?, error?) callback shape. Only the event half is ever delivered, so
   guard it before reading updatedKeys.

7. Error handling: a fetch inside the minimum fetch interval succeeds from cache, as on
   Firebase. A failure rejects with RemoteConfigFetchError, or RemoteConfigThrottledError
   while the consecutive-failure backoff window is open; both are exported. Replace any
   Firebase error-code checks accordingly, and keep the try/catch around fetch calls.

Apply these changes to every file in the project. After migrating, verify the project builds.
```

</details>

## Requirements

- React Native 0.71+ (any JS engine, no native modules)
- Works with Expo, including Expo Go
- `@react-native-async-storage/async-storage` for persistence (optional but recommended)

## Sample App

Set your API key in `SampleApp/apiKey.ts` (the `API_KEY` constant), then:

```sh
cd SampleApp
npm install
npm run android   # or: npm run ios
```

The sample runs as an Expo development build. Build it once with the command above,
after which `npx expo start` serves reloads to the installed dev client.

## Other platforms

- Android / Kotlin Multiplatform: [appspike-sdk-android-dist](https://github.com/pydetech/appspike-sdk-android-dist), [appspike-sdk-kmp-dist](https://github.com/pydetech/appspike-sdk-kmp-dist)
- iOS / Swift: [appspike-sdk-ios-dist](https://github.com/pydetech/appspike-sdk-ios-dist)

## License

Copyright (c) 2026 Pyde Technologies LTD. All rights reserved.

The AppSpike SDK is proprietary software, free to use with AppSpike services. Redistribution, modification, and reverse engineering are not permitted. See [LICENSE](LICENSE) for the full terms, or contact info@pyde.tech.
