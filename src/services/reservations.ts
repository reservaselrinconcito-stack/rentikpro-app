import { dbQueue } from "./dbQueue";
import { getDbReady } from "./sqliteStore";

export async function saveReservation(payload: any) {
  return dbQueue(async () => {
    const db = await getDbReady();
    // ... TU SQL REAL (INSERT/UPDATE)
    // return ...
    void payload;
    void db;
  });
}

export async function deleteReservation(id: string) {
  return dbQueue(async () => {
    const db = await getDbReady();
    // ... TU SQL REAL (DELETE o soft delete)
    void id;
    void db;
  });
}
