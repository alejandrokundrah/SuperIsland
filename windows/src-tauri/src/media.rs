//! Now Playing via Windows System Media Transport Controls (GlobalSystemMediaTransportControlsSessionManager).
//! Emits `media-changed` with the payload described in windows/ARCHITECTURE.md.
use serde_json::Value;
use tauri::AppHandle;

pub fn init(_app: &AppHandle) {}

#[tauri::command]
pub fn media_get() -> Value { Value::Null }

#[tauri::command]
pub fn media_command(_cmd: String, _position: Option<f64>) -> Result<(), String> { Ok(()) }
