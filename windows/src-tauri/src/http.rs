//! Generic HTTP bridge. Used by built-in modules (weather, calendar feeds) and by the
//! extension runtime (`network` permission) so requests are not subject to WebView CORS.

use serde::{Deserialize, Serialize};
use std::{collections::HashMap, time::Duration};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpRequest {
    pub url: String,
    pub method: Option<String>,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
    pub timeout_ms: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpResponse {
    pub status: u16,
    pub ok: bool,
    pub headers: HashMap<String, String>,
    /// UTF-8 text body (lossy). Use `body_base64` for binary payloads.
    pub body: String,
    pub body_base64: String,
}

#[tauri::command]
pub async fn http_fetch(req: HttpRequest) -> Result<HttpResponse, String> {
    use base64::Engine;
    let url = reqwest::Url::parse(&req.url).map_err(|e| e.to_string())?;
    if url.scheme() != "https" && url.scheme() != "http" {
        return Err("unsupported URL scheme".into());
    }
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(req.timeout_ms.unwrap_or(20_000)))
        .user_agent("SuperIsland/1.0 (Windows)")
        .build()
        .map_err(|e| e.to_string())?;
    let method = reqwest::Method::from_bytes(req.method.unwrap_or_else(|| "GET".into()).as_bytes())
        .map_err(|e| e.to_string())?;
    let mut builder = client.request(method, url);
    for (k, v) in req.headers.unwrap_or_default() {
        builder = builder.header(k, v);
    }
    if let Some(body) = req.body {
        builder = builder.body(body);
    }
    let resp = builder.send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    let headers = resp
        .headers()
        .iter()
        .filter_map(|(k, v)| v.to_str().ok().map(|v| (k.to_string(), v.to_string())))
        .collect();
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    Ok(HttpResponse {
        status: status.as_u16(),
        ok: status.is_success(),
        headers,
        body: String::from_utf8_lossy(&bytes).into_owned(),
        body_base64: base64::engine::general_purpose::STANDARD.encode(&bytes),
    })
}
