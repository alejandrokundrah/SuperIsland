//! App-level commands: secondary windows, quit, launch-at-login, screen-capture visibility.

use serde_json::Value;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Windows the frontend may open by label. Each maps to `<label>.html` in the web bundle.
const WINDOWS: &[(&str, &str, f64, f64, bool)] = &[
    // label, title, width, height, resizable
    ("settings", "SuperIsland Settings", 860.0, 640.0, true),
    ("onboarding", "Welcome to SuperIsland", 760.0, 560.0, false),
    ("emoji", "Emoji", 380.0, 440.0, false),
    ("teleprompter-editor", "Teleprompter Script", 640.0, 520.0, true),
    ("update", "SuperIsland Update", 480.0, 360.0, false),
];

#[tauri::command]
pub fn open_window(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
        return Ok(());
    }
    let (_, title, w, h, resizable) = WINDOWS
        .iter()
        .find(|(l, ..)| *l == label)
        .ok_or_else(|| format!("unknown window '{label}'"))?;
    WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(format!("{label}.html").into()))
        .title(*title)
        .inner_size(*w, *h)
        .resizable(*resizable)
        .center()
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn close_window(app: AppHandle, label: String) {
    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.close();
    }
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn open_external(app: AppHandle, target: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener().open_url(target, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reveal_path(app: AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener().reveal_item_in_dir(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_path(app: AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener().open_path(path, None::<&str>).map_err(|e| e.to_string())
}

/// Starts or stops launching the app at Windows sign-in (HKCU Run key).
#[tauri::command]
pub fn set_launch_at_login(enabled: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        use winreg::{enums::HKEY_CURRENT_USER, RegKey};
        let key = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags(
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                winreg::enums::KEY_SET_VALUE,
            )
            .map_err(|e| e.to_string())?;
        if enabled {
            let exe = std::env::current_exe().map_err(|e| e.to_string())?;
            key.set_value("SuperIsland", &format!("\"{}\"", exe.display()))
                .map_err(|e| e.to_string())?;
        } else {
            let _ = key.delete_value("SuperIsland");
        }
    }
    #[cfg(not(windows))]
    let _ = enabled;
    Ok(())
}

/// Hide the island from screen recordings / screenshots when false.
pub fn apply_content_protection(app: &AppHandle, show_in_recordings: bool) {
    if let Some(win) = app.get_webview_window(crate::window::ISLAND_LABEL) {
        let _ = win.set_content_protected(!show_in_recordings);
    }
}

/// Side effects for settings that need native work when they change.
pub fn on_setting_changed(app: &AppHandle, key: &str, value: &Value) {
    match key {
        "general.launchAtLogin" => {
            let _ = set_launch_at_login(value.as_bool().unwrap_or(false));
        }
        "general.showInScreenRecordings" => {
            apply_content_protection(app, value.as_bool().unwrap_or(false));
        }
        "general.showMenuBarIcon" => crate::tray::set_visible(app, value.as_bool().unwrap_or(true)),
        "general.displayIdentifier" => crate::window::apply_geometry(app),
        _ => {}
    }
}
