
import { IChannelAdapter, SyncResult } from './types';
import { ChannelConnection, CalendarEvent } from '../../types';
import { parseICal } from '../iCalParser';
import { getProxyUrl } from '../syncEngine'; // Reusing the helper from engine for now
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

    const headers: HeadersInit = {};
    if (conn.http_etag) headers['If-None-Match'] = conn.http_etag;
    
    let response: Response | null = null;
    let usedProxy = false;

    // STRATEGY: Force Direct vs Worker Proxy
    if (conn.force_direct) {
       try {
          response = await fetch(conn.ical_url, { headers });
       } catch (e: any) {
          throw new Error(`DIRECT ERROR: ${e.message}. Desactiva 'Forzar conexión directa'.`);
       }
    } else {
       try {
          const proxyBase = getProxyUrl();
          const joiner = proxyBase.includes('?') ? '&' : '?';
          const proxyTarget = `${proxyBase}${joiner}url=${encodeURIComponent(conn.ical_url)}`;
          response = await fetch(proxyTarget);
          usedProxy = true;
       } catch (proxyErr: any) {
          throw new Error(`PROXY ERROR: ${proxyErr.message}. Verifica el Worker.`);
       }
    }

    if (!response) throw new Error("No response received");

    // 304 NOT MODIFIED
    if (response.status === 304) {
       return { 
         events: [], // No changes implies no processing needed downstream if architecture supports it, 
                     // but here we might return empty and let engine decide. 
                     // Actually, if 304, we don't have body, so we can't parse.
                     // We signal NO CHANGE via log or specific flag if needed.
         metadataUpdates: {}, 
         log: `Sin cambios (304 Not Modified - ${usedProxy ? 'Worker' : 'Direct'})` 
       };
    }

    const bodyText = await response.text();

    if (!response.ok) {
       const errorDetails = bodyText.substring(0, 160).replace(/\n/g, ' ');
       throw new Error(`HTTP ${response.status}: ${errorDetails}`);
    }
    
    // VALIDATION
    if (!bodyText.includes('BEGIN:VCALENDAR')) {
       throw new Error("Contenido inválido (No es iCal). Posible bloqueo de seguridad.");
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
