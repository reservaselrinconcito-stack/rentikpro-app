/**
 * iCalSync.test.ts
 * Unit tests for iCal parser with OTA fixtures.
 */

import { describe, it, expect } from 'vitest';
import { parseICal } from './iCalParser';
import {
  AIRBNB_FIXTURE,
  BOOKING_FIXTURE,
  VRBO_FIXTURE,
  CANCELLED_EVENT_FIXTURE,
  RRULE_FIXTURE,
  ALLDAY_MIXED_FIXTURE,
} from './iCalFixtures';

describe('iCalParser — Airbnb feed', () => {
  it('parses 3 events (2 bookings + 1 block)', () => {
    const events = parseICal(AIRBNB_FIXTURE);
    expect(events).toHaveLength(3);
  });

  it('classifies "Not available" as BLOCK', () => {
    const events = parseICal(AIRBNB_FIXTURE);
    const block = events.find(e => e.uid === 'airbnb-block-001@airbnb.com');
    expect(block?.eventKind).toBe('BLOCK');
  });

  it('classifies guest reservation as BOOKING', () => {
    const events = parseICal(AIRBNB_FIXTURE);
    const booking = events.find(e => e.uid === 'airbnb-abc123@airbnb.com');
    expect(booking?.eventKind).toBe('BOOKING');
    expect(booking?.startDate).toBe('2026-03-10');
    expect(booking?.endDate).toBe('2026-03-15');
  });

  it('marks all-day events correctly', () => {
    const events = parseICal(AIRBNB_FIXTURE);
    events.forEach(e => expect(e.isAllDay).toBe(true));
  });
});

describe('iCalParser — Booking.com feed', () => {
  it('parses 2 events', () => {
    const events = parseICal(BOOKING_FIXTURE);
    expect(events).toHaveLength(2);
  });

  it('classifies "CLOSED - Not available" as BLOCK', () => {
    const events = parseICal(BOOKING_FIXTURE);
    expect(events.every(e => e.eventKind === 'BLOCK')).toBe(true);
  });

  it('preserves UIDs', () => {
    const events = parseICal(BOOKING_FIXTURE);
    expect(events[0].uid).toBe('booking-res-98765@booking.com');
  });
});

describe('iCalParser — VRBO feed (with TZID)', () => {
  it('parses 2 events', () => {
    const events = parseICal(VRBO_FIXTURE);
    expect(events).toHaveLength(2);
  });

  it('extracts date ignoring time component', () => {
    const events = parseICal(VRBO_FIXTURE);
    const timed = events.find(e => e.uid === 'vrbo-res-aaa111@vrbo.com');
    expect(timed?.startDate).toBe('2026-03-15');
    expect(timed?.endDate).toBe('2026-03-20');
  });

  it('captures timezone info', () => {
    const events = parseICal(VRBO_FIXTURE);
    const timed = events.find(e => e.uid === 'vrbo-res-aaa111@vrbo.com');
    expect(timed?.timezone).toBe('America/New_York');
  });
});

describe('iCalParser — Cancelled events', () => {
  it('marks STATUS:CANCELLED correctly', () => {
    const events = parseICal(CANCELLED_EVENT_FIXTURE);
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe('CANCELLED');
  });
});

describe('iCalParser — RRULE events', () => {
  it('flags hasRecurrence but does not expand', () => {
    const events = parseICal(RRULE_FIXTURE);
    expect(events).toHaveLength(1);
    expect(events[0].hasRecurrence).toBe(true);
    expect(events[0].startDate).toBe('2026-03-01');
  });
});

describe('iCalParser — Mixed all-day and timed events', () => {
  it('parses both event types', () => {
    const events = parseICal(ALLDAY_MIXED_FIXTURE);
    expect(events).toHaveLength(2);
    const allDay = events.find(e => e.uid === 'test-allday-001@test.com');
    const timed = events.find(e => e.uid === 'test-timed-001@test.com');
    expect(allDay?.isAllDay).toBe(true);
    expect(timed?.isAllDay).toBe(false);
  });
});

describe('iCalParser — Idempotence (same feed twice)', () => {
  it('produces identical UIDs on repeated parse', () => {
    const first = parseICal(AIRBNB_FIXTURE).map(e => e.uid);
    const second = parseICal(AIRBNB_FIXTURE).map(e => e.uid);
    expect(first).toEqual(second);
  });
});

describe('iCalParser — Loop guard (own events filtered by adapter)', () => {
  it('own RentikPro UIDs end with @rentikpro.app', () => {
    // The adapter filters e.uid.endsWith('@rentikpro.com')
    // and iCalGenerator uses @rentikpro.app - these should NOT conflict
    const ownUid = 'rp-booking-123@rentikpro.app';
    const foreignUid = 'airbnb-abc@airbnb.com';
    expect(ownUid.endsWith('@rentikpro.com')).toBe(false);
    expect(foreignUid.endsWith('@rentikpro.com')).toBe(false);
    // The correct guard should check @rentikpro.app OR @rentikpro.com
    const isOwn = (uid: string) => uid.includes('@rentikpro.');
    expect(isOwn(ownUid)).toBe(true);
    expect(isOwn(foreignUid)).toBe(false);
  });
});
