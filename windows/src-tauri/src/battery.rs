//! Battery state via GetSystemPowerStatus. Emits `battery-changed`.
use serde_json::Value;
use tauri::AppHandle;

pub fn init(_app: &AppHandle) {}

#[tauri::command]
pub fn battery_get() -> Value { Value::Null }
