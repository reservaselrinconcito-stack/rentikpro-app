#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use base64::Engine;
use sha2::Digest;
use chrono;
use chrono::{Datelike, Timelike};

use tauri::Manager;

#[tauri::command]
fn open_devtools(window: tauri::WebviewWindow) {
  #[cfg(debug_assertions)]
  {
    window.open_devtools();
  }
  #[cfg(not(debug_assertions))]
  {
    let debug_env = std::env::var("RENTIKPRO_DEBUG").unwrap_or_default();
    if debug_env == "1" {
      window.open_devtools();
    }
  }
}

#[derive(serde::Serialize)]
struct IcalFetchResult {
  status: u16,
  body: String,
  etag: Option<String>,
  last_modified: Option<String>,
  content_type: Option<String>,
}

#[tauri::command]
async fn fetch_ical_url(url: String, etag: Option<String>, last_modified: Option<String>) -> Result<IcalFetchResult, String> {
  let client = reqwest::Client::builder()
    .timeout(std::time::Duration::from_secs(20))
    .user_agent("RentikPro/2 (calendar-sync)")
    .build()
    .map_err(|e| e.to_string())?;

  let mut req = client.get(&url)
    .header("Accept", "text/calendar, text/plain, */*");

  if let Some(e) = etag {
    req = req.header("If-None-Match", e);
  }
  if let Some(lm) = last_modified {
    req = req.header("If-Modified-Since", lm);
  }

  let resp = req.send().await.map_err(|e| format!("Fetch error: {e}"))?;
  let status = resp.status().as_u16();
  let etag_out = resp.headers().get("etag").and_then(|v| v.to_str().ok()).map(String::from);
  let lm_out = resp.headers().get("last-modified").and_then(|v| v.to_str().ok()).map(String::from);
  let ct_out = resp.headers().get("content-type").and_then(|v| v.to_str().ok()).map(String::from);
  let body = resp.text().await.map_err(|e| format!("Read error: {e}"))?;

  Ok(IcalFetchResult { status, body, etag: etag_out, last_modified: lm_out, content_type: ct_out })
}

