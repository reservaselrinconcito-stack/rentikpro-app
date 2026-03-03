
import { logger as baseLogger } from './logger';

export type ICalLogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface ICalLogEntry {
    timestamp: number;
    level: ICalLogLevel;
    step: string;
    message: string;
    details?: any;
}

export interface ICalSyncSummary {
    lastSyncAt: number | null;
    lastStatus: number | null;
    lastContentType: string | null;
    lastSize: number | null;
    eventCount: number;
    lastError: string | null;
    lastUrl: string | null;
    lastProxyUsed: string | null;
}

const RING_BUFFER_SIZE = 200;
const PERSISTENCE_KEY = 'rentikpro_ical_debug_logs';
const SUMMARY_KEY = 'rentikpro_ical_sync_summary';

class ICalLogger {
    private logs: ICalLogEntry[] = [];
    private summary: ICalSyncSummary = {
        lastSyncAt: null,
        lastStatus: null,
        lastContentType: null,
        lastSize: null,
        eventCount: 0,
        lastError: null,
        lastUrl: null,
        lastProxyUsed: null
    };

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            const stored = localStorage.getItem(PERSISTENCE_KEY);
            if (stored) {
                this.logs = JSON.parse(stored);
            }
            const storedSummary = localStorage.getItem(SUMMARY_KEY);
            if (storedSummary) {
                this.summary = JSON.parse(storedSummary);
            }
        } catch (e) {
            this.logs = [];
        }
    }

    private saveToStorage() {
        try {
            // Only keep the last 50 for storage to avoid quota issues
            localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(this.logs.slice(-50)));
            localStorage.setItem(SUMMARY_KEY, JSON.stringify(this.summary));
        } catch (e) {
            // Ignore storage errors
        }
    }

    private isTauri = !!(window as any).__TAURI_INTERNALS__;

    private async appendToLogFile(entry: ICalLogEntry) {
        if (!this.isTauri) return;

        try {
            const { writeTextFile, exists, mkdir, BaseDirectory } = await import('@tauri-apps/plugin-fs');

            const logDir = 'logs';
            const logFile = 'logs/ical-sync.log';

            const dirExists = await exists(logDir, { baseDir: BaseDirectory.AppData });
            if (!dirExists) {
                await mkdir(logDir, { baseDir: BaseDirectory.AppData, recursive: true });
            }

            const time = new Date(entry.timestamp).toISOString();
            const line = `[${time}] [${entry.level}] ${entry.step}: ${entry.message} ${entry.details ? JSON.stringify(entry.details) : ''}\n`;

            await writeTextFile(logFile, line, {
                baseDir: BaseDirectory.AppData,
                append: true
            });
        } catch (e) {
            console.error('[iCalLogger] Failed to write to log file:', e);
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

        // Update summary if it looks like an error or a completion
        if (level === 'ERROR') {
            this.summary.lastError = message;
        }

        // Also pipe to base logger for console visibility
        if (level === 'ERROR') baseLogger.error(`[iCal] ${step}: ${message}`, details);
        else if (level === 'WARN') baseLogger.warn(`[iCal] ${step}: ${message}`, details);
        else baseLogger.log(`[iCal] ${step}: ${message}`);

        this.saveToStorage();
        this.appendToLogFile(entry);
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

    updateSummary(update: Partial<ICalSyncSummary>) {
        this.summary = { ...this.summary, ...update, lastSyncAt: Date.now() };
        if (update.lastError === null) {
            // Clear last error if success reported
        }
        this.saveToStorage();
    }

    getSummary(): ICalSyncSummary {
        return { ...this.summary };
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
        }).reverse().join('\n');

        return `RENTIKPRO ICAL DEBUG REPORT
Generated: ${new Date().toISOString()}
UserAgent: ${navigator.userAgent}
----------------------------------
SUMMARY:
Last Sync: ${this.summary.lastSyncAt ? new Date(this.summary.lastSyncAt).toLocaleString() : 'Never'}
Last Status: ${this.summary.lastStatus || 'N/A'}
Last URL: ${this.summary.lastUrl ? (this.summary.lastUrl.substring(0, 15) + '...') : 'N/A'}
Last Proxy: ${this.summary.lastProxyUsed || 'Direct'}
Events Parsed: ${this.summary.eventCount}
Last Error: ${this.summary.lastError || 'None'}
----------------------------------
LOGS (Last ${this.logs.length}):
${logs}
`;
    }
}

export const iCalLogger = new ICalLogger();
