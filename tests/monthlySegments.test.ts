import { describe, it, expect } from 'vitest';

import { parseDay } from '../utils/day';
import { buildWeeklySegmentsWithLanes } from '../utils/weeklySegments';
import { shouldOccupyReservation } from '../utils/reservationIntervals';

type R = {
  id: string;
  apartmentId: string;
  checkIn: string;
  checkOut: string;
  status: 'booked' | 'blocked' | 'cancelled';
};

const apt = 'apt_1';

const weekStart = (d: string) => parseDay(d);
const range = (s: string, e: string): [number, number] => [parseDay(s), parseDay(e)];

describe('Monthly weekly segments + lane assignment (per apartment, per week)', () => {
  it('1) Same week: A 20->22 and B 22->24 => both include 22, lanes 0 and 1', () => {
    const A: R = { id: 'A', apartmentId: apt, checkIn: '2026-01-20', checkOut: '2026-01-22', status: 'booked' };
    const B: R = { id: 'B', apartmentId: apt, checkIn: '2026-01-22', checkOut: '2026-01-24', status: 'booked' };

    const ws = weekStart('2026-01-19');
    const segments = buildWeeklySegmentsWithLanes([A, B], {
      visibleRangeInclusive: range('2026-01-19', '2026-01-25'),
      weekStarts: [ws],
    });

    const aSeg = segments.find(s => s.reservationId === 'A')!;
    const bSeg = segments.find(s => s.reservationId === 'B')!;

    expect(aSeg.weekStart).toBe(ws);
    expect(bSeg.weekStart).toBe(ws);
    expect(aSeg.segEnd).toBe(parseDay('2026-01-22'));
    expect(bSeg.segStart).toBe(parseDay('2026-01-22'));
    expect(aSeg.laneIndex).toBe(0);
    expect(bSeg.laneIndex).toBe(1);
  });

  it('2) No overlap: A 20->22 and B 23->24 => same lane', () => {
    const A: R = { id: 'A', apartmentId: apt, checkIn: '2026-01-20', checkOut: '2026-01-22', status: 'booked' };
    const B: R = { id: 'B', apartmentId: apt, checkIn: '2026-01-23', checkOut: '2026-01-24', status: 'booked' };
    const ws = weekStart('2026-01-19');

    const segments = buildWeeklySegmentsWithLanes([A, B], {
      visibleRangeInclusive: range('2026-01-19', '2026-01-25'),
      weekStarts: [ws],
    });
    const byId = new Map(segments.map(s => [s.reservationId, s]));
    expect(byId.get('A')?.laneIndex).toBe(0);
    expect(byId.get('B')?.laneIndex).toBe(0);
  });

  it('3) Cross week: A 27->30 and B 30->31 => in week of 30, lanes differ', () => {
    const A: R = { id: 'A', apartmentId: apt, checkIn: '2026-01-27', checkOut: '2026-01-30', status: 'booked' };
    const B: R = { id: 'B', apartmentId: apt, checkIn: '2026-01-30', checkOut: '2026-01-31', status: 'booked' };
    const ws = weekStart('2026-01-26');

    const segments = buildWeeklySegmentsWithLanes([A, B], {
      visibleRangeInclusive: range('2026-01-26', '2026-02-01'),
      weekStarts: [ws],
    });

    const byId = new Map(segments.map(s => [s.reservationId, s]));
    expect(byId.get('A')?.segEnd).toBe(parseDay('2026-01-30'));
    expect(byId.get('B')?.segStart).toBe(parseDay('2026-01-30'));
    expect(byId.get('A')?.laneIndex).toBe(0);
    expect(byId.get('B')?.laneIndex).toBe(1);
  });

  it('4) Cross month: A 2026-01-28 -> 2026-02-03 clipped to month grid and split by weeks', () => {
    const A: R = { id: 'A', apartmentId: apt, checkIn: '2026-01-28', checkOut: '2026-02-03', status: 'booked' };

    // Feb 2026 grid (Mon start): 2026-01-26 .. 2026-03-08
    const monthRange = range('2026-01-26', '2026-03-08');
    const weekStarts = [
      weekStart('2026-01-26'),
      weekStart('2026-02-02'),
      weekStart('2026-02-09'),
      weekStart('2026-02-16'),
      weekStart('2026-02-23'),
      weekStart('2026-03-02'),
    ];

    const segments = buildWeeklySegmentsWithLanes([A], {
      visibleRangeInclusive: monthRange,
      weekStarts,
    });

    // Expect two segments: week of 2026-01-26 and week of 2026-02-02
    expect(segments.map(s => s.weekStart)).toEqual([weekStart('2026-01-26'), weekStart('2026-02-02')]);
    expect(segments[0].segStart).toBe(parseDay('2026-01-28'));
    expect(segments[0].segEnd).toBe(parseDay('2026-02-01'));
    expect(segments[1].segStart).toBe(parseDay('2026-02-02'));
    expect(segments[1].segEnd).toBe(parseDay('2026-02-03'));
  });

  it('5) Cancelled: does not affect occupancy; if rendered, lanes are computed the same', () => {
    expect(shouldOccupyReservation('cancelled')).toBe(false);

    const booked: R = { id: 'A', apartmentId: apt, checkIn: '2026-01-20', checkOut: '2026-01-22', status: 'booked' };
    const cancelled: R = { id: 'C', apartmentId: apt, checkIn: '2026-01-22', checkOut: '2026-01-24', status: 'cancelled' };
    const ws = weekStart('2026-01-19');

    const segments = buildWeeklySegmentsWithLanes([booked, cancelled], {
      visibleRangeInclusive: range('2026-01-19', '2026-01-25'),
      weekStarts: [ws],
      includeCancelled: true,
    });

    const byId = new Map(segments.map(s => [s.reservationId, s]));
    expect(byId.get('A')?.laneIndex).toBe(0);
    expect(byId.get('C')?.laneIndex).toBe(1);
  });
});
