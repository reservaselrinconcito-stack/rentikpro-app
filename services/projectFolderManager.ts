import { invoke } from '@tauri-apps/api/core';

import { APP_VERSION } from '../src/version';
import { projectManager } from './projectManager';
import { SQLiteStore } from './sqliteStore';

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

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
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
  const res = await invoke<ValidateProjectResult>('validate_project_folder', { path });
  return res.ok ? { ok: true } : { ok: false, error: res.error || 'Invalid project folder' };
}

export async function openProject(path: string): Promise<ProjectContext> {
  if (!isTauriRuntime()) {
    throw new Error('ProjectFolderManager requires Tauri runtime');
  }
  const res = await invoke<OpenProjectResult>('open_project_folder', { path });
  const dbBytes = base64ToBytes(res.db_base64);

  // Load DB into the app's store (do NOT set active_project_id; path is the desktop source-of-truth).
  await projectManager.loadProjectFromSqliteBytes(dbBytes, {
    projectId: `proj_folder_${btoa(path).replace(/[^a-z0-9]/gi, '').slice(0, 16)}`,
    name: (() => {
      try {
        const j = JSON.parse(res.project_json);
        return j?.name || 'Proyecto';
      } catch {
        return 'Proyecto';
      }
    })(),
    mode: 'real',
    setAsActive: false,
    startAutoSave: false,
  });

  localStorage.setItem(LAST_PROJECT_PATH_KEY, path);

  return {
    rootPath: path,
    projectJsonPath: res.project_json_path,
    dbPath: res.db_path,
    name: (() => {
      try {
        const j = JSON.parse(res.project_json);
        return j?.name || 'Proyecto';
      } catch {
        return 'Proyecto';
      }
    })(),
    openedAt: Date.now(),
  };
}

export async function createProject(path: string, meta: ProjectFolderMeta): Promise<ProjectContext> {
  if (!isTauriRuntime()) {
    throw new Error('ProjectFolderManager requires Tauri runtime');
  }

  const dbBytes = await ensureBlankDbBytes(meta);
  const now = Date.now();
  const projectJson = JSON.stringify({
    schema: 1,
    name: meta.name,
    createdAt: now,
    updatedAt: now,
    appVersion: APP_VERSION,
    dbFile: 'db.sqlite',
  }, null, 2);

  await invoke<ValidateProjectResult>('write_project_folder', {
    path,
    project_json: projectJson,
    db_base64: bytesToBase64(dbBytes),
    overwrite: false,
  } as any);

  return openProject(path);
}

export async function pickProjectFolder(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  const p = await invoke<string | null>('pick_project_folder');
  return p;
}

export function getLastOpenedProjectPath(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_PATH_KEY);
  } catch {
    return null;
  }
}
