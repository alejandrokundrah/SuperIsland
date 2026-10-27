//! System-tray icon (the Windows counterpart of the macOS menu-bar item).

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

const TRAY_ID: &str = "main";

pub fn init(app: &AppHandle) -> tauri::Result<()> {
    let settings = MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "Show / Hide Island", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit SuperIsland", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings, &toggle, &sep, &quit])?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("SuperIsland")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "settings" => {
                let _ = crate::system::open_window(app.clone(), "settings".into());
            }
            "toggle" => {
                if let Some(win) = app.get_webview_window(crate::window::ISLAND_LABEL) {
                    let visible = win.is_visible().unwrap_or(true);
                    crate::window::island_set_visible(app.clone(), !visible);
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                let _ = crate::system::open_window(tray.app_handle().clone(), "settings".into());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

pub fn set_visible(app: &AppHandle, visible: bool) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_visible(visible);
    }
}
