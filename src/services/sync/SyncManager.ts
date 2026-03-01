import { ProjectPackager } from './ProjectPackager';
import { projectManager } from '@/services/projectManager';
import { notifyDataChanged } from '@/services/dataRefresher';
import type { StorageProvider, SyncResult, SyncState } from './types';

const STATE_KEY_PREFIX = 'rp_sync_state_';
const BACKUP_KEY = 'rp_sync_local_backup_b64';

export class SyncManager {
  constructor(private provider: StorageProvider) {}

  async sync(projectId: string, name: string): Promise<SyncResult> {
    if (!this.provider.isConfigured()) {
      return { success: false, direction: 'noop', error: 'Provider no configurado' };
    }

    let localZip: Uint8Array;
    try {
      localZip = await ProjectPackager.export(projectId, name);
    } catch (e: any) {
      this.saveState(projectId, 'error', e?.message ?? 'Export failed');
      return { success: false, direction: 'noop', error: e?.message };
    }

    const { manifest: localManifest } = await ProjectPackager.import(localZip);

    let remoteManifest = null;
    try {
      remoteManifest = await this.provider.getRemoteManifest(projectId);
    } catch { /* no remote yet */ }

    // Last-Write-Wins: local wins if no remote or local is newer/equal
    if (!remoteManifest || localManifest.exportedAt >= remoteManifest.exportedAt) {
      try {
        await this.provider.upload(localZip, projectId);
      } catch (e: any) {
        this.saveState(projectId, 'error', e?.message ?? 'Upload failed');
        return { success: false, direction: 'noop', error: e?.message };
      }
      this.saveState(projectId, 'ok', null);
      return {
        success: true,
        direction: 'up',
        localExportedAt: localManifest.exportedAt,
        remoteExportedAt: remoteManifest?.exportedAt,
      };
    }

    // Remote is newer → download and apply
    let remoteZip: Uint8Array | null = null;
    try {
      remoteZip = await this.provider.download(projectId);
    } catch (e: any) {
      this.saveState(projectId, 'error', e?.message ?? 'Download failed');
      return { success: false, direction: 'noop', error: e?.message };
    }

    if (!remoteZip) {
      this.saveState(projectId, 'error', 'Remote download returned null');
      return { success: false, direction: 'noop', error: 'Remote download failed' };
    }

    // Backup local DB before overwriting
    try {
      const backupBytes = projectManager.getStore().export();
      const b64 = btoa(String.fromCharCode(...backupBytes));
      localStorage.setItem(BACKUP_KEY, b64);
    } catch { /* backup best-effort */ }

    try {
      const { dbBytes } = await ProjectPackager.import(remoteZip);
      await projectManager.getStore().load(dbBytes);
      notifyDataChanged('all');
    } catch (e: any) {
      this.saveState(projectId, 'error', e?.message ?? 'Apply failed');
      return { success: false, direction: 'noop', error: e?.message };
    }

    this.saveState(projectId, 'ok', null, true);
    return {
      success: true,
      direction: 'down',
      conflict: true,
      localExportedAt: localManifest.exportedAt,
      remoteExportedAt: remoteManifest.exportedAt,
    };
  }

  async restoreLocalBackup(projectId: string): Promise<boolean> {
    try {
      const b64 = localStorage.getItem(BACKUP_KEY);
      if (!b64) return false;
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      await projectManager.getStore().load(bytes);
      notifyDataChanged('all');
      localStorage.removeItem(BACKUP_KEY);
      this.saveState(projectId, 'ok', null, false);
      return true;
    } catch {
      return false;
    }
  }

  static loadState(projectId: string): SyncState | null {
    try {
      const raw = localStorage.getItem(`${STATE_KEY_PREFIX}${projectId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private saveState(projectId: string, status: 'ok' | 'error', error: string | null, backup = false): void {
    const s: SyncState = {
      provider: this.provider.id,
      lastSyncAt: Date.now(),
      lastSyncStatus: status,
      lastError: error,
      localBackupAvailable: backup || !!localStorage.getItem(BACKUP_KEY),
      conflictPolicy: 'last-write-wins',
    };
    localStorage.setItem(`${STATE_KEY_PREFIX}${projectId}`, JSON.stringify(s));
  }
}
