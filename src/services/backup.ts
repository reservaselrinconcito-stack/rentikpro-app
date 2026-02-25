import { withMaintenance } from "./maintenance";

// Dentro de tu funcion restore/import:
export async function restoreBackup<T>(fn: () => Promise<T>) {
  return withMaintenance("Restoring backup", async () => {
    // ... TU LOGICA ACTUAL restore
    // IMPORTANTISIMO: aqui dentro ya puedes cerrar DB / swap / reinit sin carreras
    return await fn();
  });
}
