import JSZip from 'jszip';
import { projectManager } from '@/services/projectManager';
import { SCHEMA_VERSION, APP_VERSION } from '@/src/version';
import type { SyncManifest } from './types';

export const ProjectPackager = {
  async export(projectId: string, name: string): Promise<Uint8Array> {
    const dbBytes: Uint8Array = projectManager.getStore().export();
    const manifest: SyncManifest = {
      schemaVersion: SCHEMA_VERSION,
      projectId,
      name,
      exportedAt: Date.now(),
      device: navigator.userAgent.slice(0, 80),
      appVersion: APP_VERSION,
    };
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(manifest));
    zip.file('database.sqlite', dbBytes);
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  },

  async import(zipBytes: Uint8Array): Promise<{ manifest: SyncManifest; dbBytes: Uint8Array }> {
    const zip = await JSZip.loadAsync(zipBytes);
    const manifestFile = zip.file('manifest.json');
    const dbFile = zip.file('database.sqlite');
    if (!manifestFile || !dbFile) {
      throw new Error('ZIP inválido: faltan manifest.json o database.sqlite');
    }
    const manifestStr = await manifestFile.async('string');
    const manifest: SyncManifest = JSON.parse(manifestStr);
    const dbBytes = await dbFile.async('uint8array');
    return { manifest, dbBytes };
  },
};
