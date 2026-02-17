
import { logger as baseLogger } from './logger';

export type ICalLogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface ICalLogEntry {
    timestamp: number;
    level: ICalLogLevel;
    step: string;
    message: string;
    details?: any;
}

const RING_BUFFER_SIZE = 200;
const PERSISTENCE_KEY = 'rentikpro_ical_debug_logs';

class ICalLogger {
    private logs: ICalLogEntry[] = [];

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            const stored = localStorage.getItem(PERSISTENCE_KEY);
            if (stored) {
                this.logs = JSON.parse(stored);
            }
        } catch (e) {
            this.logs = [];
        }
    }

    private saveToStorage() {
        try {
            // Only keep the last 50 for storage to avoid quota issues
            localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(this.logs.slice(-50)));
        } catch (e) {
            // Ignore storage errors
        }
    }

    private addLog(level: ICalLogLevel, step: string, message: string, details?: any) {
        const entry: ICalLogEntry = {
            timestamp: Date.now(),
            level,
            step,
            message,
            details
        };

        this.logs.push(entry);

        if (this.logs.length > RING_BUFFER_SIZE) {
            this.logs.shift();
        }

        // Also pipe to base logger for console visibility
        if (level === 'ERROR') baseLogger.error(`[iCal] ${step}: ${message}`, details);
        else if (level === 'WARN') baseLogger.warn(`[iCal] ${step}: ${message}`, details);
        else baseLogger.log(`[iCal] ${step}: ${message}`);

        this.saveToStorage();
    }

    logInfo(step: string, message: string, details?: any) {
        this.addLog('INFO', step, message, details);
    }

    logWarn(step: string, message: string, details?: any) {
        this.addLog('WARN', step, message, details);
    }

    logError(step: string, message: string, details?: any) {
        this.addLog('ERROR', step, message, details);
    }

    getLogs(): ICalLogEntry[] {
        return [...this.logs];
    }

    clearLogs() {
        this.logs = [];
        localStorage.removeItem(PERSISTENCE_KEY);
    }

    getReport(): string {
        const logs = this.getLogs().map(l => {
            const time = new Date(l.timestamp).toLocaleTimeString();
            return `[${time}] [${l.level}] ${l.step}: ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`;
        }).join('\n');

        return `RENTIKPRO ICAL DEBUG REPORT
Generated: ${new Date().toISOString()}
UserAgent: ${navigator.userAgent}
----------------------------------
${logs}
`;
    }
}

export const iCalLogger = new ICalLogger();
