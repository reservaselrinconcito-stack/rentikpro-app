/**
 * iCalScheduler.ts
 * 
 * Background scheduler for iCal sync.
 * Runs every SYNC_INTERVAL_MS (default: 20 min).
 * Can be started/stopped and manually triggered.
 */

import { iCalSyncService } from './iCalSyncService';
import { iCalLogger } from './iCalLogger';
import { networkMonitor } from './networkMonitor';

const SYNC_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
const STORAGE_KEY = 'rentikpro_ical_scheduler_interval';

class ICalScheduler {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private isSyncing = false;

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const intervalMs = this._getInterval();
    iCalLogger.logInfo('SCHEDULER', `iCal scheduler started (interval: ${intervalMs / 60000} min)`);

    // Run immediately (non-blocking)
    this._runSafe();

    this.timerId = setInterval(() => this._runSafe(), intervalMs);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    iCalLogger.logInfo('SCHEDULER', 'iCal scheduler stopped');
  }

  /** Manual trigger (e.g., "Sync Now" button). */
  async triggerNow(apartmentId?: string) {
    if (this.isSyncing) {
      iCalLogger.logWarn('SCHEDULER', 'Sync already in progress, skipping manual trigger');
      return;
    }
    await this._runSafe(apartmentId);
  }

  setInterval(minutes: number) {
    const ms = Math.max(5, Math.min(120, minutes)) * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, String(ms));
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  private _getInterval(): number {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : SYNC_INTERVAL_MS;
  }

  private async _runSafe(apartmentId?: string) {
    if (this.isSyncing) return;
    if (!networkMonitor.isOnline()) {
      iCalLogger.logWarn('SCHEDULER', 'Skipping sync: offline');
      return;
    }

    const isDemoMode = localStorage.getItem('active_project_mode') === 'demo';
    if (isDemoMode) return;

    this.isSyncing = true;
    try {
      const results = await iCalSyncService.syncAll(apartmentId);
      const ok = results.filter(r => r.status === 'ok').length;
      const errors = results.filter(r => r.status === 'error').length;
      if (results.length > 0) {
        iCalLogger.logInfo('SCHEDULER', `Sync cycle complete: ${ok} ok, ${errors} errors, ${results.length} total`);
      }
    } catch (err: any) {
      iCalLogger.logError('SCHEDULER', `Sync cycle failed: ${err.message}`);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const iCalScheduler = new ICalScheduler();
