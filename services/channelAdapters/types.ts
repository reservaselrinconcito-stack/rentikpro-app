
import { ChannelConnection, CalendarEvent, PricingRule } from '../../types';

export interface SyncResult {
  events: Partial<CalendarEvent>[];
  metadataUpdates: Partial<ChannelConnection>; // ETag, Hash, LastModified updates
  log: string;
  // Optional typed status for non-fatal provider blocks (anti-bot/captcha).
  status?: 'ok' | 'blocked';
  reason?: string;
}

export interface IChannelAdapter {
  /**
   * Descarga reservas y bloqueos desde el canal.
   * Equivalente a GET /reservations o GET /ical
   */
  pullReservations(connection: ChannelConnection): Promise<SyncResult>;

  /**
   * (Futuro) Envía disponibilidad (Inventario).
   */
  pushAvailability(connection: ChannelConnection, availability: any): Promise<void>;

  /**
   * (Futuro) Envía tarifas diarias.
   */
  pushRates(connection: ChannelConnection, rates: any): Promise<void>;

  /**
   * (Futuro) Comprueba estado de conexión API.
   */
  getSyncStatus(connection: ChannelConnection): Promise<'OK' | 'ERROR' | 'EXPIRED'>;
}
