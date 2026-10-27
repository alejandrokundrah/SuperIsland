// Island window entry point.

import { settings } from "./core/settings.js";
import { Renderer } from "./core/renderer.js";
import { island } from "./core/island.js";
import { invoke, inTauri, listen, safeInvoke } from "./core/ipc.js";
import { shared } from "./core/shared.js";
import { registerAllModules } from "./modules/index.js";

async function boot(): Promise<void> {
  await settings.init();
  const root = document.getElementById("root")!;
  const renderer = new Renderer();

  await registerAllModules();
  renderer.mount(root);
  void island; // state machine is a singleton; modules drive it through ModuleContext

  if (!inTauri()) return; // plain-browser preview
  await listen<boolean>("fullscreen-changed", (active) => {
    shared.fullscreenActive = active;
    void invoke("island_set_visible", { visible: !(active && settings.bool("general.hideOnFullscreen")) });
  });
  await listen<null>("displays-changed", () => void invoke("island_reposition"));
  await invoke("island_set_visible", { visible: true });

  if (!settings.bool("onboarding.completed")) await safeInvoke("open_window", { label: "onboarding" }, null);
}

boot().catch((e) => console.error("SuperIsland boot failed", e));
