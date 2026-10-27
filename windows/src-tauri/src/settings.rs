//! Persistent key/value settings, mirroring the macOS `@AppStorage` keys one-to-one
//! (e.g. "module.weather.enabled", "appearance.compactIslandWidth").
//! Frontend windows read via `settings_get_all` and react to the `settings-changed` event.

use serde_json::{Map, Value};
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Emitter, Manager, State};

pub struct SettingsStore {
    path: PathBuf,
    data: Mutex<Map<String, Value>>,
}

impl SettingsStore {
    pub fn load(app: &AppHandle) -> Self {
        let dir = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."));
        let _ = fs::create_dir_all(&dir);
        let path = dir.join("settings.json");
        let data = fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str::<Map<String, Value>>(&s).ok())
            .unwrap_or_default();
        Self { path, data: Mutex::new(data) }
    }

    pub fn get(&self, key: &str) -> Option<Value> {
        self.data.lock().ok()?.get(key).cloned()
    }

    pub fn get_bool(&self, key: &str, default: bool) -> bool {
        self.get(key).and_then(|v| v.as_bool()).unwrap_or(default)
    }

    pub fn get_string(&self, key: &str, default: &str) -> String {
        self.get(key)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .unwrap_or_else(|| default.to_string())
    }

    fn persist(&self) {
        if let Ok(data) = self.data.lock() {
            if let Ok(text) = serde_json::to_string_pretty(&*data) {
                let _ = fs::write(&self.path, text);
            }
        }
    }
}

#[tauri::command]
pub fn settings_get_all(store: State<'_, SettingsStore>) -> Map<String, Value> {
    store.data.lock().map(|d| d.clone()).unwrap_or_default()
}

#[tauri::command]
pub fn settings_set(
    app: AppHandle,
    store: State<'_, SettingsStore>,
    key: String,
    value: Value,
) -> Result<(), String> {
    {
        let mut data = store.data.lock().map_err(|e| e.to_string())?;
        data.insert(key.clone(), value.clone());
    }
    store.persist();
    let _ = app.emit("settings-changed", serde_json::json!({ "key": key, "value": value }));
    crate::system::on_setting_changed(&app, &key, &value);
    Ok(())
}

#[tauri::command]
pub fn settings_remove(
    app: AppHandle,
    store: State<'_, SettingsStore>,
    key: String,
) -> Result<(), String> {
    {
        let mut data = store.data.lock().map_err(|e| e.to_string())?;
        data.remove(&key);
    }
    store.persist();
    let _ = app.emit("settings-changed", serde_json::json!({ "key": key, "value": Value::Null }));
    Ok(())
}
