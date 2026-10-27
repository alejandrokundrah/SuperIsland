// Island chrome: surface sizing, compact/expanded/full-expanded layout, module cycler, tab bar.

import { h, clear } from "./dom.js";
import { icon } from "./icons.js";
import { invoke, safeInvoke } from "./ipc.js";
import { island, SIZES, type IslandState } from "./island.js";
import { getModule, getHomeView, isModuleEnabled, onModulesChanged, type ModuleContext, type View, type ViewFactory } from "./modules.js";
import { settings } from "./settings.js";
import { shared } from "./shared.js";

const NOW_PLAYING = "builtIn.nowPlaying";
const BATTERY = "builtIn.battery";
const VOLUME = "builtIn.volumeHUD";
const SHELF = "builtIn.shelf";

export function contextFor(moduleId: string): ModuleContext {
  return {
    moduleId,
    activate: (opts) => island.showHUD(moduleId, opts),
    dismiss: () => island.dismiss(),
    hold: () => island.holdPresentation(moduleId),
    release: () => island.releasePresentationHold(moduleId),
    get state() { return island.state; },
  };
}

/** Port of CompactView.resolvedModule: music reclaims the pill after HUDs and passive modules. */
export function resolveCompactModule(): string | null {
  let m = island.activeModule;
  const def = getModule(m);
  if (def?.isInactive?.()) m = null;
  const npOn = settings.bool("module.nowPlaying.enabled") && !!getModule(NOW_PLAYING);
  if (m === VOLUME) return npOn && shared.mediaPlaying && island.state === "compact" ? NOW_PLAYING : m;
  if (npOn && shared.mediaPlaying && (m === BATTERY || m === SHELF)) return NOW_PLAYING;
  if (m) return m;
  if (npOn && shared.mediaTitle) return NOW_PLAYING;
  return getModule(BATTERY) ? BATTERY : null;
}

function resolveBodyModule(): string | null {
  if (island.activeModule && isModuleEnabled(island.activeModule)) return island.activeModule;
  const c = resolveCompactModule();
  if (c) return c;
  return island.availableModules()[0] ?? null;
}

export class Renderer {
  private surface = h("div", { class: "surface" });
  private content = h("div", { class: "content fade" });
  private cyclerL = h("button", { class: "cycler left", title: "Previous", onclick: (e: Event) => { e.stopPropagation(); island.cycleModule(false); } }, icon("chevron.left", 12));
  private cyclerR = h("button", { class: "cycler right", title: "Next", onclick: (e: Event) => { e.stopPropagation(); island.cycleModule(true); } }, icon("chevron.right", 12));
  private views: View[] = [];
  private viewKey = "";
  private winSize = { w: 0, h: 0 };
  private shrinkTimer: ReturnType<typeof setTimeout> | null = null;
  private scheduled = false;

  mount(root: HTMLElement): void {
    this.surface.append(this.content, this.cyclerL, this.cyclerR);
    root.append(this.surface);

    this.surface.addEventListener("mouseenter", () => island.handleHover(true));
    this.surface.addEventListener("mouseleave", () => island.handleHover(false));
    this.surface.addEventListener("click", (e) => {
      if (island.state === "fullExpanded") return;
      if ((e.target as HTMLElement).closest("button, input, textarea, select, a, [data-interactive]")) return;
      island.toggleExpansion();
    });
    this.surface.addEventListener("contextmenu", (e) => { e.preventDefault(); void invoke("open_window", { label: "settings" }); });
    this.surface.addEventListener("wheel", (e) => {
      if (!settings.bool("general.islandSurfaceSwipeEnabled")) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) island.cycleModule(e.deltaX > 0);
    }, { passive: true });

    island.subscribe(() => this.schedule());
    settings.subscribe(() => this.schedule());
    onModulesChanged(() => this.schedule());
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") island.dismiss(); });

    // Recover from missed mouseleave events (window resizes / pointer leaving the webview).
    setInterval(async () => {
      if (!island.isHovering && island.state === "compact") return;
      const p = await safeInvoke<{ inside: boolean } | null>("pointer_info", undefined, null);
      if (p && island.isHovering && !p.inside) island.handleHover(false);
    }, 1000);

