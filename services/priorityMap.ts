
import { ChannelConnection } from '../types';

export const CHANNEL_PRIORITIES: Record<string, number> = {
  'MANUAL': 100, // Bloqueo manual (Máxima prioridad)
  'BOOKING': 90,
  'AIRBNB': 80,
  'WEBSITE': 60,
  'AGENCY': 50,
  'VRBO': 40,    // Mapeo extra común
  'OTHER': 10,   // Import genérico
  'ICAL': 10     // Fallback
};

export const getChannelPriority = (channelName: string): number => {
  // Normalización básica para evitar errores de casing
  const key = channelName?.toUpperCase();
  return CHANNEL_PRIORITIES[key] || 10;
};
