
import { IChannelAdapter, SyncResult } from './types';
import { ChannelConnection, CalendarEvent } from '../../types';
import { parseICal } from '../iCalParser';
import { networkMonitor } from '../networkMonitor';
import { iCalLogger } from '../iCalLogger';
import { invoke } from '@tauri-apps/api/core';

interface IcalFetchResult {
   status: number;
   body: string;
   etag?: string;
   last_modified?: string;
   content_type?: string;
}

// Fetch via Tauri Rust command (no CORS, no Origin header).
// Falls back to browser fetch when not in Tauri (dev/web mode).
async function icalFetch(url: string, etag?: string, lastModified?: string): Promise<{ status: number; body: string; etag?: string; lastModified?: string; contentType?: string }> {
   try {
      const result = await invoke<IcalFetchResult>('fetch_ical_url', {
         url,
         etag: etag ?? null,
         lastModified: lastModified ?? null,
      });
      return { status: result.status, body: result.body, etag: result.etag, lastModified: result.last_modified, contentType: result.content_type };
   } catch {
      const headers: HeadersInit = { 'Accept': 'text/calendar, text/plain, */*' };
      if (etag) headers['If-None-Match'] = etag;
      if (lastModified) headers['If-Modified-Since'] = lastModified;
      const resp = await fetch(url, { headers });
      const body = await resp.text();
      return {
         status: resp.status,
         body,
         etag: resp.headers.get('etag') ?? undefined,
         lastModified: resp.headers.get('last-modified') ?? undefined,
         contentType: resp.headers.get('content-type') ?? undefined,
      };
   }
}


// Helper for hashing
const hashContent = async (text: string): Promise<string> => {
   const msgUint8 = new TextEncoder().encode(text);
   const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
   const hashArray = Array.from(new Uint8Array(hashBuffer));
   return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export class ICalAdapter implements IChannelAdapter {

   async pullReservations(conn: ChannelConnection): Promise<SyncResult> {
      if (!conn.ical_url) throw new Error("URL iCal vacía");

      if (typeof window !== 'undefined' && localStorage.getItem('active_project_mode') === 'demo') {
         iCalLogger.logWarn('SYNC', 'Demo mode detected, skipping remote sync.');
         return { events: [], metadataUpdates: {}, log: 'Sincronización omitida (Modo DEMO)' };
      }

      if (conn.ical_url.startsWith('mock://')) {
         iCalLogger.logInfo('FETCH', 'Using Mock URL', { url: conn.ical_url });
         return { events: [], metadataUpdates: {}, log: 'Simulación completada (Mock)' };
      }

      if (!networkMonitor.isOnline()) throw new Error("Offline");

      const isVrbo = /vrbo|abritel|fewo-direkt/i.test(conn.ical_url);

      iCalLogger.logInfo('FETCH', 'Fetching via native HTTP', { url: conn.ical_url.substring(0, 60) + '...' });

      let result: { status: number; body: string; etag?: string; lastModified?: string; contentType?: string };
      try {
         result = await icalFetch(conn.ical_url, conn.http_etag ?? undefined, conn.http_last_modified ?? undefined);
      } catch (err: any) {
         iCalLogger.logError('FETCH', `Error: ${err.message}`);
         throw new Error(`Error de conexión: ${err.message}`);
      }

      const { status, body: bodyText, etag: newEtag, lastModified: newLastMod, contentType } = result;

      if (status === 304) {
         return { events: [], metadataUpdates: {}, log: 'Sin cambios (304 Not Modified)' };
      }

      if (status === 401 || status === 403) {
         const looksHtml = (contentType || '').includes('text/html') || bodyText.trim().toLowerCase().startsWith('<!doctype html');
         if (looksHtml) {
            iCalLogger.logWarn('VALIDATE', 'Blocked by provider (HTML on error status)', { status });
            return { events: [], metadataUpdates: {}, status: 'blocked' as any, reason: 'anti-bot', log: 'Bloqueado por proveedor (Anti-bot).' };
         }
         if (status === 401 && bodyText.includes("Invalid Token")) {
            const e = new Error("Token de Booking inválido o caducado. Por favor, pega un nuevo enlace.");
            (e as any).fatal = true; throw e;
         }
         throw new Error("El proveedor rechazó la petición (403). Revisa la URL o el token.");
      }

      if (status === 429) throw new Error("Límite de peticiones alcanzado (429).");
      if (status >= 500) throw new Error(`Error del servidor: HTTP ${status}`);
      if (status >= 400) throw new Error(`HTTP ${status}: ${bodyText.substring(0, 120)}`);

      const isHtml = (contentType || '').includes('text/html') ||
         bodyText.trim().toLowerCase().startsWith('<!doctype html') ||
         bodyText.includes('<html');

      if (isHtml) {
         iCalLogger.logError('VALIDATE', 'Received HTML instead of iCal', { contentType });
         throw new Error(`${isVrbo ? 'VRBO' : 'La plataforma'} devolvió HTML en lugar del calendario. Posible Captcha/Anti-bot.`);
      }

      if (!bodyText.includes('BEGIN:VCALENDAR')) {
         iCalLogger.logError('VALIDATE', 'Invalid iCal (MISSING BEGIN:VCALENDAR)');
         throw new Error("Contenido inválido: no es un iCal válido.");
      }

      const currentHash = await hashContent(bodyText);

      if (conn.content_hash === currentHash) {
         return { events: [], metadataUpdates: { http_etag: newEtag }, log: 'Sin cambios (Hash Local)' };
      }

      const rawEvents = parseICal(bodyText);
      const validRawEvents = rawEvents.filter(e => {
         const hasDates = e.startDate && e.endDate;
         const isOwnEvent = e.uid && e.uid.includes('@rentikpro.');
         return hasDates && !isOwnEvent;
      });

      const mappedEvents: Partial<CalendarEvent>[] = validRawEvents.map(raw => ({
         external_uid: raw.uid,
         ical_uid: raw.uid,
         event_kind: raw.eventKind,
         start_date: raw.startDate,
         end_date: raw.endDate,
         status: raw.status === 'CANCELLED' ? 'cancelled' : 'confirmed',
         summary: raw.summary,
         description: raw.description,
         raw_data: raw.raw
      }));

      return {
         events: mappedEvents,
         metadataUpdates: { content_hash: currentHash, http_etag: newEtag, http_last_modified: newLastMod },
         log: `Descarga OK (${validRawEvents.length} eventos) - Native HTTP`
      };
   }

   async pushAvailability(connection: ChannelConnection, availability: any): Promise<void> {
      console.warn("Push Availability not supported for iCal (Read Only)");
   }

   async pushRates(connection: ChannelConnection, rates: any): Promise<void> {
      console.warn("Push Rates not supported for iCal (Read Only)");
   }

   async getSyncStatus(connection: ChannelConnection): Promise<'OK' | 'ERROR' | 'EXPIRED'> {
      return 'OK'; // Passive check
   }
}
