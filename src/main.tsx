// Global error hooks (before React render)
// Keep this module side-effectful: importing it installs handlers once.

import { setWorkspaceBootState } from "./services/workspaceBootState";

function maybeMarkWorkspaceMissing(err: any) {
  try {
    const code = (err as any)?.code;
    const msg = String((err as any)?.message || err || "");

    if (code === "WORKSPACE_MISSING" || msg.includes("Workspace folder does not exist")) {
      const workspacePath =
        (err as any)?.workspacePath ||
        (() => {
          try {
            return localStorage.getItem("rp_workspace_path") || "";
          } catch {
            return "";
          }
        })();

      setWorkspaceBootState({
        state: "MISSING",
        path: workspacePath,
        message:
          "La carpeta del workspace no esta disponible (iCloud aun no la ha descargado o la ruta cambio).",
      });
    }
  } catch {
    // ignore
  }
}

const w = window as any;

if (!w.__rp_global_error_handlers_installed) {
  w.__rp_global_error_handlers_installed = true;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = (event as any).reason;
    console.error('[unhandledrejection]', reason);
    maybeMarkWorkspaceMissing(reason);
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    const anyEvent: any = event as any;
    const err = anyEvent.error || anyEvent.message;
    console.error('[window.error]', err);
    maybeMarkWorkspaceMissing(err);
  });
}
