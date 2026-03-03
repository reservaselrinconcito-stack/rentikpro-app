import { useState, useCallback, useRef } from 'react';
import { SyncManager } from './SyncManager';
import { LocalFilesProvider } from './LocalFilesProvider';
import { WebDavProvider } from './WebDavProvider';
import type { SyncState, SyncResult } from './types';

export type SyncProviderType = 'local' | 'webdav' | null;

const localProvider = new LocalFilesProvider();
const webdavProvider = new WebDavProvider();

function getProvider(type: SyncProviderType) {
  if (type === 'local') return localProvider;
  if (type === 'webdav') return webdavProvider;
  return null;
}

export function getLocalProvider(): LocalFilesProvider { return localProvider; }
export function getWebDavProvider(): WebDavProvider { return webdavProvider; }

export function useSyncState(projectId: string, projectName: string) {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [savedState] = useState<SyncState | null>(() => SyncManager.loadState(projectId));
  const [activeProvider, setActiveProvider] = useState<SyncProviderType>(
    () => (savedState?.provider ?? null) as SyncProviderType
  );
  const managerRef = useRef<SyncManager | null>(null);

  const runSync = useCallback(async () => {
    if (!activeProvider) return;
    const p = getProvider(activeProvider);
    if (!p || !p.isConfigured()) return;
    managerRef.current = new SyncManager(p);
    setSyncing(true);
    try {
      const result = await managerRef.current.sync(projectId, projectName);
      setLastResult(result);
    } finally {
      setSyncing(false);
    }
  }, [activeProvider, projectId, projectName]);

  const restoreBackup = useCallback(async (): Promise<boolean> => {
    if (!managerRef.current && activeProvider) {
      const p = getProvider(activeProvider);
      if (p) managerRef.current = new SyncManager(p);
    }
    if (!managerRef.current) return false;
    return managerRef.current.restoreLocalBackup(projectId);
  }, [activeProvider, projectId]);

  return {
    syncing,
    lastResult,
    savedState,
    activeProvider,
    setActiveProvider,
    runSync,
    restoreBackup,
    localProvider,
    webdavProvider,
  };
}
