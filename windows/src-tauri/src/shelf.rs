//! Shelf: files dropped on the island, persisted between launches.
use serde_json::Value;
use tauri::AppHandle;

pub fn init(_app: &AppHandle) {}

#[tauri::command]
pub fn shelf_list() -> Value { Value::Array(vec![]) }
#[tauri::command]
pub fn shelf_add_paths(_paths: Vec<String>) -> Result<Value, String> { Ok(Value::Array(vec![])) }
#[tauri::command]
pub fn shelf_remove(_id: String) -> Result<(), String> { Ok(()) }
#[tauri::command]
pub fn shelf_clear() -> Result<(), String> { Ok(()) }
