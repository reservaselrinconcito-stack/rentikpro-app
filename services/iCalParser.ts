
export interface ICalEvent {
  uid: string;
  summary: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status?: string;   // TENTATIVE, CONFIRMED, CANCELLED
  created?: number;
  lastModified?: number;
  raw: string;
  isAllDay?: boolean; // NEW: Flag for all-day events
  timezone?: string;  // NEW: Extracted TZID (informational only)
  hasRecurrence?: boolean; // NEW: Flag if RRULE detected (not expanded)
}

// Unfold lines (RFC 5545: lines starting with space/tab are continuations)
const unfoldLines = (text: string): string[] => {
  const lines = text.split(/\r?\n/);
  const unfolded: string[] = [];

  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (unfolded.length > 0) {
        unfolded[unfolded.length - 1] += line.slice(1);
      }
    } else {
      if (line.trim()) unfolded.push(line);
    }
  }
  return unfolded;
};

/**
 * IMPROVED: Extrae fecha y detecta all-day vs datetime + timezone
 * @param val Valor completo de DTSTART/DTEND (ej: "TZID=Europe/Madrid:20240315T140000" o "VALUE=DATE:20240315")
 * @returns {date: 'YYYY-MM-DD', isAllDay: boolean, timezone?: string}
 */
const cleanDate = (val: string): { date: string | null; isAllDay: boolean; timezone?: string } => {
  if (!val) return { date: null, isAllDay: false };

  // Detectar VALUE=DATE (all-day events)
  const isAllDay = val.includes('VALUE=DATE');

  // Extraer TZID si existe
  const tzidMatch = val.match(/TZID=([^:]+):/);
  const timezone = tzidMatch ? tzidMatch[1] : undefined;

  // Obtener solo el valor de fecha/datetime (después del último ':')
  const cleanVal = val.split(':').pop() || '';
  const match = cleanVal.match(/(\d{4})(\d{2})(\d{2})/);

  if (!match) return { date: null, isAllDay, timezone };

  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    isAllDay,
    timezone
  };
};

/**
 * IMPROVED: Parsing completo de DURATION con soporte a horas y minutos
 * Formato: P[n]W[n]D[T[n]H[n]M[n]S]
 * Ejemplos: P1D, P2W, P1DT12H30M, PT6H
 * @returns Número de días (fracción si hay horas/minutos)
 */
const parseDuration = (dur: string): number => {
  if (!dur) return 0;

  let totalDays = 0;

  // Semanas
  const weeksMatch = dur.match(/(\d+)W/);
  if (weeksMatch) totalDays += parseInt(weeksMatch[1], 10) * 7;

  // Días
  const daysMatch = dur.match(/(\d+)D/);
  if (daysMatch) totalDays += parseInt(daysMatch[1], 10);

  // Horas (convertir a fracción de días)
  const hoursMatch = dur.match(/T.*?(\d+)H/);
  if (hoursMatch) totalDays += parseInt(hoursMatch[1], 10) / 24;

  // Minutos (convertir a fracción de días)
  const minutesMatch = dur.match(/T.*?(\d+)M/);
  if (minutesMatch) totalDays += parseInt(minutesMatch[1], 10) / 1440;

  // Si solo segundos o vacío, retornar al menos 1 día (fallback para reservas)
  return totalDays > 0 ? totalDays : 1;
};

const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m - 1), d);          // Fecha local estable (no parsing ISO)
  dt.setDate(dt.getDate() + Math.ceil(days));   // Checkout redondeado hacia arriba
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

export const parseICal = (icalText: string): ICalEvent[] => {
  const events: ICalEvent[] = [];
  const lines = unfoldLines(icalText);

  let inEvent = false;
  let currentEvent: any = {};
  let rawBuffer: string[] = [];

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      currentEvent = {};
      rawBuffer = [line];
      continue;
    }

    if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      rawBuffer.push(line);

      // Post-process logic
      if (currentEvent.uid && currentEvent.dtstart) {
        const startInfo = cleanDate(currentEvent.dtstart);
        const endInfo = cleanDate(currentEvent.dtend);

        let start = startInfo.date;
        let end = endInfo.date;
        const isAllDay = startInfo.isAllDay || endInfo.isAllDay;
        const timezone = startInfo.timezone || endInfo.timezone;

        // Handle DURATION if DTEND is missing
        if (!end && currentEvent.duration && start) {
          const durationDays = parseDuration(currentEvent.duration);
          end = addDays(start, durationDays);
        }

        // Fallback: If no end and no duration, assume 1 night stay (standard fallback)
        if (!end && start) {
          end = addDays(start, 1);
        }

        if (start && end) {
          events.push({
            uid: currentEvent.uid,
            summary: currentEvent.summary || 'Reserva Externa',
            description: currentEvent.description || '',
            startDate: start,
            endDate: end,
            status: currentEvent.status,
            isAllDay,
            timezone,
            hasRecurrence: !!currentEvent.rrule, // Flag si hay RRULE (NO expandido)
            raw: rawBuffer.join('\n')
          });
        }
      }
      continue;
    }

    if (inEvent) {
      rawBuffer.push(line);
      // Split KEY;PARAMS:VALUE
      const parts = line.split(':');
      const keyPart = parts[0];
      const value = parts.slice(1).join(':'); // Join back if value had colons (e.g. description)

      const key = keyPart.split(';')[0].toUpperCase();

      if (key === 'UID') currentEvent.uid = value.trim();
      if (key === 'SUMMARY') currentEvent.summary = value.trim();
      if (key === 'DESCRIPTION') currentEvent.description = value.trim();
      if (key === 'DTSTART') currentEvent.dtstart = keyPart + ':' + value; // Guardar completo (con params)
      if (key === 'DTEND') currentEvent.dtend = keyPart + ':' + value;
      if (key === 'DURATION') currentEvent.duration = value;
      if (key === 'STATUS') currentEvent.status = value.trim();
      if (key === 'RRULE') currentEvent.rrule = value.trim(); // Capturar pero NO expandir
    }
  }

  return events;
};
