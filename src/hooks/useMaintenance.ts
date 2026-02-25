import { useEffect, useState } from "react";
import { on } from "../services/events";
import {
  isMaintenanceMode,
  getMaintenanceReason,
} from "../services/maintenance";

export function useMaintenance() {
  const [enabled, setEnabled] = useState(isMaintenanceMode());
  const [reason, setReason] = useState<string | null>(getMaintenanceReason());

  useEffect(() => {
    const off = on("maintenance:changed", (payload?: any) => {
      setEnabled(!!payload?.enabled);
      setReason(payload?.reason ?? null);
    });
    return () => {
      off();
    };
  }, []);

  return { enabled, reason };
}
