/**
 * Tests for iCalDedupeService
 * Run: npm test services/iCalDedupeService.test.ts
 */
import { describe, it, expect } from 'vitest';
import { computeFingerprint, dedupeEvents, normalizeText, isBlockSummary } from '../iCalDedupeService';
import type { CalendarEvent } from '../../types';

const makeEvent = (overrides: Partial<CalendarEvent> & Record<string, any>): CalendarEvent =>
  ({
    id: `evt-${Math.random().toString(36).slice(2)}`,
    connection_id: 'conn-1',
    apartment_id: 'apt-1',
    property_id: 'prop-1',
    external_uid: 'uid-1',
    start_date: '2026-06-01',
    end_date: '2026-06-07',
    status: 'confirmed',
    summary: 'John Doe',
    description: '',
    raw_data: '',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  } as CalendarEvent);

// ------- normalizeText -------
describe('normalizeText', () => {
  it('lowercases and trims', () => {
    expect(normalizeText('  JOHN DOE  ')).toBe('john doe');
  });
  it('removes OTA noise', () => {
    expect(normalizeText('Airbnb (John Doe)')).toContain('john doe');
    expect(normalizeText('Booking reservation John')).toContain('john');
  });
});

// ------- isBlockSummary -------
describe('isBlockSummary', () => {
  it('detects BLOCK event_kind', () => {
    expect(isBlockSummary('Reserved', 'BLOCK')).toBe(true);
  });
  it('detects "Blocked" summary', () => {
    expect(isBlockSummary('Blocked')).toBe(true);
  });
  it('detects numeric-only summary', () => {
    expect(isBlockSummary('0')).toBe(true);
    expect(isBlockSummary('123')).toBe(true);
  });
  it('does NOT flag real name as block', () => {
    expect(isBlockSummary('Maria García')).toBe(false);
  });
});

// ------- computeFingerprint -------
describe('computeFingerprint', () => {
  it('produces stable fingerprint for same event', () => {
    const e = makeEvent({ summary: 'John Doe', guests: 2 });
    expect(computeFingerprint(e)).toBe(computeFingerprint(e));
  });

  it('BLOCK fingerprint ignores guest name', () => {
    const block1 = makeEvent({ summary: 'Blocked', event_kind: 'BLOCK' });
    const block2 = makeEvent({ summary: 'Not available', event_kind: 'BLOCK' });
    expect(computeFingerprint(block1)).toBe(computeFingerprint(block2));
  });

  it('different dates produce different FP', () => {
    const e1 = makeEvent({ start_date: '2026-06-01', end_date: '2026-06-05' });
    const e2 = makeEvent({ start_date: '2026-06-02', end_date: '2026-06-05' });
    expect(computeFingerprint(e1)).not.toBe(computeFingerprint(e2));
  });
});

// ------- dedupeEvents -------
describe('dedupeEvents — 3 events same stay → 1 master + 2 duplicates', () => {
  const base = { start_date: '2026-07-10', end_date: '2026-07-15', summary: 'Alice Smith', guests: 2 };
  const e1 = makeEvent({ ...base, id: 'e1', connection_id: 'conn-airbnb' });
  const e2 = makeEvent({ ...base, id: 'e2', connection_id: 'conn-booking', description: 'Extra info' });
  const e3 = makeEvent({ ...base, id: 'e3', connection_id: 'conn-vrbo' });

  const channelMap = new Map([['conn-airbnb', 'AIRBNB'], ['conn-booking', 'BOOKING'], ['conn-vrbo', 'VRBO']]);

  it('produces exactly 1 master', () => {
    const { masters } = dedupeEvents([e1, e2, e3], channelMap);
    expect(masters.filter(m => m.status !== 'cancelled')).toHaveLength(1);
  });

  it('produces exactly 2 duplicates', () => {
    const { duplicates } = dedupeEvents([e1, e2, e3], channelMap);
    expect(duplicates).toHaveLength(2);
  });

  it('master has highest data score (Booking with description wins)', () => {
    const { masters } = dedupeEvents([e1, e2, e3], channelMap);
    expect(masters[0].id).toBe('e2'); // Booking conn with description
  });

  it('duplicates have is_duplicate=1', () => {
    const { duplicates } = dedupeEvents([e1, e2, e3], channelMap);
    expect(duplicates.every(d => (d as any).is_duplicate === 1)).toBe(true);
  });

  it('master has linked_sources JSON', () => {
    const { masters } = dedupeEvents([e1, e2, e3], channelMap);
    const sources = JSON.parse((masters[0] as any).linked_sources);
    expect(sources).toHaveLength(3);
  });
});

describe('dedupeEvents — multiple BLOCKs → 1 master', () => {
  const b1 = makeEvent({ id: 'b1', summary: 'Blocked', event_kind: 'BLOCK', connection_id: 'conn-airbnb' });
  const b2 = makeEvent({ id: 'b2', summary: 'Not available', event_kind: 'BLOCK', connection_id: 'conn-booking' });
  const b3 = makeEvent({ id: 'b3', summary: 'Closed', event_kind: 'BLOCK', connection_id: 'conn-vrbo' });

  it('3 blocks same dates → 1 master', () => {
    const { masters, duplicates } = dedupeEvents([b1, b2, b3]);
    expect(masters.filter(m => m.status !== 'cancelled')).toHaveLength(1);
    expect(duplicates).toHaveLength(2);
  });
});

describe('dedupeEvents — label never returns "0"', () => {
  it('event with summary "0" gets correct FP as BLOCK', () => {
    const e = makeEvent({ summary: '0', event_kind: 'BOOKING' });
    const fp = computeFingerprint(e);
    expect(fp).toContain('BLOCK'); // "0" is treated as block (numeric-only)
  });
});
