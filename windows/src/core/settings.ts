// Settings cache mirroring the Rust SettingsStore. Keys match the macOS @AppStorage keys.

import { invoke, listen, inTauri } from "./ipc.js";

export const DEFAULTS: Record<string, unknown> = {
  "module.nowPlaying.enabled": true,
  "module.volumeHUD.enabled": true,
  "module.battery.enabled": true,
  "module.shelf.enabled": true,
  "module.connectivity.enabled": true,
  "module.calendar.enabled": true,
  "module.weather.enabled": true,
  "module.weather.temperatureUnit": "celsius",
  "module.notifications.enabled": true,
  "module.notifications.showPreviews": true,
  "module.notifications.maxRetainedItems": 10,
  "module.teleprompter.enabled": false,
  "module.shelf.autoOpenOnDrop": true,
  "module.shelf.defaultToShelf": false,

  "appearance.animationSpeed": 1.0,
  "appearance.bounceAmount": 0.25,
  "appearance.animationLevel": "full",
  "appearance.reduceMotion": false,
  "appearance.compactIslandWidth": 220,
  "appearance.compactIslandHeight": 32,

  "home.leadingPanel": "builtIn.nowPlaying",
  "home.centerPanel": "builtIn.calendar",
  "home.trailingPanel": "builtIn.weather",

  "general.showMenuBarIcon": true,
  "general.launchAtLogin": false,
  "general.showInScreenRecordings": false,
  "general.expandedAutoDismissDelay": 1.0,
  "general.hoverExpandDelay": 0.3,
  "general.lockFullExpandedInPlace": false,
  "general.hideSideSlots": false,
  "general.hideOnFullscreen": false,
  "general.displayIdentifier": "",
  "general.islandSurfaceSwipeEnabled": true,
  "onboarding.completed": false,

  "energy.mode": "smart",
  "energy.reduceAnimations": false,
  "energy.disableBackgroundExtensionRefresh": false,
};

type Listener = (key: string, value: unknown) => void;

class Settings {
  private data: Record<string, unknown> = {};
  private listeners = new Set<Listener>();
  private ready: Promise<void> | null = null;

  /** Load persisted values and start listening for changes from other windows. */
  init(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        if (inTauri()) {
          this.data = await invoke<Record<string, unknown>>("settings_get_all").catch(() => ({}));
          await listen<{ key: string; value: unknown }>("settings-changed", ({ key, value }) => {
            if (value === null) delete this.data[key];
            else this.data[key] = value;
            this.listeners.forEach((l) => l(key, this.get(key)));
          });
        }
      })();
    }
    return this.ready;
  }

  get<T = unknown>(key: string): T {
    return (key in this.data ? this.data[key] : DEFAULTS[key]) as T;
  }
  bool(key: string): boolean { return !!this.get(key); }
  num(key: string): number { return Number(this.get(key)); }
  str(key: string): string { return String(this.get(key) ?? ""); }

  async set(key: string, value: unknown): Promise<void> {
    this.data[key] = value;
    this.listeners.forEach((l) => l(key, value));
    if (inTauri()) await invoke("settings_set", { key, value }).catch((e) => console.warn("settings_set", e));
  }

  /** Subscribe to every change (local or from another window). Returns unsubscribe. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Subscribe to keys with a given prefix, e.g. "module.weather.". */
  watch(prefix: string, fn: Listener): () => void {
    return this.subscribe((k, v) => { if (k.startsWith(prefix)) fn(k, v); });
  }
}

export const settings = new Settings();
