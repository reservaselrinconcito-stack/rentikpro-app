import { SQLiteStore } from './sqliteStore';
import { notifyDataChanged } from './dataRefresher';
import { DataOnlyBackup, StructureOnlyBackup } from '../types';
import { logger } from './logger';
import JSZip from 'jszip';
import { APP_VERSION, SCHEMA_VERSION } from '../src/version';
import { projectPersistence } from './projectPersistence';
import { demoGenerator } from './demoGenerator';
import { ProjectFileProvider } from './projectFileProvider';
import { syncCoordinator } from './syncCoordinator';
import { invoke } from '@tauri-apps/api/core';

export class ProjectManager {
  public store: SQLiteStore;
  private currentProjectId: string | null = null;
  private currentProjectMode: 'real' | 'demo' = 'real';
  private lastSyncedAt: number | null = null;
  private autoSaveInterval: any = null;
  private currentCounts: { bookings: number, accounting: number } = { bookings: 0, accounting: 0 };

  // Storage mode: 'idb' = IndexedDB (default, all browsers)
  //               'file' = File System Access API (Chrome/Edge desktop only)
  private storageMode: 'idb' | 'file' = 'idb';
  private fileProvider: ProjectFileProvider = new ProjectFileProvider();

  // File-mode autosave state
  private fileSaveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  private fileAutoSaveTimer: any = null;
  public isSavingToFile: boolean = false; // reentrance guard to avoid saveToFile -> saveProject -> saveToFile loop

  constructor() {
    this.store = new SQLiteStore();
    // Register the autosave hook so every booking write/delete
    // schedules a debounced file-save when in file mode.
    this.store.setWriteHook(() => this.scheduleAutoSaveFile());
  }

  // --- INITIALIZATION ---

  async initialize(): Promise<void> {
    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

    // Priority 1: Desktop folder-based project (Tauri) — auto-open last folder if available.
    if (isTauri) {
      const lastFolder = (() => {
        try { return localStorage.getItem('rp_last_project_path'); } catch { return null; }
      })();
      if (lastFolder) {
        try {
          const pfm = await import('./projectFolderManager');
          const v = await pfm.validateProject(lastFolder);
          if (v.ok) {
            await pfm.openProject(lastFolder);
            logger.log(`[ProjectManager] Auto-opened folder project: ${lastFolder}`);
            return;
          }
          logger.warn('[ProjectManager] Last folder project invalid, falling back to IDB', v.error);
        } catch (e) {
          logger.warn('[ProjectManager] Failed to auto-open last folder project, falling back to IDB', e);
        }
      }
    }

    // Priority 2: File System Access (FSA) — restore last linked file handle if permission is granted.
    if (!isTauri && this.fileProvider.supportsFileSystemAccess()) {
      try {
        const restored = await this.fileProvider.restoreLastHandle();
        if (restored) {
          const perm = await this.fileProvider.queryPermission('read');
          if (perm === 'granted') {
            const ok = await this.openLinkedFileProject().catch((e) => {
              logger.warn('[ProjectManager] Failed to auto-open linked file project', e);
              return false;
            });
            if (ok) return;
          }
        }
      } catch (e) {
        logger.warn('[ProjectManager] FSA restore check failed, continuing with IDB', e);
      }
    }

    // Priority 3: IndexedDB auto-load via active_project_id.
    const activeId = localStorage.getItem('active_project_id');
    const activeMode = localStorage.getItem('active_project_mode') as 'real' | 'demo';

    if (activeId && activeMode) {
      logger.log(`[ProjectManager] Auto-loading active project: ${activeId} (${activeMode})`);
      const success = await this.loadProject(activeId);
      if (!success) {
        logger.warn('[ProjectManager] Failed to auto-load active project. Needs user action.');
        localStorage.removeItem('active_project_id');
        localStorage.removeItem('active_project_mode');
      }
    }
  }

  private async openLinkedFileProject(): Promise<boolean> {
    // Requires an already linked file handle (restored or chosen).
    if (!this.fileProvider.hasOpenFile()) return false;

    try {
      const zipBytes = await this.fileProvider.readOpenProjectFileBytes();
      if (!zipBytes) return false;

      // Extract database.sqlite from the ZIP (same format as exportFullBackupZip)
      const zip = await JSZip.loadAsync(zipBytes);
      const dbFile = zip.file('database.sqlite');
      if (!dbFile) {
        throw new Error("El archivo no contiene 'database.sqlite'. ¿Es un archivo .rentikpro válido?");
      }
      const dbBytes = await dbFile.async('uint8array');

      await this.store.load(dbBytes);

      const fileName = this.fileProvider.getProjectDisplayName();
      const projectId = `proj_file_${btoa(fileName).replace(/[^a-z0-9]/gi, '').substring(0, 16)}`;
      this.currentProjectId = projectId;
      this.currentProjectMode = 'real';
      this.lastSyncedAt = Date.now();

      const counts = await this.store.getCounts();
      this.currentCounts = { bookings: counts.bookings, accounting: counts.accounting };

      this.setActiveContext(projectId, 'real');
      this.storageMode = 'file';

      // Persist metadata+snapshot to IDB as fallback.
      try {
        await this.persistCurrentProject(fileName);
      } catch (e) {
        logger.warn('[FileMode] Could not persist project metadata to IDB', e);
      }

      this.startAutoSave();
      notifyDataChanged('all');
      return true;
    } catch (e: any) {
      // Permission lost or handle revoked: drop back to IDB.
      const msg = String(e?.name || e?.message || e);
      logger.warn('[FileMode] Failed to open linked file project', msg);
      try {
        await this.fileProvider.clearPersistedHandle();
      } catch { }
      this.fileProvider.clearHandle();
      this.storageMode = 'idb';
      return false;
    }
  }

  isProjectLoaded(): boolean {
    return !!this.currentProjectId;
  }

  getCurrentMode(): 'real' | 'demo' {
    return this.currentProjectMode;
  }

