import { DayIndex, formatDay } from './day';

export type MonthGridDay = {
  dayIndex: DayIndex;
  dateStr: string;
  inMonth: boolean;
};

export type MonthGrid = {
  year: number;
  month: number; // 0-11
  weeks: MonthGridDay[][]; // 6 rows x 7 cols
  days: MonthGridDay[]; // 42 days
  weekStarts: DayIndex[]; // length 6
  startDay: DayIndex;
  endDayInclusive: DayIndex;
  endDayExclusive: DayIndex;
  rangeInclusive: [DayIndex, DayIndex];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function buildMonthGrid(currentDate: Date): MonthGrid {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // IMPORTANT: DayIndex in this project is defined in UTC days since epoch.
  // All month grid calculations must therefore be done in UTC to avoid DST/timezone drift.
  const firstUTC = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const firstDayIndex = Math.floor(firstUTC.getTime() / MS_PER_DAY) as DayIndex;
  // Mon=0..Sun=6
  const offsetToMonday = (firstUTC.getUTCDay() + 6) % 7;

  const startDay = (firstDayIndex - offsetToMonday) as DayIndex;
  const endDayInclusive = (startDay + 42 - 1) as DayIndex;
  const endDayExclusive = (startDay + 42) as DayIndex;

  const weeks: MonthGridDay[][] = [];
  const weekStarts: DayIndex[] = [];
  for (let w = 0; w < 6; w++) {
    const week: MonthGridDay[] = [];
    const weekStart = (startDay + (w * 7)) as DayIndex;
    weekStarts.push(weekStart);
    for (let d = 0; d < 7; d++) {
      const idx = (weekStart + d) as DayIndex;
      const dt = new Date(idx * MS_PER_DAY);
      const inMonth = dt.getUTCFullYear() === year && dt.getUTCMonth() === month;
      week.push({ dayIndex: idx, dateStr: formatDay(idx), inMonth });
    }
    weeks.push(week);
  }

  const days = weeks.flat();

  return {
    year,
    month,
    weeks,
    days,
    weekStarts,
    startDay,
    endDayInclusive,
    endDayExclusive,
    rangeInclusive: [startDay, endDayInclusive],
  };
}
