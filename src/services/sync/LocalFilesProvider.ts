import { Filesystem, Directory } from '@capacitor/filesystem';
import type { StorageProvider, SyncManifest } from './types';

const isCapacitor = (): boolean =>
  typeof (window as any).Capacitor !== 'undefined' &&
  !!(window as any).Capacitor?.isNativePlatform?.();

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const SYNC_DIR = 'RentikPro';

export class LocalFilesProvider implements StorageProvider {
  readonly id = 'local' as const;
  private folderPath: string | null = null;

  constructor() {
    this.folderPath = localStorage.getItem('rp_sync_local_folder');
  }

  isConfigured(): boolean {
    return !!this.folderPath;
  }

  getFolderLabel(): string {
    return this.folderPath ?? '';
  }

  async chooseFolder(): Promise<boolean> {
    if (isCapacitor()) {
      try {
        await Filesystem.mkdir({
          path: SYNC_DIR,
          directory: Directory.Documents,
          recursive: true,
        });
        this.folderPath = SYNC_DIR;
      } catch (e: any) {
        if (!e?.message?.includes('exists')) throw e;
        this.folderPath = SYNC_DIR;
      }
    } else {
      if (typeof (window as any).showDirectoryPicker !== 'function') {
        throw new Error('Tu navegador no soporta selección de carpeta. Usa Chrome/Edge o la app nativa.');
      }
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      this.folderPath = dirHandle.name;
      try {
        const idb = await openFSAHandleStore();
        const tx = idb.transaction('handles', 'readwrite');
        tx.objectStore('handles').put({ id: 'sync_folder', handle: dirHandle });
        await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = rej; });
      } catch { /* persist handle best-effort */ }
    }
    localStorage.setItem('rp_sync_local_folder', this.folderPath!);
    return true;
  }

  private zipPath(projectId: string): string {
    return `${this.folderPath}/${projectId}.zip`;
  }

  async upload(zipBytes: Uint8Array, projectId: string): Promise<void> {
    if (isCapacitor()) {
      await Filesystem.writeFile({
        path: this.zipPath(projectId),
        data: uint8ToBase64(zipBytes),
        directory: Directory.Documents,
        recursive: true,
      });
    } else {
      await writeFSAFile(this.folderPath!, `${projectId}.zip`, zipBytes);
    }
  }

  async download(projectId: string): Promise<Uint8Array | null> {
    try {
      if (isCapacitor()) {
        const result = await Filesystem.readFile({
          path: this.zipPath(projectId),
          directory: Directory.Documents,
        });
        return base64ToUint8(result.data as string);
      }
      return await readFSAFile(this.folderPath!, `${projectId}.zip`);
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

// ── FSA helpers (web only) ────────────────────────────────────────────────────

async function openFSAHandleStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('rp_fsa_handles', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getFSADirHandle(folderName: string): Promise<any> {
  try {
    const idb = await openFSAHandleStore();
    return new Promise((resolve, reject) => {
      const req = idb.transaction('handles').objectStore('handles').get('sync_folder');
      req.onsuccess = () => resolve(req.result?.handle ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function writeFSAFile(folder: string, filename: string, bytes: Uint8Array): Promise<void> {
  const dirHandle = await getFSADirHandle(folder);
  if (!dirHandle) throw new Error('Sin acceso a la carpeta. Elige carpeta de nuevo en Ajustes.');
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(bytes);
  await writable.close();
}

async function readFSAFile(folder: string, filename: string): Promise<Uint8Array | null> {
  const dirHandle = await getFSADirHandle(folder);
  if (!dirHandle) return null;
  try {
    const fileHandle = await dirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}
