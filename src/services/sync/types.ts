export interface SyncManifest {
  schemaVersion: number;
  projectId: string;
  name: string;
  exportedAt: number;
  device: string;
  appVersion: string;
}

export interface SyncState {
  provider: 'local' | 'webdav' | null;
  lastSyncAt: number | null;
  lastSyncStatus: 'ok' | 'error' | 'conflict' | null;
  lastError: string | null;
  localBackupAvailable: boolean;
  conflictPolicy: 'last-write-wins';
}

export interface SyncResult {
  success: boolean;
  direction: 'up' | 'down' | 'noop';
  error?: string;
  conflict?: boolean;
  remoteExportedAt?: number;
  localExportedAt?: number;
}

export interface StorageProvider {
  id: 'local' | 'webdav';
  isConfigured(): boolean;
  upload(zipBytes: Uint8Array, projectId: string): Promise<void>;
  download(projectId: string): Promise<Uint8Array | null>;
  getRemoteManifest(projectId: string): Promise<SyncManifest | null>;
}
