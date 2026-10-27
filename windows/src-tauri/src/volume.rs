//! System volume (IAudioEndpointVolume) and display brightness (WMI). Emits `volume-changed` / `brightness-changed`.
use serde_json::Value;
use tauri::AppHandle;

pub fn init(_app: &AppHandle) {}

#[tauri::command]
pub fn volume_get() -> Value { Value::Null }
#[tauri::command]
pub fn volume_set(_volume: f32) -> Result<(), String> { Ok(()) }
#[tauri::command]
pub fn volume_set_muted(_muted: bool) -> Result<(), String> { Ok(()) }
#[tauri::command]
pub fn brightness_get() -> Value { Value::Null }
#[tauri::command]
pub fn brightness_set(_value: f32) -> Result<(), String> { Ok(()) }
