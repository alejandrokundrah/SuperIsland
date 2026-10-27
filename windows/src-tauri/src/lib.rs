//! SuperIsland for Windows - Tauri shell. See windows/ARCHITECTURE.md for the IPC contract.

mod battery;
mod connectivity;
mod extensions;
mod focus;
mod http;
mod media;
mod settings;
mod shelf;
mod system;
mod tray;
mod volume;
mod window;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // A second launch just reveals settings instead of spawning another island.
            let _ = system::open_window(app.clone(), "settings".into());
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .manage(window::IslandGeometry::default())
        .setup(|app| {
            let handle = app.handle().clone();
            app.manage(settings::SettingsStore::load(&handle));

            window::create_island(&handle)?;
            tray::init(&handle)?;

            let store = app.state::<settings::SettingsStore>();
            system::apply_content_protection(&handle, store.get_bool("general.showInScreenRecordings", false));
            tray::set_visible(&handle, store.get_bool("general.showMenuBarIcon", true));

            media::init(&handle);
            battery::init(&handle);
            volume::init(&handle);
            connectivity::init(&handle);
            focus::init(&handle);
            shelf::init(&handle);
            extensions::init(&handle);

            // Show the island once the frontend has asked for its first size (see island_set_visible).
            window::apply_geometry(&handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            settings::settings_get_all,
            settings::settings_set,
            settings::settings_remove,
            http::http_fetch,
            window::island_set_size,
            window::island_reposition,
            window::island_set_visible,
            window::pointer_info,
            window::monitors_list,
            system::open_window,
            system::close_window,
            system::quit_app,
            system::open_external,
            system::reveal_path,
            system::open_path,
            system::set_launch_at_login,
            media::media_get,
            media::media_command,
            battery::battery_get,
            volume::volume_get,
            volume::volume_set,
            volume::volume_set_muted,
            volume::brightness_get,
            volume::brightness_set,
            connectivity::connectivity_get,
            focus::focus_status,
            shelf::shelf_list,
            shelf::shelf_add_paths,
            shelf::shelf_remove,
            shelf::shelf_clear,
            extensions::ext_list,
            extensions::ext_read_text,
            extensions::ext_store_get,
            extensions::ext_store_set,
            extensions::ext_notify,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SuperIsland");
}
