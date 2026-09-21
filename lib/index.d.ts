export interface KeyValueStorage {
	getItem(key: string): Promise<string | null>;
	setItem(key: string, value: string): Promise<void>;
	removeItem(key: string): Promise<void>;
	getAllKeys(): Promise<readonly string[]>;
	multiGet?(keys: readonly string[]): Promise<readonly (readonly [
		string,
		string | null
	])[]>;
}
export declare class MemoryKeyValueStorage implements KeyValueStorage {
	private readonly entries;
	getItem(key: string): Promise<string | null>;
	setItem(key: string, value: string): Promise<void>;
	removeItem(key: string): Promise<void>;
	getAllKeys(): Promise<readonly string[]>;
}
declare class SettingsStore {
	private readonly backend;
	private readonly entries;
	private readonly keyPrefix;
	private persistQueue;
	private constructor();
	static load(backend: KeyValueStorage, namespace: string): Promise<SettingsStore>;
	getString(key: string): string | null;
	putString(key: string, value: string): void;
	getNumber(key: string): number | null;
	putNumber(key: string, value: number): void;
	remove(key: string): void;
	flush(): Promise<void>;
	private enqueue;
}
export interface SessionDeviceContext {
	deviceId: string | null;
	appId: string | null;
	platform: string;
	appVersion: string | null;
	appBuild: string | null;
	country: string | null;
	language: string | null;
}
export interface RemoteConfigUrlResolution {
	remoteConfigUrl: string | null;
	serverTimeIso: string | null;
}
export declare class RemoteConfigUrlResolutionError extends Error {
	readonly cause?: unknown;
	constructor(message: string, cause?: unknown);
}
export interface AppSpikeSession {
	readonly configUrl: string | null;
	createSettings(name: string): Promise<SettingsStore>;
	resolveRemoteConfigUrl(): Promise<RemoteConfigUrlResolution>;
	deviceContext(): SessionDeviceContext;
}
export interface AppSpikeModule {
	onSessionReady(session: AppSpikeSession): void;
}
export type InitResult = {
	success: true;
} | {
	success: false;
	message: string;
};
export declare const SDK_VERSION = "1.4.5";
export interface AppSpikeInitializeOptions {
	apiKey: string;
	modules?: AppSpikeModule[];
	appVersion?: string;
	appBuild?: string;
	storage?: KeyValueStorage;
}
declare class AppSpikeClient {
	private initializePromise;
	private state;
	private appVersion;
	private appBuild;
	initialize(options: AppSpikeInitializeOptions): Promise<InitResult>;
	deviceContext(): SessionDeviceContext;
	resetForTesting(): void;
	private performInitialize;
	private buildDeviceContext;
}
export declare const AppSpike: AppSpikeClient;
export type ValueSource = "remote" | "default" | "static";
export declare const ValueSource: {
	readonly REMOTE: ValueSource;
	readonly DEFAULT: ValueSource;
	readonly STATIC: ValueSource;
};
export declare class ConfigValue {
	private readonly rawValue;
	private readonly source;
	constructor(rawValue: string | null, source: ValueSource);
	asString(): string;
	asBoolean(): boolean;
	asNumber(): number;
	getSource(): ValueSource;
}
export interface ConfigSettings {
	minimumFetchIntervalMillis?: number;
	fetchTimeoutMillis?: number;
	fetchTimeMillis?: number;
}
export type LastFetchStatus = "success" | "failure" | "throttled" | "no_fetch_yet";
export declare const LastFetchStatus: {
	readonly SUCCESS: LastFetchStatus;
	readonly FAILURE: LastFetchStatus;
	readonly THROTTLED: LastFetchStatus;
	readonly NO_FETCH_YET: LastFetchStatus;
};
export type ConfigDefaults = Record<string, string | number | boolean>;
export type CustomSignals = Record<string, string | number | null>;
export interface ConfigUpdateEvent {
	updatedKeys: string[];
}
export interface ConfigUpdateError {
	code?: string;
	message?: string;
	nativeErrorMessage?: string;
}
export type ConfigUpdateListener = (event?: ConfigUpdateEvent, error?: ConfigUpdateError) => void;
export interface ConfigUpdate {
	getUpdatedKeys(): Set<string>;
}
export type ConfigUpdateCallback = (configUpdate: ConfigUpdate) => void;
export interface ConfigUpdateObserver {
	next: ConfigUpdateCallback;
	error?: (error: ConfigUpdateError) => void;
	complete?: () => void;
}
export type CallbackOrObserver<T extends (...args: never[]) => unknown> = T | {
	next: T;
};
export type Unsubscribe = () => void;
export type LogLevel = "debug" | "error" | "silent";
export declare class AppSpikeRemoteConfig implements AppSpikeModule {
	private core;
	private corePromise;
	private defaults;
	private defaultsSetThisSession;
	private pendingSettings;
	private pendingSignals;
	private readonly updateListeners;
	onSessionReady(session: AppSpikeSession): void;
	get lastFetchTime(): number;
	get lastFetchStatus(): LastFetchStatus;
	get settings(): Required<ConfigSettings>;
	set settings(settings: ConfigSettings);
	setConfigSettings(settings: ConfigSettings): Promise<void>;
	setDefaults(defaults: ConfigDefaults): Promise<void>;
	get defaultConfig(): ConfigDefaults;
	set defaultConfig(defaults: ConfigDefaults);
	setCustomSignals(customSignals: CustomSignals): Promise<void>;
	fetch(expirationDurationSeconds?: number): Promise<void>;
	activate(): Promise<boolean>;
	fetchAndActivate(): Promise<boolean>;
	ensureInitialized(): Promise<void>;
	getValue(key: string): ConfigValue;
	getString(key: string): string;
	getBoolean(key: string): boolean;
	getNumber(key: string): number;
	getAll(): Record<string, ConfigValue>;
	getKeysByPrefix(prefix?: string): string[];
	reset(): Promise<void>;
	onConfigUpdated(listenerOrObserver: CallbackOrObserver<ConfigUpdateListener>): Unsubscribe;
	onConfigUpdate(observerOrCallback: CallbackOrObserver<ConfigUpdateCallback>): Unsubscribe;
	addOnConfigUpdateListener(listenerOrObserver: CallbackOrObserver<ConfigUpdateListener>): {
		remove(): void;
	};
	resetForTesting(): void;
	private registerUpdateDelivery;
	private requireCore;
	private effectiveSettingsSeconds;
	private stagePendingSettings;
	private flushPendingSettings;
	private stageDefaults;
	private flushDefaults;
	private drainPending;
	private drainPendingSettings;
	private drainPendingSignals;
	private persistDefaults;
	private restorePersistedDefaults;
	private activatedValuesSnapshot;
	private resolveConfigValue;
	private resolveTypedValue;
	private notifyUpdateListeners;
}
export declare const appSpikeRemoteConfig: AppSpikeRemoteConfig;
export declare function remoteConfig(): AppSpikeRemoteConfig;
export type RemoteConfig = AppSpikeRemoteConfig;
export declare function getRemoteConfig(app?: unknown): RemoteConfig;
export declare function activate(remoteConfig: RemoteConfig): Promise<boolean>;
export declare function ensureInitialized(remoteConfig: RemoteConfig): Promise<void>;
declare function fetch$1(remoteConfig: RemoteConfig, expirationDurationSeconds?: number): Promise<void>;
export declare function fetchConfig(remoteConfig: RemoteConfig): Promise<void>;
export declare function fetchAndActivate(remoteConfig: RemoteConfig): Promise<boolean>;
export declare function getAll(remoteConfig: RemoteConfig): Record<string, ConfigValue>;
export declare function getBoolean(remoteConfig: RemoteConfig, key: string): boolean;
export declare function getNumber(remoteConfig: RemoteConfig, key: string): number;
export declare function getString(remoteConfig: RemoteConfig, key: string): string;
export declare function getValue(remoteConfig: RemoteConfig, key: string): ConfigValue;
export declare function fetchTimeMillis(remoteConfig: RemoteConfig): number;
export declare function settings(remoteConfig: RemoteConfig): Required<ConfigSettings>;
export declare function lastFetchStatus(remoteConfig: RemoteConfig): LastFetchStatus;
export declare function reset(remoteConfig: RemoteConfig): Promise<void>;
export declare function setConfigSettings(remoteConfig: RemoteConfig, configSettings: ConfigSettings): Promise<void>;
export declare function setDefaults(remoteConfig: RemoteConfig, defaults: ConfigDefaults): Promise<void>;
export declare function setDefaultsFromResource(remoteConfig: RemoteConfig, resourceName: string): Promise<null>;
export declare function setCustomSignals(remoteConfig: RemoteConfig, customSignals: CustomSignals): Promise<void>;
export declare function setLogLevel(remoteConfig: RemoteConfig, logLevel: LogLevel): void;
export declare function isSupported(): Promise<boolean>;
export declare function onConfigUpdate(remoteConfig: RemoteConfig, observer: CallbackOrObserver<ConfigUpdateCallback>): Unsubscribe;
export declare function onConfigUpdated(remoteConfig: RemoteConfig, listenerOrObserver: CallbackOrObserver<ConfigUpdateListener>): Unsubscribe;
export declare class RemoteConfigFetchError extends Error {
	readonly cause?: unknown;
	constructor(message: string, cause?: unknown);
}
export declare class RemoteConfigThrottledError extends RemoteConfigFetchError {
	readonly throttleEndTimeMillis: number;
	constructor(message: string, throttleEndTimeMillis?: number);
}
export {
	fetch$1 as fetch,
};
export {};
