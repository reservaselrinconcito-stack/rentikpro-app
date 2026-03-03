import { WebDavService } from '@/services/webdavService';
import type { StorageProvider, SyncManifest } from './types';

export interface WebDavConfig {
  url: string;
  user: string;
  pass: string;
}

const STORAGE_KEY = 'rp_sync_webdav_cfg';

export class WebDavProvider implements StorageProvider {
  readonly id = 'webdav' as const;
  private cfg: WebDavConfig | null = null;
  private svc: WebDavService | null = null;

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.configure(JSON.parse(raw), false);
    } catch { /* ignore corrupt config */ }
  }

  configure(cfg: WebDavConfig, persist = true): void {
    this.cfg = { ...cfg, url: cfg.url.replace(/\/$/, '') };
    this.svc = new WebDavService(this.cfg);
    if (persist) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cfg));
    }
  }

  getConfig(): WebDavConfig | null {
    return this.cfg;
  }

  isConfigured(): boolean {
    return !!(this.cfg?.url && this.cfg?.user && this.svc);
  }

  async testConnection(): Promise<boolean> {
    if (!this.svc) return false;
    try {
      return await this.svc.exists('/');
    } catch {
      return false;
    }
  }

  private remotePath(projectId: string): string {
    return `/rentikpro/${projectId}.zip`;
  }

  async upload(zipBytes: Uint8Array, projectId: string): Promise<void> {
    if (!this.svc) throw new Error('WebDAV no configurado');
    await this.svc.makeDir('/rentikpro');
    await this.svc.putFile(this.remotePath(projectId), zipBytes);
  }

  async download(projectId: string): Promise<Uint8Array | null> {
    if (!this.svc) return null;
    try {
      return await this.svc.getFile(this.remotePath(projectId));
    } catch {
      return null;
    }
  }

  async getRemoteManifest(projectId: string): Promise<SyncManifest | null> {
    const bytes = await this.download(projectId);
    if (!bytes) return null;
    const { ProjectPackager } = await import('./ProjectPackager');
    const { manifest } = await ProjectPackager.import(bytes);
    return manifest;
  }
}
