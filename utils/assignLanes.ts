import { DayIndex } from './day';
import { getRenderInterval, ReservationLike, shouldRenderReservation } from './reservationIntervals';

export type LaneAssigned<T extends ReservationLike> = T & {
  laneIndex: number;
  renderStartDay: DayIndex;
  renderEndDayInclusive: DayIndex;
};

export type AssignLanesOptions = {
  // Visible calendar window (inclusive range). If omitted, no date filtering is applied.
  viewStartDay?: DayIndex;
  viewEndDayInclusive?: DayIndex;
  includeCancelled?: boolean;
};

// Assigns laneIndex so that within a single apartment row, render intervals do not overlap.
// IMPORTANT: Overlap is inclusive. If one ends on day E and another starts on day E,
// they overlap visually and must go to different lanes.
export function assignLanes<T extends ReservationLike>(
  reservationsForApartment: T[],
  opts: AssignLanesOptions = {}
): Array<LaneAssigned<T>> {
  const { viewStartDay, viewEndDayInclusive, includeCancelled } = opts;
  const hasView = viewStartDay !== undefined && viewEndDayInclusive !== undefined;

  const decorated = reservationsForApartment
    .filter(r => shouldRenderReservation(r.status, { includeCancelled }))
    .map(r => {
      const [s, e] = getRenderInterval(r);
      if (!hasView) return { r, s, e };
      const clippedS = Math.max(s, viewStartDay as DayIndex);
      const clippedE = Math.min(e, viewEndDayInclusive as DayIndex);
      return { r, s: clippedS, e: clippedE };
    })
    .filter(({ s, e }) => {
      if (!hasView) return true;
      // Intersects [viewStartDay, viewEndDayInclusive] with [s, e] (both inclusive)
      return e >= (viewStartDay as DayIndex) && s <= (viewEndDayInclusive as DayIndex);
    })
    .filter(({ s, e }) => e >= s)
    .sort((a, b) => {
      if (a.s !== b.s) return a.s - b.s;
      if (a.e !== b.e) return a.e - b.e;
      return String(a.r.id).localeCompare(String(b.r.id));
    });

  const lanes: Array<{ lastEndInclusiveDay: DayIndex }> = [];
  const out: Array<LaneAssigned<T>> = [];

  for (const { r, s, e } of decorated) {
    let laneIndex = -1;
    for (let i = 0; i < lanes.length; i++) {
      // Strictly ">" because if s === lastEnd, they share a day visually.
      if (s > lanes[i].lastEndInclusiveDay) {
        laneIndex = i;
        lanes[i].lastEndInclusiveDay = Math.max(lanes[i].lastEndInclusiveDay, e);
        break;
      }
    }

    if (laneIndex === -1) {
      laneIndex = lanes.length;
      lanes.push({ lastEndInclusiveDay: e });
    }

    out.push({
      ...r,
      laneIndex,
      renderStartDay: s,
      renderEndDayInclusive: e,
    });
  }

  return out;
}
