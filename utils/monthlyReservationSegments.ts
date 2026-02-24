import { DayIndex, formatDay, parseDay } from './day';
import { clipIntervalToRange, getRenderIntervalInclusive, splitIntervalByWeeks } from './calendarIntervals';
import { ReservationLike, shouldRenderReservation } from './reservationIntervals';

export type MonthlyWeekSegment<T extends ReservationLike> = {
  key: string;
  reservation: T;
  weekStart: DayIndex;
  segStartDay: DayIndex;
  segEndDayInclusive: DayIndex;
  laneIndex: number;
};

export type BuildMonthlyReservationSegmentsOptions = {
  // Visible grid range (inclusive) e.g. 42-day month grid.
  visibleRangeInclusive: [DayIndex, DayIndex];
  // Week starts (DayIndex) for each of the 6 rows.
  weekStarts: DayIndex[];
  includeCancelled?: boolean;
};

type SegmentReservation<T extends ReservationLike> = ReservationLike & {
  // Unique per (reservation, weekStart)
  id: string;
  originalReservationId: string;
  originalReservation: T;
  weekStart: DayIndex;
  segStartDay: DayIndex;
  segEndDayInclusive: DayIndex;
};

function assignLanesStrictMonthly<T extends ReservationLike>(
  list: Array<SegmentReservation<T>>
): Array<SegmentReservation<T> & { laneIndex: number }> {
  const sorted = [...list].sort((a, b) => {
    if (a.segStartDay !== b.segStartDay) return a.segStartDay - b.segStartDay;
    // If start ties, place longer segments first for stability.
    if (a.segEndDayInclusive !== b.segEndDayInclusive) return b.segEndDayInclusive - a.segEndDayInclusive;
    return a.id.localeCompare(b.id);
  });

  const laneLastEnd: DayIndex[] = [];
  const out: Array<SegmentReservation<T> & { laneIndex: number }> = [];

  for (const item of sorted) {
    let laneIndex = -1;
    for (let i = 0; i < laneLastEnd.length; i++) {
      // Strictly ">" so sharing a day forces stacking (inclusive render).
      if (item.segStartDay > laneLastEnd[i]) {
        laneIndex = i;
        laneLastEnd[i] = item.segEndDayInclusive;
        break;
      }
    }
    if (laneIndex === -1) {
      laneIndex = laneLastEnd.length;
      laneLastEnd.push(item.segEndDayInclusive);
    }
    out.push({ ...item, laneIndex });
  }

  return out;
}

