/**
 * iCalDedupeService.ts
 * Fingerprint-based deduplication for calendar events from multiple OTA channels.
 *
 * Logic:
 *  - BLOCK events: FP = property_id|apartment_id|start_date|end_date|BLOCK
 *  - BOOKING events: FP = property_id|apartment_id|start_date|end_date|normalizedName|pax
 *  - Group events by FP, elect one "master" (highest channel priority + most data).
 *  - Mark non-masters with is_duplicate=1 and store linked_sources[] JSON.
 */

import type { CalendarEvent } from '../types';

// Channel priority: lower = higher priority (wins dedup)
const DEFAULT_CHANNEL_PRIORITY: Record<string, number> = {
  BOOKING: 10,
  AIRBNB: 20,
  VRBO: 30,
  ESCAPADA_RURAL: 40,
  MANUAL: 5,
};

const BLOCK_TOKENS = new Set([
  'blocked', 'block', 'unavailable', 'closed', 'reserved', 'not available',
  'no disponible', 'bloqueo', 'bloquear', 'bloqueado', 'sin reserva',
  'maintenance', 'mantenimiento', 'owner', 'propietario',
]);

const OTA_NOISE_TOKENS = new RegExp(
  '\\b(airbnb|booking|vrbo|abritel|homeaway|tripadvisor|escapada rural|escapadarural|' +
  'confirmed|confirmation|reservation|booking reference|ref:|id:)\\b',
  'gi'
);

export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(OTA_NOISE_TOKENS, '')
    .replace(/[^a-záéíóúüñ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isBlockSummary(summary: string, eventKind?: string): boolean {
  if (eventKind === 'BLOCK') return true;
  const n = normalizeText(summary || '');
  if (!n || /^\d+$/.test(n)) return true;
  const words = n.split(/\s+/);
  return words.length <= 3 && words.every(w => BLOCK_TOKENS.has(w) || /^\d+$/.test(w));
}

export function computeFingerprint(evt: CalendarEvent): string {
  const base = `${evt.property_id || ''}|${evt.apartment_id || ''}|${evt.start_date}|${evt.end_date}`;
  const kind = (evt as any).event_kind;

  if (isBlockSummary(evt.summary || '', kind)) {
    return `${base}|BLOCK`;
  }

  const name = normalizeText(evt.summary || '');
  const pax = String((evt as any).guests || 0);
  return `${base}|${name}|${pax}`;
}

function channelPriority(channelName: string): number {
  const key = (channelName || '').toUpperCase().replace(/[^A-Z_]/g, '_');
  for (const [k, v] of Object.entries(DEFAULT_CHANNEL_PRIORITY)) {
    if (key.includes(k)) return v;
  }
  return 99;
}

function eventDataScore(evt: CalendarEvent): number {
  let score = 0;
  if (evt.summary && evt.summary.trim() && !isBlockSummary(evt.summary)) score += 10;
  if (evt.description && evt.description.trim()) score += 5;
  if ((evt as any).guests > 0) score += 3;
  if ((evt as any).event_kind === 'BOOKING') score += 2;
  return score;
}

export interface DedupeResult {
  masters: CalendarEvent[];
  duplicates: CalendarEvent[];
  masterMap: Map<string, CalendarEvent>;
}

/**
 * Given a list of events (typically all events for one property/apartment after a sync),
 * return masters (to keep visible) and duplicates (to hide).
 * Mutates events: sets fingerprint, master_event_id, is_duplicate, linked_sources.
 */
export function dedupeEvents(
  events: CalendarEvent[],
  connectionChannelMap: Map<string, string> = new Map()
): DedupeResult {
  const groups = new Map<string, CalendarEvent[]>();

  for (const evt of events) {
    if (evt.status === 'cancelled') continue;
    const fp = computeFingerprint(evt);
    (evt as any).fingerprint = fp;
    if (!groups.has(fp)) groups.set(fp, []);
    groups.get(fp)!.push(evt);
  }

  const masters: CalendarEvent[] = [];
  const duplicates: CalendarEvent[] = [];
  const masterMap = new Map<string, CalendarEvent>();

  for (const [fp, group] of groups) {
    if (group.length === 1) {
      const evt = group[0];
      (evt as any).is_duplicate = 0;
      (evt as any).master_event_id = null;
      (evt as any).linked_sources = null;
      masters.push(evt);
      masterMap.set(fp, evt);
      continue;
    }

    // Sort: highest data score first, then by channel priority
    group.sort((a, b) => {
      const scoreDiff = eventDataScore(b) - eventDataScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      const chA = connectionChannelMap.get(a.connection_id || '') || '';
      const chB = connectionChannelMap.get(b.connection_id || '') || '';
      return channelPriority(chA) - channelPriority(chB);
    });

    const master = group[0];
    const linkedSources = group.map(e => ({
      connection_id: e.connection_id,
      channel: connectionChannelMap.get(e.connection_id || '') || 'unknown',
      uid: (e as any).ical_uid || e.external_uid,
      summary: e.summary,
      event_id: e.id,
    }));

    (master as any).is_duplicate = 0;
    (master as any).master_event_id = null;
    (master as any).linked_sources = JSON.stringify(linkedSources);
    masters.push(master);
    masterMap.set(fp, master);

    for (let i = 1; i < group.length; i++) {
      (group[i] as any).is_duplicate = 1;
      (group[i] as any).master_event_id = master.id;
      (group[i] as any).linked_sources = null;
      duplicates.push(group[i]);
    }
  }

  // Cancelled events always pass through as non-duplicate
  for (const evt of events) {
    if (evt.status === 'cancelled') {
      (evt as any).is_duplicate = 0;
      masters.push(evt);
    }
  }

  return { masters, duplicates, masterMap };
}
