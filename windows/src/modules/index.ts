// Registers every module. Each import is isolated so one failing module cannot take down the island.
const MODULES = [
  "./nowPlaying.js", "./volumeHUD.js", "./battery.js", "./shelf.js", "./connectivity.js",
  "./calendar.js", "./weather.js", "./notifications.js", "./teleprompter.js",
  "./home.js", "./extensions.js",
];

export async function registerAllModules(): Promise<void> {
  for (const path of MODULES) {
    try { await import(path); } catch (e) { console.error(`module ${path} failed to load`, e); }
  }
}
