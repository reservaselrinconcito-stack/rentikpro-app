import { isTauri } from "../../utils/isTauri";
import { workspaceManager } from "../../services/workspaceManager";

export function getActiveWorkspacePath(): string | null {
  try {
    return workspaceManager.getWorkspacePath();
  } catch {
    return null;
  }
}

export function isCloudPath(path: string): boolean {
  return path.includes("Mobile Documents/com~apple~CloudDocs");
}

export async function revealInFinder(path: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("Esta accion requiere Tauri (desktop).");
  }

  // Uses plugin-shell to open the folder in Finder (macOS) / Explorer (Windows).
  const mod: any = await import("@tauri-apps/plugin-shell");
  if (typeof mod.open !== "function") {
    throw new Error("Shell open no disponible.");
  }
  await mod.open(path);
}
