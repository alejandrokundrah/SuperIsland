// Module registry. Built-in modules and extensions both register a ModuleDef.
// Module ids: "builtIn.<ModuleType>" (nowPlaying, volumeHUD, battery, shelf, connectivity,
// calendar, weather, notifications, teleprompter) or "extension.<manifest id>".

import { settings } from "./settings.js";

export interface View {
  el: HTMLElement;
  /** Called when the view is removed (stop timers, unsubscribe). */
  destroy?(): void;
}
export type ViewFactory = (ctx: ModuleContext) => View;

export interface ModuleContext {
  moduleId: string;
  /** Show this module in the island (HUD-style). autoDismiss defaults to true. */
  activate(opts?: { autoDismiss?: boolean; delaySeconds?: number }): void;
  dismiss(): void;
  /** Keep the island open on this module until released (e.g. while editing text). */
  hold(): void;
  release(): void;
  readonly state: "compact" | "expanded" | "fullExpanded";
}

export interface ModuleDef {
  id: string;
  title: string;
  /** SF-Symbol style name resolved by core/icons.ts */
  icon: string;
  /** Settings key holding the enabled flag; undefined = always enabled. */
  enabledKey?: string;
  isEnabled?(): boolean;
  compact: ViewFactory;
  expanded: ViewFactory;
  fullExpanded?: ViewFactory;
  /** Two-slot compact layout (leading/trailing) used by wide compact on non-notch screens. */
  minimalCompact?: { leading?: ViewFactory; trailing?: ViewFactory; precedence?: number };
  /** Compact for built-ins is only reachable via activation (HUD) rather than module cycling. */
  cyclable?: boolean;
  /** Small widget used by the full-expanded Home tab (leading/center/trailing panels). */
  homeWidget?: ViewFactory;
  /** Called once at startup so the module can subscribe to native events and call ctx.activate(). */
  init?(ctx: ModuleContext): void;
  /** For extensions: precedence 0 = inactive, falls through to default compact content. */
  isInactive?(): boolean;
}

const defs = new Map<string, ModuleDef>();
const listeners = new Set<() => void>();
let homeView: ViewFactory | null = null;

export function registerModule(def: ModuleDef): void {
  defs.set(def.id, def);
  listeners.forEach((l) => l());
}
export function unregisterModule(id: string): void {
  if (defs.delete(id)) listeners.forEach((l) => l());
}
export function getModule(id: string | null | undefined): ModuleDef | undefined {
  return id ? defs.get(id) : undefined;
}
export function allModules(): ModuleDef[] {
  return [...defs.values()];
}
export function isModuleEnabled(id: string): boolean {
  const def = defs.get(id);
  if (!def) return false;
  if (def.isEnabled) return def.isEnabled();
  return def.enabledKey ? settings.bool(def.enabledKey) : true;
}
export function onModulesChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function setHomeView(factory: ViewFactory): void { homeView = factory; }
export function getHomeView(): ViewFactory | null { return homeView; }

export const BUILTIN = (name: string): string => `builtIn.${name}`;
export const EXTENSION = (id: string): string => `extension.${id}`;
export const BUILTIN_ORDER = [
  "nowPlaying", "volumeHUD", "battery", "shelf", "connectivity",
  "calendar", "weather", "notifications", "teleprompter",
] as const;
