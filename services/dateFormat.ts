import { projectManager } from './projectManager';

class DateFormatService {
    private currentFormat: string = 'DD/MM/YYYY'; // Default

    // Load settings from DB
    async initDateFormat() {
        try {
            const store = projectManager.getStore();
            const settings = await store.getSettings();
            if (settings && settings.date_format) {
                this.currentFormat = settings.date_format;
            }
        } catch (e) {
            console.warn('Error loading date format:', e);
        }
    }

    getUserDateFormat(): string {
        return this.currentFormat;
    }

    /**
     * Formats a YYYY-MM-DD string to the user's preferred format.
     */
    formatDateForUser(dateStr: string): string {
        if (!dateStr) return '';

        // Parse YYYY-MM-DD safely
        const [year, month, day] = dateStr.split('-');
        if (!year || !month || !day) return dateStr; // Return original if invalid

        switch (this.currentFormat) {
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'DD/MM/YYYY':
            default:
                return `${day}/${month}/${year}`;
        }
    }

    /**
     * Formats a timestamp (number) to user's date format + time
     */
    formatTimestampForUser(timestamp: number): string {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');

        const datePart = this.formatDateForUser(`${y}-${m}-${d}`);
        const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `${datePart} ${timePart}`;
    }

    /**
     * Formats a date range (CheckIn -> CheckOut)
     */
    formatRangeForUser(start: string, end: string): string {
        return `${this.formatDateForUser(start)} → ${this.formatDateForUser(end)}`;
    }
}

export const dateFormat = new DateFormatService();
