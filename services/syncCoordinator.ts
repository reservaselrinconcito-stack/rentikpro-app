import { WebDavService } from './webdavService';
import { projectManager } from './projectManager';
import { securityService } from './security';
import { SyncState, UserSettings } from '../types';
import { logger } from './logger';
import { webdavSync } from './webdavSync';

export type SyncResult = {
    success: boolean;
    error?: string;
    conflict?: {
        remoteState: SyncState;
        localState: SyncState;
    };
};

export class SyncCoordinator {
    private dav: WebDavService | null = null;
    private clientId: string;
    public isSyncing: boolean = false;
    private listeners: ((syncing: boolean) => void)[] = [];

    constructor() {
        // Generate a stable client ID per browser instance if not exists
        let cid = localStorage.getItem('rentikpro_sync_client_id');
        if (!cid) {
            cid = crypto.randomUUID();
            localStorage.setItem('rentikpro_sync_client_id', cid);
        }
        this.clientId = cid;
    }

    private async getWebDav(): Promise<WebDavService | null> {
        if (this.dav) return this.dav;

        const store = projectManager.getStore();
        const settings = await store.getSettings();

        if (!settings.webdav_url || !settings.webdav_sync_enabled) {
            return null;
        }

        this.dav = new WebDavService({
            url: settings.webdav_url,
            user: settings.webdav_user || '',
            pass: settings.webdav_pass || ''
        });
        return this.dav;
    }

    private isTauriRuntime(): boolean {
        return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
    }

