import React, { useMemo } from "react";
import {
  getWorkspacePath,
  isICloudWorkspace,
  openWorkspaceFolder,
  chooseFolder,
  switchWorkspace,
} from "../services/workspaceInfo";
import {
  chooseDestinationFolder,
  moveWorkspaceToFolder,
} from "../services/workspaceMover";

export function Settings() {
  const workspacePath = useMemo(() => getWorkspacePath(), []);

  return (
    <div>
      {/* ...tu settings actual... */}

      <div
        style={{
          marginTop: 24,
          padding: 16,
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: 12,
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 8 }}>Workspace de datos</h2>

        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
          Ubicacion actual
        </div>

        <div
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            padding: 10,
            borderRadius: 10,
            background: "rgba(0,0,0,0.04)",
          }}
        >
          {workspacePath ?? "-"}
        </div>

        <div style={{ marginTop: 10, fontSize: 12 }}>
          {isICloudWorkspace(workspacePath)
            ? "iCloud Drive"
            : "Local / Otra ubicacion"}
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => workspacePath && openWorkspaceFolder(workspacePath)}
            disabled={!workspacePath}
          >
            Abrir carpeta
          </button>

          <button
            onClick={async () => {
              const dir = await chooseFolder();
              if (!dir) return;
              await switchWorkspace(dir);
            }}
          >
            Cambiar ubicacion...
          </button>

          <button
            onClick={async () => {
              const destRoot = await chooseDestinationFolder();
              if (!destRoot) return;
              await moveWorkspaceToFolder(destRoot);
            }}
          >
            Mover workspace a...
          </button>
        </div>
      </div>
    </div>
  );
}
