import { DayIndex, parseDay } from './day';

export type ReservationStatus = 'booked' | 'blocked' | 'cancelled' | string;

export type ReservationLike = {
  id: string;
  apartmentId: string;
  checkIn: string;  // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  status: ReservationStatus;
};

// Business occupancy: [checkIn, checkOut) (checkOut is exclusive)
export function getOccupancyInterval(res: ReservationLike): [startDay: DayIndex, endDayExclusive: DayIndex] {
  const start = parseDay(res.checkIn);
  const end = parseDay(res.checkOut);

  // If data is inconsistent (checkout before checkin), keep it non-crashing and empty.
  const endExclusive = end < start ? start : end;
  return [start, endExclusive];
}

// Visual render: [checkIn, checkOut] (checkOut is inclusive)
// Rule: if checkOut === checkIn, render at least 1 day (start===end).
export function getRenderInterval(res: ReservationLike): [startDay: DayIndex, endDayInclusive: DayIndex] {
  const start = parseDay(res.checkIn);
  const end = parseDay(res.checkOut);

  const endInclusive = end < start ? start : end;
  return [start, endInclusive];
}

export function shouldRenderReservation(status: ReservationStatus, opts?: { includeCancelled?: boolean }): boolean {
  if (status === 'booked' || status === 'blocked') return true;
  if (status === 'cancelled') return !!opts?.includeCancelled;
  // Unknown statuses: default to render to avoid hiding data unexpectedly.
  return true;
}

export function shouldOccupyReservation(status: ReservationStatus): boolean {
  if (status === 'cancelled') return false;
  if (status === 'booked' || status === 'blocked') return true;
  return true;
}
