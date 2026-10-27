//! Focus / do-not-disturb and fullscreen detection (SHQueryUserNotificationState). Emits `fullscreen-changed`.
use serde_json::Value;
use tauri::AppHandle;

pub fn init(_app: &AppHandle) {}

#[tauri::command]
pub fn focus_status() -> Value { Value::Null }
