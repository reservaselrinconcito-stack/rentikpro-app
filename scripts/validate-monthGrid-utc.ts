import { buildMonthGrid } from '../utils/monthGrid';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function assert(cond: any, msg: string) {
  console.assert(!!cond, msg);
  if (!cond) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function validate(date: Date) {
  const g = buildMonthGrid(date);

  assert(g.days.length === 42, `days.length should be 42 (got ${g.days.length})`);
  assert(g.weeks.length === 6, `weeks.length should be 6 (got ${g.weeks.length})`);
  for (const [i, w] of g.weeks.entries()) {
    assert(w.length === 7, `weeks[${i}].length should be 7 (got ${w.length})`);
  }

  for (let i = 0; i < 6; i++) {
    const expected = g.startDay + (i * 7);
    assert(g.weekStarts[i] === expected, `weekStarts[${i}] should equal startDay + ${i}*7`);
    const dow = new Date(g.weekStarts[i] * MS_PER_DAY).getUTCDay();
    assert(dow === 1, `weekStarts[${i}] should be Monday UTC (getUTCDay()=${dow})`);
  }

  console.log('[monthGrid UTC] OK', {
    input: date.toString(),
    year: g.year,
    month: g.month,
    startDay: g.startDay,
    endDayInclusive: g.endDayInclusive,
  });
}

// Run a few representative dates (including DST seasons in many timezones).
validate(new Date());
validate(new Date(2026, 2, 15)); // Mar
validate(new Date(2026, 9, 15)); // Oct
