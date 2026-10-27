// Island state machine. Port of the macOS AppState: compact / expanded / fullExpanded,
// hover-to-open, auto-dismiss, HUD activation, module cycling and presentation holds.

import { settings } from "./settings.js";
import { allModules, getModule, isModuleEnabled } from "./modules.js";

export type IslandState = "compact" | "expanded" | "fullExpanded";
export type TabId = "home" | string; // "home" or a module id

export const SIZES = {
  expanded: { w: 408, h: 88 },
  fullExpanded: { w: 658, h: 180 },
  cornerRadius: { compact: 16, expanded: 22, fullExpanded: 32 },
  notificationHoverFullExpandWindowMs: 10_000,
};

type Listener = () => void;
type Timer = ReturnType<typeof setTimeout> | null;

class Island {
  state: IslandState = "compact";
  activeModule: string | null = null;
  previousModule: string | null = null;
  tab: TabId = "home";
  isHovering = false;
  shelfDragActive = false;
  /** Set by modules that want a fresh-notification hover shortcut. */
  hasFreshNotification: () => boolean = () => false;

  private listeners = new Set<Listener>();
  private autoDismiss: Timer = null;
  private fullDismiss: Timer = null;
  private hoverTimer: Timer = null;
  private holdModule: string | null = null;
  private interactionUntil = 0;

  subscribe(fn: Listener): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(): void { this.listeners.forEach((l) => l()); }

  // ---- sizes -------------------------------------------------------------------------------
  get compactSize(): { w: number; h: number } {
    return { w: settings.num("appearance.compactIslandWidth") || 220, h: settings.num("appearance.compactIslandHeight") || 32 };
  }
  sizeFor(state: IslandState): { w: number; h: number } {
    if (state === "compact") return this.compactSize;
    return state === "expanded" ? SIZES.expanded : SIZES.fullExpanded;
  }
  get size(): { w: number; h: number } { return this.sizeFor(this.state); }

  // ---- modules -----------------------------------------------------------------------------
  /** Modules that can be shown in the island body and cycled with the arrows. */
  availableModules(): string[] {
    return allModules()
      .filter((m) => m.cyclable !== false && isModuleEnabled(m.id) && !m.isInactive?.())
      .filter((m) => m.id !== "builtIn.volumeHUD")
      .map((m) => m.id);
  }
  /** Tabs shown in the full-expanded header: Home plus every enabled module with a full view. */
  availableTabs(): TabId[] {
    const tabs: TabId[] = ["home"];
    for (const m of allModules()) {
      if (m.id === "builtIn.volumeHUD") continue;
      if (isModuleEnabled(m.id) && !m.isInactive?.()) tabs.push(m.id);
    }
    return tabs;
  }

  private set(state: IslandState): void {
    if (state === this.state) return;
    this.state = state;
    if (state === "expanded") { this.clear("full"); if (!this.shelfDragActive) this.scheduleAutoDismiss(); }
    else { this.clear("auto"); if (state === "compact") this.clear("full"); }
    this.emit();
  }

  expand(): void { if (this.state === "compact") this.set("expanded"); }

  /** Open from compact lands on Home; from expanded keeps the module's own tab. */
  open(): void {
    if (this.state === "fullExpanded") return;
    this.tab = this.state === "compact" ? "home" : (this.activeModule && getModule(this.activeModule) ? this.activeModule : "home");
    this.clear("auto"); this.clear("full");
    this.set("fullExpanded");
  }
  fullyExpand(): void {
    if (this.activeModule && getModule(this.activeModule)) this.tab = this.activeModule;
    this.set("fullExpanded");
  }
  toggleExpansion(): void {
    if (this.state === "compact") this.open();
    else if (this.state === "expanded") this.fullyExpand();
    else this.dismiss();
  }

  dismiss(): void {
    if (this.shelfDragActive) { this.clearAll(); return; }
    if (this.state === "fullExpanded" && settings.bool("general.lockFullExpandedInPlace")) { this.clear("full"); return; }
    this.clearAll();
    this.interactionUntil = 0;
    this.set("compact");
  }

  /** HUD-style presentation: show `moduleId` expanded, then fall back to compact. */
  showHUD(moduleId: string, opts: { autoDismiss?: boolean; delaySeconds?: number } = {}): void {
    if (!isModuleEnabled(moduleId)) return;
    const autoDismiss = opts.autoDismiss !== false;
    if (this.state !== "fullExpanded" && this.isHovering && moduleId === "builtIn.notifications" && this.hasFreshNotification()) {
      this.presentNotificationsFullExpanded();
      return;
    }
    this.clear("auto");
    this.activeModule = moduleId;
    if (this.state === "compact") this.set("expanded"); else this.emit();
    if (autoDismiss) this.scheduleAutoDismiss(opts.delaySeconds);
  }

  presentNotificationsFullExpanded(): void {
    this.activeModule = "builtIn.notifications";
    this.tab = "builtIn.notifications";
    this.clearAll();
    this.set("fullExpanded");
  }

