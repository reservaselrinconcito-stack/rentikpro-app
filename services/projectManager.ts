
import { SQLiteStore } from './sqliteStore';
import { notifyDataChanged } from './dataRefresher';
import { DataOnlyBackup, StructureOnlyBackup } from '../types';
import { logger } from './logger';

export class ProjectManager {
  private store: SQLiteStore;
  private currentProjectPath: string | null = null;
  private sandboxPath: string | null = null;
  private lastSyncedAt: number | null = null;

  constructor() {
    this.store = new SQLiteStore();
  }

  isProjectLoaded(): boolean {
    return !!this.currentProjectPath;
  }

  // --- ACTIVE PROPERTY CONTEXT (Block 11-B) ---

  getActivePropertyId(): string {
    return localStorage.getItem('activePropertyId') || 'prop_default';
  }

  setActivePropertyId(id: string) {
    localStorage.setItem('activePropertyId', id);
    // Notificamos 'all' para que la UI reaccione al cambio de contexto (aunque aún no filtre)
    notifyDataChanged('all');
  }

  // --------------------------------------------

  async createNewProject(): Promise<boolean> {
    await this.store.init();
    await this.ensureDefaultProperty(); // Init defaults
    await this.runSilentPropertyIdMigration(); // Block 11-C Migration
    this.currentProjectPath = 'web_demo.rentikpro.sqlite';
    this.lastSyncedAt = Date.now();
    notifyDataChanged();
    return true;
  }

  async openProject(): Promise<boolean> {
    // This functionality is desktop-specific (opening local files)
    // For web, users must use the file input on the landing screen.
    alert("Para abrir un proyecto en la versión web, usa el botón 'Abrir Existente' de la pantalla de inicio y selecciona tu archivo .sqlite.");
    return false;
  }

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

  // Block 11-C: Silent Migration for Multi-Property Support
  private async runSilentPropertyIdMigration() {
    if (localStorage.getItem('migration_propertyId_v1_done') === '1') return;

    logger.log("Ejecutando migración silenciosa propertyId...");
    const store = this.store;
    let updates = 0;

    // 1. Apartments
    const apartments = await store.getAllApartments();
    for (const apt of apartments) {
      if (!apt.property_id || apt.property_id === 'undefined') {
        apt.property_id = 'prop_default';
        await store.saveApartment(apt);
        updates++;
      }
    }

    // 2. Bookings
    const bookings = await store.getBookings();
    for (const b of bookings) {
      if (!b.property_id || b.property_id === 'undefined') {
        b.property_id = 'prop_default';
        // Intenta inferir desde el apartamento si existe
        if (b.apartment_id) {
          const apt = apartments.find(a => a.id === b.apartment_id);
          if (apt) b.property_id = apt.property_id;
        }
        await store.saveBooking(b);
        updates++;
      }
    }

    // 3. Calendar Events
    const events = await store.getCalendarEvents(); // Gets all if no connId
    for (const evt of events) {
      if (!evt.property_id || evt.property_id === 'undefined') {
        evt.property_id = 'prop_default';
        if (evt.apartment_id) {
          const apt = apartments.find(a => a.id === evt.apartment_id);
          if (apt) evt.property_id = apt.property_id;
        }
        await store.saveCalendarEvent(evt);
        updates++;
      }
    }

    // Block 22: Cancellation Policies (newly added)
    const policies = await store.getCancellationPolicies('ALL_LEGACY'); // Fetching all for migration
    for (const p of policies) {
      if (!p.property_id || p.property_id === 'undefined' || p.property_id === 'ALL_LEGACY') {
        p.property_id = 'prop_default';
        await store.saveCancellationPolicy(p);
        updates++;
      }
    }

    localStorage.setItem('migration_propertyId_v1_done', '1');
    logger.log(`Migración completada. ${updates} registros actualizados.`);
  }

  async saveProject(): Promise<void> {
    if (!this.store) return;
    const data = this.store.export();
    if (data.length === 0) return; // Prevent empty export if store failed

    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rentikpro_export.sqlite';
    a.click();
    URL.revokeObjectURL(url);
    this.lastSyncedAt = Date.now();
  }

  async exportProjectDataOnly(): Promise<void> {
    const data = await this.store.exportDataOnly();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'rentikpro-data.json'; a.click();
    URL.revokeObjectURL(url);
  }

  async exportProjectStructureOnly(): Promise<void> {
    const data = await this.store.exportStructureOnly();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'rentikpro-structure.json'; a.click();
    URL.revokeObjectURL(url);
  }

  async importProjectDataOnly(fileOrContent: File | string): Promise<any> {
    try {
      let data: DataOnlyBackup;
      if (typeof fileOrContent === 'string') {
        data = JSON.parse(fileOrContent);
      } else {
        const text = await fileOrContent.text();
        data = JSON.parse(text);
      }
      const result = await this.store.importDataOnly(data);
      notifyDataChanged();
      return result;
    } catch (e) {
      console.error("JSON Import Data error:", e);
      throw e;
    }
  }

  async importProjectStructureOnly(fileOrContent: File | string): Promise<any> {
    try {
      let data: StructureOnlyBackup;
      if (typeof fileOrContent === 'string') {
        data = JSON.parse(fileOrContent);
      } else {
        const text = await fileOrContent.text();
        data = JSON.parse(text);
      }
      const result = await this.store.importStructureOnly(data);
      notifyDataChanged();
      return result;
    } catch (e) {
      console.error("JSON Import Structure error:", e);
      throw e;
    }
  }

  async importProjectFromFile(file: File) {
    // Validar extensión
    if (!file.name.endsWith('.sqlite')) {
      throw new Error('Formato inválido. Se requiere archivo .sqlite');
    }

    // Validar tamaño (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('Archivo demasiado grande (máximo 100MB)');
    }

    // Validar que sea SQLite válido
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // SQLite signature: "SQLite format 3\0"
    const header = String.fromCharCode(...Array.from(data.slice(0, 16)));
    if (!header.startsWith('SQLite format')) {
      throw new Error('Archivo SQLite corrupto o inválido');
    }

    await this.store.load(data);
    this.currentProjectPath = file.name;
    await this.ensureDefaultProperty();
    await this.runSilentPropertyIdMigration();
    this.lastSyncedAt = Date.now();
    notifyDataChanged();
  }

  getStore() { return this.store; }

  getProjectName() {
    if (!this.currentProjectPath) return 'Sin Proyecto';
    return this.currentProjectPath.split(/[\\/]/).pop()?.replace('.rentikpro.sqlite', '') || 'Proyecto';
  }

  async closeProject() {
    this.currentProjectPath = null;
    this.sandboxPath = null;
    this.lastSyncedAt = null;
    try {
      await this.store.close();
    } catch (err) {
      console.warn("Could not close store cleanly", err);
    }
  }

  getProjectDetails() {
    return {
      name: this.getProjectName(),
      externalPath: this.currentProjectPath,
      sandboxPath: this.sandboxPath,
      lastSyncedAt: this.lastSyncedAt
    };
  }
}

export const projectManager = new ProjectManager();