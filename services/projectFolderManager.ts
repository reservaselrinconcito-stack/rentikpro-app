// Native imports moved to dynamic for web compatibility


import { APP_VERSION } from '../src/version';
import { projectManager } from './projectManager';
import { SQLiteStore } from './sqliteStore';
import { isTauri } from '../utils/isTauri';

export type ProjectFolderMeta = {
  name: string;
};

export type ProjectContext = {
  rootPath: string;
  projectJsonPath: string;
  dbPath: string;
  name: string;
  openedAt: number;
};

type ValidateProjectResult = {
  ok: boolean;
  error: string | null;
  project_json_path: string;
  db_path: string;
};

type OpenProjectResult = {
  project_json: string;
  db_base64: string;
  project_json_path: string;
  db_path: string;
};

const LAST_PROJECT_PATH_KEY = 'rp_last_project_path';
const LAST_PROJECT_JSON_KEY = 'rp_last_project_json';

function isTauriRuntime(): boolean {
  return isTauri();
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function ensureBlankDbBytes(meta: ProjectFolderMeta): Promise<Uint8Array> {
  // Use a fresh store instance so we don't mutate the currently loaded project on failure.
  const store = new SQLiteStore();
  await store.init();

  // Seed minimum defaults expected by the UI.
  await store.saveProperty({
    id: 'prop_default',
    name: meta.name || 'Propiedad principal',
    created_at: Date.now(),
    updated_at: Date.now(),
    is_active: true,
    timezone: 'Europe/Madrid',
    currency: 'EUR',
  } as any);

  return store.export();
}

export async function validateProject(path: string): Promise<{ ok: boolean; error?: string }> {
  if (!isTauriRuntime()) {
    return { ok: false, error: 'ProjectFolderManager requires Tauri runtime' };
  }
  const { invoke } = await import('@tauri-apps/api/core');
  const res = await invoke<ValidateProjectResult>('validate_project_folder', { path });
  return res.ok ? { ok: true } : { ok: false, error: res.error || 'Invalid project folder' };
}

export async function openProject(path: string): Promise<ProjectContext> {
  if (!isTauriRuntime()) {
    throw new Error('ProjectFolderManager requires Tauri runtime');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  const res = await invoke<OpenProjectResult>('open_project_folder', { path });
  const dbBytes = base64ToBytes(res.db_base64);

  // Store path early (needed for syncDown to locate the folder).
  localStorage.setItem(LAST_PROJECT_PATH_KEY, path);
  localStorage.setItem(LAST_PROJECT_JSON_KEY, res.project_json);

  let projectName = 'Proyecto';
  let projectId = '';
  let projectJsonObj: any = null;
  try {
    projectJsonObj = JSON.parse(res.project_json);
    projectName = projectJsonObj?.name || projectName;
    projectId = (projectJsonObj?.id || '').trim();
  } catch {
    // ignore
  }

  // Ensure folder projects have a stable ID (used for WebDAV slug across devices).
  if (!projectId) {
    projectId = crypto.randomUUID();
    const updated = {
      ...(projectJsonObj && typeof projectJsonObj === 'object' ? projectJsonObj : {}),
      schema: projectJsonObj?.schema || 1,
      id: projectId,
      name: projectName,
      updatedAt: Date.now(),
      appVersion: APP_VERSION,
      dbFile: 'db.sqlite',
    };
    const updatedJson = JSON.stringify(updated, null, 2);
    const { invoke } = await import('@tauri-apps/api/core');
     await invoke<ValidateProjectResult>('write_project_folder', {
       path,
       projectJson: updatedJson,
       dbBase64: res.db_base64,
       overwrite: true,
     } as any);

    localStorage.setItem(LAST_PROJECT_JSON_KEY, updatedJson);
  }

  // Load DB into the app's store (do NOT set active_project_id; path is the desktop source-of-truth).
  await projectManager.loadProjectFromSqliteBytes(dbBytes, {
    projectId,
    name: projectName,
    mode: 'real',
    setAsActive: false,
    startAutoSave: true,
  });

  // Best-effort auto sync DOWN on open (if enabled in settings).
  try {
    const { syncCoordinator } = await import('./syncCoordinator');
    // Never block UI on network.
    syncCoordinator.syncDown().catch(() => null);
  } catch {
    // ignore
  }

  return {
    rootPath: path,
    projectJsonPath: res.project_json_path,
    dbPath: res.db_path,
    name: projectName,
    openedAt: Date.now(),
  };
}

export async function createProject(path: string, meta: ProjectFolderMeta): Promise<ProjectContext> {
  if (!isTauriRuntime()) {
    throw new Error('ProjectFolderManager requires Tauri runtime');
  }

  const dbBytes = await ensureBlankDbBytes(meta);
  const now = Date.now();
  const id = crypto.randomUUID();
  const projectJson = JSON.stringify({
    schema: 1,
    id,
    name: meta.name,
    createdAt: now,
    updatedAt: now,
    appVersion: APP_VERSION,
    dbFile: 'db.sqlite',
  }, null, 2);

  const { invoke } = await import('@tauri-apps/api/core');

  await invoke<ValidateProjectResult>('write_project_folder', {
    path,
    projectJson: projectJson,
    dbBase64: bytesToBase64(dbBytes),
    overwrite: false,
  } as any);

  localStorage.setItem(LAST_PROJECT_JSON_KEY, projectJson);

  return openProject(path);
}

export async function pickProjectFolder(): Promise<string | null> {
  if (!isTauriRuntime()) return null;

  // Prefer Tauri dialog plugin for desktop apps.
  // Returns a string path in most cases when directory=true and multiple=false.
  const dialog = await import('@tauri-apps/plugin-dialog');
  const picked = await dialog.open({
    directory: true,
    multiple: false,
    title: 'Selecciona carpeta de proyecto',
  });
  if (!picked) return null;
  if (Array.isArray(picked)) return picked[0] || null;
  return picked;
}

export function getLastOpenedProjectPath(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_PATH_KEY);
  } catch {
    return null;
  }
}
