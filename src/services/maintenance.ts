import { emit } from "./events";

let maintenanceCount = 0;
let maintenanceReason: string | null = null;

export function isMaintenanceMode() {
  return maintenanceCount > 0;
}

export function getMaintenanceReason() {
  return maintenanceReason;
}

export function beginMaintenance(reason: string) {
  maintenanceCount++;
  maintenanceReason = reason;
  emit("maintenance:changed", { enabled: true, reason });
}

export function endMaintenance() {
  maintenanceCount = Math.max(0, maintenanceCount - 1);
  if (maintenanceCount === 0) {
    maintenanceReason = null;
    emit("maintenance:changed", { enabled: false, reason: null });
  } else {
    emit("maintenance:changed", { enabled: true, reason: maintenanceReason });
  }
}

/**
 * Envuelve una operacion critica (restore/import/migrate) garantizando endMaintenance.
 */
export async function withMaintenance<T>(
  reason: string,
  fn: () => Promise<T>
): Promise<T> {
  beginMaintenance(reason);
  try {
    return await fn();
  } finally {
    endMaintenance();
  }
}
