
import { projectManager } from './projectManager';
import { syncEngine } from './syncEngine';
import { notifyDataChanged } from './dataRefresher';
import { networkMonitor } from './networkMonitor';
import { logger } from './logger';

export type SyncInterval = 15 | 30 | 60 | 'MANUAL';

export class SyncScheduler {
  private static instance: SyncScheduler;
  private intervalMinutes: SyncInterval = 60; // Default
  private timerId: number | null = null;
  private isRunning: boolean = false;

  private constructor() {
    // Load preference
    const stored = localStorage.getItem('rentikpro_sync_interval');
    if (stored) this.intervalMinutes = stored === 'MANUAL' ? 'MANUAL' : parseInt(stored) as SyncInterval;

    // Listen to network changes to auto-resume
    networkMonitor.subscribe((isOnline) => {
      if (isOnline && this.intervalMinutes !== 'MANUAL') {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  public static getInstance(): SyncScheduler {
    if (!SyncScheduler.instance) {
      SyncScheduler.instance = new SyncScheduler();
    }
    return SyncScheduler.instance;
  }

  public setInterval(minutes: SyncInterval) {
    this.intervalMinutes = minutes;
    localStorage.setItem('rentikpro_sync_interval', minutes.toString());
    this.stop();
    if (minutes !== 'MANUAL') {
      this.start();
    }
  }

  public getInterval(): SyncInterval {
    return this.intervalMinutes;
  }

  public start() {
    if (this.isRunning || this.intervalMinutes === 'MANUAL') return;

    // Immediate check
    this.processQueue();

    this.timerId = window.setInterval(() => {
      this.processQueue();
    }, (this.intervalMinutes as number) * 60 * 1000);

    this.isRunning = true;
    logger.log(`Sync Scheduler Started: Every ${this.intervalMinutes} min`);
  }

  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }

  public async triggerNow() {
    await this.processQueue();
  }

  // --- QUEUE PROCESSOR ---
  private async processQueue() {
    if (!networkMonitor.isOnline()) {
      logger.log("Sync Skipped: Offline");
      return;
    }

    // CRITICAL FIX: Ensure project is loaded before attempting database access
    if (!projectManager.isProjectLoaded()) {
      // console.debug("Sync Skipped: No project loaded");
      return;
    }

    if (projectManager.getCurrentMode() === 'demo') {
      logger.log("Sync Skipped: Demo Mode Active");
      return;
    }

    const store = projectManager.getStore();
    const apartments = await store.getAllApartments();

    logger.log("Starting Auto-Sync Cycle...");

    // Sequential processing to avoid flooding
    for (const apt of apartments) {
      try {
        await syncEngine.syncApartment(apt.id, { isAutomated: true });
      } catch (e) {
        logger.error(`Auto-Sync Error Apt ${apt.id}:`, e);
      }
    }

    logger.log("Auto-Sync Cycle Completed");
    notifyDataChanged('all');
  }
}

export const syncScheduler = SyncScheduler.getInstance();
