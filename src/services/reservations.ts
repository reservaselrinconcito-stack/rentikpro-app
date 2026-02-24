import { dbQueue } from "./dbQueue";
import { getDbReady } from "./sqliteStore";
import { emit } from "./events";

export async function saveReservation(payload: any) {
  return dbQueue(async () => {
    const db = await getDbReady();
    // ... TU SQL REAL (INSERT/UPDATE)
    // return ...
    void payload;
    void db;

    // al final de saveReservation/delete/etc:
    emit("reservations:changed");
  });
}

export async function deleteReservation(id: string) {
  return dbQueue(async () => {
    const db = await getDbReady();
    // ... TU SQL REAL (DELETE o soft delete)
    void id;
    void db;

    // al final de saveReservation/delete/etc:
    emit("reservations:changed");
  });
}
