export type DayIndex = number;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function assertFiniteInt(n: number, label: string): void {
  if (!Number.isFinite(n) || Math.floor(n) !== n) {
    throw new Error(`${label} must be a finite integer`);
  }
}

// Parses a YYYY-MM-DD day string to a UTC day index (days since Unix epoch).
// This avoids local timezone / DST issues.
export function parseDay(str: string): DayIndex {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(str);
  if (!m) throw new Error(`Invalid day format: ${str}`);

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  // Basic bounds (final validation is roundtrip check below)
  if (mo < 1 || mo > 12) throw new Error(`Invalid month in day: ${str}`);
  if (d < 1 || d > 31) throw new Error(`Invalid day in date: ${str}`);

  const ms = Date.UTC(y, mo - 1, d, 0, 0, 0, 0);
  const idx = Math.floor(ms / MS_PER_DAY);

  // Roundtrip validation to reject impossible dates (e.g. 2026-02-30)
  if (formatDay(idx) !== str) throw new Error(`Invalid calendar day: ${str}`);

  return idx;
}

export function formatDay(day: DayIndex): string {
  assertFiniteInt(day, 'day');
  const dt = new Date(day * MS_PER_DAY);
  const y = dt.getUTCFullYear();
  const mo = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

export function compareDays(a: DayIndex, b: DayIndex): number {
  assertFiniteInt(a, 'a');
  assertFiniteInt(b, 'b');
  return a === b ? 0 : (a < b ? -1 : 1);
}

export function* dayRangeInclusive(start: DayIndex, end: DayIndex): Iterable<DayIndex> {
  assertFiniteInt(start, 'start');
  assertFiniteInt(end, 'end');
  if (end < start) return;
  for (let d = start; d <= end; d++) yield d;
}

export function* dayRangeExclusive(start: DayIndex, end: DayIndex): Iterable<DayIndex> {
  assertFiniteInt(start, 'start');
  assertFiniteInt(end, 'end');
  if (end <= start) return;
  for (let d = start; d < end; d++) yield d;
}
