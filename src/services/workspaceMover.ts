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

async function copyFileBytes(fromPath: string, toPath: string): Promise<void> {
  const fs: any = await import("@tauri-apps/plugin-fs");
  const bytes = await fs.readFile(fromPath);
  await fs.writeFile(toPath, bytes);
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
      await copyFileBytes(srcPath, destPath);
    } else {
      // Skip symlinks
    }
  }
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
    await copyFileBytes(srcDb, destDb);

    progress("Copiando workspace.json...");
    await copyFileBytes(srcWs, destWs);

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
