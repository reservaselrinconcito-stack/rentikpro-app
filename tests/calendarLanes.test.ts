import { describe, it, expect } from 'vitest';

import { parseDay } from '../utils/day';
import { getOccupancyInterval, getRenderInterval, shouldOccupyReservation } from '../utils/reservationIntervals';
import { assignLanes } from '../utils/assignLanes';

type R = {
  id: string;
  apartmentId: string;
  checkIn: string;
  checkOut: string;
  status: 'booked' | 'blocked' | 'cancelled';
};

const apt = 'apt_1';

const view = (start: string, end: string) => ({
  viewStartDay: parseDay(start),
  viewEndDayInclusive: parseDay(end),
});

describe('Calendar lane assignment + intervals', () => {
  it('1) A:20->22 and B:22->24 same apt => different lanes; render includes checkout day', () => {
    const A: R = { id: 'A', apartmentId: apt, checkIn: '2026-01-20', checkOut: '2026-01-22', status: 'booked' };
    const B: R = { id: 'B', apartmentId: apt, checkIn: '2026-01-22', checkOut: '2026-01-24', status: 'booked' };

    const [aS, aE] = getRenderInterval(A);
    const [bS, bE] = getRenderInterval(B);
    expect(aS).toBe(parseDay('2026-01-20'));
    expect(aE).toBe(parseDay('2026-01-22'));
    expect(bS).toBe(parseDay('2026-01-22'));
    expect(bE).toBe(parseDay('2026-01-24'));

    const assigned = assignLanes([A, B], { ...view('2026-01-01', '2026-01-31') });
    const byId = new Map(assigned.map(x => [x.id, x]));
    expect(byId.get('A')?.laneIndex).toBe(0);
    expect(byId.get('B')?.laneIndex).toBe(1);
  });

  it('2) A:20->22 and B:23->24 => can reuse same lane', () => {
    const A: R = { id: 'A', apartmentId: apt, checkIn: '2026-01-20', checkOut: '2026-01-22', status: 'booked' };
    const B: R = { id: 'B', apartmentId: apt, checkIn: '2026-01-23', checkOut: '2026-01-24', status: 'booked' };

    const assigned = assignLanes([A, B], { ...view('2026-01-01', '2026-01-31') });
    const byId = new Map(assigned.map(x => [x.id, x]));
    expect(byId.get('A')?.laneIndex).toBe(0);
    expect(byId.get('B')?.laneIndex).toBe(0);
  });

  it('3) Three overlapping reservations in render => lanes 0,1,2', () => {
    const A: R = { id: 'A', apartmentId: apt, checkIn: '2026-01-20', checkOut: '2026-01-24', status: 'booked' };
    const B: R = { id: 'B', apartmentId: apt, checkIn: '2026-01-21', checkOut: '2026-01-24', status: 'booked' };
    const C: R = { id: 'C', apartmentId: apt, checkIn: '2026-01-22', checkOut: '2026-01-24', status: 'booked' };

    const assigned = assignLanes([A, B, C], { ...view('2026-01-01', '2026-01-31') });
    const byId = new Map(assigned.map(x => [x.id, x]));
    expect(byId.get('A')?.laneIndex).toBe(0);
    expect(byId.get('B')?.laneIndex).toBe(1);
    expect(byId.get('C')?.laneIndex).toBe(2);
  });

  it('4) cancelled does not occupy business availability, but lane math is the same if included', () => {
    expect(shouldOccupyReservation('cancelled')).toBe(false);
    expect(shouldOccupyReservation('booked')).toBe(true);

    const booked: R = { id: 'A', apartmentId: apt, checkIn: '2026-01-20', checkOut: '2026-01-22', status: 'booked' };
    const cancelled: R = { id: 'C', apartmentId: apt, checkIn: '2026-01-22', checkOut: '2026-01-24', status: 'cancelled' };

    // Occupancy is exclusive-end by business rule
    const [oS, oE] = getOccupancyInterval(cancelled);
    expect(oS).toBe(parseDay('2026-01-22'));
    expect(oE).toBe(parseDay('2026-01-24'));

    // If we choose to render cancelled, it participates in the same lane rules.
    const assigned = assignLanes([booked, cancelled], {
      ...view('2026-01-01', '2026-01-31'),
      includeCancelled: true,
    });
    const byId = new Map(assigned.map(x => [x.id, x]));
    expect(byId.get('A')?.laneIndex).toBe(0);
    expect(byId.get('C')?.laneIndex).toBe(1);
  });

  it('5) View range: only reservations intersecting the view participate (compact lanes for that view)', () => {
    const A: R = { id: 'A', apartmentId: apt, checkIn: '2026-01-10', checkOut: '2026-01-20', status: 'booked' };
    const B: R = { id: 'B', apartmentId: apt, checkIn: '2026-01-15', checkOut: '2026-01-25', status: 'booked' };

    // View is after A ends, so only B is considered.
    const assigned = assignLanes([A, B], { ...view('2026-01-21', '2026-01-22') });
    expect(assigned.map(x => x.id)).toEqual(['B']);
    expect(assigned[0].laneIndex).toBe(0);
    // Visual interval is clipped to the view window by assignLanes when view is provided.
    expect(assigned[0].renderStartDay).toBe(parseDay('2026-01-21'));
    expect(assigned[0].renderEndDayInclusive).toBe(parseDay('2026-01-22'));
  });
});
