
import { IChannelAdapter, SyncResult } from './types';
import { ChannelConnection, CalendarEvent } from '../../types';
import { parseICal } from '../iCalParser';
import { getProxyUrl, rotateProxy } from '../syncEngine';
import { networkMonitor } from '../networkMonitor';
import { iCalLogger } from '../iCalLogger';
import { EnrichedResponse, proxyFetch } from '../fetchWrapper';

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

      // DEMO PROTECTION
      if (typeof window !== 'undefined' && localStorage.getItem('active_project_mode') === 'demo') {
         iCalLogger.logWarn('SYNC', 'Demo mode detected, skipping remote sync.');
         return { events: [], metadataUpdates: {}, log: 'Sincronización omitida (Modo DEMO)' };
      }

      // MOCK SUPPORT
      if (conn.ical_url.startsWith('mock://')) {
         iCalLogger.logInfo('FETCH', 'Using Mock URL', { url: conn.ical_url });
         return {
            events: [],
            metadataUpdates: {},
            log: 'Simulación completada (Mock)'
         };
      }

      if (!networkMonitor.isOnline()) throw new Error("Offline");

      const isVrbo = /vrbo|abritel|fewo-direkt/i.test(conn.ical_url);

      const headers: HeadersInit = {
         // NOTE: Do not set forbidden headers like UA in browser fetch.
         'Accept': 'text/calendar, text/plain, */*'
      };
      if (conn.http_etag) headers['If-None-Match'] = conn.http_etag;

      let response: EnrichedResponse | null = null;
      let usedProxy = false;

      // STRATEGY: Direct vs Proxy
      if (conn.force_direct) {
         try {
            iCalLogger.logInfo('FETCH', 'Forcing Direct Connection', { url: conn.ical_url.substring(0, 50) + '...' });
            const directRes = await fetch(conn.ical_url, { headers, cache: 'no-store' });
            response = directRes as EnrichedResponse;
            response._cachedBody = await directRes.text();
         } catch (e: any) {
            iCalLogger.logError('FETCH', `Direct Error: ${e.message}`);
            throw new Error(`DIRECT ERROR: ${e.message}. Desactiva 'Forzar conexión directa'.`);
         }
      } else {
         // USE CENTRALIZED WRAPPER (MINI-BLOQUE F5)
         try {
            response = await proxyFetch(conn.ical_url, { headers, cache: 'no-store' });
            usedProxy = true;

            const bodyText = response._cachedBody || "";

            // Handle Specific Blocks preserved from earlier hardening
            if (response.status === 401 || response.status === 403 || response.status === 429) {
               let errorMsg = response.status === 429
                  ? "Límite de peticiones alcanzado en el proxy."
                  : "El proveedor bloquea accesos desde navegador. Revisa URL/token o usa integración alternativa.";

               // Probar si es JSON (V3 hardening)
               try {
                  const data = JSON.parse(bodyText);
                  if (data.code === "DOMAIN_NOT_ALLOWED") {
                     errorMsg = `Dominio no permitido en el Proxy: ${data.host || 'desconocido'}.`;
                     const fatalError = new Error(errorMsg);
                     (fatalError as any).fatal = true;
                     throw fatalError;
                  }
               } catch (e: any) {
                  if (e.fatal) throw e;
                  // Si no es JSON, fallback al texto plano antiguo
                  if (response.status === 403 && (bodyText.includes("Host not allowed") || bodyText.includes("Dominio no permitido"))) {
                     errorMsg = "Dominio no permitido en el Proxy central.";
                     const fatalError = new Error(errorMsg);
                     (fatalError as any).fatal = true;
                     throw fatalError;
                  }
               }
               throw new Error(errorMsg);
            }

            if ((response.status === 400 || response.status === 401) && bodyText.includes("Invalid Token")) {
               const errorMsg = "Token de Booking inválido o caducado. Por favor, pega un nuevo enlace.";
               const fatalError = new Error(errorMsg);
               (fatalError as any).fatal = true;
               throw fatalError;
            }

            if (!response.ok && response.status >= 500) {
               throw new Error(`Proxy error ${response.status}`);
            }

         } catch (err: any) {
            iCalLogger.logError('FETCH', `Wrapper Error: ${err.message}`);
            // If it's a fatal error or we already tried direct fallback logic, rethrow
            if (err.fatal) throw err;

            // Fallback DIRECT (Simplified from previous version)
            iCalLogger.logWarn('FETCH', 'Proxy failed. Trying direct fallback...');
            try {
               const direct = await fetch(conn.ical_url, { headers, cache: 'no-store' });
               response = direct as EnrichedResponse;
               response._cachedBody = await direct.text();
               usedProxy = false;
            } catch (dErr: any) {
               throw new Error(`Error de conexión: ${err.message}. Direct fell back too: ${dErr.message}`);
            }
         }
      }

      if (!response) throw new Error("No response received");

      // 304 NOT MODIFIED
      if (response.status === 304) {
         return {
            events: [],
            metadataUpdates: {},
            log: `Sin cambios (304 Not Modified - ${usedProxy ? 'Worker' : 'Direct'})`
         };
      }

      // GET BODY (Read from cache if proxy was used, otherwise read now)
      const bodyText = (response as any)._cachedBody !== undefined
         ? (response as any)._cachedBody
         : await response.text();

      if (!response.ok) {
         const errorDetails = bodyText.substring(0, 160).replace(/\n/g, ' ');
         throw new Error(`HTTP ${response.status}: ${errorDetails}`);
      }

      // VALIDATION: Check for HTML (Anti-bot Blocking)
      const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
      const isHtml = contentType.includes('text/html') ||
         bodyText.trim().toLowerCase().startsWith('<!doctype html') ||
         bodyText.includes('<html');

      if (isHtml) {
         const isCaptcha = bodyText.includes('captcha') || bodyText.includes('robot');
         const platform = isVrbo ? 'VRBO' : 'la plataforma';
         iCalLogger.logError('VALIDATE', 'Received HTML instead of iCal (Possible blocking)', { contentType });
         throw new Error(`Bloqueo de seguridad detectado. ${platform} devolvió una página web (HTML) en lugar del calendario. Posible Captcha/Anti-bot.`);
      }

      if (!bodyText.includes('BEGIN:VCALENDAR')) {
         iCalLogger.logError('VALIDATE', 'Invalid iCal content (MISSING BEGIN:VCALENDAR)');
         throw new Error("Contenido inválido (No es iCal). El archivo descargado no parece un calendario válido.");
      }

      // HASH CHECK
      const currentHash = await hashContent(bodyText);
      const newEtag = response.headers.get('ETag') || undefined;
      const newLastMod = response.headers.get('Last-Modified') || undefined;

      if (conn.content_hash === currentHash) {
         return {
            events: [],
            metadataUpdates: { http_etag: newEtag },
            log: `Sin cambios (Hash Local - ${usedProxy ? 'Worker' : 'Direct'})`
         };
      }

      // PARSE
      const rawEvents = parseICal(bodyText);

      // MINI-BLOQUE B4: Loop Guard - Filter out RentikPro's own exported events
      const validRawEvents = rawEvents.filter(e => {
         const hasDates = e.startDate && e.endDate;
         const isOwnEvent = e.uid && e.uid.endsWith('@rentikpro.com');
         return hasDates && !isOwnEvent;
      });

      // MAP TO CalendarEvent PARTIALS
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
         metadataUpdates: {
            content_hash: currentHash,
            http_etag: newEtag,
            http_last_modified: newLastMod
         },
         log: `Descarga OK (${validRawEvents.length} eventos) - ${usedProxy ? 'Worker' : 'Direct'}`
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
