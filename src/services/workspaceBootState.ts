/**
 * Workspace Boot State Machine
 *
 * Deterministic startup states:
 *
 *   CHECK_CONFIG  →  VALIDATE_PATH  →  WAITING_MATERIALIZATION  →  OPENING_DB  →  READY
 *                          ↓                      ↓
 *                       MISSING              MISSING (after timeout)
 *
 * The UI subscribes via onBootStateChange() to render the correct screen
 * at every point, eliminating the "infinite Initializing…" problem.
 */

export type BootPhase =
  | "CHECK_CONFIG"
  | "VALIDATE_PATH"
  | "WAITING_MATERIALIZATION"
  | "OPENING_DB"
  | "READY"
  | "MISSING";

export type WorkspaceBootState =
  | { state: "CHECK_CONFIG" }
  | { state: "VALIDATE_PATH"; path: string }
  | { state: "WAITING_MATERIALIZATION"; path: string; startedAt: number; timeoutMs: number }
  | { state: "OPENING_DB"; path: string }
  | { state: "READY"; path: string }
  | { state: "MISSING"; path: string; message?: string };

// ── singleton ──

let bootState: WorkspaceBootState = { state: "CHECK_CONFIG" };

type Listener = (s: WorkspaceBootState) => void;
const listeners: Set<Listener> = new Set();

export function setWorkspaceBootState(s: WorkspaceBootState) {
  bootState = s;
  console.log("[BootState]", s.state, "path" in s ? (s as any).path : "");
  listeners.forEach((fn) => {
    try { fn(s); } catch { /* never crash the state machine */ }
  });
}

export function getWorkspaceBootState(): WorkspaceBootState {
  return bootState;
}

/** Subscribe to boot state changes. Returns an unsubscribe function. */
export function onBootStateChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
