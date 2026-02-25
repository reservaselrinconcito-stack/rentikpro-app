import { isTauri } from '../utils/isTauri';
import { SQLiteStore } from './sqliteStore';
import { APP_VERSION } from '../src/version';
import { exists } from "@tauri-apps/plugin-fs";
import { setWorkspaceBootState } from "../src/services/workspaceBootState";

const WORKSPACE_PATH_KEY = 'rp_workspace_path';

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function isICloudPath(p: string) { return p.includes("Mobile Documents/com~apple~CloudDocs"); }
async function waitForExists(path: string, totalMs: number) {
  const start = Date.now();
  while (Date.now() - start < totalMs) {
    try { if (await exists(path)) return true; } catch { }
    await sleep(500);
  }
  return false;
}

function looksLikeSqlite(bytes: Uint8Array): boolean {
  if (!bytes || bytes.byteLength < 16) return false;
  const magic = [83, 81, 76, 105, 116, 101, 32, 102, 111, 114, 109, 97, 116, 32, 51, 0];
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

export type WorkspaceOpenResult = {
  path: string;
  dbBytes: Uint8Array;
  workspaceJson: string;
  dbPath: string;
  workspaceJsonPath: string;
  backupsDir: string;
};

type OpenWorkspaceResultRaw = {
  workspace_json: string;
  db_base64: string;
  db_path: string;
  workspace_json_path: string;
  backups_dir: string;
};

export class WorkspaceManager {
  getWorkspacePath(): string | null {
    try {
      return localStorage.getItem(WORKSPACE_PATH_KEY);
    } catch {
      return null;
    }
  }

  setWorkspacePath(path: string | null): void {
    try {
      if (!path) localStorage.removeItem(WORKSPACE_PATH_KEY);
      else localStorage.setItem(WORKSPACE_PATH_KEY, path);
    } catch {
      // ignore
    }
  }

  isEnabled(): boolean {
    return isTauri();
  }

  private requireTauri(): void {
    if (!isTauri()) throw new Error('WorkspaceManager requiere Tauri runtime');
  }

  private async ensureDirectoryPath(path: string): Promise<string> {
    if (path.endsWith(".sqlite")) {
      const { dirname } = await import('@tauri-apps/api/path');
      return await dirname(path);
    }
    return path;
  }

  async setupWorkspace(path: string): Promise<void> {
    this.requireTauri();
    const wsPath = await this.ensureDirectoryPath(path);

    const { invoke } = await import('@tauri-apps/api/core');
    await invoke<void>('setup_workspace', { path: wsPath });

    // If a valid workspace already exists here, do not overwrite it.
    try {
      await this.openWorkspace(wsPath);
      return;
    } catch {
      // continue with fresh initialization
    }

    // Create a valid SQLite DB from sql.js (frontend) and persist it atomically.
    const store = new SQLiteStore();
    await store.init();
    await store.saveProperty({
      id: 'prop_default',
      name: 'Propiedad principal',
      created_at: Date.now(),
      updated_at: Date.now(),
      is_active: true,
      timezone: 'Europe/Madrid',
      currency: 'EUR',
    } as any);
    const dbBytes = store.export();
    await this.saveWorkspace(wsPath, dbBytes);
  }

  async openWorkspace(path: string): Promise<WorkspaceOpenResult> {
    this.requireTauri();

    const wsPath = await this.ensureDirectoryPath(path);

    // ── Phase 1: VALIDATE_PATH ──
    setWorkspaceBootState({ state: "VALIDATE_PATH", path: wsPath });
    console.warn("[WorkspaceManager] openWorkspace →", wsPath);

    let pathExists = false;
    try { pathExists = await exists(wsPath); } catch { pathExists = false; }

    // ── Phase 2: WAITING_MATERIALIZATION (iCloud lazy download) ──
    if (!pathExists && isICloudPath(wsPath)) {
      const TIMEOUT_MS = 30_000;
      setWorkspaceBootState({
        state: "WAITING_MATERIALIZATION",
        path: wsPath,
        startedAt: Date.now(),
        timeoutMs: TIMEOUT_MS,
      });
      console.warn("[WorkspaceManager] iCloud path not materialized. Waiting up to 30 s…", wsPath);
      pathExists = await waitForExists(wsPath, TIMEOUT_MS);
    }

    if (!pathExists) {
      console.warn("[WorkspaceManager] Path missing after validation:", wsPath);
      setWorkspaceBootState({
        state: "MISSING",
        path: wsPath,
        message: "La carpeta del workspace no existe o iCloud aún no la ha descargado.",
      });
      const err: any = new Error("Workspace folder does not exist");
      err.code = "WORKSPACE_MISSING";
      err.workspacePath = wsPath;
      throw err;
    }

    // ── Phase 3: OPENING_DB ──
    setWorkspaceBootState({ state: "OPENING_DB", path: wsPath });

    const { invoke } = await import("@tauri-apps/api/core");
    let res: OpenWorkspaceResultRaw;

    // Retry strategy: DB may be locked by another process (multi-device sync).
    const MAX_RETRIES = 3;
    let lastError: any = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        res = await invoke<OpenWorkspaceResultRaw>("open_workspace", { path: wsPath });
        lastError = null;
        break;
      } catch (e: any) {
        lastError = e;
        const msg = e?.message || String(e);
        console.warn(`[WorkspaceManager] open_workspace attempt ${attempt}/${MAX_RETRIES} failed:`, msg);

        // Only retry on lock / busy errors, not on structural errors.
        const isLock = msg.includes("database is locked") || msg.includes("SQLITE_BUSY");
        if (!isLock || attempt === MAX_RETRIES) {
          const err = new Error(msg);
          (err as any).workspacePath = wsPath;
          if (msg.includes("Workspace folder does not exist") || msg.includes("Missing database.sqlite")) {
            (err as any).code = "WORKSPACE_MISSING";
          }
          throw err;
        }
        // Exponential backoff: 500ms, 1s, 2s
        await sleep(500 * Math.pow(2, attempt - 1));
      }
    }

    const dbBytes = base64ToBytes(res!.db_base64);
    if (!looksLikeSqlite(dbBytes)) {
      throw new Error("'database.sqlite' no es un SQLite valido (workspace corrupto)");
    }

    // ── Phase 4: READY ──
    this.setWorkspacePath(wsPath);
    setWorkspaceBootState({ state: "READY", path: wsPath });

    return {
      path: wsPath,
      dbBytes,
      workspaceJson: res!.workspace_json,
      dbPath: res!.db_path,
      workspaceJsonPath: res!.workspace_json_path,
      backupsDir: res!.backups_dir,
    };
  }


  // Switch the active workspace path (Tauri).
  // This validates the folder and ensures required workspace files exist.
  async setActiveWorkspace(path: string): Promise<void> {
    this.requireTauri();
    const wsPath = await this.ensureDirectoryPath(path);
    await this.setupWorkspace(wsPath);
    // Validate workspace and persist rp_workspace_path.
    await this.openWorkspace(wsPath);
  }

  async saveWorkspace(path: string, dbBytes: Uint8Array): Promise<void> {
    this.requireTauri();
    if (!looksLikeSqlite(dbBytes)) {
      throw new Error("No se puede guardar: la base de datos no es un SQLite valido.");
    }
    const { invoke } = await import('@tauri-apps/api/core');
    const dbB64 = bytesToBase64(dbBytes);
    await invoke<void>('save_workspace', {
      path,
      dbB64,
    } as any);
  }

  async saveCurrentWorkspace(dbBytes: Uint8Array): Promise<void> {
    const path = this.getWorkspacePath();
    if (!path) throw new Error('No hay workspace seleccionado');
    await this.saveWorkspace(path, dbBytes);
  }

  async createBackup(): Promise<{ filename: string }> {
    this.requireTauri();
    const path = this.getWorkspacePath();
    if (!path) throw new Error('No hay workspace seleccionado');
    const { invoke } = await import('@tauri-apps/api/core');
    const filename = await invoke<string>('create_backup', { path });
    localStorage.setItem('rentik_last_backup_date', new Date().toISOString());
    return { filename };
  }

  async listBackups(): Promise<string[]> {
    this.requireTauri();
    const path = this.getWorkspacePath();
    if (!path) return [];
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string[]>('list_backups', { path });
  }

  async restoreBackup(name: string): Promise<Uint8Array> {
    this.requireTauri();
    const path = this.getWorkspacePath();
    if (!path) throw new Error('No hay workspace seleccionado');
    const { invoke } = await import('@tauri-apps/api/core');
    const dbBase64 = await invoke<string>('restore_backup', { path, backupName: name });
    const dbBytes = base64ToBytes(dbBase64);
    if (!looksLikeSqlite(dbBytes)) {
      throw new Error('Backup restaurado pero la base de datos resultante es invalida.');
    }
    localStorage.setItem('rentik_last_restore_date', new Date().toISOString());
    return dbBytes;
  }

  async resetWorkspace(): Promise<void> {
    this.requireTauri();
    const path = this.getWorkspacePath();
    if (!path) throw new Error('No hay workspace seleccionado');
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke<void>('reset_workspace', { path });

    // Recreate a valid DB from frontend (sql.js) and persist.
    const store = new SQLiteStore();
    await store.init();
    await store.saveProperty({
      id: 'prop_default',
      name: 'Propiedad principal',
      created_at: Date.now(),
      updated_at: Date.now(),
      is_active: true,
      timezone: 'Europe/Madrid',
      currency: 'EUR',
    } as any);
    const dbBytes = store.export();
    await this.saveWorkspace(path, dbBytes);
  }

  async importExternalBackupZip(file: File): Promise<Uint8Array> {
    // External import remains frontend-side (File API). We then persist into the workspace.
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    const dbFile = zip.file('database.sqlite') || zip.file('db.sqlite');
    if (!dbFile) {
      throw new Error("El archivo no contiene 'database.sqlite'.");
    }
    const dbBytes = await dbFile.async('uint8array');
    if (!looksLikeSqlite(dbBytes)) {
      throw new Error("'database.sqlite' no parece un archivo SQLite valido.");
    }

    await this.saveCurrentWorkspace(dbBytes);
    localStorage.setItem('rentik_last_restore_date', new Date().toISOString());
    return dbBytes;
  }

  getWorkspaceDisplayName(): string {
    const p = this.getWorkspacePath();
    if (!p) return 'Workspace';
    const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts[parts.length - 1] || p;
  }

  getDefaultWorkspaceJson(): any {
    return {
      schema: 1,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      appVersion: APP_VERSION,
      kind: 'workspace',
      dbFile: 'database.sqlite',
    };
  }
}

export const workspaceManager = new WorkspaceManager();
