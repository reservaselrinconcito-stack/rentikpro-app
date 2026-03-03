/**
 * UpdateService — Tauri v2 updater wrapper
 */
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'up-to-date'
  | 'downloading'
  | 'ready'
  | 'error';

export interface UpdateStatus {
  state: UpdateState;
  availableVersion?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  error?: string;
}

type Listener = (status: UpdateStatus) => void;

class UpdateService {
  private status: UpdateStatus = { state: 'idle' };
  private listeners = new Set<Listener>();
  private _update: Awaited<ReturnType<typeof check>> | null = null;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private emit(patch: Partial<UpdateStatus>) {
    this.status = { ...this.status, ...patch };
    this.listeners.forEach(fn => fn(this.status));
  }

  async checkForUpdates(): Promise<void> {
    if (this.status.state === 'checking' || this.status.state === 'downloading') return;
    this.emit({ state: 'checking', error: undefined, availableVersion: undefined });
    try {
      const update = await check();
      if (update?.available) {
        this._update = update;
        this.emit({ state: 'available', availableVersion: update.version });
      } else {
        this._update = null;
        this.emit({ state: 'up-to-date' });
      }
    } catch (err: any) {
      this._update = null;
      this.emit({ state: 'error', error: this.humanizeError(err) });
    }
  }

  async downloadAndInstall(): Promise<void> {
    if (!this._update) return;
    let downloaded = 0;
    this.emit({ state: 'downloading', downloadedBytes: 0, totalBytes: undefined });
    try {
      await this._update.downloadAndInstall((progress) => {
        if (progress.event === 'Progress') {
          downloaded += progress.data.chunkLength ?? 0;
          this.emit({
            state: 'downloading',
            downloadedBytes: downloaded,
            totalBytes: progress.data.contentLength ?? undefined,
          });
        } else if (progress.event === 'Finished') {
          this.emit({ state: 'ready' });
        }
      });
      // Fallback: if Finished event never fires, mark ready after await resolves
      if (this.status.state === 'downloading') {
        this.emit({ state: 'ready' });
      }
    } catch (err: any) {
      this.emit({ state: 'error', error: this.humanizeError(err) });
    }
  }

  async relaunch(): Promise<void> {
    await relaunch();
  }

  private humanizeError(err: any): string {
    const msg = String(err?.message || err || '');
    if (msg.includes('up to date') || msg.includes('no update')) {
      return 'Ya tienes la última versión instalada.';
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connect') || msg.includes('NETWORK')) {
      return 'Sin conexión a internet. Comprueba tu red e inténtalo de nuevo.';
    }
    if (msg.includes('signature') || msg.includes('sig')) {
      return 'Error de firma: la actualización no pudo verificarse.';
    }
    if (msg.includes('release JSON') || msg.includes('valid release') || msg.includes('404')) {
      return 'No se encuentra el servidor de actualizaciones.';
    }
    return msg || 'Error desconocido al buscar actualizaciones.';
  }

  getStatus(): UpdateStatus {
    return this.status;
  }
}

export const updateService = new UpdateService();
