import { getActiveWorkspacePath, setActiveWorkspace } from "./workspaceManager";

export function getWorkspacePath(): string | null {
  return getActiveWorkspacePath?.() ?? null;
}

export function isICloudWorkspace(path?: string | null) {
  if (!path) return false;
  return path.includes("Mobile Documents/com~apple~CloudDocs");
}

export async function openWorkspaceFolder(path: string) {
  try {
    // We use plugin-shell here (revealItemInDir does not exist on plugin-fs v2).
    const mod: any = await import("@tauri-apps/plugin-shell");
    await mod.open(path);
  } catch (e) {
    console.error("Reveal failed", e);
  }
}

export async function chooseNewWorkspace(): Promise<string | null> {
  const dialog: any = await import("@tauri-apps/plugin-dialog");
  const dir = await dialog.open({
    directory: true,
    multiple: false,
  });

  if (!dir) return null;

  return dir as string;
}

export async function switchWorkspace(path: string) {
  await setActiveWorkspace(path);
  window.location.reload();
}