  // --- ACTIVE PROPERTY CONTEXT ---

  getActivePropertyId(): string {
    return localStorage.getItem('activePropertyId') || 'prop_default';
  }

  setActivePropertyId(id: string) {
    localStorage.setItem('activePropertyId', id);
    notifyDataChanged('all');
  }

  // --- PROJECT OPERATIONS ---

  async createBlankProject(): Promise<boolean> {
    const id = `proj_${Date.now()}`;
    const name = `Proyecto Nuevo ${new Date().toLocaleDateString()}`;

    logger.log("[ProjectManager] Creating Blank Project...");
    await this.store.init(); // Fresh DB
    await this.ensureDefaultProperty();

    this.currentProjectId = id;
    this.currentProjectMode = 'real';
    this.lastSyncedAt = Date.now();

    await this.persistCurrentProject(name);
    this.setActiveContext(id, 'real');
    this.startAutoSave();

    notifyDataChanged();
    return true;
  }

  async createDemoProject(onProgress?: (msg: string) => void): Promise<boolean> {
    const id = 'demo_project';
    const name = 'DEMO RentikPro';

    const existing = await projectPersistence.loadProject(id);
    if (existing) {
      if (onProgress) onProgress("Cargando proyecto demo existente...");
      logger.log("[ProjectManager] Loading existing Demo Project...");
      try {
        const success = await this.loadProject(id);
        if (success) return true;
        // If load failed, fall through to regenerate
        logger.warn("[ProjectManager] Existing demo corrupted, regenerating...");
        await projectPersistence.deleteProject(id);
      } catch (e) {
        logger.warn("[ProjectManager] Error loading demo, regenerating...", e);
      }
    }

    try {
      if (onProgress) onProgress("Inicializando nueva demo...");
      logger.log("[ProjectManager] Creating New Demo Project...");
      await this.store.init(); // Fresh DB

      await demoGenerator.generateDemoData(this.store, onProgress);

      this.currentProjectId = id;
      this.currentProjectMode = 'demo';
      this.lastSyncedAt = Date.now();

      if (onProgress) onProgress("Guardando proyecto...");
      await this.persistCurrentProject(name);
      this.setActiveContext(id, 'demo');
      this.startAutoSave();

      notifyDataChanged();
      return true;
    } catch (e) {
      logger.error("Error creating demo project:", e);
      // Ensure we don't leave a broken state
      await this.closeProject();
      throw e;
    }
  }

  async loadProject(id: string): Promise<boolean> {
    try {
      const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

      const record = await projectPersistence.loadProject(id);
      if (!record) return false;

      await this.store.load(record.data);
      this.currentProjectId = record.id;
      this.currentProjectMode = record.mode;
      this.lastSyncedAt = Date.now();

      // Initial counts load
      const counts = await this.store.getCounts();
      this.currentCounts = { bookings: counts.bookings, accounting: counts.accounting };

      this.setActiveContext(record.id, record.mode);
      this.startAutoSave();

      // Non-blocking WebDAV pull (never blocks UI). If remote changes apply, SyncCoordinator will call store.load() + notify.
      if (!isTauri && this.currentProjectMode === 'real') {
        syncCoordinator.syncDown().catch(e => logger.warn('[ProjectManager] SyncDown failed (non-blocking)', e));
      }

      // In desktop mode, treat legacy IDB projects as read-only persistence.
      // Users should migrate to a folder-based project instead.
      if (isTauri) {
        if (this.autoSaveInterval) {
          clearInterval(this.autoSaveInterval);
          this.autoSaveInterval = null;
        }
      }

      // DEBUG 2: Snapshot after load
      const debugBookingId = localStorage.getItem('debug_revert_booking_id');
      if (debugBookingId) {
        const b = await this.store.getBooking(debugBookingId);
        console.log("[REVERT:LOAD_COMPLETE]", {
          id: debugBookingId,
          price: b?.total_price,
          check_in: b?.check_in,
          sources: b?.field_sources
        });
      }

      notifyDataChanged();
      return true;
    } catch (err) {
      logger.error("Error loading project:", err);
      return false;
    }
  }

