import { Booking } from '../types';

type OriginInfo = {
  channelKey: string | null;
  label: string;
  detail: string | null;
  display: string;
};

const CHANNEL_LABELS: Record<string, string> = {
  AIRBNB: 'Airbnb',
  BOOKING: 'Booking',
  VRBO: 'Vrbo',
  WEBSITE: 'Web directa',
  AGENCY: 'Agencia',
  OTHER: 'Calendario externo',
};

const inferChannelKey = (booking: Partial<Booking>): string | null => {
  const source = `${booking.ota || ''} ${booking.source || ''} ${booking.external_ref || ''}`.toUpperCase();
  if (source.includes('AIRBNB')) return 'AIRBNB';
  if (source.includes('BOOKING')) return 'BOOKING';
  if (source.includes('VRBO')) return 'VRBO';
  if (source.includes('WEBSITE') || source.includes('DIRECT_WEB')) return 'WEBSITE';
  if (source.includes('AGENCY')) return 'AGENCY';
  if ((booking.event_origin || '').toLowerCase() === 'ical') return 'OTHER';
  return null;
};

const extractDetail = (booking: Partial<Booking>, channelKey: string | null): string | null => {
  const source = booking.source || '';
  const parenMatch = source.match(/\(([^)]+)\)/);
  if (parenMatch?.[1]) return parenMatch[1].trim();

  if (channelKey === 'OTHER' && source && source.toUpperCase() !== 'CALENDARIO') {
    return source.trim();
  }

  return null;
};

export const getBookingOriginInfo = (booking: Partial<Booking> | null | undefined): OriginInfo => {
  if (!booking) {
    return { channelKey: null, label: 'Manual', detail: null, display: 'Manual' };
  }

  const channelKey = inferChannelKey(booking);
  const label = channelKey
    ? CHANNEL_LABELS[channelKey] || channelKey
    : ((booking.source || '').trim() || 'Manual');
  const detail = extractDetail(booking, channelKey);
  const display = detail ? `${label} · ${detail}` : label;

  return { channelKey, label, detail, display };
};

export const getBookingCommissionChannelKey = (booking: Partial<Booking> | null | undefined): string | null => {
  return getBookingOriginInfo(booking).channelKey;
};
