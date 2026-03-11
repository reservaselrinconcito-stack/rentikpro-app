import { WebDavService } from './webdavService';
import { projectManager } from './projectManager';
import { securityService } from './security';
import { SyncState } from '../types';
import { logger } from './logger';
import { webdavSync } from './webdavSync';
import { isTauri as isTauriRuntime } from '../utils/isTauri';

export type SyncResult = {
  success: boolean;
  error?: string;
  conflict?: {
    remoteState: SyncState;
    localState: SyncState;
  };
};

export type SyncUiState = 'disabled' | 'syncing' | 'synchronized' | 'local_changes' | 'remote_changes' | 'conflict' | 'read_only' | 'error';

export type SyncStatusSnapshot = {
  state: SyncUiState;
  detail: string;
  isEnabled: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  sourceKind: 'workspace' | 'folder-project' | null;
};

export class SyncCoordinator {
  private dav: WebDavService | null = null;
  private davKey: string | null = null;
  private clientId: string;
  public isSyncing: boolean = false;
  private listeners: ((syncing: boolean) => void)[] = [];
  private statusListeners: ((status: SyncStatusSnapshot) => void)[] = [];
  private syncEnabledCache: boolean = false;
  private status: SyncStatusSnapshot = {
    state: 'disabled',
    detail: 'Sincronizacion desactivada',
    isEnabled: false,
    isSyncing: false,
    lastSyncAt: null,
    sourceKind: null,
  };

  constructor() {
    let cid = localStorage.getItem('rentikpro_sync_client_id');
    if (!cid) {
      cid = crypto.randomUUID();
      localStorage.setItem('rentikpro_sync_client_id', cid);
    }
    this.clientId = cid;
  }

  private getSourceKind(): 'workspace' | 'folder-project' | null {
    return projectManager.getActiveSyncSourceKind();
  }