  async loadLegacyIdbProjectReadOnly(id: string): Promise<boolean> {
    try {
      const record = await projectPersistence.loadProject(id);
      if (!record) return false;

      await this.store.load(record.data);
      this.currentProjectId = record.id;
      this.currentProjectMode = record.mode;
      this.lastSyncedAt = Date.now();

      const counts = await this.store.getCounts();
      this.currentCounts = { bookings: counts.bookings, accounting: counts.accounting };

      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }
      // Do NOT set active_project_id and do NOT persist back to IDB.
      notifyDataChanged('all');
      return true;
    } catch (e) {
      logger.error('[ProjectManager] loadLegacyIdbProjectReadOnly failed', e);
      return false;
    }
  }

  async exitDemo(): Promise<void> {
    if (this.currentProjectMode !== 'demo') return;
    await this.closeProject();
    // Logic to return to Startup Screen handled by isProjectLoaded() -> false
  }

  async resetDemo(): Promise<void> {
    await projectPersistence.deleteProject('demo_project');
    await this.createDemoProject();
  }

  async closeProject(): Promise<void> {
    try {
      // Auto-sync UP on close if real project
      if (this.currentProjectId && this.currentProjectMode === 'real') {
        await syncCoordinator.syncUp().catch(e => logger.warn("[ProjectManager] Final SyncUp failed", e));
      }

      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }
      if (this.fileAutoSaveTimer) {
        clearTimeout(this.fileAutoSaveTimer);
        this.fileAutoSaveTimer = null;
      }

      this.fileProvider.clearHandle();

      this.currentProjectId = null;
      this.currentProjectMode = 'real';
      this.lastSyncedAt = null;
      this.currentCounts = { bookings: 0, accounting: 0 };

      try {
        localStorage.removeItem('active_project_id');
        localStorage.removeItem('active_project_mode');
      } catch (_) { }

      // Reset store to a fresh DB instance
      this.store = new SQLiteStore();
      this.store.setWriteHook(() => this.scheduleAutoSaveFile());

      notifyDataChanged('all');
    } catch (e) {
      logger.warn('[ProjectManager] closeProject failed', e);
    }
  }

  private setActiveContext(id: string, mode: 'real' | 'demo') {
    localStorage.setItem('active_project_id', id);
    localStorage.setItem('active_project_mode', mode);
  }

  private ensureActiveProjectContext() {
    if (!this.currentProjectId) {
      const id = `proj_restored_${Date.now()}`;
      logger.log(`[Import] No active project found. Creating context: ${id}`);
      this.currentProjectId = id;
      this.currentProjectMode = 'real';
      this.setActiveContext(id, 'real');
      // We don't save yet, the import function will save at the end.
    }
  }

  private startAutoSave() {
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
    this.autoSaveInterval = setInterval(() => {
      this.saveProject().catch(e => console.warn("Auto-save failed", e));
    }, 30000); // 30s auto-save to IndexedDB
  }

  // --- PERSISTENCE ---

  async saveProject(): Promise<void> {
    console.log('[SAVE:PM] begin', { projectId: this.currentProjectId });
    if (!this.store || !this.currentProjectId) return;
    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
    const folderPath = isTauri ? (localStorage.getItem('rp_last_project_path') || '') : '';

    // Desktop folder-based projects: persist to the selected folder (project.json + db.sqlite).
    // Always also snapshot to IndexedDB as a fallback.
    if (isTauri && folderPath) {
      await this.persistCurrentProjectToFolder(folderPath);

      try {
        const cached = localStorage.getItem('rp_last_project_json');
        const nameFromJson = cached ? (JSON.parse(cached)?.name as string | undefined) : undefined;
        const name = nameFromJson || `Proyecto ${new Date().toLocaleDateString()}`;
        await this.snapshotCurrentProjectToIdb(name);
      } catch (e) {
        logger.warn('[ProjectManager] IDB snapshot failed (folder mode)', e);
      }

      this.lastSyncedAt = Date.now();
      if (this.currentProjectMode === 'real') {
        syncCoordinator.syncUp().catch(e => logger.warn('[ProjectManager] Async SyncUp failed', e));
      }
      return;
    }

    const name = this.currentProjectMode === 'demo' ? 'DEMO RentikPro' : `Proyecto ${new Date().toLocaleDateString()}`;
    await this.persistCurrentProject(name);
    this.lastSyncedAt = Date.now();

    // File-mode: schedule a debounced write to disk after every IDB save.
    // Guard: skip if we are already mid-save to avoid save→export→save loop.
    if (this.storageMode === 'file' && !this.isSavingToFile) {
      this.scheduleAutoSaveFile();
    }
  }

  private async snapshotCurrentProjectToIdb(name: string): Promise<void> {
    if (!this.currentProjectId) return;

    const data = this.store.export();
    const counts = await this.store.getCounts();
    this.currentCounts = { bookings: counts.bookings, accounting: counts.accounting };

    await projectPersistence.saveProject(
      this.currentProjectId,
      name,
      data,
      this.currentProjectMode,
      this.currentCounts.bookings,
      this.currentCounts.accounting
    );
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  private async persistCurrentProjectToFolder(folderPath: string): Promise<void> {
    if (!this.currentProjectId) return;

    // Refresh counts for UI stats.
    const counts = await this.store.getCounts();
    this.currentCounts = { bookings: counts.bookings, accounting: counts.accounting };

    const dbBytes = this.store.export();
    const dbBase64 = this.bytesToBase64(dbBytes);

    // Reuse the last project.json we opened/created (cached by ProjectFolderManager).
    const cached = localStorage.getItem('rp_last_project_json');
    let projectJson: any = null;
    if (cached) {
      try { projectJson = JSON.parse(cached); } catch { projectJson = null; }
    }

    if (!projectJson || typeof projectJson !== 'object') {
      projectJson = {
        schema: 1,
        id: this.currentProjectId,
        name: 'Proyecto',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        appVersion: APP_VERSION,
        dbFile: 'db.sqlite',
      };
    }

    // Keep stable id/name; only bump updatedAt/appVersion.
    projectJson.id = (projectJson.id || this.currentProjectId);
    projectJson.updatedAt = Date.now();
    projectJson.appVersion = APP_VERSION;

    const projectJsonStr = JSON.stringify(projectJson, null, 2);
    localStorage.setItem('rp_last_project_json', projectJsonStr);

    await invoke<any>('write_project_folder', {
      path: folderPath,
      project_json: projectJsonStr,
      db_base64: dbBase64,
      overwrite: true,
    } as any);
  }

  async waitForFileSave(): Promise<void> {
    if (!this.isSavingToFile) return;
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (!this.isSavingToFile) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  private async persistCurrentProject(name: string) {
    if (!this.currentProjectId) return;
    const data = this.store.export();

    // Refresh counts before persisting metadata
    const counts = await this.store.getCounts();
    this.currentCounts = { bookings: counts.bookings, accounting: counts.accounting };

    console.log("[SAVE:PM] exporting_sqlite_bytes", { byteLength: data.byteLength });
    await projectPersistence.saveProject(
      this.currentProjectId,
      name,
      data,
      this.currentProjectMode,
      this.currentCounts.bookings,
      this.currentCounts.accounting
    );
    console.log("[SAVE:PM] persisted_ok");

    // Trigger remote sync
    if (this.currentProjectMode === 'real') {
      syncCoordinator.syncUp().catch(e => logger.warn("[ProjectManager] Async SyncUp failed", e));
    }
  }

  getProjectStats() {
    return this.currentCounts;
  }

  isProjectEmpty() {
    return this.currentCounts.bookings === 0 && this.currentCounts.accounting === 0;
  }

  // --- LEGACY / HELPER ---

  // Ensure default property exists
  private async ensureDefaultProperty() {
    if (!this.currentProjectId) {
      console.log("[INIT] Skipped property check (no active project context)");
      return;
    }

    const props = await this.getStore().getProperties();
    console.log(`[INIT] propertiesCount: ${props.length} for project: ${this.currentProjectId}`);

    if (props.length === 0) {
      logger.log("[SEED] Creating default property...");
      await this.getStore().saveProperty({
        id: 'prop_default',
        name: 'Propiedad principal',
        created_at: Date.now(),
        is_active: true,
        timezone: 'Europe/Madrid',
        currency: 'EUR',
        updated_at: Date.now()
      });
      console.log("[SEED] created default property: prop_default");
    } else {
      const hasDefault = props.some(p => p.id === 'prop_default');
      console.log(`[SEED] skipped (already has ${props.length} properties, default_exists=${hasDefault})`);
    }
  }

  // ... (Keep existing migration logic if needed, but for blank projects it's not needed, only for imported legacy files)
  // Re-implementing simplified import for legacy files support
  async importProjectFromFile(file: File) {
    // Wrapper to adapt to new persistence
    const loaded = await this.legacyImportFile(file);
    if (loaded) {
      // Save as new blank project populated with file data
      const id = `proj_imp_${Date.now()}`;
      this.currentProjectId = id;
      this.currentProjectMode = 'real';
      await this.persistCurrentProject(file.name.replace('.sqlite', ''));
      this.setActiveContext(id, 'real');
      this.startAutoSave();
      notifyDataChanged();
    }
  }

  private async legacyImportFile(file: File): Promise<boolean> {
    // Logic copied from previous implementation, just loading into store
    if (!file.name.endsWith('.sqlite')) throw new Error('Formato inválido.');
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    await this.store.load(data);
    return true;
  }

  // --- SAFARI-SAFE DOWNLOAD HELPER ---
  // MUST be called synchronously inside an onClick handler (user gesture).
  // Appending to document.body is required for Firefox and Safari.
  static triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after a generous delay to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    console.log(`[DOWNLOAD] Triggered: ${filename} (${blob.size} bytes)`);
  }

  // --- FULL BACKUP (ZIP) ---
  // Returns { blob, filename } — caller MUST call ProjectManager.triggerDownload()
  // synchronously from an onClick handler to avoid Safari's async-gesture block.
  async exportFullBackupZip(): Promise<{ blob: Blob; filename: string }> {
    console.log("[EXPORT:FULL] Beginning export process...");
    await this.waitForFileSave();


    // 0. Force save to ensure IndexedDB is up to date
    await this.saveProject();

    const zip = new JSZip();

    // 1. Database (The core of sync state, settings, and bookings)
    const dbData = this.store.export();
    zip.file('database.sqlite', dbData);

    // 2. Metadata (For identification)
    const metadata = {
      app: 'RentikPro',
      version: APP_VERSION,
      schema_version: SCHEMA_VERSION,
      exported_at: new Date().toISOString()
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    // 3. Structural Config (Enhanced transparency + Channel Manager)
    try {
      const connections = await this.store.getChannelConnections();
      zip.file('connections.json', JSON.stringify(connections, null, 2));

      const [pList, aList] = await Promise.all([
        this.store.getProperties(),
        this.store.getAllApartments()
      ]);
      zip.file('mappings.json', JSON.stringify({ properties: pList, apartments: aList }, null, 2));

      const [settings, userSettings] = await Promise.all([
        this.store.query("SELECT * FROM settings"),
        this.store.query("SELECT * FROM user_settings")
      ]);
      zip.file('settings.json', JSON.stringify({ settings, user_settings: userSettings }, null, 2));

      const websites = await this.store.getWebsites();
      const webspecs = websites.map((w: any) => ({
        id: w.id, name: w.name, subdomain: w.subdomain,
        sections: typeof w.sections_json === 'string' ? JSON.parse(w.sections_json) : w.sections_json,
        theme: w.theme_config
      }));
      zip.file('webspec.json', JSON.stringify(webspecs, null, 2));
    } catch (e) {
      logger.warn("[Backup] Structure export failed, continuing with DB only", e);
    }

    // 4. Media Assets
    try {
      const mediaAssets = await this.store.getAllMediaAssets();
      const mediaFolder = zip.folder('media');
      if (mediaFolder && mediaAssets.length > 0) {
        for (const asset of mediaAssets) {
          if (asset.data_base64) {
            mediaFolder.file(asset.filename, asset.data_base64.split(',')[1], { base64: true });
          }
        }
      }
    } catch (e: any) {
      const msg = e?.message?.toLowerCase() || '';
      if (msg.includes('no such table')) {
        console.debug("[Backup] media_assets table not found, skipping media export.");
      } else {
        logger.warn("[Backup] Media export failed", e);
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `rentikpro_full_${timestamp}.zip`;

    console.log(`[EXPORT:FULL] Created blob (${blob.size} bytes). Filename: ${filename}`);

    localStorage.setItem('rentik_last_backup_date', new Date().toISOString());
    return { blob, filename };
  }


  async importFullBackupZip(file: File, onProgress?: (msg: string) => void): Promise<boolean> {
    try {
      if (onProgress) onProgress("Leyendo archivo ZIP...");
      const zip = await JSZip.loadAsync(file);

      // 1. Load Database using MERGE (Sequential & Safety)
      const dbFile = zip.file('database.sqlite');
      if (!dbFile) throw new Error("El backup no contiene 'database.sqlite'");

      if (onProgress) onProgress("Extrayendo base de datos...");
      const dbData = await dbFile.async('uint8array');

      // 2. Identify and restore context
      // We create a new project ID for the restored data
      const name = `Restored ${new Date().toLocaleDateString()}`;
      const id = `proj_restored_${Date.now()}`;
      this.currentProjectId = id;
      this.currentProjectMode = 'real';

      // Perform sequential merge (Structural -> Operational)
      // This preserves existing data in the DB engine if any, but restores these specific tables
      await this.store.merge(dbData, onProgress);

      if (onProgress) onProgress("Persistiendo en almacenamiento local...");
      await this.persistCurrentProject(name);
      this.setActiveContext(id, 'real');

      // 3. SECURE: Set sync to MANUAL after restore to avoid immediate network hits
      if (onProgress) onProgress("Configurando sincronización manual y pendiente...");
      localStorage.setItem('rentikpro_sync_interval', 'MANUAL');
      localStorage.setItem('rentikpro_sync_pending', 'true');

      // 4. Verification Logs
      const counts = await this.store.getCounts();
      const connections = await this.store.getChannelConnections();

      if (onProgress) {
        onProgress("Restauración completada con éxito.");
        onProgress(`- Reservas: ${counts.bookings}`);
        onProgress(`- Movimientos: ${counts.accounting}`);
        onProgress(`- Conexiones iCal: ${connections.length}`);
        onProgress(`- Sync Restore Status: PENDING (Manual required)`);
      }

      localStorage.setItem('rentik_last_restore_date', new Date().toISOString());
      this.startAutoSave();
      notifyDataChanged('all');

      return true;
    } catch (e: any) {
      logger.error("Full Restore Failed", e);
      if (onProgress) onProgress(`ERROR: ${e.message}`);
      throw e;
    }
  }

  // --- SERIALIZATION UTILITIES (used by file-mode persistence and autosave) ---

  /**
   * Serializes the current project to raw bytes (ZIP format, same as full backup).
   * Safe to call at any time while a project is loaded.
   * Returns the same content as exportFullBackupZip(), but as Uint8Array instead of Blob.
   */
  async serializeProjectToBytes(): Promise<Uint8Array> {
    logger.log('[Serialize] Building project bytes...');
    // Debug: log booking count to verify records are in DB before serializing
    try {
      const rows = await this.store.query("SELECT COUNT(*) as c FROM bookings");
      logger.log(`[Serialize] bookings count = ${rows[0]?.c ?? 0}`);
    } catch (_) { }
    const { blob } = await this.exportFullBackupZip();
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    logger.log(`[Serialize] Done — ${bytes.byteLength} bytes`);
    return bytes;
  }

  /**
   * Restores a project from raw bytes (ZIP format produced by serializeProjectToBytes).
   * Equivalent to importFullBackupZip() but accepts Uint8Array instead of File.
   *
   * @param bytes  Raw ZIP bytes previously produced by serializeProjectToBytes()
   * @param options.setAsActive  If true (default), sets this project as the active context
   *                             and starts auto-save. Pass false for read-only inspection.
   */
  async loadProjectFromBytes(
    bytes: Uint8Array,
    options: { setAsActive?: boolean } = {}
  ): Promise<void> {
    const { setAsActive = true } = options;
    logger.log(`[Deserialize] Loading project from ${bytes.byteLength} bytes...`);

    // Wrap in a File so importFullBackupZip can use JSZip.loadAsync(file)
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' });
    const file = new File([blob], 'project.rentikpro', { type: 'application/zip' });

    const ok = await this.importFullBackupZip(file);

    if (ok && !setAsActive) {
      // If caller does NOT want auto-save (e.g. read-only check), stop the timer.
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }
    }

    logger.log(`[Deserialize] Load complete (setAsActive=${setAsActive})`);
  }

  /**
   * Loads a project from raw SQLite bytes (db.sqlite) without going through IDB.
   * Intended for desktop folder-based projects (Tauri).
   */
  async loadProjectFromSqliteBytes(
    dbBytes: Uint8Array,
    ctx: {
      projectId: string;
      name: string;
      mode: 'real' | 'demo';
      setAsActive?: boolean;
      startAutoSave?: boolean;
      persistToIdb?: boolean;
    }
  ): Promise<void> {
    const {
      projectId,
      name,
      mode,
      setAsActive = false,
      startAutoSave = false,
      persistToIdb = false,
    } = ctx;

    await this.store.load(dbBytes);
    this.currentProjectId = projectId;
    this.currentProjectMode = mode;
    this.lastSyncedAt = Date.now();

    const counts = await this.store.getCounts();
    this.currentCounts = { bookings: counts.bookings, accounting: counts.accounting };

    if (setAsActive) {
      this.setActiveContext(projectId, mode);
    }
    if (persistToIdb) {
      try {
        await this.persistCurrentProject(name);
      } catch (e) {
        logger.warn('[ProjectManager] Could not persist external project metadata to IDB', e);
      }
    }

    if (startAutoSave) {
      this.startAutoSave();
    } else {
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }
    }

    notifyDataChanged('all');
  }

  // --- FILE-MODE OPERATIONS (Chrome/Edge only — Safari falls back to IDB) ---

  /** Returns 'file' if using File System Access API, 'idb' otherwise. */
  getStorageMode(): 'idb' | 'file' {
    return this.storageMode;
  }

  /** Switch storage mode programmatically. Does NOT migrate data. */
  setStorageMode(mode: 'idb' | 'file'): void {
    this.storageMode = mode;
    logger.log(`[StorageMode] Switched to '${mode}'`);
  }

  /**
   * Opens a project from a file on disk.
   * Prompts the user via OS file picker, reads bytes, and loads the project.
   *
   * IMPORTANT: Uses store.load() (binary DB swap) — NOT importFullBackupZip/merge —
   * so ALL tables (including bookings) are guaranteed to be restored exactly as saved.
   * Sets storageMode = 'file' so future saves go back to the file.
   */
  async openProjectFromFile(): Promise<boolean> {
    if (!this.fileProvider.supportsFileSystemAccess()) {
      throw new Error('File System Access API no está disponible en este navegador (requiere Chrome/Edge).');
    }
    logger.log('[FileMode] Opening project from file...');
    const zipBytes = await this.fileProvider.openProjectFile();
    if (!zipBytes) {
      logger.log('[FileMode] Open cancelled by user.');
      return false;
    }

    // Extract database.sqlite from the ZIP (same format as exportFullBackupZip)
    const zip = await JSZip.loadAsync(zipBytes);
    const dbFile = zip.file('database.sqlite');
    if (!dbFile) {
      throw new Error("El archivo no contiene 'database.sqlite'. ¿Es un archivo .rentikpro válido?");
    }
    const dbBytes = await dbFile.async('uint8array');

    // --- DIAG 1: booking count in the extracted DB ---
    try {
      const SQL = await (this.store as any).getSQL();
      const tempDb = new SQL.Database(dbBytes);
      const res = tempDb.exec("SELECT COUNT(*) as c FROM bookings");
      const count = res[0]?.values[0]?.[0] ?? 0;
      console.log('[FILE OPEN] bookings in extracted db.sqlite =', count);
      tempDb.close();
    } catch (_) { }

    // Binary swap: same path as loadProject() → guaranteed to preserve ALL tables
    await this.store.load(dbBytes);

    // Set project context (generate a stable ID from the file name)
    const fileName = this.fileProvider.getProjectDisplayName();
    const projectId = `proj_file_${btoa(fileName).replace(/[^a-z0-9]/gi, '').substring(0, 16)}`;
    this.currentProjectId = projectId;
    this.currentProjectMode = 'real';
    this.lastSyncedAt = Date.now();

    const counts = await this.store.getCounts();
    this.currentCounts = { bookings: counts.bookings, accounting: counts.accounting };

    this.setActiveContext(projectId, 'real');
    this.storageMode = 'file';

    // Persist metadata to IDB so the project appears in "Mis Proyectos"
    try {
      await this.persistCurrentProject(fileName);
    } catch (e) {
      logger.warn('[FileMode] Could not persist project metadata to IDB', e);
    }

    this.startAutoSave();
    notifyDataChanged('all');

    // --- DIAG 4: booking count after load ---
    try {
      const rows = await this.store.query("SELECT COUNT(*) as c FROM bookings");
      console.log('[FILE OPEN] bookings count after load =', rows[0]?.c ?? 0);
    } catch (_) { }

    logger.log(`[FileMode] Project loaded — ${fileName} | bookings: ${this.currentCounts.bookings}`);
    return true;
  }

  /**
   * Prompts the user to pick a save location for a new project file,
   * then initialises a blank project and writes the initial bytes to disk.
   * Sets storageMode = 'file'.
   * @param defaultName suggested file name, e.g. 'mi-proyecto.rentikpro'
   */
  async createNewProjectFileAndInit(defaultName: string = 'proyecto.rentikpro'): Promise<boolean> {
    if (!this.fileProvider.supportsFileSystemAccess()) {
      throw new Error('File System Access API no está disponible en este navegador (requiere Chrome/Edge).');
    }
    logger.log('[FileMode] Picking save location for new project...');
    const created = await this.fileProvider.createNewProjectFile(defaultName);
    if (!created) {
      logger.log('[FileMode] Create cancelled by user.');
      return false;
    }

    // Initialise a fresh blank project in the store
    await this.createBlankProject();

    // Write initial bytes to the chosen file
    const bytes = await this.serializeProjectToBytes();
    await this.fileProvider.saveProjectFile(bytes);

    this.storageMode = 'file';
    logger.log(`[FileMode] New project created at: ${this.fileProvider.getProjectDisplayName()}`);
    return true;
  }

  /**
   * Saves the current project to the open file on disk.
   * Must be in 'file' mode (i.e. openProjectFromFile or createNewProjectFileAndInit called first).
   * Throws if no file handle is available.
   */
  async saveToFile(): Promise<void> {
    if (this.storageMode !== 'file') {
      throw new Error('saveToFile() called but storageMode is not \'file\'. Use saveProject() for IDB mode.');
    }
    logger.log('[FileMode] Saving project to file...');
    const bytes = await this.serializeProjectToBytes();
    await this.fileProvider.saveProjectFile(bytes);
    this.lastSyncedAt = Date.now();
    logger.log('[FileMode] Saved ✓');
  }

  /** Returns the display name of the currently linked file (or 'Sin archivo'). */
  getFileDisplayName(): string {
    return this.fileProvider.getProjectDisplayName();
  }

  /** Returns the current file save state for UI feedback ('idle'|'saving'|'saved'|'error'). */
  getFileSaveState(): 'idle' | 'saving' | 'saved' | 'error' {
    return this.fileSaveState;
  }

  /**
   * Schedules a debounced (1500 ms) write of the current project to disk.
   * Safe to call many times in quick succession — only the last call triggers the write.
   * No-op if not in 'file' mode or no file handle is open.
   *
   * IMPORTANT: uses isSavingToFile guard to prevent the re-entrance loop:
   *   saveProject() -> scheduleAutoSaveFile() -> saveToFile()
   *     -> serializeProjectToBytes() -> exportFullBackupZip() -> saveProject()
   *     -> scheduleAutoSaveFile() would fire again → BLOCKED by isSavingToFile
   */
  scheduleAutoSaveFile(): void {
    if (this.storageMode !== 'file' || !this.fileProvider.hasOpenFile()) return;

    // PRO: si ya estamos guardando, no reprogramar (evita "Guardando..." infinito por re-entrancia)
    if (this.isSavingToFile) return;

    // Cancel any pending write
    if (this.fileAutoSaveTimer) {
      clearTimeout(this.fileAutoSaveTimer);
    }

    // No machacar estado si ya está guardando (por seguridad)
    if (this.fileSaveState !== 'saving') this.fileSaveState = 'idle';

    this.fileAutoSaveTimer = setTimeout(async () => {
      this.fileAutoSaveTimer = null;
      this.fileSaveState = 'saving';
      this.isSavingToFile = true; // prevent re-entrance
      try {
        // --- DIAG 1: booking count BEFORE serialize ---
        try {
          const rows = await this.store.query("SELECT COUNT(*) as c FROM bookings");
          console.log('[FILE SAVE] bookings count before serialize =', rows[0]?.c ?? 0);
        } catch (_) { }

        // Export the raw ZIP bytes
        const { blob } = await this.exportFullBackupZip();
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // --- DIAG 2: bytes size + check db.sqlite presence in ZIP ---
        console.log('[FILE SAVE] bytes.length =', bytes.length);
        try {
          const JSZip = (await import('jszip')).default;
          const inspectZip = await JSZip.loadAsync(buffer.slice(0));
          const entries = Object.keys(inspectZip.files);
          console.log('[FILE SAVE] ZIP entries =', entries);
          console.log('[FILE SAVE] has database.sqlite =', entries.includes('database.sqlite'));
        } catch (zipErr) {
          console.log('[FILE SAVE] Could not inspect ZIP:', zipErr);
        }

        await this.fileProvider.saveProjectFile(bytes);

        // --- DIAG 3: booking count AFTER file write (confirms live DB state) ---
        try {
          const rows2 = await this.store.query("SELECT COUNT(*) as c FROM bookings");
          console.log('[FILE SAVE] bookings count after save =', rows2[0]?.c ?? 0);
        } catch (_) { }

        this.fileSaveState = 'saved';
        logger.log('[FileMode AutoSave] ✓ Saved to file');
      } catch (e) {
        this.fileSaveState = 'error';
        logger.error('[FileMode AutoSave] Failed', e);

        // If we lost permissions or the handle became invalid, fall back to IDB snapshots.
        const name = (e as any)?.name || '';
        const msg = String((e as any)?.message || e);
        const isPermission = name === 'NotAllowedError' || name === 'SecurityError' || msg.toLowerCase().includes('permission');
        if (isPermission) {
          try {
            await this.fileProvider.clearPersistedHandle();
          } catch { }
          this.fileProvider.clearHandle();
          this.storageMode = 'idb';
          try {
            localStorage.setItem('rp_fsa_last_error', msg.slice(0, 400));
          } catch { }
          notifyDataChanged('all');
        }
      } finally {
        this.isSavingToFile = false;
      }
    }, 1500);
  }

  // ...

  getStore() { return this.store; }

  getProjectName() {
    return this.currentProjectId ? (this.currentProjectMode === 'demo' ? 'DEMO MODE' : 'Mi Proyecto') : 'Sin Proyecto';
  }

  getCurrentProjectId() {
    return this.currentProjectId;
  }

  // ...

  // NEW: Download SQLite plain
  async downloadSqlite() {
    await this.waitForFileSave();
    const data = this.store.export();
    const blob = new Blob([data as any], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rentikpro-${new Date().toISOString().slice(0, 10)}.sqlite`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Stub for interface compatibility if needed
  async openProject(): Promise<boolean> { return false; }
  async saveProjectAndExport(): Promise<void> { await this.saveProject(); await this.downloadSqlite(); }
  // --- EXPORT / IMPORT IMPLEMENTATIONS ---

  private downloadJson(filename: string, data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async exportProjectDataOnly() {
    try {
      const data = {
        app_version: APP_VERSION,
        schema_version: SCHEMA_VERSION,
        exported_at: new Date().toISOString(),
        type: 'DATA_ONLY',
        // Operational Data
        travelers: await this.store.query("SELECT * FROM travelers"),
        bookings: await this.store.query("SELECT * FROM bookings"),
        stays: await this.store.query("SELECT * FROM stays"),
        movements: await this.store.query("SELECT * FROM accounting_movements"),
        cleaning_tasks: await this.store.query("SELECT * FROM cleaning_tasks"),
        maintenance_issues: await this.store.query("SELECT * FROM maintenance_issues"),
        conversations: await this.store.query("SELECT * FROM conversations"),
        messages: await this.store.query("SELECT * FROM messages"),
        // BLOCK 11: Added missing operational tables
        channel_connections: await this.store.query("SELECT * FROM channel_connections"),
        calendar_events: await this.store.query("SELECT * FROM calendar_events"),
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      this.downloadJson(`rentikpro_data_${timestamp}.json`, data);
    } catch (e) {
      logger.error("Export Data Failed", e);
      alert("Error exportando datos: " + e);
    }
  }

  async exportProjectStructureOnly() {
    try {
      const data = {
        app_version: APP_VERSION,
        schema_version: SCHEMA_VERSION,
        exported_at: new Date().toISOString(),
        type: 'STRUCTURE_ONLY',
        // Structural Data
        properties: await this.store.query("SELECT * FROM properties"),
        apartments: await this.store.query("SELECT * FROM apartments"),
        user_settings: await this.store.query("SELECT * FROM user_settings"),
        websites: await this.store.query("SELECT * FROM websites"),
        marketing_campaigns: await this.store.query("SELECT * FROM marketing_campaigns"),
        marketing_templates: await this.store.query("SELECT * FROM marketing_templates"),
        marketing_email_templates: await this.store.query("SELECT * FROM marketing_email_templates"),
        cleaning_templates: await this.store.query("SELECT * FROM cleaning_templates"),
        fees: await this.store.query("SELECT * FROM fees"),
        policies: await this.store.query("SELECT * FROM booking_policies"),
        // Fiscal Profile
        fiscal_profile: await this.store.query("SELECT * FROM fiscal_profile"),
        // BLOCK 11: Added channel_connections to structure to preserve settings
        channel_connections: await this.store.query("SELECT * FROM channel_connections"),
      };
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      this.downloadJson(`rentikpro_structure_${timestamp}.json`, data);
    } catch (e) {
      logger.error("Export Structure Failed", e);
      alert("Error exportando estructura: " + e);
    }
  }

  async importProjectDataOnly(jsonString: string): Promise<any> {
    try {
      const data = JSON.parse(jsonString);
      /*
      if (!data.type || data.type !== 'DATA_ONLY') {
         // Relaxed check: if it has 'bookings' and 'travelers', we accept it
         if (!data.bookings && !data.travelers) throw new Error("JSON no parece ser un backup de datos válido.");
      }
      */

      // 1. Ensure we have an active project context to attach data to
      this.ensureActiveProjectContext();

      // Order matters for Foreign Keys? We disabled checks or handle order?
      // SQLiteStore init enables FKs: `PRAGMA foreign_keys = ON;`.
      // We should disable FKs during bulk import or delete in correct order.
      await this.store.execute("PRAGMA foreign_keys = OFF;");

      const tables = [
        'bookings', 'stays', 'travelers', 'accounting_movements',
        'cleaning_tasks', 'maintenance_issues', 'conversations', 'messages',
        'channel_connections', 'calendar_events'
      ];
      const counts: any = {};
      const errors: any = {};

      await this.store.execute("BEGIN TRANSACTION;");

      try {
        for (const table of tables) {
          if (data[table] && Array.isArray(data[table])) {
            // clear table first?
            // "Restore" implies replacing operational data usually, or merging?
            // Let's go with DELETE ALL for "Restore" of Data Only.
            // But we must be careful not to delete structure.
            // Assuming tables listed are purely data.
            await this.store.execute(`DELETE FROM ${table}`);

            let inserted = 0;
            for (const row of data[table]) {
              const cols = Object.keys(row).join(',');
              const placeholders = Object.keys(row).map(() => '?').join(',');
              const values = Object.values(row);
              await this.store.executeWithParams(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);
              inserted++;
            }
            counts[table] = inserted;
          }
        }
        await this.store.execute("COMMIT;");
      } catch (err) {
        await this.store.execute("ROLLBACK;");
        throw err;
      } finally {
        await this.store.execute("PRAGMA foreign_keys = ON;");
      }

      // 2. Reconstruct Calendar Events from Bookings (Essential for Manual Reservations to show up)
      logger.log("[Import] Reconstructing calendar events from imported bookings...");
      try {
        await this.store.execute("DELETE FROM calendar_events WHERE booking_id IS NOT NULL");
        const allBookings = await this.store.query("SELECT * FROM bookings");
        for (const b of allBookings) {
          await this.store.upsertCalendarEventFromBooking(b);
        }
        logger.log(`[Import] Reconstructed events for ${allBookings.length} bookings.`);
      } catch (evtErr) {
        logger.error("[Import] Failed to reconstruct calendar events", evtErr);
        // Non-fatal, return warning
      }

      const realCounts = await this.store.getCounts();

      await this.saveProject();
      notifyDataChanged('all');
      return { success: true, counts, realCounts, errors, wasLegacy: data.schema_version === undefined };

    } catch (e: any) {
      logger.error("Import Data Failed", e);
      return { success: false, errors: { general: e.message } };
    }
  }

  async importProjectStructureOnly(jsonString: string): Promise<any> {
    try {
      // 1. Ensure we have an active project context
      this.ensureActiveProjectContext();
      const data = JSON.parse(jsonString);

      await this.store.execute("PRAGMA foreign_keys = OFF;");
      await this.store.execute("BEGIN TRANSACTION;");

      const tables = [
        'properties', 'apartments', 'user_settings', 'websites',
        'marketing_campaigns', 'marketing_templates', 'marketing_email_templates',
        'cleaning_templates', 'fees', 'booking_policies', 'fiscal_profile',
        'channel_connections'
      ];

      // Special handling: settings is singleton usually, but table has ID.
      // We will clear and insert.

      const counts: any = {};

      try {
        for (const table of tables) {
          if (data[table] && Array.isArray(data[table])) {
            await this.store.execute(`DELETE FROM ${table}`);
            let inserted = 0;
            for (const row of data[table]) {
              // SPECIAL HANDLING: user_settings
              // Force ID to 'default' so it takes effect as the active configuration
              if (table === 'user_settings') {
                row.id = 'default';
                // Log what we are importing for debugging
                logger.log(`[Import] Restore Settings: Name="${row.business_name}", Email="${row.contact_email}"`);
              }

              const cols = Object.keys(row).join(',');
              const placeholders = Object.keys(row).map(() => '?').join(',');
              const values = Object.values(row);
              await this.store.executeWithParams(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);
              inserted++;
            }
            counts[table] = inserted;
          }
        }
        await this.store.execute("COMMIT;");
      } catch (err) {
        await this.store.execute("ROLLBACK;");
        throw err;
      } finally {
        await this.store.execute("PRAGMA foreign_keys = ON;");
      }

      // LOGS & VERIFICATION
      if (counts.user_settings > 0) {
        try {
          const settings = await this.store.getSettings();
          logger.log(`[Import] Settings Update: ${counts.user_settings} records.`);
          logger.log(`[Import] Timezone: ${settings.default_timezone || 'N/A'}`);
          logger.log(`[Import] DateFmt: ${settings.date_format || 'N/A'}`);
          logger.log(`[Import] Email: ${settings.contact_email || 'N/A'}`);
        } catch (e) { /* ignore read error */ }
      }

      notifyDataChanged('all');
      await this.saveProject();
      return {
        success: true,
        properties: counts.properties || 0,
        apartments: counts.apartments || 0,
        settings: counts.user_settings || 0,
        wasLegacy: data.schema_version === undefined
      };

    } catch (e: any) {
      logger.error("Import Structure Failed", e);
      return { success: false, error: e.message };
    }
  }


  forceResetSavingState(): void {
    logger.warn("[ProjectManager] Manually resetting saving state.");
    this.isSavingToFile = false;
    this.fileSaveState = 'idle';
    if (this.fileAutoSaveTimer) {
      clearTimeout(this.fileAutoSaveTimer);
      this.fileAutoSaveTimer = null;
    }
    notifyDataChanged('all');
  }
}

export const projectManager = new ProjectManager();
