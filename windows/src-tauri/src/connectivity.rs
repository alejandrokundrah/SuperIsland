//! Wi-Fi and Bluetooth status.
use serde_json::Value;
use tauri::AppHandle;

pub fn init(_app: &AppHandle) {}

#[tauri::command]
pub async fn connectivity_get() -> Value { Value::Null }
