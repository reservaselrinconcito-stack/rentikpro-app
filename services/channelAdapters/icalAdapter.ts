
import { IChannelAdapter, SyncResult } from './types';
import { ChannelConnection, CalendarEvent } from '../../types';
import { parseICal } from '../iCalParser';
import { getProxyUrl, rotateProxy } from '../syncEngine'; // Reusing the helper from engine for now
import { networkMonitor } from '../networkMonitor';

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

      // MOCK SUPPORT
      if (conn.ical_url.startsWith('mock://')) {
         return {
            events: [],
            metadataUpdates: {},
            log: 'Simulación completada (Mock)'
         };
      }

      if (!networkMonitor.isOnline()) throw new Error("Offline");

      const headers: HeadersInit = {
         'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
         'Accept': 'text/calendar, text/plain, */*'
      };
      if (conn.http_etag) headers['If-None-Match'] = conn.http_etag;

      let response: Response | null = null;
      let usedProxy = false;

      // Detect Platform for specific logging/logic
      const isVrbo = /vrbo|abritel|fewo-direkt/i.test(conn.ical_url);

      // STRATEGY: Force Direct vs Worker Proxy with automatic fallback
      if (conn.force_direct) {
         try {
            response = await fetch(conn.ical_url, { headers });
         } catch (e: any) {
            throw new Error(`DIRECT ERROR: ${e.message}. Desactiva 'Forzar conexión directa'.`);
         }
      } else {
         // RETRY LOGIC (3 attempts with rotation)
         let lastError: any = null;
         const MAX_ATTEMPTS = 3;

         for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
               const proxyBase = getProxyUrl();
               const originalUrl = conn.ical_url;
               let proxyTarget = '';

               // 1. CONSTRUCCIÓN URL PROXY (Robust Encoding)
               if (proxyBase.includes('corsproxy.io')) {
                  // corsproxy.io/?https%3A%2F%2F...
                  proxyTarget = `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`;
               } else if (proxyBase.includes('allorigins.win')) {
                  // allorigins.win/raw?url=https%3A%2F%2F...
                  proxyTarget = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
               } else {
                  // Worker Genérico (ej. /cm-proxy) -> ?url=...
                  const joiner = proxyBase.includes('?') ? '&' : '?';
                  proxyTarget = `${proxyBase}${joiner}url=${encodeURIComponent(originalUrl)}`;
               }

               // 2. CACHE BUSTER (Solo para "Sincronizar Ahora" - aunque aquí lo ponemos siempre para asegurar)
               // Añadimos timestamp al final del proxy para evitar cacheo intermedio (Cloudflare, etc.)
               const ts = Date.now();
               const hasParams = proxyTarget.includes('?');
               proxyTarget += `${hasParams ? '&' : '?'}t=${ts}`;

               console.log(`[iCal] Request: ${originalUrl.substring(0, 30)}... -> Proxy: ${proxyBase} -> Status: ESPERANDO...`);

               // 3. FETCH con NO-STORE
               response = await fetch(proxyTarget, {
                  headers,
                  cache: 'no-store', // Fuerza a no usar cache del navegador
                  // mode: 'cors' // Implícito
               });

               console.log(`[iCal] Response: ${response.status} ${response.statusText} (Proxy: ${proxyBase})`);

               // If 403 Forbidden (Blocked), try rotating immediately
               if (response.status === 403) {
                  const txt = await response.text();
                  if (txt.includes('Host not allowed') || txt.includes('Access Denied') || txt.includes('Forbidden')) {
                     console.warn(`[iCal] Proxy ${proxyBase} bloqueado (403). Rotando...`);
                     rotateProxy();
                     lastError = new Error(`Proxy bloqueado (403): ${txt.substring(0, 50)}...`);
                     continue;
                  }
               }

               if (!response.ok && response.status >= 500) {
                  console.warn(`[iCal] Proxy ${proxyBase} error ${response.status}. Rotando...`);
                  rotateProxy();
                  lastError = new Error(`Proxy error ${response.status}`);
                  continue;
               }

               usedProxy = true;
               lastError = null;
               break; // Success (ish)

            } catch (proxyErr: any) {
               console.warn(`[iCal] Error en Proxy (Intento ${attempt + 1}):`, proxyErr);
               lastError = proxyErr;
               rotateProxy();
            }
         }

         // If Proxy failed all attempts, try DIRECT Fallback
         if (!response && !usedProxy) {
            console.log("[iCal] Todos los proxies fallaron. Intentando directo...");
            try {
               response = await fetch(conn.ical_url, { headers, cache: 'no-store' });
               usedProxy = false;
            } catch (directErr: any) {
               const finalMsg = lastError ? lastError.message : 'Unknown Proxy Error';
               throw new Error(`Rotación de Proxies falló (${finalMsg}). Fallback directo también falló: ${directErr.message}`);
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

      const bodyText = await response.text();

      if (!response.ok) {
         const errorDetails = bodyText.substring(0, 160).replace(/\n/g, ' ');
         throw new Error(`HTTP ${response.status}: ${errorDetails}`);
      }

      // VALIDATION: Check for HTML (Anti-bot Blocking)
      if (bodyText.trim().toLowerCase().startsWith('<!doctype html') || bodyText.includes('<html')) {
         const isCaptcha = bodyText.includes('captcha') || bodyText.includes('robot');
         const platform = isVrbo ? 'VRBO' : 'la plataforma';
         throw new Error(`Bloqueo de seguridad detectado. ${platform} devolvió una página web (HTML) en lugar del calendario. Posible Captcha/Anti-bot.`);
      }

      if (!bodyText.includes('BEGIN:VCALENDAR')) {
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
      const validRawEvents = rawEvents.filter(e => e.startDate && e.endDate);

      // MAP TO CalendarEvent PARTIALS
      const mappedEvents: Partial<CalendarEvent>[] = validRawEvents.map(raw => ({
         external_uid: raw.uid,
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
