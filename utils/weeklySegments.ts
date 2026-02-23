import { DayIndex } from './day';
import { clipIntervalToRange, getRenderIntervalInclusive, splitIntervalByWeeks } from './calendarIntervals';
import { ReservationLike, ReservationStatus, shouldRenderReservation } from './reservationIntervals';

export type WeeklySegment = {
  reservationId: string;
  apartmentId: string;
  status: ReservationStatus;
  weekStart: DayIndex;
  segStart: DayIndex;
  segEnd: DayIndex;
  laneIndex: number;
};

export type BuildWeeklySegmentsOptions = {
  // Visible range is inclusive (e.g. monthly grid range).
  visibleRangeInclusive: [DayIndex, DayIndex];
  // Week starts (DayIndex) for the grid rows.
  weekStarts: DayIndex[];
  includeCancelled?: boolean;
};

// Builds weekly segments (inclusive) and assigns laneIndex per (apartmentId, weekStart).
// Lane assignment uses strict ">" so that if two segments share a day, they go to different lanes.
export function buildWeeklySegmentsWithLanes<T extends ReservationLike>(
  reservations: T[],
  opts: BuildWeeklySegmentsOptions
): WeeklySegment[] {
  const { visibleRangeInclusive, weekStarts, includeCancelled } = opts;
  const starts = Array.from(new Set(weekStarts)).sort((a, b) => a - b);

  // First: create clipped segments per week.
  const rawSegments: Array<Omit<WeeklySegment, 'laneIndex'>> = [];
  for (const r of reservations) {
    if (!shouldRenderReservation(r.status, { includeCancelled })) continue;

    const interval = getRenderIntervalInclusive(r);
    const clipped = clipIntervalToRange(interval, visibleRangeInclusive);
    if (!clipped) continue;

    const segs = splitIntervalByWeeks(clipped, starts);
    for (const seg of segs) {
      rawSegments.push({
        reservationId: r.id,
        apartmentId: r.apartmentId,
        status: r.status,
        weekStart: seg.weekStart,
        segStart: seg.segStart,
        segEnd: seg.segEnd,
      });
    }
  }

  // Group by (weekStart, apartmentId)
  const groups = new Map<string, Array<Omit<WeeklySegment, 'laneIndex'>>>();
  const keyOf = (weekStart: DayIndex, apartmentId: string) => `${weekStart}::${apartmentId}`;
  for (const s of rawSegments) {
    const k = keyOf(s.weekStart, s.apartmentId);
    const list = groups.get(k) || [];
    list.push(s);
    groups.set(k, list);
  }

  const out: WeeklySegment[] = [];
  for (const list of groups.values()) {
    // Sort by (segStart asc, segEnd asc, id)
    const sorted = [...list].sort((a, b) => {
      if (a.segStart !== b.segStart) return a.segStart - b.segStart;
      if (a.segEnd !== b.segEnd) return a.segEnd - b.segEnd;
      return String(a.reservationId).localeCompare(String(b.reservationId));
    });

    const lanes: Array<{ lastEndInclusive: DayIndex }> = [];
    for (const seg of sorted) {
      let laneIndex = -1;
      for (let i = 0; i < lanes.length; i++) {
        if (seg.segStart > lanes[i].lastEndInclusive) {
          laneIndex = i;
          lanes[i].lastEndInclusive = Math.max(lanes[i].lastEndInclusive, seg.segEnd);
          break;
        }
      }
      if (laneIndex === -1) {
        laneIndex = lanes.length;
        lanes.push({ lastEndInclusive: seg.segEnd });
      }
      out.push({ ...seg, laneIndex });
    }
  }

  // Stable output ordering: weekStart, apartmentId, laneIndex, segStart, segEnd, reservationId
  out.sort((a, b) => {
    if (a.weekStart !== b.weekStart) return a.weekStart - b.weekStart;
    if (a.apartmentId !== b.apartmentId) return a.apartmentId.localeCompare(b.apartmentId);
    if (a.laneIndex !== b.laneIndex) return a.laneIndex - b.laneIndex;
    if (a.segStart !== b.segStart) return a.segStart - b.segStart;
    if (a.segEnd !== b.segEnd) return a.segEnd - b.segEnd;
    return a.reservationId.localeCompare(b.reservationId);
  });

  return out;
}
