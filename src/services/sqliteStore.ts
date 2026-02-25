// Compatibility re-export for code that expects src/services.
// The real implementation lives in /services.

import { isMaintenanceMode, getMaintenanceReason } from "./maintenance";
import {
  getDbReady as __getDbReady,
  isDbReady,
  __markDbReady,
  __markDbFailed,
} from "../../services/sqliteStore";

function __assertNotMaintenance() {
  if (isMaintenanceMode()) {
    throw new Error(
      `DB is in maintenance mode${
        getMaintenanceReason() ? `: ${getMaintenanceReason()}` : ""
      }`
    );
  }
}

export async function getDbReady(): Promise<any> {
  __assertNotMaintenance();
  return __getDbReady();
}

export { isDbReady, __markDbReady, __markDbFailed };
