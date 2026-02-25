import { isTauri } from "../../utils/isTauri";
import { workspaceManager } from "../../services/workspaceManager";
import { emit } from "./events";
import { withMaintenance } from "./maintenance";

function basenamePath(p: string): string {
  const norm = p.replace(/\\/g, "/").replace(/\/+$/g, "");
  const parts = norm.split("/").filter(Boolean);
  return parts[parts.length - 1] || norm;
}

function normalize(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+$/g, "");
}

async function copyFileNative(fromPath: string, toPath: string): Promise<void> {
  const fs: any = await import("@tauri-apps/plugin-fs");
  await fs.copyFile(fromPath, toPath);
}

async function copyDirRecursive(srcDir: string, destDir: string): Promise<void> {
  const fs: any = await import("@tauri-apps/plugin-fs");
  const pathApi: any = await import("@tauri-apps/api/path");

  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readDir(srcDir);

  for (const entry of entries) {
    const srcPath = await pathApi.join(srcDir, entry.name);
    const destPath = await pathApi.join(destDir, entry.name);
    if (entry.isDirectory) {
      await copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile) {
      await copyFileNative(srcPath, destPath);
    } else {
      // Skip symlinks
    }
  }
}

export async function chooseDestinationFolder(): Promise<string | null> {
  if (!isTauri()) return null;
  const dialog: any = await import("@tauri-apps/plugin-dialog");
  const dir = await dialog.open({ directory: true, multiple: false });
  if (!dir) return null;
  return dir as string;
}

export async function moveWorkspaceToFolder(destRoot: string) {
  if (!isTauri()) {
    throw new Error("Esta accion solo esta disponible en escritorio (Tauri). ");
  }

  const src = workspaceManager.getWorkspacePath();
  if (!src) throw new Error("No active workspace path");

  const fs: any = await import("@tauri-apps/plugin-fs");
  const pathApi: any = await import("@tauri-apps/api/path");

  const folderName = basenamePath(src);
  const dest = await pathApi.join(destRoot, folderName);

  const srcN = normalize(src);
  const destN = normalize(dest);
  if (destN === srcN) {
    throw new Error("El destino no puede ser la misma carpeta del workspace actual.");
  }
  if (destN.startsWith(srcN + "/")) {
    throw new Error("El destino no puede estar dentro del workspace actual.");
  }

  return withMaintenance("Moviendo workspace...", async () => {
    // 1) Copiar TODO el workspace
    if (await fs.exists(dest)) {
      throw new Error("El destino ya existe. Elige otra carpeta.");
    }
    await copyDirRecursive(src, dest);

    // 2) Verificar minimo (existencia + tamanos)
    const dbPath = await pathApi.join(dest, "database.sqlite");
    const wsJson = await pathApi.join(dest, "workspace.json");

    const okDb = await fs.exists(dbPath);
    const okWs = await fs.exists(wsJson);
    if (!okDb || !okWs) {
      throw new Error("Move failed: missing database.sqlite or workspace.json in destination");
    }

    const dbStat = await fs.stat(dbPath);
    const wsStat = await fs.stat(wsJson);
    if (!dbStat?.size || dbStat.size <= 0 || !wsStat?.size || wsStat.size <= 0) {
      throw new Error("Move failed: database.sqlite or workspace.json is empty");
    }

    // 3) Renombrar origen (no borrar)
    const srcParent = srcN.split("/").slice(0, -1).join("/") || "/";
    const backupName = `${folderName}__MOVED_BACKUP_${Date.now()}`;
    const srcBackup = await pathApi.join(srcParent, backupName);
    await fs.rename(src, srcBackup);

    // 4) Switch al nuevo
    await workspaceManager.setActiveWorkspace(dest);
    emit("workspace:changed", { from: src, to: dest });

    // 5) Reload app
    window.location.reload();
  });
}

export type MoveWorkspaceOptions = {
  onProgress?: (msg: string) => void;
  renameSourceToBackup?: boolean;
};

export async function moveWorkspaceTo(destDir: string, opts: MoveWorkspaceOptions = {}) {
  if (!isTauri()) {
    throw new Error("Esta accion solo esta disponible en escritorio (Tauri).");
  }

  const src = workspaceManager.getWorkspacePath();
  if (!src) {
    throw new Error("No hay workspace activo.");
  }

  const fs: any = await import("@tauri-apps/plugin-fs");
  const pathApi: any = await import("@tauri-apps/api/path");

  const srcName = basenamePath(src);
  const dest = await pathApi.join(destDir, srcName);

  const srcN = normalize(src);
  const destN = normalize(dest);
  if (destN === srcN) {
    throw new Error("El destino no puede ser la misma carpeta del workspace actual.");
  }
  if (destN.startsWith(srcN + "/")) {
    throw new Error("El destino no puede estar dentro del workspace actual.");
  }

  const progress = (m: string) => {
    try {
      opts.onProgress?.(m);
    } catch {
      // ignore
    }
  };

  return await withMaintenance("Moving workspace", async () => {
    progress("Preparando destino...");
    const destExists = await fs.exists(dest);
    if (destExists) {
      throw new Error("El destino ya existe. Elige otra carpeta.");
    }
    await fs.mkdir(dest, { recursive: true });

    // Copy required files
    const srcDb = await pathApi.join(src, "database.sqlite");
    const srcWs = await pathApi.join(src, "workspace.json");
    const destDb = await pathApi.join(dest, "database.sqlite");
    const destWs = await pathApi.join(dest, "workspace.json");

    progress("Copiando database.sqlite...");
    await copyFileNative(srcDb, destDb);

    progress("Copiando workspace.json...");
    await copyFileNative(srcWs, destWs);

    // Copy optional folders
    const srcBackups = await pathApi.join(src, "backups");
    const srcMedia = await pathApi.join(src, "media");
    const destBackups = await pathApi.join(dest, "backups");
    const destMedia = await pathApi.join(dest, "media");

    if (await fs.exists(srcBackups)) {
      progress("Copiando backups/...");
      await copyDirRecursive(srcBackups, destBackups);
    }
    if (await fs.exists(srcMedia)) {
      progress("Copiando media/...");
      await copyDirRecursive(srcMedia, destMedia);
    }

    // Verify required files exist and are non-empty
    progress("Verificando...");
    const dbBytes = await fs.readFile(destDb);
    const wsBytes = await fs.readFile(destWs);
    if (!dbBytes || dbBytes.byteLength === 0 || !wsBytes || wsBytes.byteLength === 0) {
      throw new Error("Move failed: database not written");
    }

    progress("Cambiando workspace activo...");
    await workspaceManager.setActiveWorkspace(dest);

    emit("workspace:changed", { from: src, to: dest });

    let renamedSource: string | null = null;
    if (opts.renameSourceToBackup) {
      try {
        const ts = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
        const parent = srcN.split("/").slice(0, -1).join("/") || "/";
        const newName = `${srcName}_MOVED_BACKUP_${stamp}`;
        const target = await pathApi.join(parent, newName);

        // Requires fs:allow-rename permission.
        await fs.rename(src, target);
        renamedSource = target;
      } catch {
        // Best-effort only.
      }
    }

    progress("Listo.");
    return { src, dest, renamedSource };
  });
}
