import { open } from "@tauri-apps/plugin-dialog";
import { open as shellOpen } from "@tauri-apps/plugin-shell";

// Ajusta estos imports a tu workspace manager real:
import { getActiveWorkspacePath, setActiveWorkspace } from "./workspaceManager";

export function getWorkspacePath(): string | null {
  return getActiveWorkspacePath?.() ?? null;
}

export function isICloudWorkspace(path?: string | null) {
  if (!path) return false;
  return path.includes("Mobile Documents/com~apple~CloudDocs");
}

export async function openWorkspaceFolder(path: string) {
  // Abre Finder en esa ruta
  await shellOpen(path);
}

export async function chooseFolder(): Promise<string | null> {
  const dir = await open({ directory: true, multiple: false });
  return dir ? (dir as string) : null;
}

// Backwards-compatible alias (older code).
export async function chooseNewWorkspace(): Promise<string | null> {
  return await chooseFolder();
}

export async function switchWorkspace(path: string) {
  await setActiveWorkspace(path);
  window.location.reload();
}
