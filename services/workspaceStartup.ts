export type KnownWorkspace = {
  path: string;
  name: string;
  projectId?: string;
  lastOpenedAt?: number;
  missing?: boolean;
};

type StartupMode = 'ask' | 'remember';

const KNOWN_WORKSPACES_KEY = 'rp_known_workspaces';
const LAST_WORKSPACE_KEY = 'rp_last_workspace_path';
const DEFAULT_WORKSPACE_KEY = 'rp_default_workspace_path';
const ASK_ON_STARTUP_KEY = 'rp_workspace_ask_on_startup';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value == null || value === '') {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
}

function normalizePath(path: string | null | undefined): string {
  return String(path || '').trim();
}

function fallbackWorkspaceName(path: string): string {
  const normalized = normalizePath(path).replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  const last = parts[parts.length - 1] || normalized || 'Workspace';
  if (last.toLowerCase() === 'backups' && parts.length >= 2) {
    return parts[parts.length - 2] || last;
  }
  return last;
}

function coerceWorkspace(value: any): KnownWorkspace | null {
  const path = normalizePath(value?.path);
  if (!path) return null;
  const name = String(value?.name || fallbackWorkspaceName(path)).trim() || fallbackWorkspaceName(path);
  const projectId = value?.projectId ? String(value.projectId) : undefined;
  const lastOpenedAt = Number(value?.lastOpenedAt);
  return {
    path,
    name,
    projectId,
    lastOpenedAt: Number.isFinite(lastOpenedAt) && lastOpenedAt > 0 ? lastOpenedAt : undefined,
    missing: value?.missing === true,
  };
}

function readKnownWorkspaces(): KnownWorkspace[] {
  const raw = readStorage(KNOWN_WORKSPACES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(coerceWorkspace).filter((entry): entry is KnownWorkspace => Boolean(entry));
  } catch {
    return [];
  }
}

function writeKnownWorkspaces(entries: KnownWorkspace[]): void {
  const deduped = dedupeWorkspaces(entries);
  writeStorage(KNOWN_WORKSPACES_KEY, JSON.stringify(deduped));
}

function dedupeWorkspaces(entries: KnownWorkspace[]): KnownWorkspace[] {
  const map = new Map<string, KnownWorkspace>();
  for (const entry of entries) {
    const normalized = coerceWorkspace(entry);
    if (!normalized) continue;
    const existing = map.get(normalized.path);
    map.set(normalized.path, {
      path: normalized.path,
      name: normalized.name || existing?.name || fallbackWorkspaceName(normalized.path),
      projectId: normalized.projectId || existing?.projectId,
      lastOpenedAt: Math.max(normalized.lastOpenedAt || 0, existing?.lastOpenedAt || 0) || undefined,
      missing: normalized.missing === true && existing?.missing !== false,
    });
  }
  return Array.from(map.values()).sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
}

function mergeCurrentWorkspace(entries: KnownWorkspace[]): KnownWorkspace[] {
  const currentPath = normalizePath(readStorage('rp_workspace_path'));
  if (!currentPath) return entries;
  const currentName = normalizePath(readStorage('rp_workspace_name')) || fallbackWorkspaceName(currentPath);
  const currentProjectId = normalizePath(readStorage('rp_workspace_project_id')) || undefined;
  return dedupeWorkspaces([{ path: currentPath, name: currentName, projectId: currentProjectId, missing: false }, ...entries]);
}

export function listKnownWorkspaces(): KnownWorkspace[] {
  return mergeCurrentWorkspace(readKnownWorkspaces());
}

export function getWorkspaceStartupMode(): StartupMode {
  return readStorage(ASK_ON_STARTUP_KEY) === '1' ? 'ask' : 'remember';
}

export function setWorkspaceStartupMode(mode: StartupMode): void {
  writeStorage(ASK_ON_STARTUP_KEY, mode === 'ask' ? '1' : '0');
}

export function getDefaultWorkspacePath(): string | null {
  return normalizePath(readStorage(DEFAULT_WORKSPACE_KEY)) || null;
}

export function setDefaultWorkspacePath(path: string | null): void {
  writeStorage(DEFAULT_WORKSPACE_KEY, normalizePath(path) || null);
}

export function getLastWorkspacePath(): string | null {
  return normalizePath(readStorage(LAST_WORKSPACE_KEY)) || null;
}

export function recordOpenedWorkspace(entry: { path: string; name?: string; projectId?: string | null; lastOpenedAt?: number }): void {
  const path = normalizePath(entry.path);
  if (!path) return;

  const next: KnownWorkspace = {
    path,
    name: normalizePath(entry.name) || fallbackWorkspaceName(path),
    projectId: normalizePath(entry.projectId || undefined) || undefined,
    lastOpenedAt: entry.lastOpenedAt || Date.now(),
    missing: false,
  };

  writeStorage(LAST_WORKSPACE_KEY, path);
  writeKnownWorkspaces([next, ...listKnownWorkspaces()]);
}

export function applyWorkspaceStartupPreference(path: string, mode: StartupMode): void {
  const normalized = normalizePath(path);
  if (!normalized) return;
  setWorkspaceStartupMode(mode);
  if (mode === 'remember') {
    setDefaultWorkspacePath(normalized);
  }
}

export function prepareWorkspaceSwitch(path: string): void {
  const normalized = normalizePath(path);
  if (!normalized) return;
  writeStorage(LAST_WORKSPACE_KEY, normalized);
  writeKnownWorkspaces([{ path: normalized, name: fallbackWorkspaceName(normalized), missing: false }, ...listKnownWorkspaces()]);
  if (getWorkspaceStartupMode() === 'remember') {
    setDefaultWorkspacePath(normalized);
  }
}

export function markWorkspaceUnavailable(path: string): void {
  const normalized = normalizePath(path);
  if (!normalized) return;

  const updated = listKnownWorkspaces().map((entry) => {
    if (entry.path !== normalized) return entry;
    return { ...entry, missing: true };
  });

  writeKnownWorkspaces(updated);
  if (getDefaultWorkspacePath() === normalized) {
    setDefaultWorkspacePath(null);
  }
  if (getLastWorkspacePath() === normalized) {
    writeStorage(LAST_WORKSPACE_KEY, null);
  }
  if (normalizePath(readStorage('rp_workspace_path')) === normalized) {
    writeStorage('rp_workspace_path', null);
    writeStorage('rp_workspace_project_id', null);
    writeStorage('rp_workspace_name', null);
  }
}

export function getWorkspaceStartupDecision(): {
  mode: StartupMode;
  defaultWorkspacePath: string | null;
  knownWorkspaces: KnownWorkspace[];
  autoOpenPath: string | null;
  shouldPrompt: boolean;
} {
  const mode = getWorkspaceStartupMode();
  const defaultWorkspacePath = getDefaultWorkspacePath();
  const knownWorkspaces = listKnownWorkspaces();
  const availableWorkspaces = knownWorkspaces.filter((entry) => !entry.missing);

  if (mode === 'ask') {
    return { mode, defaultWorkspacePath, knownWorkspaces, autoOpenPath: null, shouldPrompt: true };
  }

  if (defaultWorkspacePath) {
    return { mode, defaultWorkspacePath, knownWorkspaces, autoOpenPath: defaultWorkspacePath, shouldPrompt: false };
  }

  if (availableWorkspaces.length === 1) {
    return {
      mode,
      defaultWorkspacePath,
      knownWorkspaces,
      autoOpenPath: availableWorkspaces[0].path,
      shouldPrompt: false,
    };
  }

  return { mode, defaultWorkspacePath, knownWorkspaces, autoOpenPath: null, shouldPrompt: true };
}