    this.render();
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => { this.scheduled = false; this.render(); });
  }

  private destroyViews(): void {
    for (const v of this.views) { try { v.destroy?.(); } catch (e) { console.warn(e); } }
    this.views = [];
  }

  private render(): void {
    const state = island.state;
    this.applySize(state);
    this.surface.className = `surface ${state}${settings.bool("appearance.reduceMotion") || settings.str("appearance.animationLevel") === "off" ? " reduce" : ""}`;
    this.surface.style.setProperty("--r", `${SIZES.cornerRadius[state]}px`);
    this.surface.style.setProperty("--speed", String(settings.num("appearance.animationSpeed") || 1));
    const showCycler = state === "expanded" && island.availableModules().length > 1;
    this.cyclerL.style.display = this.cyclerR.style.display = showCycler ? "" : "none";

    const { key, build } = this.plan(state);
    if (key === this.viewKey) return;
    this.viewKey = key;
    this.destroyViews();
    clear(this.content);
    this.content.classList.remove("fade"); void this.content.offsetWidth; this.content.classList.add("fade");
    try { this.content.append(build()); } catch (e) { console.error("render failed", e); }
  }

  private mountView(factory: ViewFactory, moduleId: string): HTMLElement {
    const view = factory(contextFor(moduleId));
    this.views.push(view);
    return view.el;
  }

  private plan(state: IslandState): { key: string; build: () => HTMLElement } {
    if (state === "compact") {
      const id = resolveCompactModule();
      const def = getModule(id);
      const ext = def?.minimalCompact;
      if (id && def && ext && (ext.leading || ext.trailing) && id.startsWith("extension.")) {
        return {
          key: `c|min|${id}`,
          build: () => h("div", { class: "row", style: "width:100%;padding:0 22px;justify-content:space-between" },
            ext.leading ? this.mountView(ext.leading, id) : h("span"),
            ext.trailing ? this.mountView(ext.trailing, id) : h("span")),
        };
      }
      return {
        key: `c|${id}`,
        build: () => (def ? h("div", { class: "row", style: "width:100%;height:100%;padding:0 18px;justify-content:center" }, this.mountView(def.compact, def.id))
          : h("div", { class: "dim caption" }, "SuperIsland")),
      };
    }
    if (state === "expanded") {
      const id = resolveBodyModule();
      const def = getModule(id);
      return {
        key: `e|${id}`,
        build: () => (def ? h("div", { style: "width:100%;height:100%;padding:10px 40px" }, this.mountView(def.expanded, def.id)) : h("div")),
      };
    }
    const tab = island.tab;
    return { key: `f|${tab}|${island.availableTabs().join(",")}|${settings.bool("general.lockFullExpandedInPlace")}`, build: () => this.buildFull(tab) };
  }

  private buildFull(tab: string): HTMLElement {
    const tabs = island.availableTabs();
    const bar = h("div", { class: "tabbar" },
      ...tabs.map((t) => {
        const def = t === "home" ? null : getModule(t);
        return h("button", { class: `tab${t === tab ? " sel" : ""}`, title: t === "home" ? "Home" : def?.title ?? t, onclick: () => island.selectTab(t) },
          icon(t === "home" ? "house.fill" : def?.icon ?? "puzzlepiece.extension", 14));
      }),
      h("span", { class: "grow" }),
      h("button", { class: "tab" + (settings.bool("general.lockFullExpandedInPlace") ? " sel" : ""), title: "Keep open", onclick: () => island.toggleLock() }, icon("pin.fill", 13)),
      h("button", { class: "tab", title: "Settings", onclick: () => void invoke("open_window", { label: "settings" }) }, icon("gearshape.fill", 13)));
    const body = h("div", { class: "fullbody" });
    if (tab === "home") {
      const home = getHomeView();
      if (home) body.append(this.mountView(home, "home"));
    } else {
      const def = getModule(tab);
      const f = def?.fullExpanded ?? def?.expanded;
      if (def && f) body.append(this.mountView(f, def.id));
    }
    return h("div", { class: "full" }, bar, body);
  }

  /** Grow the OS window before the CSS transition, shrink it after. */
  private applySize(state: IslandState): void {
    const { w, h: ht } = island.sizeFor(state);
    this.surface.style.width = `${w}px`;
    this.surface.style.height = `${ht}px`;
    if (this.shrinkTimer) { clearTimeout(this.shrinkTimer); this.shrinkTimer = null; }
    const growing = w > this.winSize.w || ht > this.winSize.h;
    const commit = () => { this.winSize = { w, h: ht }; void safeInvoke("island_set_size", { width: w, height: ht }, null); };
    if (growing || this.winSize.w === 0) {
      // Keep the window at least as large as the bigger of old/new while animating.
      commit();
    } else if (w !== this.winSize.w || ht !== this.winSize.h) {
      this.shrinkTimer = setTimeout(commit, 450);
    }
  }
}