    private getRemotePath(): string {
        const projectId = projectManager.getCurrentProjectId() || 'default';
        return `/RentikProSync/${projectId}`;
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.isSyncing));
    }

    public subscribe(l: (syncing: boolean) => void) {
        this.listeners.push(l);
        return () => {
            this.listeners = this.listeners.filter(x => x !== l);
        };
    }

    /**
     * PUSH: Local -> Remote
     * 1. Lock
     * 2. Upload .uploading
     * 3. Move to final
     * 4. Update state.json
     * 5. Unlock
     */
    async syncUp(force: boolean = false): Promise<SyncResult> {
        const dav = await this.getWebDav();
        if (!dav) return { success: false, error: 'WebDAV not configured' };

        const settings = await projectManager.getStore().getSettings();

        // Prefer Tauri backend sync (avoids CORS and supports local state.json + backups).
        if (this.isTauriRuntime()) {
            try {
                const res = await webdavSync('up', {
                    url: settings.webdav_url || '',
                    user: settings.webdav_user || '',
                    pass: settings.webdav_pass || '',
                    slug: projectManager.getCurrentProjectId() || undefined,
                }, { force });
                if (res.success) return { success: true };
                if (res.conflict) {
                    return { success: false, error: res.error, conflict: { remoteState: res.remoteState, localState: res.localState } };
                }
                return { success: false, error: res.error || 'SyncUp failed' };
            } catch (e: any) {
                return { success: false, error: e?.message || String(e) };
            }
        }

        this.isSyncing = true;
        this.notifyListeners();

        const remotePath = this.getRemotePath();
        try {
            // 0. If not forced, check if someone else pushed a newer version while we were working
            if (!force) {
                const remoteStateData = await dav.getFileAsText(`${remotePath}/state.json`).catch(() => null);
                if (remoteStateData) {
                    const remoteState: SyncState = JSON.parse(remoteStateData);
                    const localStateData = localStorage.getItem(`sync_state_${remotePath}`);
                    const localState: SyncState | null = localStateData ? JSON.parse(localStateData) : null;

                    if (localState && remoteState.sha256 !== localState.sha256 && remoteState.clientId !== this.clientId) {
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
                return { success: false, error: 'Remote project is locked by another client' };
            }

            const store = projectManager.getStore();
            const dbData = await store.export();
            const hash = await securityService.sha256(dbData);
            const now = Date.now();

            // Ensure directory exists
            await dav.makeDir('/RentikProSync').catch(() => { });
            await dav.makeDir(remotePath).catch(() => { });

            // 1. Upload temporary file
            const tempFile = `${remotePath}/db.sqlite.uploading`;
            await dav.putFile(tempFile, dbData);

            // 2. Commit move
            const finalFile = `${remotePath}/db.sqlite`;
            await dav.moveFile(tempFile, finalFile);

            // 3. Update state
            const newState: SyncState = {
                version: 1,
                lastModified: now,
                sha256: hash,
                clientId: this.clientId
            };
            await dav.putFile(`${remotePath}/state.json`, JSON.stringify(newState), 'application/json');

            // Update local tracking
            localStorage.setItem(`sync_state_${remotePath}`, JSON.stringify(newState));

            return { success: true };
        } catch (e: any) {
            logger.error('[Sync] SyncUp failed:', e);
            return { success: false, error: e.message };
        } finally {
            await dav.releaseLock(remotePath);
            this.isSyncing = false;
            this.notifyListeners();
        }
    }

    /**
     * PULL: Remote -> Local
     * 1. Compare states
     * 2. Download if newer
     * 3. Integrity Check
     * 4. Replace & Backup
     */
    async syncDown(force: boolean = false): Promise<SyncResult> {
        const dav = await this.getWebDav();
        if (!dav) return { success: false, error: 'WebDAV not configured' };

        const settings = await projectManager.getStore().getSettings();

        if (this.isTauriRuntime()) {
            try {
                const res = await webdavSync('down', {
                    url: settings.webdav_url || '',
                    user: settings.webdav_user || '',
                    pass: settings.webdav_pass || '',
                    slug: projectManager.getCurrentProjectId() || undefined,
                }, { force });
                if (res.success) return { success: true };
                if (res.conflict) {
                    return { success: false, error: res.error, conflict: { remoteState: res.remoteState, localState: res.localState } };
                }
                return { success: false, error: res.error || 'SyncDown failed' };
            } catch (e: any) {
                return { success: false, error: e?.message || String(e) };
            }
        }

        this.isSyncing = true;
        this.notifyListeners();

        const remotePath = this.getRemotePath();

        try {
            // 1. Get remote state
            const remoteStateData = await dav.getFileAsText(`${remotePath}/state.json`).catch(() => null);
            if (!remoteStateData) {
                // Remote doesn't exist, first sync?
                return { success: true };
            }

            const remoteState: SyncState = JSON.parse(remoteStateData);
            const localStateData = localStorage.getItem(`sync_state_${remotePath}`);
            const localState: SyncState | null = localStateData ? JSON.parse(localStateData) : null;

            // 2. Conflict detection
            if (!force && localState && remoteState.clientId !== this.clientId) {
                // Check if local has unsaved changes since last sync
                const dbData = await projectManager.getStore().export();
                const currentLocalHash = await securityService.sha256(dbData);

                if (currentLocalHash !== localState.sha256 && remoteState.sha256 !== localState.sha256) {
                    return {
                        success: false,
                        error: 'Conflict: Both local and remote have changed',
                        conflict: { remoteState, localState }
                    };
                }
            }

            // 3. Download if newer or forced
            if (force || !localState || remoteState.sha256 !== localState.sha256) {
                logger.log('[Sync] Downloading remote database...');
                const remoteData = await dav.getFile(`${remotePath}/db.sqlite`);

                // Integrity check
                const downloadedHash = await securityService.sha256(remoteData);
                if (downloadedHash !== remoteState.sha256) {
                    throw new Error('Downloaded database hash mismatch');
                }

                // Apply to local
                await projectManager.getStore().load(remoteData);
                localStorage.setItem(`sync_state_${remotePath}`, JSON.stringify(remoteState));

                logger.log('[Sync] Remote database applied successfully');
            }

            return { success: true };
        } catch (e: any) {
            logger.error('[Sync] SyncDown failed:', e);
            return { success: false, error: e.message };
        } finally {
            this.isSyncing = false;
            this.notifyListeners();
        }
    }
}

export const syncCoordinator = new SyncCoordinator();
