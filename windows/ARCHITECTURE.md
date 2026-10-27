# SuperIsland for Windows — architecture & IPC contract

Tauri v2 app (Rust shell + zero-dependency TypeScript UI). The macOS source in `../SuperIsland` and
`../ExtensionHost` is the behavioural reference; this folder is a port, not a wrapper.

## Layout
```
windows/
  src/                 TypeScript (compiled by tsc to dist/, ES modules, NO runtime npm deps)
    index.html main.ts   island window
    settings.html ...    secondary windows (one <label>.html + <label>.ts each; see system.rs WINDOWS)
    core/                ipc, dom (h()), settings, island (state machine), modules (registry), renderer, icons
    modules/             one file per built-in module (+ home.ts, extensions.ts)
    extensions/          JS extension runtime + API
  src-tauri/src/         Rust: one file per native feature, all commands registered in lib.rs
```
Static assets: any non-.ts file under `src/` is copied to `dist/` (scripts/build-web.mjs).
Bundled extensions (`../Extensions`) ship as Tauri resources under `Extensions/`.

## Rules for contributors
* UI = plain DOM via `h()`; modules return `View {el, destroy?}`. No frameworks, no npm runtime deps.
* Never edit `core/*` signatures; add icons with `registerIcons({...})` from your own file.
* Talk to Rust only through `invoke`/`listen` (core/ipc.ts). Command args are camelCase in JS, snake_case in Rust.
* Rust: `windows` crate 0.58, `tauri` 2. Keep `#[cfg(windows)]` code behind cfg and give a non-Windows
  fallback so `cargo check` on Linux logic still type-checks where possible. Emit events with `app.emit(...)`.
* Settings keys are the macOS `@AppStorage` keys (see core/settings.ts DEFAULTS). Add new keys to your own
  module and read them with `settings.get(key)`; defaults live next to the code that reads them.

## Window model
Single island window `island` (frameless, transparent, always-on-top, skip-taskbar). Its OS window size is
always exactly the surface size (frontend calls `island_set_size`; Rust centres it at the top of the target
monitor) so transparent pixels never block clicks. Compact = 220x32 pill, expanded 408x88, full 658x180.
Secondary windows are created by `open_window(label)` from `<label>.html`:
`settings`, `onboarding`, `emoji`, `teleprompter-editor`, `update`.

## Rust commands (see lib.rs)
settings_get_all / settings_set(key,value) / settings_remove(key) · http_fetch({url,method,headers,body,timeoutMs})
island_set_size(width,height) · island_reposition · island_set_visible(visible) · pointer_info · monitors_list
open_window(label) · close_window(label) · quit_app · open_external(target) · reveal_path(path) · open_path(path)
set_launch_at_login(enabled) · media_get / media_command(cmd,position?) · battery_get · volume_get / volume_set(volume)
/ volume_set_muted(muted) / brightness_get / brightness_set(value) · connectivity_get · focus_status
shelf_list / shelf_add_paths(paths) / shelf_remove(id) / shelf_clear
ext_list / ext_read_text(id,rel) / ext_store_get(id,key) / ext_store_set(id,key,value) / ext_notify(id,title,body)

## Events (Rust -> all windows)
* `settings-changed` {key, value|null}
* `media-changed` MediaState | null — `{title, artist, album, app, isPlaying, position (s), duration (s), artwork (data URL|null), canNext, canPrev}`
* `battery-changed` `{hasBattery, percent 0-100, charging, pluggedIn, fullyCharged, minutesRemaining|null, powerSaver}`
* `volume-changed` `{volume 0-1, muted}` · `brightness-changed` `{value 0-1}`
* `fullscreen-changed` boolean · `displays-changed` null
* `shelf-changed` ShelfItem[] `{id,name,path,size,addedAt,kind}`
* Tauri built-ins for file drops: `tauri://drag-enter|drag-over|drag-drop|drag-leave` (payload `{paths, position}`)

## Shared TS contracts
* `core/modules.ts` ModuleDef/ModuleContext — every module registers itself on import.
* `core/shared.ts` — media-playing flags used by compact-view priority rules.
* `core/notifyBus.ts` — in-app notification feed (extensions push, Notifications module renders).
* `extensions/api.ts` — installed-extension list / activation / settings rendering used by settings window.
* `core/mascot.ts` — `mascotView(size, expression)`.

## Known platform differences
No notch: the island is always the "wide compact" pill. No EventKit/MediaRemote/Focus API: calendar uses ICS
feeds + local events, media uses SMTC, focus uses SHQueryUserNotificationState. System notification
interception needs a packaged (MSIX) identity and is out of scope; the feed shows extension notifications.
