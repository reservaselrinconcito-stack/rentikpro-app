import { workspaceManager } from "../../services/workspaceManager";
import { exists } from "@tauri-apps/plugin-fs";

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
  const retries = opts.retries ?? 20; // 20 * 500ms = 10s
  const delayMs = opts.delayMs ?? 500;

  for (let i = 0; i < retries; i++) {
    try {
      if (await exists(path)) return true;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}
