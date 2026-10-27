//! Extension discovery, per-extension storage, notifications and logging for the JS extension runtime.
use serde_json::Value;
use tauri::AppHandle;

pub fn init(_app: &AppHandle) {}

#[tauri::command]
pub fn ext_list(_app: AppHandle) -> Value { Value::Array(vec![]) }
#[tauri::command]
pub fn ext_read_text(_app: AppHandle, _id: String, _rel: String) -> Result<String, String> { Err("not implemented".into()) }
#[tauri::command]
pub fn ext_store_get(_app: AppHandle, _id: String, _key: String) -> Value { Value::Null }
#[tauri::command]
pub fn ext_store_set(_app: AppHandle, _id: String, _key: String, _value: Value) -> Result<(), String> { Ok(()) }
#[tauri::command]
pub fn ext_notify(_app: AppHandle, _id: String, _title: String, _body: String) -> Result<(), String> { Ok(()) }
