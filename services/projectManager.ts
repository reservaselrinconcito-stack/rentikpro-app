import { SQLiteStore } from './sqliteStore';
import { notifyDataChanged } from './dataRefresher';
import { DataOnlyBackup, StructureOnlyBackup } from '../types';
import { logger } from './logger';
import JSZip from 'jszip';
import { APP_VERSION, SCHEMA_VERSION } from '../src/version';
import { projectPersistence } from './projectPersistence';
import { demoGenerator } from './demoGenerator';

export class ProjectManager {
  public store: SQLiteStore;
  private currentProjectId: string | null = null;
  private currentProjectMode: 'real' | 'demo' = 'real';
  private lastSyncedAt: number | null = null;
  private autoSaveInterval: any = null;
  private currentCounts: { bookings: number, accounting: number } = { bookings: 0, accounting: 0 };

  constructor() {
    this.store = new SQLiteStore();
  }

  // --- INITIALIZATION ---

  async initialize(): Promise<void> {
    // Check if we should auto-load a project
    const activeId = localStorage.getItem('active_project_id');
    const activeMode = localStorage.getItem('active_project_mode') as 'real' | 'demo';

    if (activeId && activeMode) {
      logger.log(`[ProjectManager] Auto-loading active project: ${activeId} (${activeMode})`);
      const success = await this.loadProject(activeId);
      if (!success) {
        logger.warn("[ProjectManager] Failed to auto-load active project. Needs user action.");
        localStorage.removeItem('active_project_id');
        localStorage.removeItem('active_project_mode');
      }
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

      notifyDataChanged();
      return true;
    } catch (err) {
      logger.error("Error loading project:", err);
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

  private setActiveContext(id: string, mode: 'real' | 'demo') {
    localStorage.setItem('active_project_id', id);
    localStorage.setItem('active_project_mode', mode);
  }

  private startAutoSave() {
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
    this.autoSaveInterval = setInterval(() => {
      this.saveProject().catch(e => console.warn("Auto-save failed", e));
    }, 30000); // 30s auto-save to IndexedDB
  }

  // --- PERSISTENCE ---

  async saveProject(): Promise<void> {
    if (!this.store || !this.currentProjectId) return;
    const name = this.currentProjectMode === 'demo' ? 'DEMO RentikPro' : `Proyecto ${new Date().toLocaleDateString()}`; // Simplify name logic
    await this.persistCurrentProject(name);
    this.lastSyncedAt = Date.now();
  }

  private async persistCurrentProject(name: string) {
    if (!this.currentProjectId) return;
    const data = this.store.export();

    // Refresh counts before persisting metadata
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

  getProjectStats() {
    return this.currentCounts;
  }

  isProjectEmpty() {
    return this.currentCounts.bookings === 0 && this.currentCounts.accounting === 0;
  }

  // --- LEGACY / HELPER ---

  // Ensure default property exists
  private async ensureDefaultProperty() {
    const props = await this.store.getProperties();
    if (props.length === 0) {
      logger.log("Initializing default property...");
      await this.store.saveProperty({
        id: 'prop_default',
        name: 'Propiedad principal',
        created_at: Date.now(),
        is_active: true,
        timezone: 'Europe/Madrid',
        currency: 'EUR',
        updated_at: Date.now()
      });
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

  // ... (Legacy exports, keep them)
  // --- FULL BACKUP (ZIP) ---

  async exportFullBackupZip(): Promise<void> {
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

    // 3. Structural Config (Enhanced transparency)
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

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rentikpro-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    localStorage.setItem('rentik_last_backup_date', new Date().toISOString());
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

  // ...

  getStore() { return this.store; }

  getProjectName() {
    return this.currentProjectId ? (this.currentProjectMode === 'demo' ? 'DEMO MODE' : 'Mi Proyecto') : 'Sin Proyecto';
  }

  getCurrentProjectId() {
    return this.currentProjectId;
  }

  async closeProject() {
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
    this.currentProjectId = null;
    this.lastSyncedAt = null;
    localStorage.removeItem('active_project_id');
    localStorage.removeItem('active_project_mode');
    await this.store.close();
  }

  // NEW: Download SQLite plain
  async downloadSqlite() {
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
      };
      this.downloadJson(`rentikpro-data-${new Date().toISOString().slice(0, 10)}.json`, data);
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
      };
      this.downloadJson(`rentikpro-structure-${new Date().toISOString().slice(0, 10)}.json`, data);
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

      // Order matters for Foreign Keys? We disabled checks or handle order?
      // SQLiteStore init enables FKs: `PRAGMA foreign_keys = ON;`.
      // We should disable FKs during bulk import or delete in correct order.
      await this.store.execute("PRAGMA foreign_keys = OFF;");

      const tables = ['bookings', 'stays', 'travelers', 'accounting_movements', 'cleaning_tasks', 'maintenance_issues', 'conversations', 'messages'];
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
      const data = JSON.parse(jsonString);

      await this.store.execute("PRAGMA foreign_keys = OFF;");
      await this.store.execute("BEGIN TRANSACTION;");

      const tables = ['properties', 'apartments', 'user_settings', 'websites', 'marketing_campaigns', 'marketing_templates', 'marketing_email_templates', 'cleaning_templates', 'fees', 'booking_policies', 'fiscal_profile'];

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
}

export const projectManager = new ProjectManager();