  private setStatus(next: Partial<SyncStatusSnapshot>): void {
    this.status = {
      ...this.status,
      ...next,
      isSyncing: this.isSyncing,
      sourceKind: next.sourceKind ?? this.getSourceKind(),
    };
    this.statusListeners.forEach((listener) => listener(this.getStatus()));
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.isSyncing));
    this.statusListeners.forEach((listener) => listener(this.getStatus()));
  }

  private async getWebDav(): Promise<WebDavService | null> {
    const store = projectManager.getStore();
    const settings = await store.getSettings();

    if (!settings.webdav_url || !settings.webdav_sync_enabled) {
      this.syncEnabledCache = false;
      this.setStatus({
        state: 'disabled',
        detail: 'Sincronizacion Nextcloud/WebDAV desactivada',
        isEnabled: false,
      });
      return null;
    }

    this.syncEnabledCache = true;
    const nextKey = `${settings.webdav_url}::${settings.webdav_user || ''}::${settings.webdav_pass || ''}`;
    if (!this.dav || this.davKey !== nextKey) {
      this.dav = new WebDavService({
        url: settings.webdav_url,
        user: settings.webdav_user || '',
        pass: settings.webdav_pass || ''
      });
      this.davKey = nextKey;
    }
    return this.dav;
  }

  private isTauriRuntime(): boolean {
    return isTauriRuntime();
  }

  private getRemotePath(): string {
    const projectId = projectManager.getCurrentProjectId() || 'default';
    return `/RentikProSync/${projectId}`;
  }

  private beginSync(detail: string): void {
    this.isSyncing = true;
    this.setStatus({
      state: 'syncing',
      detail,
      isEnabled: this.syncEnabledCache,
    });
    this.notifyListeners();
  }

  private endSync(): void {
    this.isSyncing = false;
    this.notifyListeners();
  }

  private classifyFailure(message: string, conflict?: boolean): { state: SyncUiState; detail: string } {
    if (message.includes('locked by another client') || message.includes('Remote locked')) {
      return { state: 'read_only', detail: 'Solo lectura: otro dispositivo tiene el lock activo' };
    }

    if (message.includes('remote changed since last sync') || message.includes('remote has data but local has no sync state')) {
      return { state: 'remote_changes', detail: 'Cambios remotos detectados en Nextcloud' };
    }

    if (message.includes('local changed since last sync')) {
      return { state: 'local_changes', detail: 'Cambios locales pendientes de subir' };
    }

    if (message.includes('both local and remote changed') || conflict) {
      return { state: 'conflict', detail: 'Conflicto detectado entre local y remoto' };
    }

    return { state: 'error', detail: message || 'Error de sincronizacion' };
  }

  private markSyncSuccess(detail: string): void {
    this.setStatus({
      state: 'synchronized',
      detail,
      isEnabled: this.syncEnabledCache,
      lastSyncAt: Date.now(),
    });
  }

  public subscribe(l: (syncing: boolean) => void) {
    this.listeners.push(l);
    return () => {
      this.listeners = this.listeners.filter(x => x !== l);
    };
  }

  public subscribeStatus(listener: (status: SyncStatusSnapshot) => void) {
    this.statusListeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter(x => x !== listener);
    };
  }

  public getStatus(): SyncStatusSnapshot {
    return {
      ...this.status,
      isSyncing: this.isSyncing,
      sourceKind: this.getSourceKind(),
    };
  }

  public async refreshStatus(): Promise<SyncStatusSnapshot> {
    await this.getWebDav();
    if (!this.syncEnabledCache) {
      return this.getStatus();
    }

    if (!this.getSourceKind()) {
      this.setStatus({
        state: 'disabled',
        detail: 'Abre un workspace local para activar la sincronizacion',
        isEnabled: true,
      });
      return this.getStatus();
    }

    if (this.status.state === 'disabled') {
      this.setStatus({
        state: 'synchronized',
        detail: 'Motor de sincronizacion listo',
        isEnabled: true,
      });
    }

    return this.getStatus();
  }

  public resetStatus(): void {
    this.dav = null;
    this.davKey = null;
    this.syncEnabledCache = false;
    this.setStatus({
      state: 'disabled',
      detail: 'Sin proyecto sincronizado abierto',
      isEnabled: false,
      lastSyncAt: null,
      sourceKind: null,
    });
  }

  public markLocalChange(): void {
    if (this.isSyncing || !this.syncEnabledCache) return;
    if (projectManager.getCurrentMode() !== 'real') return;
    if (!this.getSourceKind()) return;

    if (this.status.state === 'conflict' || this.status.state === 'read_only') return;

    this.setStatus({
      state: 'local_changes',
      detail: 'Cambios locales pendientes de subir',
      isEnabled: true,
    });
  }

  async syncUp(force: boolean = false): Promise<SyncResult> {
    const dav = await this.getWebDav();
    if (!dav) return { success: false, error: 'WebDAV not configured' };

    const settings = await projectManager.getStore().getSettings();

    if (this.isTauriRuntime()) {
      try {
        this.beginSync('Subiendo workspace a Nextcloud...');
        const res = await webdavSync('up', {
          url: settings.webdav_url || '',
          user: settings.webdav_user || '',
          pass: settings.webdav_pass || '',
          slug: projectManager.getCurrentProjectId() || undefined,
        }, { force });

        if (res.success) {
          this.markSyncSuccess('Sincronizado con Nextcloud');
          return { success: true };
        }

        const failure = this.classifyFailure(res.error || 'SyncUp failed', res.conflict);
        this.setStatus({ state: failure.state, detail: failure.detail, isEnabled: true });
        if (res.conflict) {
          return { success: false, error: res.error, conflict: { remoteState: res.remoteState, localState: res.localState } };
        }
        return { success: false, error: res.error || 'SyncUp failed' };
      } catch (e: any) {
        const message = e?.message || String(e);
        const failure = this.classifyFailure(message, false);
        this.setStatus({ state: failure.state, detail: failure.detail, isEnabled: true });
        return { success: false, error: message };
      } finally {
        this.endSync();
      }
    }

    this.beginSync('Subiendo workspace a Nextcloud...');

    const remotePath = this.getRemotePath();
    try {
      if (!force) {
        const remoteStateData = await dav.getFileAsText(`${remotePath}/state.json`).catch(() => null);
        if (remoteStateData) {
          const remoteState: SyncState = JSON.parse(remoteStateData);
          const localStateData = localStorage.getItem(`sync_state_${remotePath}`);
          const localState: SyncState | null = localStateData ? JSON.parse(localStateData) : null;

          if (localState && remoteState.sha256 !== localState.sha256 && remoteState.clientId !== this.clientId) {
            this.setStatus({ state: 'remote_changes', detail: 'Cambios remotos detectados en Nextcloud', isEnabled: true });
            return {
              success: false,
              error: 'Conflict: Remote has newer changes',
              conflict: { remoteState, localState }
            };
          }
        }
      }

      const lockAcquired = await dav.acquireLock(remotePath, this.clientId);
      if (!lockAcquired) {
        this.setStatus({ state: 'read_only', detail: 'Solo lectura: otro dispositivo esta sincronizando', isEnabled: true });
        return { success: false, error: 'Remote project is locked by another client' };
      }

      const store = projectManager.getStore();
      const dbData = await store.export();
      const hash = await securityService.sha256(dbData);
      const now = Date.now();

      await dav.makeDir('/RentikProSync').catch(() => { });
      await dav.makeDir(remotePath).catch(() => { });

      const tempFile = `${remotePath}/db.sqlite.uploading`;
      await dav.putFile(tempFile, dbData);
      await dav.moveFile(tempFile, `${remotePath}/db.sqlite`);

      const newState: SyncState = {
        version: 1,
        lastModified: now,
        sha256: hash,
        clientId: this.clientId
      };
      await dav.putFile(`${remotePath}/state.json`, JSON.stringify(newState), 'application/json');
      localStorage.setItem(`sync_state_${remotePath}`, JSON.stringify(newState));

      this.markSyncSuccess('Sincronizado con Nextcloud');
      return { success: true };
    } catch (e: any) {
      logger.error('[Sync] SyncUp failed:', e);
      const message = e?.message || String(e);
      this.setStatus({ state: 'error', detail: message, isEnabled: true });
      return { success: false, error: message };
    } finally {
      await dav.releaseLock(remotePath);
      this.endSync();
    }
  }

  async syncDown(force: boolean = false): Promise<SyncResult> {
    const dav = await this.getWebDav();
    if (!dav) return { success: false, error: 'WebDAV not configured' };

    const settings = await projectManager.getStore().getSettings();

    if (this.isTauriRuntime()) {
      try {
        this.beginSync('Descargando workspace desde Nextcloud...');
        const res = await webdavSync('down', {
          url: settings.webdav_url || '',
          user: settings.webdav_user || '',
          pass: settings.webdav_pass || '',
          slug: projectManager.getCurrentProjectId() || undefined,
        }, { force });

        if (res.success) {
          if (res.applied === false && !res.remoteState) {
            this.setStatus({ state: 'local_changes', detail: 'Sin copia remota todavia; sube este workspace primero', isEnabled: true });
          } else {
            this.markSyncSuccess(res.applied === false ? 'Workspace ya sincronizado' : 'Workspace actualizado desde Nextcloud');
          }
          return { success: true };
        }

        const failure = this.classifyFailure(res.error || 'SyncDown failed', res.conflict);
        this.setStatus({ state: failure.state, detail: failure.detail, isEnabled: true });
        if (res.conflict) {
          return { success: false, error: res.error, conflict: { remoteState: res.remoteState, localState: res.localState } };
        }
        return { success: false, error: res.error || 'SyncDown failed' };
      } catch (e: any) {
        const message = e?.message || String(e);
        const failure = this.classifyFailure(message, false);
        this.setStatus({ state: failure.state, detail: failure.detail, isEnabled: true });
        return { success: false, error: message };
      } finally {
        this.endSync();
      }
    }

    this.beginSync('Descargando workspace desde Nextcloud...');

    const remotePath = this.getRemotePath();

    try {
      const remoteStateData = await dav.getFileAsText(`${remotePath}/state.json`).catch(() => null);
      if (!remoteStateData) {
        this.setStatus({ state: 'local_changes', detail: 'Sin copia remota todavia; sube este workspace primero', isEnabled: true });
        return { success: true };
      }

      const remoteState: SyncState = JSON.parse(remoteStateData);
      const localStateData = localStorage.getItem(`sync_state_${remotePath}`);
      const localState: SyncState | null = localStateData ? JSON.parse(localStateData) : null;

      if (!force && localState && remoteState.clientId !== this.clientId) {
        const dbData = await projectManager.getStore().export();
        const currentLocalHash = await securityService.sha256(dbData);

        if (currentLocalHash !== localState.sha256 && remoteState.sha256 !== localState.sha256) {
          this.setStatus({ state: 'conflict', detail: 'Conflicto detectado entre local y remoto', isEnabled: true });
          return {
            success: false,
            error: 'Conflict: Both local and remote have changed',
            conflict: { remoteState, localState }
          };
        }
      }

      if (force || !localState || remoteState.sha256 !== localState.sha256) {
        const remoteData = await dav.getFile(`${remotePath}/db.sqlite`);
        const downloadedHash = await securityService.sha256(remoteData);
        if (downloadedHash !== remoteState.sha256) {
          throw new Error('Downloaded database hash mismatch');
        }

        await projectManager.getStore().load(remoteData);
        await projectManager.getStore().sanitizeCanonicalState().catch(e => logger.warn('[Sync] Canonical sanitize failed after remote apply', e));
        localStorage.setItem(`sync_state_${remotePath}`, JSON.stringify(remoteState));
      }

      this.markSyncSuccess('Workspace actualizado desde Nextcloud');
      return { success: true };
    } catch (e: any) {
      logger.error('[Sync] SyncDown failed:', e);
      const message = e?.message || String(e);
      this.setStatus({ state: 'error', detail: message, isEnabled: true });
      return { success: false, error: message };
    } finally {
      this.endSync();
    }
  }
}

export const syncCoordinator = new SyncCoordinator();