  setActiveModule(id: string | null): void {
    if (id && !isModuleEnabled(id)) return;
    this.previousModule = this.activeModule;
    this.activeModule = id;
    this.emit();
  }

  cycleModule(forward: boolean): void {
    if (this.state === "fullExpanded") { this.cycleTab(forward); return; }
    const mods = this.availableModules();
    if (!mods.length) return;
    const i = this.activeModule ? mods.indexOf(this.activeModule) : -1;
    const next = i < 0 ? (forward ? 0 : mods.length - 1) : (i + (forward ? 1 : -1) + mods.length) % mods.length;
    this.setActiveModule(mods[next]);
    if (this.state === "expanded") this.scheduleAutoDismiss();
  }
  private cycleTab(forward: boolean): void {
    const tabs = this.availableTabs();
    const i = Math.max(0, tabs.indexOf(this.tab));
    this.selectTab(tabs[(i + (forward ? 1 : -1) + tabs.length) % tabs.length]);
  }
  selectTab(tab: TabId): void {
    this.tab = tab;
    if (tab !== "home") this.activeModule = tab;
    this.emit();
  }

  // ---- presentation holds / interactions ----------------------------------------------------
  holdPresentation(id: string): void { this.holdModule = id; this.clearAll(); }
  releasePresentationHold(id: string): void { if (this.holdModule === id) this.holdModule = null; }
  private isHeld(id: string | null): boolean { return !!id && this.holdModule === id; }

  /** Suppress hover-dismiss while a native popup (emoji picker) is open. */
  beginSystemInteraction(ms = 12_000): void { this.interactionUntil = Date.now() + ms; this.clearAll(); }
  endSystemInteraction(): void { this.interactionUntil = 0; }
  private get interacting(): boolean { return this.interactionUntil > Date.now(); }

  setShelfDragActive(active: boolean): void {
    this.shelfDragActive = active;
    if (active) this.clearAll(); else if (!this.isHovering && this.state !== "compact") this.scheduleDismissForState();
    this.emit();
  }

  // ---- hover -------------------------------------------------------------------------------
  handleHover(hovering: boolean): void {
    const was = this.isHovering;
    this.isHovering = hovering;
    if (this.shelfDragActive) { this.clearAll(); return; }
    if (hovering) {
      this.clear("auto"); this.clear("full");
      if (this.interacting) { this.clear("hover"); return; }
      if (this.state !== "fullExpanded") { if (!was) this.scheduleHoverActivation(); } else this.clear("hover");
    } else {
      this.clear("hover");
      if (this.interacting) return;
      this.scheduleDismissForState();
    }
    this.emit();
  }

  private scheduleDismissForState(): void {
    if (this.state === "expanded") this.scheduleAutoDismiss();
    else if (this.state === "fullExpanded") this.scheduleFullDismiss();
  }

  private scheduleHoverActivation(): void {
    this.clear("hover");
    const delay = settings.num("general.hoverExpandDelay") * 1000;
    this.hoverTimer = setTimeout(() => {
      if (!this.isHovering || this.state === "fullExpanded") return;
      if (this.activeModule === "builtIn.notifications" && this.hasFreshNotification()) { this.presentNotificationsFullExpanded(); return; }
      const m = getModule(this.activeModule);
      if (this.state === "compact" && m && this.activeModule?.startsWith("extension.") ) { this.fullyExpand(); return; }
      this.open();
    }, Math.max(0, delay));
  }

  private scheduleAutoDismiss(delaySeconds?: number): void {
    this.clear("auto");
    if (this.shelfDragActive || this.interacting || this.isHeld(this.activeModule)) return;
    const delay = (delaySeconds ?? settings.num("general.expandedAutoDismissDelay")) * 1000;
    if (delay <= 0) return;
    this.autoDismiss = setTimeout(() => { if (!this.isHovering) this.dismiss(); }, delay);
  }
  private scheduleFullDismiss(): void {
    this.clear("full");
    if (this.shelfDragActive || this.interacting || settings.bool("general.lockFullExpandedInPlace")) return;
    if (this.isHeld(this.tab === "home" ? null : this.tab)) return;
    const delay = settings.num("general.expandedAutoDismissDelay") * 1000;
    if (delay <= 0) return;
    this.fullDismiss = setTimeout(() => { if (this.state === "fullExpanded" && !this.isHovering) this.dismiss(); }, delay);
  }

  private clear(which: "auto" | "full" | "hover"): void {
    const key = which === "auto" ? "autoDismiss" : which === "full" ? "fullDismiss" : "hoverTimer";
    const t = this[key];
    if (t) clearTimeout(t);
    this[key] = null;
  }
  private clearAll(): void { this.clear("auto"); this.clear("full"); this.clear("hover"); }

  /** Lock toggle used by the full-expanded header pin button. */
  toggleLock(): void {
    const next = !settings.bool("general.lockFullExpandedInPlace");
    void settings.set("general.lockFullExpandedInPlace", next);
    if (next) this.clear("full"); else if (this.state === "fullExpanded" && !this.isHovering) this.scheduleFullDismiss();
    this.emit();
  }
}

export const island = new Island();
