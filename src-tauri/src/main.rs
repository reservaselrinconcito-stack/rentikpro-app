#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use base64::Engine;
use sha2::Digest;
use chrono;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      pick_project_folder,
      validate_project_folder,
      open_project_folder,
      write_project_folder,
      webdav_sync
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
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
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SyncStateV1 {
  version: u32,
  last_modified: i64,
  sha256: String,
  client_id: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LockFileV1 {
  version: u32,
  client_id: String,
  created_at: i64,
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

async fn acquire_lock(client: &reqwest::Client, lock_url: &str, auth: &str, client_id: &str, ttl_ms: i64) -> Result<bool, String> {
  let now = chrono::Utc::now().timestamp_millis();
  let existing = dav_get_bytes(client, lock_url, auth).await;
  if let Ok(bytes) = existing {
    if let Ok(lock) = serde_json::from_slice::<LockFileV1>(&bytes) {
      if lock.client_id != client_id && now < lock.expires_at {
        return Ok(false);
      }
    }
  }

  let lock = LockFileV1 {
    version: 1,
    client_id: client_id.to_string(),
    created_at: now,
    expires_at: now + ttl_ms,
  };
  let txt = serde_json::to_vec(&lock).map_err(|e| format!("Lock encode failed: {e}"))?;
  dav_put_bytes(client, lock_url, auth, txt, "application/json").await?;
  Ok(true)
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
    return Ok(WebDavSyncResponse { success: false, error: Some("Missing slug".to_string()), conflict: false, remote_state: None, local_state: None, conflict_paths: None, db_base64: None, applied: None });
  }

  let base = args.url.trim().trim_end_matches('/').to_string();
  if base.is_empty() {
    return Ok(WebDavSyncResponse { success: false, error: Some("Missing WebDAV url".to_string()), conflict: false, remote_state: None, local_state: None, conflict_paths: None, db_base64: None, applied: None });
  }

  let remote_root = join_base(&base, &format!("RentikProSync/{slug}"));
  let remote_sync = join_base(&remote_root, "sync");
  let remote_state_url = join_base(&remote_sync, "state.json");
  let remote_lock_url = join_base(&remote_sync, "lock.json");
  let remote_db_url = join_base(&remote_root, "db.sqlite");

  // ensure dirs
  dav_mkcol(&client, &join_base(&base, "RentikProSync"), &auth).await.ok();
  dav_mkcol(&client, &remote_root, &auth).await.ok();
  dav_mkcol(&client, &remote_sync, &auth).await.ok();

  // local paths
  let project_root = std::path::PathBuf::from(&args.project_path);
  let sync_dir = project_root.join("sync");
  let backups_dir = sync_dir.join("backups");
  let conflicts_dir = sync_dir.join("conflicts");
  ensure_dir(&backups_dir)?;
  ensure_dir(&conflicts_dir)?;

  let local_state_path = sync_dir.join("state.json");

  let local_state: Option<SyncStateV1> = read_json_file(&local_state_path);

  let remote_state: Option<SyncStateV1> = match dav_get_bytes(&client, &remote_state_url, &auth).await {
    Ok(b) => serde_json::from_slice(&b).ok(),
    Err(e) if e == "NOT_FOUND" => None,
    Err(e) => return Ok(WebDavSyncResponse { success: false, error: Some(e), conflict: false, remote_state: None, local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: None }),
  };

  // Acquire lock
  let lock_ok = acquire_lock(&client, &remote_lock_url, &auth, &args.client_id, 120_000).await?;
  if !lock_ok {
    return Ok(WebDavSyncResponse { success: false, error: Some("Remote locked by another client".to_string()), conflict: false, remote_state: remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: None });
  }

  let now = chrono::Utc::now().timestamp_millis();
  let local_db_bytes = match base64::engine::general_purpose::STANDARD.decode(args.local_db_base64.as_bytes()) {
    Ok(b) => b,
    Err(e) => {
      let _ = dav_delete(&client, &remote_lock_url, &auth).await;
      return Ok(WebDavSyncResponse {
        success: false,
        error: Some(format!("Invalid local DB base64: {e}")),
        conflict: false,
        remote_state: remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()),
        local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()),
        conflict_paths: None,
        db_base64: None,
        applied: None,
      });
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
            let local_copy = conflicts_dir.join(format!("local-{}-{}.sqlite", now, &local_sha[..8]));
            if let Err(e) = std::fs::write(&local_copy, &local_db_bytes) {
              return Ok(finish(WebDavSyncResponse { success: false, error: Some(format!("Failed writing local conflict copy: {e}")), conflict: false, remote_state: serde_json::to_value(rs).ok(), local_state: None, conflict_paths: None, db_base64: None, applied: None }).await);
            }
            let remote_copy_path = conflicts_dir.join(format!("remote-{}-{}.sqlite", now, &rs.sha256[..8]));
            if let Ok(remote_db) = dav_get_bytes(&client, &remote_db_url, &auth).await {
              let _ = std::fs::write(&remote_copy_path, &remote_db);
            }
            return Ok(finish(WebDavSyncResponse {
              success: false,
              error: Some("Conflict: remote has data but local has no sync state (use Download or Force Upload)".to_string()),
              conflict: true,
              remote_state: serde_json::to_value(rs).ok(),
              local_state: None,
              conflict_paths: serde_json::to_value(serde_json::json!({
                "localCopy": local_copy.to_string_lossy().to_string(),
                "remoteCopy": remote_copy_path.to_string_lossy().to_string()
              })).ok(),
              db_base64: None,
              applied: None,
            }).await);
          }
        }
        Some(ls) => {
          let local_changed = local_sha != ls.sha256;
          let remote_changed = rs.sha256 != ls.sha256;

          if !local_changed && !remote_changed {
            no_op = true;
          } else if remote_changed && !local_changed && !args.force {
            let remote_copy_path = conflicts_dir.join(format!("remote-{}-{}.sqlite", now, &rs.sha256[..8]));
            if let Ok(remote_db) = dav_get_bytes(&client, &remote_db_url, &auth).await {
              let _ = std::fs::write(&remote_copy_path, &remote_db);
            }
            return Ok(finish(WebDavSyncResponse {
              success: false,
              error: Some("Conflict: remote changed since last sync (download first or Force Upload)".to_string()),
              conflict: true,
              remote_state: serde_json::to_value(rs).ok(),
              local_state: serde_json::to_value(ls).ok(),
              conflict_paths: serde_json::to_value(serde_json::json!({
                "remoteCopy": remote_copy_path.to_string_lossy().to_string()
              })).ok(),
              db_base64: None,
              applied: None,
            }).await);
          } else if local_changed && remote_changed && !args.force {
            let local_copy = conflicts_dir.join(format!("local-{}-{}.sqlite", now, &local_sha[..8]));
            if let Err(e) = std::fs::write(&local_copy, &local_db_bytes) {
              return Ok(finish(WebDavSyncResponse { success: false, error: Some(format!("Failed writing local conflict copy: {e}")), conflict: false, remote_state: serde_json::to_value(rs).ok(), local_state: serde_json::to_value(ls).ok(), conflict_paths: None, db_base64: None, applied: None }).await);
            }

            let remote_copy_path = conflicts_dir.join(format!("remote-{}-{}.sqlite", now, &rs.sha256[..8]));
            if let Ok(remote_db) = dav_get_bytes(&client, &remote_db_url, &auth).await {
              let _ = std::fs::write(&remote_copy_path, &remote_db);
            }

            return Ok(finish(WebDavSyncResponse {
              success: false,
              error: Some("Conflict: both local and remote changed".to_string()),
              conflict: true,
              remote_state: serde_json::to_value(rs).ok(),
              local_state: serde_json::to_value(ls).ok(),
              conflict_paths: serde_json::to_value(serde_json::json!({
                "localCopy": local_copy.to_string_lossy().to_string(),
                "remoteCopy": remote_copy_path.to_string_lossy().to_string()
              })).ok(),
              db_base64: None,
              applied: None,
            }).await);
          }
        }
      }
    }

    if no_op {
      if let Some(rs) = remote_state.clone() {
        write_json_file(&local_state_path, &rs).ok();
        return Ok(finish(WebDavSyncResponse {
          success: true,
          error: None,
          conflict: false,
          remote_state: serde_json::to_value(rs.clone()).ok(),
          local_state: serde_json::to_value(rs).ok(),
          conflict_paths: None,
          db_base64: None,
          applied: Some(false),
        }).await);
      }
    }

    // Write local db.sqlite (so local folder matches pushed version)
    let db_path = project_root.join("db.sqlite");
    if let Err(e) = std::fs::write(&db_path, &local_db_bytes) {
      return Ok(finish(WebDavSyncResponse { success: false, error: Some(format!("Failed writing local db.sqlite: {e}")), conflict: false, remote_state: remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: None }).await);
    }

    // upload temp then move
    let tmp_name = format!("db.sqlite.uploading.{}.{}", args.client_id, now);
    let tmp_url = join_base(&remote_root, &tmp_name);
    if let Err(e) = dav_put_bytes(&client, &tmp_url, &auth, local_db_bytes.clone(), "application/octet-stream").await {
      return Ok(finish(WebDavSyncResponse { success: false, error: Some(e), conflict: false, remote_state: remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: None }).await);
    }
    if let Err(e) = dav_move(&client, &tmp_url, &remote_db_url, &auth).await {
      return Ok(finish(WebDavSyncResponse { success: false, error: Some(e), conflict: false, remote_state: remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: None }).await);
    }

    let new_state = SyncStateV1 {
      version: 1,
      last_modified: now,
      sha256: local_sha.clone(),
      client_id: args.client_id.clone(),
    };
    let state_bytes = serde_json::to_vec(&new_state).map_err(|e| format!("State encode failed: {e}"))?;
    if let Err(e) = dav_put_bytes(&client, &remote_state_url, &auth, state_bytes, "application/json").await {
      return Ok(finish(WebDavSyncResponse { success: false, error: Some(e), conflict: false, remote_state: remote_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: None }).await);
    }
    if let Err(e) = write_json_file(&local_state_path, &new_state) {
      return Ok(finish(WebDavSyncResponse { success: false, error: Some(e), conflict: false, remote_state: serde_json::to_value(new_state.clone()).ok(), local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: None }).await);
    }

    return Ok(finish(WebDavSyncResponse {
      success: true,
      error: None,
      conflict: false,
      remote_state: serde_json::to_value(new_state.clone()).ok(),
      local_state: serde_json::to_value(new_state).ok(),
      conflict_paths: None,
      db_base64: None,
      applied: Some(true),
    }).await);
  }

  // mode down
  if remote_state.is_none() {
    return Ok(finish(WebDavSyncResponse { success: true, error: None, conflict: false, remote_state: None, local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: Some(false) }).await);
  }

  let rs = remote_state.clone().unwrap();
  if !args.force {
    if let Some(ls) = local_state.clone() {
      let local_changed = local_sha != ls.sha256;
      let remote_changed = rs.sha256 != ls.sha256;

      if local_changed && !remote_changed {
        // local is ahead; downloading would discard changes
        let local_copy = conflicts_dir.join(format!("local-{}-{}.sqlite", now, &local_sha[..8]));
        if let Err(e) = std::fs::write(&local_copy, &local_db_bytes) {
          return Ok(finish(WebDavSyncResponse { success: false, error: Some(format!("Failed writing local conflict copy: {e}")), conflict: false, remote_state: serde_json::to_value(rs).ok(), local_state: serde_json::to_value(ls).ok(), conflict_paths: None, db_base64: None, applied: None }).await);
        }
        return Ok(finish(WebDavSyncResponse {
          success: false,
          error: Some("Conflict: local changed since last sync (upload first or Force Download)".to_string()),
          conflict: true,
          remote_state: serde_json::to_value(rs).ok(),
          local_state: serde_json::to_value(ls).ok(),
          conflict_paths: serde_json::to_value(serde_json::json!({
            "localCopy": local_copy.to_string_lossy().to_string()
          })).ok(),
          db_base64: None,
          applied: None,
        }).await);
      }

      if local_changed && remote_changed {
        let local_copy = conflicts_dir.join(format!("local-{}-{}.sqlite", now, &local_sha[..8]));
        if let Err(e) = std::fs::write(&local_copy, &local_db_bytes) {
          return Ok(finish(WebDavSyncResponse { success: false, error: Some(format!("Failed writing local conflict copy: {e}")), conflict: false, remote_state: serde_json::to_value(rs).ok(), local_state: serde_json::to_value(ls).ok(), conflict_paths: None, db_base64: None, applied: None }).await);
        }
        let remote_copy_path = conflicts_dir.join(format!("remote-{}-{}.sqlite", now, &rs.sha256[..8]));
        if let Ok(remote_db) = dav_get_bytes(&client, &remote_db_url, &auth).await {
          let _ = std::fs::write(&remote_copy_path, &remote_db);
        }
        return Ok(finish(WebDavSyncResponse {
          success: false,
          error: Some("Conflict: both local and remote changed".to_string()),
          conflict: true,
          remote_state: serde_json::to_value(rs).ok(),
          local_state: serde_json::to_value(ls).ok(),
          conflict_paths: serde_json::to_value(serde_json::json!({
            "localCopy": local_copy.to_string_lossy().to_string(),
            "remoteCopy": remote_copy_path.to_string_lossy().to_string()
          })).ok(),
          db_base64: None,
          applied: None,
        }).await);
      }
    }
  }

  // If remote sha equals local sha, nothing to do.
  if rs.sha256 == local_sha {
    write_json_file(&local_state_path, &rs).ok();
    return Ok(finish(WebDavSyncResponse { success: true, error: None, conflict: false, remote_state: serde_json::to_value(rs.clone()).ok(), local_state: serde_json::to_value(rs).ok(), conflict_paths: None, db_base64: None, applied: Some(false) }).await);
  }

  // Download, verify, backup, replace
  let remote_db = match dav_get_bytes(&client, &remote_db_url, &auth).await {
    Ok(b) => b,
    Err(e) => {
      return Ok(finish(WebDavSyncResponse { success: false, error: Some(e), conflict: false, remote_state: serde_json::to_value(rs).ok(), local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: None }).await);
    }
  };
  let downloaded_sha = sha256_hex(&remote_db);
  if downloaded_sha != rs.sha256 {
    return Ok(finish(WebDavSyncResponse { success: false, error: Some("Downloaded sha256 mismatch".to_string()), conflict: false, remote_state: serde_json::to_value(rs).ok(), local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: None }).await);
  }

  let backup_path = backups_dir.join(format!("local-{}-{}.sqlite", now, &local_sha[..8]));
  if let Err(e) = std::fs::write(&backup_path, &local_db_bytes) {
    return Ok(finish(WebDavSyncResponse { success: false, error: Some(format!("Failed writing backup: {e}")), conflict: false, remote_state: serde_json::to_value(rs).ok(), local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: None }).await);
  }

  let db_path = project_root.join("db.sqlite");
  if let Err(e) = std::fs::write(&db_path, &remote_db) {
    return Ok(finish(WebDavSyncResponse { success: false, error: Some(format!("Failed writing local db.sqlite: {e}")), conflict: false, remote_state: serde_json::to_value(rs).ok(), local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: None }).await);
  }
  if let Err(e) = write_json_file(&local_state_path, &rs) {
    return Ok(finish(WebDavSyncResponse { success: false, error: Some(e), conflict: false, remote_state: serde_json::to_value(rs).ok(), local_state: local_state.as_ref().and_then(|s| serde_json::to_value(s).ok()), conflict_paths: None, db_base64: None, applied: None }).await);
  }

  return Ok(finish(WebDavSyncResponse {
    success: true,
    error: None,
    conflict: false,
    remote_state: serde_json::to_value(rs.clone()).ok(),
    local_state: serde_json::to_value(rs.clone()).ok(),
    conflict_paths: None,
    db_base64: Some(base64::engine::general_purpose::STANDARD.encode(remote_db)),
    applied: Some(true),
  }).await);
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

fn project_paths(root: &std::path::Path) -> (std::path::PathBuf, std::path::PathBuf) {
  (root.join("project.json"), root.join("db.sqlite"))
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