// Builds weekly-clipped segments for a classic 6x7 month grid.
// Lane assignment is strict: segStartDay > laneLastEndInclusiveDay.
// This ensures A 20->22 and B 22->24 are stacked on day 22.
export function buildMonthlyReservationSegmentsWithLanes<T extends ReservationLike>(
  reservations: T[],
  opts: BuildMonthlyReservationSegmentsOptions
): Array<MonthlyWeekSegment<T>> {
  const { visibleRangeInclusive, weekStarts, includeCancelled } = opts;
  const starts = Array.from(new Set(weekStarts)).sort((a, b) => a - b);

  // 1) Create raw segments clipped to visible range, then split by grid weeks.
  const raw: Array<{
    reservation: T;
    weekStart: DayIndex;
    segStartDay: DayIndex;
    segEndDayInclusive: DayIndex;
  }> = [];

  for (const r of reservations) {
    if (!shouldRenderReservation(r.status, { includeCancelled })) continue;

    const interval = getRenderIntervalInclusive(r);
    const clipped = clipIntervalToRange(interval, visibleRangeInclusive);
    if (!clipped) continue;

    const segs = splitIntervalByWeeks(clipped, starts);
    for (const seg of segs) {
      raw.push({
        reservation: r,
        weekStart: seg.weekStart,
        segStartDay: seg.segStart,
        segEndDayInclusive: seg.segEnd,
      });
    }
  }

  // 2) Group by weekStart and assign lanes within each week.
  const byWeek = new Map<DayIndex, Array<SegmentReservation<T>>>();
  for (const s of raw) {
    const list = byWeek.get(s.weekStart) || [];
    list.push({
      // NOTE: assignLanes relies on checkIn/checkOut, and render interval is inclusive.
      id: `${s.reservation.id}::${s.weekStart}`,
      apartmentId: s.reservation.apartmentId,
      checkIn: formatDay(s.segStartDay),
      checkOut: formatDay(s.segEndDayInclusive),
      status: s.reservation.status,
      originalReservationId: s.reservation.id,
      originalReservation: s.reservation,
      weekStart: s.weekStart,
      segStartDay: s.segStartDay,
      segEndDayInclusive: s.segEndDayInclusive,
    });
    byWeek.set(s.weekStart, list);
  }

  const out: Array<MonthlyWeekSegment<T>> = [];
  for (const [weekStart, list] of byWeek) {
    const assigned = assignLanesStrictMonthly(list);

    for (const a of assigned) {
      out.push({
        key: `${a.originalReservationId}::${weekStart}`,
        reservation: a.originalReservation,
        weekStart,
        segStartDay: a.segStartDay,
        segEndDayInclusive: a.segEndDayInclusive,
        laneIndex: a.laneIndex,
      });
    }
  }

  // Stable ordering for rendering.
  out.sort((a, b) => {
    if (a.weekStart !== b.weekStart) return a.weekStart - b.weekStart;
    if (a.laneIndex !== b.laneIndex) return a.laneIndex - b.laneIndex;
    if (a.segStartDay !== b.segStartDay) return a.segStartDay - b.segStartDay;
    if (a.segEndDayInclusive !== b.segEndDayInclusive) return a.segEndDayInclusive - b.segEndDayInclusive;
    return a.key.localeCompare(b.key);
  });

  return out;
}

// Quick validation (opt-in):
// - A: 2026-02-20 → 2026-02-22
// - B: 2026-02-22 → 2026-02-24
// Both include the 22 visually (inclusive). They must be in different lanes.
function __monthlyStrictLaneSelfTest() {
  const weekStart = parseDay('2026-02-16'); // Monday
  const weekStarts = [weekStart];
  const visibleRangeInclusive: [DayIndex, DayIndex] = [weekStart, (weekStart + 6) as DayIndex];

  const A: ReservationLike = {
    id: 'A',
    apartmentId: 'apt-1',
    checkIn: '2026-02-20',
    checkOut: '2026-02-22',
    status: 'CONFIRMED' as any,
  };
  const B: ReservationLike = {
    id: 'B',
    apartmentId: 'apt-1',
    checkIn: '2026-02-22',
    checkOut: '2026-02-24',
    status: 'CONFIRMED' as any,
  };

  const segs = buildMonthlyReservationSegmentsWithLanes([A, B], {
    visibleRangeInclusive,
    weekStarts,
    includeCancelled: false,
  });

  const aSeg = segs.find(s => s.key === `A::${weekStart}`);
  const bSeg = segs.find(s => s.key === `B::${weekStart}`);
  console.assert(!!aSeg && !!bSeg, '[monthly lanes strict] expected both segments in same week');
  if (!aSeg || !bSeg) return;
  console.assert(aSeg.laneIndex !== bSeg.laneIndex, '[monthly lanes strict] expected A and B to be stacked (different lanes)');

  const d22 = parseDay('2026-02-22');
  console.assert(aSeg.segEndDayInclusive === d22, '[monthly lanes strict] expected A to include 22 as segEndDayInclusive');
  console.assert(bSeg.segStartDay === d22, '[monthly lanes strict] expected B to include 22 as segStartDay');
}

if (typeof globalThis !== 'undefined' && (globalThis as any).__RP_RUN_MONTHLY_STRICT_LANES_TEST__ === true) {
  __monthlyStrictLaneSelfTest();
}
