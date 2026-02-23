import { invoke } from '@tauri-apps/api/core';
import { projectManager } from './projectManager';
import { getLastOpenedProjectPath } from './projectFolderManager';
import { notifyDataChanged } from './dataRefresher';

export type WebDavSyncMode = 'up' | 'down';

export type WebDavSyncConfig = {
  url: string;
  user: string;
  pass: string;
  slug: string;
};

export type WebDavSyncResult = {
  success: boolean;
  error?: string;
  conflict?: boolean;
  remoteState?: any;
  localState?: any;
  conflictPaths?: { localCopy?: string; remoteCopy?: string };
  applied?: boolean;
};

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

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

function sanitizeSlug(raw: string): string {
  const s = (raw || '').trim().toLowerCase();
  return s
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+/, '')
    .replace(/[-_]+$/, '')
    .slice(0, 60) || 'default';
}

function inferSlugFromPath(p: string): string {
  const parts = p.split(/[/\\]/).filter(Boolean);
  return sanitizeSlug(parts[parts.length - 1] || 'default');
}

export async function webdavSync(mode: WebDavSyncMode, cfg: Omit<WebDavSyncConfig, 'slug'> & { slug?: string }, opts?: { force?: boolean }): Promise<WebDavSyncResult> {
  if (!isTauriRuntime()) {
    return { success: false, error: 'WebDAV sync requires Tauri runtime' };
  }

  const projectPath = getLastOpenedProjectPath();
  if (!projectPath) return { success: false, error: 'No project folder path set' };

  const store = projectManager.getStore();
  const dbBytes = store.export();
  const dbBase64 = bytesToBase64(dbBytes);

  const slug = sanitizeSlug(cfg.slug || inferSlugFromPath(projectPath));
  const clientId = localStorage.getItem('rentikpro_sync_client_id') || crypto.randomUUID();
  localStorage.setItem('rentikpro_sync_client_id', clientId);

  const res = await invoke<any>('webdav_sync', {
    mode,
    url: cfg.url,
    user: cfg.user,
    pass: cfg.pass,
    slug,
    projectPath,
    clientId,
    force: !!opts?.force,
    localDbBase64: dbBase64,
  });

  if (res?.dbBase64 && mode === 'down' && res.success) {
    // Apply to in-memory store too
    await store.load(base64ToBytes(res.dbBase64));
    notifyDataChanged('all');
  }

  return res as WebDavSyncResult;
}
