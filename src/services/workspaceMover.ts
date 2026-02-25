import { join, basename, dirname } from "@tauri-apps/api/path";
import {
  exists,
  readDir,
  mkdir as createDir,
  copyFile,
  rename,
  stat,
} from "@tauri-apps/plugin-fs";
import { confirm, open } from "@tauri-apps/plugin-dialog";

import { withMaintenance } from "./maintenance";
// Ajusta estos imports a tu workspace manager real:
import { getActiveWorkspacePath, setActiveWorkspace } from "./workspaceManager";

function normalize(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+$/g, "");
}

async function copyDirRecursive(src: string, dest: string) {
  await createDir(dest, { recursive: true });

  const entries = await readDir(src);
  for (const entry of entries) {
    const srcPath = await join(src, entry.name);
    const destPath = await join(dest, entry.name);

    if (entry.isDirectory) {
      await copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile) {
      await copyFile(srcPath, destPath);
    }
  }
}

export async function chooseDestinationFolder(): Promise<string | null> {
  const dir = await open({ directory: true, multiple: false });
  return dir ? (dir as string) : null;
}

export async function moveWorkspaceToFolder(destRoot: string) {
  return withMaintenance("Moviendo workspace...", async () => {
    const src = getActiveWorkspacePath?.();
    if (!src) throw new Error("No active workspace path");

    const srcN = normalize(src);
    const destRootN = normalize(destRoot);
    if (destRootN === srcN || destRootN.startsWith(srcN + "/")) {
      throw new Error("El destino no puede ser la misma carpeta (ni estar dentro) del workspace actual.");
    }

    let ok = false;
    try {
      ok = await confirm(
        `Se copiaran todos los datos a:\n\n${destRoot}\n\nLuego RentikPro usara esa ubicacion. El origen NO se borra (se renombra como backup).`,
        { title: "Mover workspace", kind: "warning" }
      );
    } catch (e) {
      console.error("[workspaceMover] dialog.confirm failed", e);
      ok = window.confirm(
        `Se copiaran todos los datos a:\n\n${destRoot}\n\nLuego RentikPro usara esa ubicacion. El origen NO se borra (se renombra como backup).`
      );
    }
    if (!ok) return;

    const folderName = await basename(src);
    const dest = await join(destRoot, folderName);
    if (await exists(dest)) {
      throw new Error("El destino ya existe. Elige otra carpeta.");
    }

    // 1) Copiar a destino
    await copyDirRecursive(src, dest);

    // 2) Verificar minimo
    const dbPath = await join(dest, "database.sqlite");
    const wsJson = await join(dest, "workspace.json");
    const okDb = await exists(dbPath);
    const okWs = await exists(wsJson);
    if (!okDb || !okWs) {
      throw new Error(
        "Move failed: missing database.sqlite or workspace.json in destination"
      );
    }
    const dbStat = await stat(dbPath);
    const wsStat = await stat(wsJson);
    if (!dbStat?.size || dbStat.size <= 0 || !wsStat?.size || wsStat.size <= 0) {
      throw new Error("Move failed: database.sqlite or workspace.json is empty");
    }

    // 3) Renombrar origen (backup)
    const srcParent = await dirname(src);
    const backupName = `${folderName}__MOVED_BACKUP_${Date.now()}`;
    const srcBackup = await join(srcParent, backupName);
    await rename(src, srcBackup);

    // 4) Switch workspace activo
    await setActiveWorkspace(dest);

    // 5) Reload
    window.location.reload();
  });
}

// Backwards-compatible alias.
export async function moveWorkspaceTo(destRoot: string) {
  return await moveWorkspaceToFolder(destRoot);
}
