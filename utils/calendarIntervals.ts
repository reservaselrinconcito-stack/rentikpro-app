import { DayIndex } from './day';
import { getRenderInterval, ReservationLike } from './reservationIntervals';

export type InclusiveInterval = [startDay: DayIndex, endDayInclusive: DayIndex];

// Render interval is inclusive: [check_in, check_out]
export function getRenderIntervalInclusive(res: ReservationLike): InclusiveInterval {
  return getRenderInterval(res);
}

export function clipIntervalToRange(
  interval: InclusiveInterval,
  range: InclusiveInterval
): InclusiveInterval | null {
  const [s, e] = interval;
  const [rs, re] = range;
  const cs = Math.max(s, rs);
  const ce = Math.min(e, re);
  if (cs > ce) return null;
  return [cs, ce];
}

export function splitIntervalByWeeks(
  clipped: InclusiveInterval,
  weekStarts: DayIndex[]
): Array<{ weekStart: DayIndex; segStart: DayIndex; segEnd: DayIndex }> {
  const [cs, ce] = clipped;
  const starts = Array.from(new Set(weekStarts)).sort((a, b) => a - b);
  const out: Array<{ weekStart: DayIndex; segStart: DayIndex; segEnd: DayIndex }> = [];

  for (const weekStart of starts) {
    const weekEnd = weekStart + 6;
    if (weekEnd < cs) continue;
    if (weekStart > ce) break;

    const segStart = Math.max(cs, weekStart);
    const segEnd = Math.min(ce, weekEnd);
    if (segStart <= segEnd) out.push({ weekStart, segStart, segEnd });
  }

  return out;
}