fn main() {
  let debug_enabled = std::env::var("RENTIKPRO_DEBUG").map(|v| v == "1").unwrap_or(false);
  
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .setup(move |app| {
      #[cfg(all(debug_assertions, not(mobile)))]
      {
        let window = app.get_webview_window("main").unwrap();
        window.open_devtools();
      }
      
      if debug_enabled {
        println!("RentikPro Debug Mode Enabled via RENTIKPRO_DEBUG=1");
      }
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      open_devtools,
      fetch_ical_url,
      pick_project_folder,
      validate_project_folder,
      open_project_folder,
      write_project_folder,
      setup_workspace,
      open_workspace,
      save_workspace,
      create_backup,
      list_backups,
      restore_backup,
      reset_workspace,
      webdav_sync
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

const WORKSPACE_JSON_NAME: &str = "workspace.json";
const WORKSPACE_DB_NAME: &str = "database.sqlite";
const WORKSPACE_BACKUPS_DIR: &str = "backups";
const WORKSPACE_MEDIA_DIR: &str = "media";
const REMOTE_WORKSPACE_FORMAT: &str = "rentikpro.remote-workspace.v1";

fn is_sqlite_bytes(bytes: &[u8]) -> bool {
  // "SQLite format 3\0"
  const MAGIC: [u8; 16] = [83, 81, 76, 105, 116, 101, 32, 102, 111, 114, 109, 97, 116, 32, 51, 0];
  if bytes.len() < 16 {
    return false;
  }
  bytes[0..16] == MAGIC
}

fn workspace_paths(root: &std::path::Path) -> (std::path::PathBuf, std::path::PathBuf, std::path::PathBuf, std::path::PathBuf) {
  (
    root.join(WORKSPACE_JSON_NAME),
    root.join(WORKSPACE_DB_NAME),
    root.join(WORKSPACE_BACKUPS_DIR),
    root.join(WORKSPACE_MEDIA_DIR),
  )
}

#[derive(Clone)]
struct LocalSyncContext {
  root: std::path::PathBuf,
  meta_path: std::path::PathBuf,
  db_path: std::path::PathBuf,
  sync_dir: std::path::PathBuf,
  backups_dir: std::path::PathBuf,
  conflicts_dir: std::path::PathBuf,
  kind: String,
  local_meta_file: String,
  local_db_file: String,
}

fn project_paths(root: &std::path::Path) -> (std::path::PathBuf, std::path::PathBuf) {
  (root.join("project.json"), root.join("db.sqlite"))
}

fn detect_local_sync_context(root: &std::path::Path) -> Result<LocalSyncContext, String> {
  let (workspace_meta, workspace_db, _workspace_backups, _workspace_media) = workspace_paths(root);
  if workspace_meta.exists() || workspace_db.exists() {
    return Ok(LocalSyncContext {
      root: root.to_path_buf(),
      meta_path: workspace_meta,
      db_path: workspace_db,
      sync_dir: root.join("sync"),
      backups_dir: root.join("sync").join("backups"),
      conflicts_dir: root.join("sync").join("conflicts"),
      kind: "workspace".to_string(),
      local_meta_file: WORKSPACE_JSON_NAME.to_string(),
      local_db_file: WORKSPACE_DB_NAME.to_string(),
    });
  }

  let (project_meta, project_db) = project_paths(root);
  if project_meta.exists() || project_db.exists() {
    return Ok(LocalSyncContext {
      root: root.to_path_buf(),
      meta_path: project_meta,
      db_path: project_db,
      sync_dir: root.join("sync"),
      backups_dir: root.join("sync").join("backups"),
      conflicts_dir: root.join("sync").join("conflicts"),
      kind: "folder-project".to_string(),
      local_meta_file: "project.json".to_string(),
      local_db_file: "db.sqlite".to_string(),
    });
  }

  Err("Missing workspace.json/database.sqlite or project.json/db.sqlite in local root".to_string())
}

fn atomic_write(path: &std::path::Path, bytes: &[u8]) -> Result<(), String> {
  let parent = path.parent().ok_or_else(|| "Invalid path (no parent)".to_string())?;
  ensure_dir(parent)?;

  let filename = path
    .file_name()
    .and_then(|s| s.to_str())
    .ok_or_else(|| "Invalid path filename".to_string())?;
  // Requirement: <name>.tmp (e.g. database.sqlite.tmp)
  let tmp = parent.join(format!("{filename}.tmp"));
  std::fs::write(&tmp, bytes).map_err(|e| format!("Failed writing temp {}: {e}", tmp.display()))?;

  // On Windows, rename cannot overwrite an existing file.
  #[cfg(target_os = "windows")]
  {
    if path.exists() {
      std::fs::remove_file(path).map_err(|e| format!("Failed removing existing {}: {e}", path.display()))?;
    }
  }

  std::fs::rename(&tmp, path).map_err(|e| format!("Failed renaming temp into {}: {e}", path.display()))?;
  Ok(())
}

fn default_workspace_json() -> serde_json::Value {
  serde_json::json!({
    "schema": 1,
    "kind": "workspace",
    "id": format!("ws_{}", chrono::Utc::now().timestamp_millis()),
    "createdAt": chrono::Utc::now().timestamp_millis(),
    "updatedAt": chrono::Utc::now().timestamp_millis(),
    "dbFile": WORKSPACE_DB_NAME,
  })
}

#[derive(serde::Serialize)]
struct OpenWorkspaceResult {
  workspace_json: String,
  db_base64: String,
  workspace_json_path: String,
  db_path: String,
  backups_dir: String,
}

#[tauri::command]
fn setup_workspace(path: String) -> Result<(), String> {
  let root = std::path::PathBuf::from(&path);
  if !root.exists() {
    return Err("Workspace folder does not exist".to_string());
  }
  if !root.is_dir() {
    return Err("Workspace path is not a folder".to_string());
  }

  let (wjson, _db, backups, media) = workspace_paths(&root);
  ensure_dir(&backups)?;
  ensure_dir(&media)?;

  if !wjson.exists() {
    write_json_file(&wjson, &default_workspace_json())?;
  }

  Ok(())
}

#[tauri::command]
fn open_workspace(path: String) -> Result<OpenWorkspaceResult, String> {
  let root = std::path::PathBuf::from(&path);
  if !root.exists() {
    return Err("Workspace folder does not exist".to_string());
  }
  if !root.is_dir() {
    return Err("Workspace path is not a folder".to_string());
  }

  let (wjson, db, backups, media) = workspace_paths(&root);
  ensure_dir(&backups)?;
  ensure_dir(&media)?;

  if !wjson.exists() {
    write_json_file(&wjson, &default_workspace_json())?;
  }
  if !db.exists() {
    return Err(format!("Missing {} in workspace", WORKSPACE_DB_NAME));
  }

  let db_bytes = std::fs::read(&db).map_err(|e| format!("Failed reading {}: {e}", db.display()))?;
  if !is_sqlite_bytes(&db_bytes) {
    return Err(format!("{} is not a valid SQLite database", WORKSPACE_DB_NAME));
  }
  let db_base64 = base64::engine::general_purpose::STANDARD.encode(db_bytes);

  let workspace_json = std::fs::read_to_string(&wjson).unwrap_or_else(|_| "{}".to_string());

  Ok(OpenWorkspaceResult {
    workspace_json,
    db_base64,
    workspace_json_path: wjson.to_string_lossy().to_string(),
    db_path: db.to_string_lossy().to_string(),
    backups_dir: backups.to_string_lossy().to_string(),
  })
}

#[tauri::command]
fn save_workspace(path: String, db_b64: String) -> Result<(), String> {
  let root = std::path::PathBuf::from(&path);
  if !root.exists() {
    return Err("Workspace folder does not exist".to_string());
  }
  if !root.is_dir() {
    return Err("Workspace path is not a folder".to_string());
  }

  let (_wjson, db, backups, media) = workspace_paths(&root);
  ensure_dir(&backups)?;
  ensure_dir(&media)?;

  let bytes = base64::engine::general_purpose::STANDARD
    .decode(db_b64.as_bytes())
    .map_err(|e| format!("Invalid db base64: {e}"))?;

  if !is_sqlite_bytes(&bytes) {
    return Err(format!("Refusing to write: {} is not valid SQLite bytes", WORKSPACE_DB_NAME));
  }

  atomic_write(&db, &bytes)
}

fn timestamp_backup_name(prefix: &str, ext: &str) -> String {
  let now = chrono::Local::now();
  format!(
    "{prefix}{:04}{:02}{:02}_{:02}{:02}{:02}.{ext}",
    now.year(),
    now.month(),
    now.day(),
    now.hour(),
    now.minute(),
    now.second()
  )
}

fn create_backup_internal(root: &std::path::Path, prefix: &str) -> Result<String, String> {
  let (wjson, db, backups, _media) = workspace_paths(root);
  ensure_dir(&backups)?;

  if !db.exists() {
    return Err(format!("Missing {} in workspace", WORKSPACE_DB_NAME));
  }
  let db_bytes = std::fs::read(&db).map_err(|e| format!("Failed reading {}: {e}", db.display()))?;
  if !is_sqlite_bytes(&db_bytes) {
    return Err(format!("{} is not a valid SQLite database", WORKSPACE_DB_NAME));
  }

  let workspace_json = std::fs::read_to_string(&wjson).unwrap_or_else(|_| "{}".to_string());
  let metadata = serde_json::json!({
    "app": "RentikPro",
    "format": "rentikpro-workspace-backup",
    "createdAt": chrono::Utc::now().timestamp_millis(),
    "dbFile": WORKSPACE_DB_NAME,
  });
  let metadata_bytes = serde_json::to_vec_pretty(&metadata).map_err(|e| format!("Metadata encode failed: {e}"))?;

  let filename = timestamp_backup_name(prefix, "rentikpro");
  let backup_path = backups.join(&filename);

  let f = std::fs::File::create(&backup_path).map_err(|e| format!("Failed creating backup {}: {e}", backup_path.display()))?;
  let mut zip = zip::ZipWriter::new(f);
  let opts = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

  use std::io::Write;
  zip
    .start_file(WORKSPACE_DB_NAME, opts)
    .map_err(|e| format!("ZIP start database.sqlite failed: {e}"))?;
  zip
    .write_all(&db_bytes)
    .map_err(|e| format!("ZIP write database.sqlite failed: {e}"))?;

  zip
    .start_file(WORKSPACE_JSON_NAME, opts)
    .map_err(|e| format!("ZIP start workspace.json failed: {e}"))?;
  zip
    .write_all(workspace_json.as_bytes())
    .map_err(|e| format!("ZIP write workspace.json failed: {e}"))?;

  zip
    .start_file("metadata.json", opts)
    .map_err(|e| format!("ZIP start metadata.json failed: {e}"))?;
  zip
    .write_all(&metadata_bytes)
    .map_err(|e| format!("ZIP write metadata.json failed: {e}"))?;

  zip.finish().map_err(|e| format!("ZIP finalize failed: {e}"))?;

  Ok(filename)
}

#[tauri::command]
fn create_backup(path: String) -> Result<String, String> {
  let root = std::path::PathBuf::from(&path);
  if !root.exists() {
    return Err("Workspace folder does not exist".to_string());
  }
  if !root.is_dir() {
    return Err("Workspace path is not a folder".to_string());
  }
  create_backup_internal(&root, "backup_")
}

#[tauri::command]
fn list_backups(path: String) -> Result<Vec<String>, String> {
  let root = std::path::PathBuf::from(&path);
  if !root.exists() {
    return Err("Workspace folder does not exist".to_string());
  }
  if !root.is_dir() {
    return Err("Workspace path is not a folder".to_string());
  }
  let (_wjson, _db, backups, _media) = workspace_paths(&root);
  ensure_dir(&backups)?;

  let mut out: Vec<String> = vec![];
  let entries = std::fs::read_dir(&backups).map_err(|e| format!("Failed listing backups: {e}"))?;
  for ent in entries {
    let ent = ent.map_err(|e| format!("Failed reading backup entry: {e}"))?;
    let p = ent.path();
    if !p.is_file() {
      continue;
    }
    let name = p.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
    if name.ends_with(".rentikpro") || name.ends_with(".zip") {
      out.push(name);
    }
  }
  out.sort_by(|a, b| b.cmp(a));
  Ok(out)
}

fn extract_db_from_backup(backup_path: &std::path::Path) -> Result<Vec<u8>, String> {
  let f = std::fs::File::open(backup_path).map_err(|e| format!("Failed opening backup {}: {e}", backup_path.display()))?;
  let mut zip = zip::ZipArchive::new(f).map_err(|e| format!("Invalid ZIP: {e}"))?;

  // Standard name first, then legacy.
  let target_name = if zip.file_names().any(|n| n == WORKSPACE_DB_NAME) {
    WORKSPACE_DB_NAME
  } else if zip.file_names().any(|n| n == "db.sqlite") {
    "db.sqlite"
  } else {
    return Err(format!("Backup ZIP does not contain '{}'", WORKSPACE_DB_NAME));
  };

  let mut file = zip
    .by_name(target_name)
    .map_err(|e| format!("Failed opening {target_name} in ZIP: {e}"))?;

  use std::io::Read;
  let mut bytes: Vec<u8> = vec![];
  file.read_to_end(&mut bytes).map_err(|e| format!("Failed reading database from ZIP: {e}"))?;
  if !is_sqlite_bytes(&bytes) {
    return Err("database.sqlite extracted from backup is not valid SQLite bytes".to_string());
  }
  Ok(bytes)
}

#[tauri::command]
fn restore_backup(path: String, backup_name: String) -> Result<String, String> {
  let root = std::path::PathBuf::from(&path);
  if !root.exists() {
    return Err("Workspace folder does not exist".to_string());
  }
  if !root.is_dir() {
    return Err("Workspace path is not a folder".to_string());
  }
  let (_wjson, _db, backups, _media) = workspace_paths(&root);
  ensure_dir(&backups)?;

  // Basic safety: do not allow path traversal in backup_name.
  if backup_name.contains('/') || backup_name.contains('\\') || backup_name.contains("..") {
    return Err("Invalid backup name".to_string());
  }

  // Auto-backup current state before overwriting.
  create_backup_internal(&root, "autobackup_before_restore_").ok();

  // Requirement: open <workspace>/backups/<backup_name>.rentikpro
  let backup_file = if backup_name.ends_with(".rentikpro") {
    backup_name.clone()
  } else {
    format!("{backup_name}.rentikpro")
  };
  let backup_path = backups.join(&backup_file);
  if !backup_path.exists() {
    return Err("Backup file not found".to_string());
  }

  // Extract ONLY database.sqlite (or legacy db.sqlite) from the ZIP
  let bytes = extract_db_from_backup(&backup_path)?;

  // Requirement: write EXACTLY to <workspace>/database.sqlite with atomic tmp+rename
  let final_db = root.join(WORKSPACE_DB_NAME);
  let tmp_db = root.join(format!("{WORKSPACE_DB_NAME}.tmp"));

  std::fs::write(&tmp_db, &bytes)
    .map_err(|e| format!("Failed writing temp {}: {e}", tmp_db.display()))?;

  // On Windows, rename cannot overwrite an existing file.
  #[cfg(target_os = "windows")]
  {
    if final_db.exists() {
      std::fs::remove_file(&final_db)
        .map_err(|e| format!("Failed removing existing {}: {e}", final_db.display()))?;
    }
  }

  std::fs::rename(&tmp_db, &final_db)
    .map_err(|e| format!("Failed renaming temp into {}: {e}", final_db.display()))?;

  // Verification requirement
  let ok = final_db.exists()
    && std::fs::metadata(&final_db)
      .map(|m| m.len() > 0)
      .unwrap_or(false);
  if !ok {
    return Err("Restore failed: database not written".to_string());
  }

  // Log requirement
  println!("Workspace database restored successfully");
  Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
}

#[tauri::command]
fn reset_workspace(path: String) -> Result<(), String> {
  let root = std::path::PathBuf::from(&path);
  if !root.exists() {
    return Err("Workspace folder does not exist".to_string());
  }
  if !root.is_dir() {
    return Err("Workspace path is not a folder".to_string());
  }
  let (_wjson, db, backups, _media) = workspace_paths(&root);
  ensure_dir(&backups)?;

  // Auto-backup current state before resetting.
  create_backup_internal(&root, "autobackup_before_reset_").ok();

  if db.exists() {
    std::fs::remove_file(&db).map_err(|e| format!("Failed removing {}: {e}", db.display()))?;
  }
  Ok(())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct WebDavSyncArgs {
  mode: String, // "up" | "down"
  url: String,
  user: String,
  pass: String,
  slug: String,
  project_path: String,
  client_id: String,
  force: bool,
  local_db_base64: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct WebDavSyncResponse {
  success: bool,
  error: Option<String>,
  conflict: bool,
  remote_state: Option<serde_json::Value>,
  local_state: Option<serde_json::Value>,
  conflict_paths: Option<serde_json::Value>,
  db_base64: Option<String>,
  applied: Option<bool>,
  workspace_kind: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
struct SyncStateV1 {
  version: u32,
  format: String,
  last_modified: i64,
  sha256: String,
  client_id: String,
  workspace_kind: String,
  db_file: String,
  metadata_file: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
struct LockFileV1 {
  version: u32,
  format: String,
  client_id: String,
  workspace_kind: String,
  created_at: i64,
  heartbeat_at: i64,
  expires_at: i64,
}

fn sha256_hex(bytes: &[u8]) -> String {
  let mut hasher = sha2::Sha256::new();
  hasher.update(bytes);
  let out = hasher.finalize();
  hex::encode(out)
}

fn ensure_dir(path: &std::path::Path) -> Result<(), String> {
  std::fs::create_dir_all(path).map_err(|e| format!("Failed creating dir {}: {e}", path.display()))
}

fn read_json_file<T: for<'de> serde::Deserialize<'de>>(path: &std::path::Path) -> Option<T> {
  let txt = std::fs::read_to_string(path).ok()?;
  serde_json::from_str(&txt).ok()
}

fn write_json_file<T: serde::Serialize>(path: &std::path::Path, value: &T) -> Result<(), String> {
  if let Some(parent) = path.parent() {
    std::fs::create_dir_all(parent).map_err(|e| format!("Failed creating dir {}: {e}", parent.display()))?;
  }
  let txt = serde_json::to_string_pretty(value).map_err(|e| format!("JSON encode failed: {e}"))?;
  std::fs::write(path, txt.as_bytes()).map_err(|e| format!("Failed writing {}: {e}", path.display()))
}

fn read_local_metadata(ctx: &LocalSyncContext, slug: &str) -> serde_json::Value {
  let fallback_name = ctx
    .root
    .file_name()
    .and_then(|s| s.to_str())
    .unwrap_or("RentikPro Workspace")
    .to_string();

  let mut meta = read_json_file::<serde_json::Value>(&ctx.meta_path)
    .unwrap_or_else(|| serde_json::json!({}));

  if !meta.is_object() {
    meta = serde_json::json!({});
  }

  let now = chrono::Utc::now().timestamp_millis();
  let obj = meta.as_object_mut().unwrap();
  obj.entry("schema".to_string()).or_insert_with(|| serde_json::json!(1));
  obj.entry("id".to_string()).or_insert_with(|| serde_json::json!(slug));
  obj.entry("name".to_string()).or_insert_with(|| serde_json::json!(fallback_name));
  obj.entry("createdAt".to_string()).or_insert_with(|| serde_json::json!(now));
  obj.insert("updatedAt".to_string(), serde_json::json!(now));
  obj.entry("appVersion".to_string()).or_insert_with(|| serde_json::json!("unknown"));
  meta
}

fn build_remote_workspace_json(local_meta: &serde_json::Value, ctx: &LocalSyncContext) -> serde_json::Value {
  let mut meta = local_meta.clone();
  if !meta.is_object() {
    meta = serde_json::json!({});
  }

  let now = chrono::Utc::now().timestamp_millis();
  let obj = meta.as_object_mut().unwrap();
  obj.insert("schema".to_string(), serde_json::json!(1));
  obj.insert("kind".to_string(), serde_json::json!("workspace"));
  obj.insert("dbFile".to_string(), serde_json::json!(WORKSPACE_DB_NAME));
  obj.insert("updatedAt".to_string(), serde_json::json!(now));
  obj.insert("remoteFormat".to_string(), serde_json::json!(REMOTE_WORKSPACE_FORMAT));
  obj.insert("localMetaFile".to_string(), serde_json::json!(ctx.local_meta_file));
  obj.insert("localDbFile".to_string(), serde_json::json!(ctx.local_db_file));
  obj.insert("sync".to_string(), serde_json::json!({
    "format": REMOTE_WORKSPACE_FORMAT,
    "workspaceKind": ctx.kind.clone(),
  }));
  meta
}

fn adapt_remote_workspace_json_for_local(remote_meta: &serde_json::Value, ctx: &LocalSyncContext) -> serde_json::Value {
  let mut meta = remote_meta.clone();
  if !meta.is_object() {
    meta = serde_json::json!({});
  }

  let obj = meta.as_object_mut().unwrap();
  obj.insert("dbFile".to_string(), serde_json::json!(ctx.local_db_file));
  obj.insert("updatedAt".to_string(), serde_json::json!(chrono::Utc::now().timestamp_millis()));
  obj.insert("kind".to_string(), serde_json::json!(if ctx.kind == "workspace" { "workspace" } else { "project" }));
  meta
}

fn join_base(base: &str, suffix: &str) -> String {
  let b = base.trim_end_matches('/');
  let s = suffix.trim_start_matches('/');
  format!("{b}/{s}")
}

async fn dav_mkcol(client: &reqwest::Client, url: &str, auth: &str) -> Result<(), String> {
  let res = client
    .request(reqwest::Method::from_bytes(b"MKCOL").unwrap(), url)
    .header("Authorization", auth)
    .send()
    .await
    .map_err(|e| format!("MKCOL failed: {e}"))?;
  let status = res.status();
  if status.as_u16() == 201 || status.as_u16() == 405 {
    return Ok(());
  }
  let t = res.text().await.unwrap_or_default();
  Err(format!("MKCOL {url} -> {status} {t}"))
}

async fn dav_get_bytes(client: &reqwest::Client, url: &str, auth: &str) -> Result<Vec<u8>, String> {
  let res = client
    .get(url)
    .header("Authorization", auth)
    .send()
    .await
    .map_err(|e| format!("GET failed: {e}"))?;
  let status = res.status();
  if status.as_u16() == 404 {
    return Err("NOT_FOUND".to_string());
  }
  if !status.is_success() {
    let t = res.text().await.unwrap_or_default();
    return Err(format!("GET {url} -> {status} {t}"));
  }
  let b = res.bytes().await.map_err(|e| format!("GET bytes failed: {e}"))?;
  Ok(b.to_vec())
}

async fn dav_put_bytes(client: &reqwest::Client, url: &str, auth: &str, bytes: Vec<u8>, content_type: &str) -> Result<(), String> {
  let res = client
    .put(url)
    .header("Authorization", auth)
    .header("Content-Type", content_type)
    .body(bytes)
    .send()
    .await
    .map_err(|e| format!("PUT failed: {e}"))?;
  let status = res.status();
  if !status.is_success() {
    let t = res.text().await.unwrap_or_default();
    return Err(format!("PUT {url} -> {status} {t}"));
  }
  Ok(())
}

async fn dav_delete(client: &reqwest::Client, url: &str, auth: &str) -> Result<(), String> {
  let res = client
    .delete(url)
    .header("Authorization", auth)
    .send()
    .await
    .map_err(|e| format!("DELETE failed: {e}"))?;
  let status = res.status();
  if status.as_u16() == 404 || status.is_success() {
    return Ok(());
  }
  let t = res.text().await.unwrap_or_default();
  Err(format!("DELETE {url} -> {status} {t}"))
}

async fn dav_move(client: &reqwest::Client, from_url: &str, to_url: &str, auth: &str) -> Result<(), String> {
  let res = client
    .request(reqwest::Method::from_bytes(b"MOVE").unwrap(), from_url)
    .header("Authorization", auth)
    .header("Destination", to_url)
    .header("Overwrite", "T")
    .send()
    .await
    .map_err(|e| format!("MOVE failed: {e}"))?;
  let status = res.status();
  if !status.is_success() {
    let t = res.text().await.unwrap_or_default();
    return Err(format!("MOVE {from_url} -> {status} {t}"));
  }
  Ok(())
}

async fn read_remote_lock(client: &reqwest::Client, lock_url: &str, auth: &str) -> Result<Option<LockFileV1>, String> {
  match dav_get_bytes(client, lock_url, auth).await {
    Ok(bytes) => Ok(serde_json::from_slice::<LockFileV1>(&bytes).ok()),
    Err(e) if e == "NOT_FOUND" => Ok(None),
    Err(e) => Err(e),
  }
}

async fn write_remote_lock(client: &reqwest::Client, lock_url: &str, auth: &str, lock: &LockFileV1) -> Result<(), String> {
  let txt = serde_json::to_vec(lock).map_err(|e| format!("Lock encode failed: {e}"))?;
  dav_put_bytes(client, lock_url, auth, txt, "application/json").await
}

async fn acquire_lock(client: &reqwest::Client, lock_url: &str, auth: &str, client_id: &str, workspace_kind: &str, ttl_ms: i64) -> Result<Option<LockFileV1>, String> {
  let now = chrono::Utc::now().timestamp_millis();
  if let Some(lock) = read_remote_lock(client, lock_url, auth).await? {
    if lock.client_id != client_id && now < lock.expires_at {
      return Ok(None);
    }
  }

  let lock = LockFileV1 {
    version: 1,
    format: REMOTE_WORKSPACE_FORMAT.to_string(),
    client_id: client_id.to_string(),
    workspace_kind: workspace_kind.to_string(),
    created_at: now,
    heartbeat_at: now,
    expires_at: now + ttl_ms,
  };
  write_remote_lock(client, lock_url, auth, &lock).await?;
  Ok(Some(lock))
}

async fn renew_lock(client: &reqwest::Client, lock_url: &str, auth: &str, lock: &mut LockFileV1, ttl_ms: i64) -> Result<(), String> {
  let now = chrono::Utc::now().timestamp_millis();
  lock.heartbeat_at = now;
  lock.expires_at = now + ttl_ms;
  write_remote_lock(client, lock_url, auth, lock).await
}

fn make_sync_state(now: i64, sha256: String, client_id: String, ctx: &LocalSyncContext) -> SyncStateV1 {
  SyncStateV1 {
    version: 1,
    format: REMOTE_WORKSPACE_FORMAT.to_string(),
    last_modified: now,
    sha256,
    client_id,
    workspace_kind: ctx.kind.clone(),
    db_file: WORKSPACE_DB_NAME.to_string(),
    metadata_file: WORKSPACE_JSON_NAME.to_string(),
  }
}

fn finish_sync_response(
  success: bool,
  error: Option<String>,
  conflict: bool,
  remote_state: Option<serde_json::Value>,
  local_state: Option<serde_json::Value>,
  conflict_paths: Option<serde_json::Value>,
  db_base64: Option<String>,
  applied: Option<bool>,
  workspace_kind: Option<String>,
) -> WebDavSyncResponse {
  WebDavSyncResponse {
    success,
    error,
    conflict,
    remote_state,
    local_state,
    conflict_paths,
    db_base64,
    applied,
    workspace_kind,
  }
}

#[tauri::command]
async fn webdav_sync(args: WebDavSyncArgs) -> Result<WebDavSyncResponse, String> {
  let auth = format!(
    "Basic {}",
    base64::engine::general_purpose::STANDARD.encode(format!("{}:{}", args.user, args.pass))
  );
  let client = reqwest::Client::new();

  let slug = args.slug.trim().to_string();
  if slug.is_empty() {
    return Ok(finish_sync_response(false, Some("Missing slug".to_string()), false, None, None, None, None, None, None));
  }

  let base = args.url.trim().trim_end_matches('/').to_string();
  if base.is_empty() {
    return Ok(finish_sync_response(false, Some("Missing WebDAV url".to_string()), false, None, None, None, None, None, None));
  }

  let project_root = std::path::PathBuf::from(&args.project_path);
  let local_ctx = detect_local_sync_context(&project_root)?;
  ensure_dir(&local_ctx.sync_dir)?;
  ensure_dir(&local_ctx.backups_dir)?;
  ensure_dir(&local_ctx.conflicts_dir)?;

  let remote_root = join_base(&base, &format!("RentikProSync/{slug}"));
  let remote_state_url = join_base(&remote_root, "state.json");
  let remote_lock_url = join_base(&remote_root, "lock.json");
  let remote_db_url = join_base(&remote_root, WORKSPACE_DB_NAME);
  let remote_meta_url = join_base(&remote_root, WORKSPACE_JSON_NAME);

  // ensure dirs
  dav_mkcol(&client, &join_base(&base, "RentikProSync"), &auth).await.ok();
  dav_mkcol(&client, &remote_root, &auth).await.ok();

  let local_state_path = local_ctx.sync_dir.join("state.json");
  let local_meta = read_local_metadata(&local_ctx, &slug);
  let remote_workspace_meta = build_remote_workspace_json(&local_meta, &local_ctx);

  let local_state: Option<SyncStateV1> = read_json_file(&local_state_path);

  let remote_state: Option<SyncStateV1> = match dav_get_bytes(&client, &remote_state_url, &auth).await {
    Ok(b) => serde_json::from_slice(&b).ok(),
    Err(e) if e == "NOT_FOUND" => None,
    Err(e) => return Ok(finish_sync_response(false, Some(e), false, None, local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))),
  };

  let remote_meta_json: Option<serde_json::Value> = match dav_get_bytes(&client, &remote_meta_url, &auth).await {
    Ok(bytes) => serde_json::from_slice::<serde_json::Value>(&bytes).ok(),
    Err(e) if e == "NOT_FOUND" => None,
    Err(e) => return Ok(finish_sync_response(false, Some(e), false, remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))),
  };

  // Acquire lock
  let lock = acquire_lock(&client, &remote_lock_url, &auth, &args.client_id, &local_ctx.kind, 120_000).await?;
  if lock.is_none() {
    return Ok(finish_sync_response(false, Some("Remote locked by another client".to_string()), false, remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone())));
  }
  let mut held_lock = lock.unwrap();

  let now = chrono::Utc::now().timestamp_millis();
  let local_db_bytes = match base64::engine::general_purpose::STANDARD.decode(args.local_db_base64.as_bytes()) {
    Ok(b) => b,
    Err(e) => {
      let _ = dav_delete(&client, &remote_lock_url, &auth).await;
      return Ok(finish_sync_response(false, Some(format!("Invalid local DB base64: {e}")), false, remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone())));
    }
  };
  let local_sha = sha256_hex(&local_db_bytes);

  let finish = |resp: WebDavSyncResponse| async {
    let _ = dav_delete(&client, &remote_lock_url, &auth).await;
    resp
  };

  if args.mode == "up" {
    let mut no_op = false;

    if let Some(rs) = remote_state.clone() {
      match local_state.clone() {
        None => {
          if !args.force {
            let local_copy = local_ctx.conflicts_dir.join(format!("local-{}-{}.sqlite", now, &local_sha[..8]));
            if let Err(e) = std::fs::write(&local_copy, &local_db_bytes) {
              return Ok(finish(finish_sync_response(false, Some(format!("Failed writing local conflict copy: {e}")), false, serde_json::to_value(rs).ok(), None, None, None, None, Some(local_ctx.kind.clone()))).await);
            }
            let remote_copy_path = local_ctx.conflicts_dir.join(format!("remote-{}-{}.sqlite", now, &rs.sha256[..8]));
            if let Ok(remote_db) = dav_get_bytes(&client, &remote_db_url, &auth).await {
              let _ = std::fs::write(&remote_copy_path, &remote_db);
            }
            return Ok(finish(finish_sync_response(false, Some("Conflict: remote has data but local has no sync state (use Download or Force Upload)".to_string()), true, serde_json::to_value(rs).ok(), None, serde_json::to_value(serde_json::json!({
              "localCopy": local_copy.to_string_lossy().to_string(),
              "remoteCopy": remote_copy_path.to_string_lossy().to_string()
            })).ok(), None, None, Some(local_ctx.kind.clone()))).await);
          }
        }
        Some(ls) => {
          let local_changed = local_sha != ls.sha256;
          let remote_changed = rs.sha256 != ls.sha256;

          if !local_changed && !remote_changed {
            no_op = true;
          } else if remote_changed && !local_changed && !args.force {
            let remote_copy_path = local_ctx.conflicts_dir.join(format!("remote-{}-{}.sqlite", now, &rs.sha256[..8]));
            if let Ok(remote_db) = dav_get_bytes(&client, &remote_db_url, &auth).await {
              let _ = std::fs::write(&remote_copy_path, &remote_db);
            }
            return Ok(finish(finish_sync_response(false, Some("Conflict: remote changed since last sync (download first or Force Upload)".to_string()), true, serde_json::to_value(rs).ok(), serde_json::to_value(ls).ok(), serde_json::to_value(serde_json::json!({
              "remoteCopy": remote_copy_path.to_string_lossy().to_string()
            })).ok(), None, None, Some(local_ctx.kind.clone()))).await);
          } else if local_changed && remote_changed && !args.force {
            let local_copy = local_ctx.conflicts_dir.join(format!("local-{}-{}.sqlite", now, &local_sha[..8]));
            if let Err(e) = std::fs::write(&local_copy, &local_db_bytes) {
              return Ok(finish(finish_sync_response(false, Some(format!("Failed writing local conflict copy: {e}")), false, serde_json::to_value(rs).ok(), serde_json::to_value(ls).ok(), None, None, None, Some(local_ctx.kind.clone()))).await);
            }

            let remote_copy_path = local_ctx.conflicts_dir.join(format!("remote-{}-{}.sqlite", now, &rs.sha256[..8]));
            if let Ok(remote_db) = dav_get_bytes(&client, &remote_db_url, &auth).await {
              let _ = std::fs::write(&remote_copy_path, &remote_db);
            }

            return Ok(finish(finish_sync_response(false, Some("Conflict: both local and remote changed".to_string()), true, serde_json::to_value(rs).ok(), serde_json::to_value(ls).ok(), serde_json::to_value(serde_json::json!({
              "localCopy": local_copy.to_string_lossy().to_string(),
              "remoteCopy": remote_copy_path.to_string_lossy().to_string()
            })).ok(), None, None, Some(local_ctx.kind.clone()))).await);
          }
        }
      }
    }

    if no_op {
      if let Some(rs) = remote_state.clone() {
        write_json_file(&local_state_path, &rs).ok();
        let local_workspace_meta = adapt_remote_workspace_json_for_local(&remote_workspace_meta, &local_ctx);
        write_json_file(&local_ctx.meta_path, &local_workspace_meta).ok();
        return Ok(finish(finish_sync_response(true, None, false, serde_json::to_value(rs.clone()).ok(), serde_json::to_value(rs).ok(), None, None, Some(false), Some(local_ctx.kind.clone()))).await);
      }
    }

    if let Err(e) = atomic_write(&local_ctx.db_path, &local_db_bytes) {
      return Ok(finish(finish_sync_response(false, Some(format!("Failed writing local {}: {e}", local_ctx.local_db_file)), false, remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
    }
    let local_workspace_meta = adapt_remote_workspace_json_for_local(&remote_workspace_meta, &local_ctx);
    if let Err(e) = write_json_file(&local_ctx.meta_path, &local_workspace_meta) {
      return Ok(finish(finish_sync_response(false, Some(format!("Failed writing local metadata: {e}")), false, remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
    }

    renew_lock(&client, &remote_lock_url, &auth, &mut held_lock, 120_000).await.ok();

    // upload temp then move
    let tmp_name = format!("{}.uploading.{}.{}", WORKSPACE_DB_NAME, args.client_id, now);
    let tmp_url = join_base(&remote_root, &tmp_name);
    if let Err(e) = dav_put_bytes(&client, &tmp_url, &auth, local_db_bytes.clone(), "application/octet-stream").await {
      return Ok(finish(finish_sync_response(false, Some(e), false, remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
    }
    if let Err(e) = dav_move(&client, &tmp_url, &remote_db_url, &auth).await {
      return Ok(finish(finish_sync_response(false, Some(e), false, remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
    }

    let meta_tmp_name = format!("{}.uploading.{}.{}", WORKSPACE_JSON_NAME, args.client_id, now);
    let meta_tmp_url = join_base(&remote_root, &meta_tmp_name);
    let meta_bytes = match serde_json::to_vec_pretty(&remote_workspace_meta) {
      Ok(bytes) => bytes,
      Err(e) => {
        return Ok(finish(finish_sync_response(false, Some(format!("Workspace metadata encode failed: {e}")), false, remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
      }
    };
    if let Err(e) = dav_put_bytes(&client, &meta_tmp_url, &auth, meta_bytes, "application/json").await {
      return Ok(finish(finish_sync_response(false, Some(e), false, remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
    }
    if let Err(e) = dav_move(&client, &meta_tmp_url, &remote_meta_url, &auth).await {
      return Ok(finish(finish_sync_response(false, Some(e), false, remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
    }

    renew_lock(&client, &remote_lock_url, &auth, &mut held_lock, 120_000).await.ok();

    let new_state = make_sync_state(now, local_sha.clone(), args.client_id.clone(), &local_ctx);
    let state_bytes = serde_json::to_vec(&new_state).map_err(|e| format!("State encode failed: {e}"))?;
    if let Err(e) = dav_put_bytes(&client, &remote_state_url, &auth, state_bytes, "application/json").await {
      return Ok(finish(finish_sync_response(false, Some(e), false, remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
    }
    if let Err(e) = write_json_file(&local_state_path, &new_state) {
      return Ok(finish(finish_sync_response(false, Some(e), false, serde_json::to_value(new_state.clone()).ok(), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
    }

    return Ok(finish(finish_sync_response(true, None, false, serde_json::to_value(new_state.clone()).ok(), serde_json::to_value(new_state).ok(), None, None, Some(true), Some(local_ctx.kind.clone()))).await);
  }

  // mode down
  if remote_state.is_none() {
    return Ok(finish(finish_sync_response(true, None, false, None, local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, Some(false), Some(local_ctx.kind.clone()))).await);
  }

  let rs = remote_state.clone().unwrap();
  if !args.force {
    if let Some(ls) = local_state.clone() {
      let local_changed = local_sha != ls.sha256;
      let remote_changed = rs.sha256 != ls.sha256;

      if local_changed && !remote_changed {
        // local is ahead; downloading would discard changes
        let local_copy = local_ctx.conflicts_dir.join(format!("local-{}-{}.sqlite", now, &local_sha[..8]));
        if let Err(e) = std::fs::write(&local_copy, &local_db_bytes) {
          return Ok(finish(finish_sync_response(false, Some(format!("Failed writing local conflict copy: {e}")), false, serde_json::to_value(rs).ok(), serde_json::to_value(ls).ok(), None, None, None, Some(local_ctx.kind.clone()))).await);
        }
        return Ok(finish(finish_sync_response(false, Some("Conflict: local changed since last sync (upload first or Force Download)".to_string()), true, serde_json::to_value(rs).ok(), serde_json::to_value(ls).ok(), serde_json::to_value(serde_json::json!({
          "localCopy": local_copy.to_string_lossy().to_string()
        })).ok(), None, None, Some(local_ctx.kind.clone()))).await);
      }

      if local_changed && remote_changed {
        let local_copy = local_ctx.conflicts_dir.join(format!("local-{}-{}.sqlite", now, &local_sha[..8]));
        if let Err(e) = std::fs::write(&local_copy, &local_db_bytes) {
          return Ok(finish(finish_sync_response(false, Some(format!("Failed writing local conflict copy: {e}")), false, serde_json::to_value(rs).ok(), serde_json::to_value(ls).ok(), None, None, None, Some(local_ctx.kind.clone()))).await);
        }
        let remote_copy_path = local_ctx.conflicts_dir.join(format!("remote-{}-{}.sqlite", now, &rs.sha256[..8]));
        if let Ok(remote_db) = dav_get_bytes(&client, &remote_db_url, &auth).await {
          let _ = std::fs::write(&remote_copy_path, &remote_db);
        }
        return Ok(finish(finish_sync_response(false, Some("Conflict: both local and remote changed".to_string()), true, serde_json::to_value(rs).ok(), serde_json::to_value(ls).ok(), serde_json::to_value(serde_json::json!({
          "localCopy": local_copy.to_string_lossy().to_string(),
          "remoteCopy": remote_copy_path.to_string_lossy().to_string()
        })).ok(), None, None, Some(local_ctx.kind.clone()))).await);
      }
    }
  }

  // If remote sha equals local sha, nothing to do.
  if rs.sha256 == local_sha {
    write_json_file(&local_state_path, &rs).ok();
    if let Some(remote_meta) = remote_meta_json.as_ref() {
      let local_meta_json = adapt_remote_workspace_json_for_local(remote_meta, &local_ctx);
      write_json_file(&local_ctx.meta_path, &local_meta_json).ok();
    }
    return Ok(finish(finish_sync_response(true, None, false, serde_json::to_value(rs.clone()).ok(), serde_json::to_value(rs).ok(), None, None, Some(false), Some(local_ctx.kind.clone()))).await);
  }

  // Download, verify, backup, replace
  renew_lock(&client, &remote_lock_url, &auth, &mut held_lock, 120_000).await.ok();
  let remote_db = match dav_get_bytes(&client, &remote_db_url, &auth).await {
    Ok(b) => b,
    Err(e) => {
      return Ok(finish(finish_sync_response(false, Some(e), false, serde_json::to_value(rs).ok(), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
    }
  };
  let downloaded_sha = sha256_hex(&remote_db);
  if downloaded_sha != rs.sha256 {
    return Ok(finish(finish_sync_response(false, Some("Downloaded sha256 mismatch".to_string()), false, serde_json::to_value(rs).ok(), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
  }

  let backup_path = local_ctx.backups_dir.join(format!("local-{}-{}.sqlite", now, &local_sha[..8]));
  if let Err(e) = std::fs::write(&backup_path, &local_db_bytes) {
    return Ok(finish(finish_sync_response(false, Some(format!("Failed writing backup: {e}")), false, serde_json::to_value(rs).ok(), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
  }

  if let Err(e) = atomic_write(&local_ctx.db_path, &remote_db) {
    return Ok(finish(finish_sync_response(false, Some(format!("Failed writing local {}: {e}", local_ctx.local_db_file)), false, serde_json::to_value(rs).ok(), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
  }
  if let Some(remote_meta) = remote_meta_json.as_ref() {
    let local_meta_json = adapt_remote_workspace_json_for_local(remote_meta, &local_ctx);
    if let Err(e) = write_json_file(&local_ctx.meta_path, &local_meta_json) {
      return Ok(finish(finish_sync_response(false, Some(format!("Failed writing local metadata: {e}")), false, serde_json::to_value(rs).ok(), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
    }
  }
  if let Err(e) = write_json_file(&local_state_path, &rs) {
    return Ok(finish(finish_sync_response(false, Some(e), false, serde_json::to_value(rs).ok(), local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), None, None, None, Some(local_ctx.kind.clone()))).await);
  }

  return Ok(finish(finish_sync_response(true, None, false, serde_json::to_value(rs.clone()).ok(), serde_json::to_value(rs.clone()).ok(), None, Some(base64::engine::general_purpose::STANDARD.encode(remote_db)), Some(true), Some(local_ctx.kind.clone()))).await);
}

#[derive(serde::Serialize)]
struct ValidateProjectResult {
  ok: bool,
  error: Option<String>,
  project_json_path: String,
  db_path: String,
}

#[derive(serde::Serialize)]
struct OpenProjectResult {
  project_json: String,
  db_base64: String,
  project_json_path: String,
  db_path: String,
}

#[tauri::command]
fn pick_project_folder() -> Result<Option<String>, String> {
  let folder = rfd::FileDialog::new().pick_folder();
  Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
fn validate_project_folder(path: String) -> Result<ValidateProjectResult, String> {
  let root = std::path::PathBuf::from(&path);
  if !root.exists() {
    return Ok(ValidateProjectResult {
      ok: false,
      error: Some("Folder does not exist".to_string()),
      project_json_path: root.join("project.json").to_string_lossy().to_string(),
      db_path: root.join("db.sqlite").to_string_lossy().to_string(),
    });
  }
  if !root.is_dir() {
    return Ok(ValidateProjectResult {
      ok: false,
      error: Some("Path is not a folder".to_string()),
      project_json_path: root.join("project.json").to_string_lossy().to_string(),
      db_path: root.join("db.sqlite").to_string_lossy().to_string(),
    });
  }

  let (pj, db) = project_paths(&root);
  let pj_ok = pj.exists();
  let db_ok = db.exists();

  let ok = pj_ok && db_ok;
  let error = if ok {
    None
  } else {
    Some(format!(
      "Missing required files: {}{}",
      if !pj_ok { "project.json " } else { "" },
      if !db_ok { "db.sqlite" } else { "" }
    ))
  };

  Ok(ValidateProjectResult {
    ok,
    error,
    project_json_path: pj.to_string_lossy().to_string(),
    db_path: db.to_string_lossy().to_string(),
  })
}

#[tauri::command]
fn open_project_folder(path: String) -> Result<OpenProjectResult, String> {
  let v = validate_project_folder(path.clone())?;
  if !v.ok {
    return Err(v.error.unwrap_or_else(|| "Invalid project folder".to_string()));
  }
  let root = std::path::PathBuf::from(&path);
  let (pj, db) = project_paths(&root);

  let project_json = std::fs::read_to_string(&pj)
    .map_err(|e| format!("Failed reading project.json: {e}"))?;
  let db_bytes = std::fs::read(&db)
    .map_err(|e| format!("Failed reading db.sqlite: {e}"))?;

  let db_base64 = base64::engine::general_purpose::STANDARD.encode(db_bytes);

  Ok(OpenProjectResult {
    project_json,
    db_base64,
    project_json_path: pj.to_string_lossy().to_string(),
    db_path: db.to_string_lossy().to_string(),
  })
}

#[tauri::command]
fn write_project_folder(path: String, project_json: String, db_base64: String, overwrite: bool) -> Result<ValidateProjectResult, String> {
  let root = std::path::PathBuf::from(&path);
  if !root.exists() {
    std::fs::create_dir_all(&root).map_err(|e| format!("Failed to create folder: {e}"))?;
  }
  if !root.is_dir() {
    return Err("Path is not a folder".to_string());
  }

  let (pj, db) = project_paths(&root);

  if !overwrite {
    if pj.exists() {
      return Err("project.json already exists".to_string());
    }
    if db.exists() {
      return Err("db.sqlite already exists".to_string());
    }
  }

  std::fs::write(&pj, project_json.as_bytes())
    .map_err(|e| format!("Failed writing project.json: {e}"))?;

  let db_bytes = base64::engine::general_purpose::STANDARD
    .decode(db_base64.as_bytes())
    .map_err(|e| format!("Invalid db base64: {e}"))?;
  std::fs::write(&db, db_bytes)
    .map_err(|e| format!("Failed writing db.sqlite: {e}"))?;

  validate_project_folder(path)
}
