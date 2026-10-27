//! The island window: a frameless, transparent, always-on-top window pinned to the
//! top-centre of a monitor. Like the macOS build, the *window itself* is the viewport:
//! the frontend asks for the exact size it needs (`island_set_size`) and Rust resizes and
//! re-centres it, so transparent pixels never steal clicks from apps underneath.

use serde::Serialize;
use std::sync::Mutex;
use tauri::{
    AppHandle, LogicalSize, Manager, Monitor, PhysicalPosition, State, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder,
};

use crate::settings::SettingsStore;

pub const ISLAND_LABEL: &str = "island";

pub struct IslandGeometry {
    /// Logical size requested by the frontend.
    size: Mutex<(f64, f64)>,
}

impl Default for IslandGeometry {
    fn default() -> Self {
        Self { size: Mutex::new((200.0, 36.0)) }
    }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub id: String,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    pub primary: bool,
}

fn monitor_id(m: &Monitor) -> String {
    m.name().cloned().unwrap_or_else(|| format!("{}x{}@{},{}", m.size().width, m.size().height, m.position().x, m.position().y))
}

pub fn create_island(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let win = WebviewWindowBuilder::new(app, ISLAND_LABEL, WebviewUrl::App("index.html".into()))
        .title("SuperIsland")
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .focused(false)
        .visible(false)
        .inner_size(200.0, 36.0)
        .build()?;
    Ok(win)
}

/// Picks the monitor the island should live on from `general.displayIdentifier`:
/// "" (automatic) -> monitor under the cursor, falling back to primary; otherwise a monitor id.
fn target_monitor(app: &AppHandle, win: &WebviewWindow) -> Option<Monitor> {
    let wanted = app
        .state::<SettingsStore>()
        .get_string("general.displayIdentifier", "");
    if !wanted.is_empty() && wanted != "all" {
        if let Ok(list) = app.available_monitors() {
            if let Some(m) = list.into_iter().find(|m| monitor_id(m) == wanted) {
                return Some(m);
            }
        }
    }
    if let Ok(cursor) = app.cursor_position() {
        if let Ok(Some(m)) = app.monitor_from_point(cursor.x, cursor.y) {
            return Some(m);
        }
    }
    app.primary_monitor().ok().flatten().or_else(|| win.current_monitor().ok().flatten())
}

pub fn apply_geometry(app: &AppHandle) {
    let Some(win) = app.get_webview_window(ISLAND_LABEL) else { return };
    let geo = app.state::<IslandGeometry>();
    let (w, h) = *geo.size.lock().unwrap();
    let Some(mon) = target_monitor(app, &win) else {
        let _ = win.set_size(LogicalSize::new(w, h));
        return;
    };
    let scale = mon.scale_factor();
    let _ = win.set_size(LogicalSize::new(w, h));
    let phys_w = (w * scale).round() as i32;
    let x = mon.position().x + (mon.size().width as i32 - phys_w) / 2;
    let y = mon.position().y;
    let _ = win.set_position(PhysicalPosition::new(x, y));
}

#[tauri::command]
pub fn island_set_size(app: AppHandle, geo: State<'_, IslandGeometry>, width: f64, height: f64) {
    *geo.size.lock().unwrap() = (width.max(1.0), height.max(1.0));
    apply_geometry(&app);
}

#[tauri::command]
pub fn island_reposition(app: AppHandle) {
    apply_geometry(&app);
}

#[tauri::command]
pub fn island_set_visible(app: AppHandle, visible: bool) {
    if let Some(win) = app.get_webview_window(ISLAND_LABEL) {
        if visible {
            apply_geometry(&app);
            let _ = win.show();
            let _ = win.set_always_on_top(true);
        } else {
            let _ = win.hide();
        }
    }
}

/// Global cursor position in physical pixels plus the island's outer rect, so the frontend can
/// validate hover state when the pointer leaves the window without a `mouseleave` event.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PointerInfo {
    pub cursor_x: f64,
    pub cursor_y: f64,
    pub win_x: i32,
    pub win_y: i32,
    pub win_w: u32,
    pub win_h: u32,
    pub inside: bool,
}

#[tauri::command]
pub fn pointer_info(app: AppHandle) -> Option<PointerInfo> {
    let win = app.get_webview_window(ISLAND_LABEL)?;
    let c = app.cursor_position().ok()?;
    let p = win.outer_position().ok()?;
    let s = win.outer_size().ok()?;
    let inside = c.x >= p.x as f64
        && c.x < (p.x + s.width as i32) as f64
        && c.y >= p.y as f64
        && c.y < (p.y + s.height as i32) as f64;
    Some(PointerInfo { cursor_x: c.x, cursor_y: c.y, win_x: p.x, win_y: p.y, win_w: s.width, win_h: s.height, inside })
}

#[tauri::command]
pub fn monitors_list(app: AppHandle) -> Vec<MonitorInfo> {
    let primary = app.primary_monitor().ok().flatten().map(|m| monitor_id(&m));
    app.available_monitors()
        .unwrap_or_default()
        .iter()
        .map(|m| MonitorInfo {
            id: monitor_id(m),
            name: m.name().cloned().unwrap_or_else(|| "Display".into()),
            x: m.position().x,
            y: m.position().y,
            width: m.size().width,
            height: m.size().height,
            scale_factor: m.scale_factor(),
            primary: primary.as_deref() == Some(&monitor_id(m)),
        })
        .collect()
}
