import { workspaceManager } from "../../services/workspaceManager";

const isTauri = () => typeof (window as any).__TAURI__ !== "undefined";

export function getActiveWorkspacePath(): string | null {
  return workspaceManager.getWorkspacePath();
}

export async function setActiveWorkspace(path: string): Promise<void> {
  await workspaceManager.setActiveWorkspace(path);
}

export async function waitForPathToExist(
  path: string,
  opts: { retries?: number; delayMs?: number } = {}
): Promise<boolean> {
  if (!isTauri()) return true; // In web mode, we don't check for native paths

  const retries = opts.retries ?? 20; // 20 * 500ms = 10s
  const delayMs = opts.delayMs ?? 500;

  try {
    const { exists } = await import("@tauri-apps/plugin-fs");

    for (let i = 0; i < retries; i++) {
      try {
        if (await exists(path)) return true;
      } catch {
        // ignore
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  } catch (err) {
    console.warn("[WorkspaceManager] Failed to load Tauri FS plugin", err);
    return true; // Fallback to avoid blocking boot
  }

  return false;
}

