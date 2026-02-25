export type WorkspaceBootState =
  | { state: "OK" }
  | { state: "MISSING"; path: string; message?: string };

let current: WorkspaceBootState = { state: "OK" };

export function setWorkspaceBootState(s: WorkspaceBootState) {
  current = s;
}

export function getWorkspaceBootState() {
  return current;
}
