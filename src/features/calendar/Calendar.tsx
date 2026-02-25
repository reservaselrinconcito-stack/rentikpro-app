import { useEffect } from "react";
import { getDbReady } from "../../services/sqliteStore";
import { tableHasColumn } from "../../services/schema";
import { on } from "../../services/events";
import { safeAsync } from "../../utils/async";

export async function loadReservations(rangeStart: string, rangeEnd: string) {
  const db = await getDbReady();

  const hasDeletedAt = await tableHasColumn(db, "reservations", "deleted_at");

  const deletedFilter = hasDeletedAt ? "AND deleted_at IS NULL" : "";

  const sql = `
    SELECT *
    FROM reservations
    WHERE start_date <= ?
    AND end_date >= ?
    ${deletedFilter}
    ORDER BY start_date ASC
  `;

  return db.queryAll(sql, [rangeEnd, rangeStart]);
}

export function useReservationsChanged(refreshCalendar: () => Promise<void>) {
  useEffect(() => {
    const off = on("reservations:changed", () => {
      safeAsync(async () => {
        await refreshCalendar(); // tu funcion real que llama loadReservations + setState
      });
    });
    return () => {
      off();
    };
  }, [refreshCalendar]);
}
