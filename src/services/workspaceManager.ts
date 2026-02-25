import { workspaceManager } from "../../services/workspaceManager";

export function getActiveWorkspacePath(): string | null {
  return workspaceManager.getWorkspacePath();
}

export async function setActiveWorkspace(path: string): Promise<void> {
  await workspaceManager.setActiveWorkspace(path);
}
