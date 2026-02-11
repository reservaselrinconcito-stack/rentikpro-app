
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

const cleanDate = (val: string): string | null => {
  if (!val) return null;
  // Format: 20231001, 20231001T120000Z, TZID=...:20231001
  const cleanVal = val.split(':').pop() || ''; // Remove params like TZID
  const match = cleanVal.match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
};

const parseDuration = (dur: string): number => {
  // P1D, P2W, P1DT12H... We only care about days for rental logic usually
  const daysMatch = dur.match(/(\d+)D/);
  const weeksMatch = dur.match(/(\d+)W/);
  let days = 0;
  if (daysMatch) days += parseInt(daysMatch[1], 10);
  if (weeksMatch) days += parseInt(weeksMatch[1], 10) * 7;
  // If only hours/minutes/seconds, counting as 0 days (same day checkout logic elsewhere)
  return days;
};

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
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
        let start = cleanDate(currentEvent.dtstart);
        let end = cleanDate(currentEvent.dtend);

        // Handle DURATION if DTEND is missing
        if (!end && currentEvent.duration && start) {
           const days = parseDuration(currentEvent.duration);
           end = addDays(start, days > 0 ? days : 1); // Minimum 1 day usually for booking logic
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
      if (key === 'DTSTART') currentEvent.dtstart = value;
      if (key === 'DTEND') currentEvent.dtend = value;
      if (key === 'DURATION') currentEvent.duration = value;
      if (key === 'STATUS') currentEvent.status = value.trim();
    }
  }

  return events;
};
