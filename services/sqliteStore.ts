
import {
  IDataStore, Property, Apartment, Traveler, Stay, AccountingMovement,
  Booking, FiscalProfile, DataOnlyBackup, StructureOnlyBackup,
  MarketingTemplate, MarketingEmailTemplate, MarketingLog, MarketingEmailLog, MarketingCampaign, Coupon,
  RegistryUnit, RegistryPresentation, WebSite,
  CleaningTask, CleaningTemplate,
  MaintenanceIssue, MaintenancePhoto,
  CommunicationAccount, Conversation, Message, MessageAttachment, ConversationStatus,
  AiPersona, AiKnowledgeFact, AiAuditLog, ChannelConnection, CalendarEvent, MediaAsset,
  PricingRuleSet, PricingRule, BookingPriceSnapshot,
  CancellationPolicy, RatePlan, PricingModifier, Fee, UserSettings,
  ProvisionalBooking, BookingPolicy, PolicyScope, EmailIngest, EmailIngestStatus,
  PaymentMode, DepositType, DepositDue, RemainingDue, SecurityDepositMethod, CancellationPolicyType,
  CheckInRequest, PropertySnapshot, SiteDraft, SiteOverrides,
  PricingDefaults, NightlyRateOverride
} from '../types';
import { PaymentScheduleItem, CheckoutResult, checkoutService } from './checkoutService';
import { logger } from './logger';
import { APP_VERSION, SCHEMA_VERSION } from '../src/version';
import { notifyDataChanged } from './dataRefresher';
import { guestService } from './guestService';
import { isProvisionalBlock, isProvisionalBooking } from '../utils/bookingClassification';
import { ensureValidStay } from '../utils/dateLogic';

const DEFAULT_POLICY: BookingPolicy = {
  id: 'default_policy',
  scope_type: 'PROPERTY',
  scope_id: 'default',
  currency: 'EUR',
  payment_mode: 'PAY_ON_ARRIVAL',
  deposit_type: 'PERCENT',
  deposit_value: 0,
  deposit_due: 'IMMEDIATE',
  remaining_due: 'ON_ARRIVAL',
  accepted_methods: ['"CASH"', '"CARD"'],
  require_security_deposit: false,
  security_deposit_method: 'HOLD_CARD',
  cancellation_policy_type: 'FLEXIBLE',
  created_at: 0,
  updated_at: 0
};

declare const initSqlJs: any;

export class SQLiteStore implements IDataStore {
  public db: any = null;
  private SQL: any = null;
  public initialized = false;
  private initPromise: Promise<void> | null = null;
  private schemaFlags = {
    bookings_event_kind: false,
    bookings_event_state: false,
    bookings_provisional_id: false,
    bookings_payments: false,
    accounting_payment_id: false,
    calendar_event_kind: false,
    calendar_project_id: false,
    calendar_ical_uid: false,
    marketing_email_template_id: false,
    accounting_stay_metadata: false,
    bookings_field_sources: false,
    bookings_updated_at: false,
    bookings_pax_fields: false,
    accounting_pax_infants: false,
    bookings_needs_details: false
  };

  // Optional callback registered by ProjectManager to trigger file-mode autosave
  // when data changes. Using a callback avoids a circular import.
  private onWriteHook: (() => void) | null = null;

  /** Register a callback to be invoked after every saveBooking / deleteBooking. */
  setWriteHook(fn: () => void): void {
    this.onWriteHook = fn;
  }


  constructor() {
    // DO NOT init automatically to avoid async race conditions in boot
    // this.init(); 
  }

  private async getSQL() {
    if (this.SQL) return this.SQL;
    if (typeof initSqlJs === 'undefined') {
      throw new Error("initSqlJs not found. Ensure sql-wasm.js is loaded.");
    }
    this.SQL = await initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });
    return this.SQL;
  }

  private async ensureInitialized() {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;
    return this.init();
  }

  async load(data: Uint8Array) {
    this.initPromise = (async () => {
      const SQL = await this.getSQL();
      this.db = new SQL.Database(data);
      await this.finishInitialization();
    })();
    return this.initPromise;
  }

  /**
   * Merges data from a backup Uint8Array into the current active database.
   * Uses INSERT OR REPLACE to preserve existing data and ensure idempotency.
   */
  async merge(data: Uint8Array, onProgress?: (msg: string) => void) {
    if (!this.db) throw new Error("Database not initialized for merge");
    const SQL = await this.getSQL();
    const backupDb = new SQL.Database(data);

    // RESTORE ORDER: Structural -> Operational (as requested)
    const tables = [
      // 1. Structural
      'properties', 'apartments', 'settings', 'user_settings', 'channel_connections', 'registry_units',
      // 2. Operational
      'travelers', 'stays', 'bookings', 'calendar_events', 'accounting_movements',
      'cleaning_tasks', 'maintenance_issues', 'conversations', 'messages', 'media_assets'
    ];

    await this.execute("PRAGMA foreign_keys = OFF;");
    await this.execute("BEGIN TRANSACTION;");

    try {
      for (const table of tables) {
        if (onProgress) onProgress(`Restaurando ${table}...`);

        // Check if table exists in backup
        const tableCheck = backupDb.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
        if (tableCheck.length === 0) continue;

        const res = backupDb.exec(`SELECT * FROM ${table}`);
        if (res.length === 0) continue;

        const { columns, values } = res[0];
        const placeholders = columns.map(() => '?').join(',');
        const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;

        for (const rowValues of values) {
          await this.executeWithParams(sql, rowValues);
        }
      }
      await this.execute("COMMIT;");
      logger.log("[DB] Merge restore completed successfully.");
    } catch (e) {
      await this.execute("ROLLBACK;");
      logger.error("[DB] Merge restore failed", e);
      throw e;
    } finally {
      await this.execute("PRAGMA foreign_keys = ON;");
      backupDb.close();
    }
  }

  async init(customPath?: string): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const SQL = await this.getSQL();
      this.db = new SQL.Database();
      await this.finishInitialization();
    })();
    return this.initPromise;
  }

  private async finishInitialization() {
    if (!this.db) return;
    this.db.run("PRAGMA foreign_keys = ON;");
    await this.runMigrations();

    await this.ensureMigrations();

    await this.ensureSettings();
    await this.seedMarketingEmailTemplates();
    await this.ensureSettings();
    await this.seedMarketingEmailTemplates();
    await this.detectSchema();

    // CRITICAL: Ensure web_sites table exists for Builder persistence
    await this.ensureWebSitesSchema();
    logger.log(`[DB] Initialization complete. State: ${this.db ? 'READY' : 'CLOSED'}`);

    // SCHEMA VERSION PERSISTENCE & BACKFILL (v2 Hardening)
    const currentDbVersion = await this.getDbSchemaVersion();
    if (currentDbVersion < SCHEMA_VERSION) {
      logger.log(`[DB] Upgrading schema version: ${currentDbVersion} -> ${SCHEMA_VERSION}`);
      if (currentDbVersion < 2) {
        await this.runCalendarEventsBackfill();
      }
      await this.setDbSchemaVersion(SCHEMA_VERSION);
    }

    this.initialized = true;
  }

  private async getDbSchemaVersion(): Promise<number> {
    try {
      const res = await this.query("SELECT value FROM settings WHERE key = 'schema_version'");
      return res.length > 0 ? parseInt(res[0].value) : 0;
    } catch (e) {
      return 0; // Table might not exist yet
    }
  }

  private async setDbSchemaVersion(version: number): Promise<void> {
    await this.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER);");
    await this.executeWithParams(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
      ['schema_version', version.toString(), Date.now()]
    );
  }

  private async runCalendarEventsBackfill() {
    logger.log("[DB] Running calendar_events backfill...");
    try {
      // 1. Identify Blocks by Heuristics
      const blockKeywords = ['blocked', 'unavailable', 'bloqueado', 'no disponible', 'occupied', 'reservado', 'cierre', 'bloqueo'];
      const events = await this.query("SELECT id, summary, description FROM calendar_events WHERE event_kind IS NULL OR event_kind = '' OR event_kind = 'BOOKING'");

      let updatedCount = 0;
      for (const evt of events) {
        const text = ((evt.summary || '') + ' ' + (evt.description || '')).toLowerCase();
        const isBlock = blockKeywords.some(kw => text.includes(kw));

        if (isBlock) {
          await this.executeWithParams(
            "UPDATE calendar_events SET event_kind = 'BLOCK', event_state = 'confirmed' WHERE id = ?",
            [evt.id]
          );
          updatedCount++;
        } else {
          // Ensure default for others
          await this.executeWithParams(
            "UPDATE calendar_events SET event_kind = 'BOOKING', event_state = 'confirmed' WHERE id = ? AND (event_kind IS NULL OR event_kind = '')",
            [evt.id]
          );
        }
      }
      logger.log(`[DB] Backfill complete. Updated ${updatedCount} events to BLOCK.`);
    } catch (e) {
      logger.error("[DB] Backfill failed", e);
    }
  }

  private async detectSchema() {
    try {
      const bInfo = await this.query("PRAGMA table_info(bookings)");
      this.schemaFlags.bookings_event_kind = bInfo.some((c: any) => c.name === 'event_kind');
      this.schemaFlags.bookings_event_state = bInfo.some((c: any) => c.name === 'event_state');
      this.schemaFlags.bookings_provisional_id = bInfo.some((c: any) => c.name === 'provisional_id');
      this.schemaFlags.bookings_payments = bInfo.some((c: any) => c.name === 'payments_json');
      this.schemaFlags.bookings_field_sources = bInfo.some((c: any) => c.name === 'field_sources');
      this.schemaFlags.bookings_updated_at = bInfo.some((c: any) => c.name === 'updated_at');
      this.schemaFlags.bookings_pax_fields = bInfo.some((c: any) => c.name === 'pax_total');
      this.schemaFlags.bookings_needs_details = bInfo.some((c: any) => c.name === 'needs_details');

      const aInfo = await this.query("PRAGMA table_info(accounting_movements)");
      this.schemaFlags.accounting_payment_id = aInfo.some((c: any) => c.name === 'payment_id');
      this.schemaFlags.accounting_pax_infants = aInfo.some((c: any) => c.name === 'pax_infants');

      const cInfo = await this.query("PRAGMA table_info(calendar_events)");
      this.schemaFlags.calendar_event_kind = cInfo.some((c: any) => c.name === 'event_kind');
      this.schemaFlags.calendar_project_id = cInfo.some((c: any) => c.name === 'project_id');
      this.schemaFlags.calendar_ical_uid = cInfo.some((c: any) => c.name === 'ical_uid');

      const mInfo = await this.query("PRAGMA table_info(marketing_campaigns)");
      this.schemaFlags.marketing_email_template_id = mInfo.some((c: any) => c.name === 'email_template_id');

      this.schemaFlags.accounting_stay_metadata = aInfo.some((c: any) => c.name === 'check_in');

      logger.log("[DB] Schema Detection:", this.schemaFlags);
      if (!this.schemaFlags.bookings_event_kind || !this.schemaFlags.bookings_event_state) {
        logger.warn("[DB] missing columns: event_kind,event_state — fallback mode active");
      }
    } catch (e) {
      logger.error("[DB] Schema detection failed", e);
    }
  }

  /**
   * Helper function for SQL migrations with intelligent error handling
   * Silences "duplicate column" errors but logs actual problems
   */
  private async safeMigration(sql: string, description: string = ''): Promise<void> {
    try {
      await this.execute(sql);
    } catch (e: any) {
      const errorMsg = e?.message?.toLowerCase() || '';
      // Only ignore expected "column already exists" errors
      if (errorMsg.includes('duplicate column') || errorMsg.includes('already exists')) {
        // Silently ignore - migration already applied
        return;
      }
      // Log actual errors
      logger.error(`Migration failed: ${description || sql.substring(0, 50)}...`, e);
      throw e; // Re-throw critical errors
    }
  }

  private async ensureColumn(table: string, col: string, type: string) {
    try {
      const tableExists = await this.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [table]);
      if (tableExists.length === 0) return;

      const info = await this.query(`PRAGMA table_info(${table})`);
      const exists = info.some((c: any) => c.name === col);
      if (!exists) {
        await this.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
        logger.log(`[DB] Migration applied: ${table}.${col}`);
      }
    } catch (e) {
      logger.error(`[DB] Failed to ensure column ${table}.${col}`, e);
    }
  }

  private async ensureMigrations() {
    // 1. Ensure Columns exist (Critical for ancient restores)
    await this.ensureColumn("bookings", "booking_key", "TEXT");
    await this.ensureColumn("bookings", "project_id", "TEXT");
    await this.ensureColumn("accounting_movements", "project_id", "TEXT");
    await this.ensureColumn("accounting_movements", "property_id", "TEXT");
    await this.ensureColumn("bookings", "field_sources", "TEXT");
    await this.ensureColumn("bookings", "updated_at", "INTEGER");
    await this.ensureColumn("accounting_movements", "check_in", "TEXT");
    await this.ensureColumn("accounting_movements", "check_out", "TEXT");
    await this.ensureColumn("accounting_movements", "guests", "INTEGER");
    await this.ensureColumn("accounting_movements", "pax_adults", "INTEGER");
    await this.ensureColumn("accounting_movements", "pax_children", "INTEGER");
    await this.ensureColumn("accounting_movements", "pax_infants", "INTEGER");

    // Bookings Occupancy (Block 10)
    await this.ensureColumn("bookings", "pax_total", "INTEGER");
    await this.ensureColumn("bookings", "pax_adults", "INTEGER");
    await this.ensureColumn("bookings", "pax_children", "INTEGER");
    await this.ensureColumn("bookings", "pax_infants", "INTEGER");

    // Updates for Block 2 (Soft Delete & Features)
    await this.ensureColumn("accounting_movements", "source_event_type", "TEXT");
    await this.ensureColumn("accounting_movements", "event_state", "TEXT");
    await this.ensureColumn("accounting_movements", "ical_uid", "TEXT");
    await this.ensureColumn("accounting_movements", "connection_id", "TEXT");
    await this.ensureColumn("accounting_movements", "raw_summary", "TEXT");
    await this.ensureColumn("accounting_movements", "raw_description", "TEXT");
    await this.ensureColumn("calendar_events", "project_id", "TEXT");
    await this.ensureColumn("calendar_events", "ical_uid", "TEXT");
    await this.ensureColumn("calendar_events", "event_kind", "TEXT");
    await this.ensureColumn("calendar_events", "event_state", "TEXT");
    await this.ensureColumn("calendar_events", "source_type", "TEXT");
    await this.ensureColumn("calendar_events", "confidence", "REAL");
    await this.ensureColumn("calendar_events", "connection_id", "TEXT");
    await this.ensureColumn("bookings", "event_kind", "TEXT");
    await this.ensureColumn("bookings", "event_origin", "TEXT");
    await this.ensureColumn("bookings", "event_state", "TEXT");
    await this.ensureColumn("bookings", "connection_id", "TEXT");
    await this.ensureColumn("bookings", "ical_uid", "TEXT");
    await this.ensureColumn("bookings", "raw_summary", "TEXT");
    await this.ensureColumn("bookings", "raw_description", "TEXT");

    // MARKETING & ISOLATION
    await this.ensureColumn("travelers", "project_id", "TEXT");
    await this.ensureColumn("travelers", "traveler_key", "TEXT");
    await this.ensureColumn("marketing_campaigns", "project_id", "TEXT");
    await this.ensureColumn("marketing_campaigns", "email_template_id", "TEXT");
    await this.ensureColumn("coupons", "project_id", "TEXT");
    await this.ensureColumn("marketing_email_logs", "project_id", "TEXT");
    await this.ensureColumn("stays", "project_id", "TEXT");

    await this.ensureWebSitesSchema();
    await this.ensureMediaAssetsSchema();
    logger.log("[WEBBUILDER:MIGRATE] web_sites & media_assets schemas verified");

    // 2. Indexes (A4 Hardened)
    try {
      await this.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_project_booking_key 
        ON bookings(project_id, booking_key) 
        WHERE booking_key IS NOT NULL AND booking_key <> '';
      `);
      await this.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_movements_project_movement_key 
        ON accounting_movements(project_id, movement_key) 
        WHERE movement_key IS NOT NULL AND movement_key <> '';
      `);
      await this.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_stay_unique
        ON bookings(project_id, apartment_id, check_in, check_out);
      `);
      await this.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ical_events_unique 
        ON calendar_events(project_id, connection_id, ical_uid) 
        WHERE ical_uid IS NOT NULL AND ical_uid <> '';
      `);
      await this.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_traveler_key_unique
        ON travelers(project_id, traveler_key)
        WHERE traveler_key IS NOT NULL AND traveler_key <> '';
      `);
      logger.log("[DB] Robust unique keys and indexes verified.");
    } catch (e) {
      logger.error("[DB] Migration indexes failed (maybe missing project_id column?)", e);
    }

  }

  // --- CRITICAL PERSISTENCE HELPERS ---
  private async ensureWebSitesSchema() {
    try {
      await this.execute(`CREATE TABLE IF NOT EXISTS web_sites (
            id TEXT PRIMARY KEY, 
            property_id TEXT, 
            name TEXT, 
            subdomain TEXT, 
            template_slug TEXT, 
            plan_type TEXT,
            primary_domain TEXT, 
            public_token TEXT, 
            is_published INTEGER DEFAULT 0,
            theme_config TEXT, 
            seo_title TEXT, 
            seo_description TEXT,
            sections_json TEXT, 
            booking_config TEXT, 
            property_ids_json TEXT,
            allowed_origins_json TEXT, 
            features_json TEXT, 
            config_json TEXT, 
            slug TEXT, 
            created_at INTEGER, 
            updated_at INTEGER
        )`);

      // Ensure columns exist (for migration from older versions)
      const cols = [
        "name", "theme_config", "seo_title", "seo_description", "sections_json",
        "booking_config", "property_ids_json", "allowed_origins_json", "features_json",
        "config_json", "slug", "is_published", "updated_at"
      ];

      for (const col of cols) {
        await this.ensureColumn("web_sites", col, "TEXT"); // Most are TEXT, is_published handled by verify
      }

    } catch (e) {
      logger.error("[DB:SCHEMA:WEBSITE] Failed to ensure web_sites schema", e);
      throw e;
    }
  }

  private async ensureMediaAssetsSchema() {
    try {
      await this.execute(`
          CREATE TABLE IF NOT EXISTS media_assets (
            id TEXT PRIMARY KEY,
            site_id TEXT,
            filename TEXT,
            mime_type TEXT,
            size INTEGER,
            data_base64 TEXT,
            width INTEGER,
            height INTEGER,
            created_at INTEGER
          )
        `);
      logger.log("[DB:SCHEMA:MEDIA] media_assets schema verified");
    } catch (e) {
      logger.error("[DB:SCHEMA:MEDIA] Failed to ensure media_assets schema", e);
    }
  }

  async runMigrations() {
    await this.execute("CREATE TABLE IF NOT EXISTS properties (id TEXT PRIMARY KEY, name TEXT, description TEXT, color TEXT, created_at INTEGER);");
    await this.execute("CREATE TABLE IF NOT EXISTS apartments (id TEXT PRIMARY KEY, property_id TEXT, name TEXT, color TEXT, created_at INTEGER);");
    await this.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER);");
    await this.execute("CREATE TABLE IF NOT EXISTS travelers (id TEXT PRIMARY KEY, nombre TEXT, apellidos TEXT, tipo_documento TEXT, documento TEXT, fecha_nacimiento TEXT, telefono TEXT, email TEXT, nacionalidad TEXT, provincia TEXT, cp TEXT, localidad TEXT, direccion TEXT, created_at INTEGER, updated_at INTEGER);");

    // Simple migration for existing travelers table
    try {
      await this.execute("ALTER TABLE travelers ADD COLUMN provincia TEXT;");
      await this.execute("ALTER TABLE travelers ADD COLUMN cp TEXT;");
      await this.execute("ALTER TABLE travelers ADD COLUMN localidad TEXT;");
      await this.execute("ALTER TABLE travelers ADD COLUMN direccion TEXT;");
    } catch (e) { /* columns might already exist */ }
    await this.execute(`CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      connection_id TEXT,
      external_uid TEXT,
      property_id TEXT,
      apartment_id TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT,
      summary TEXT,
      description TEXT,
      raw_data TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      booking_id TEXT,
      project_id TEXT,
      ical_uid TEXT,
      event_kind TEXT DEFAULT 'BOOKING',
      event_state TEXT DEFAULT 'confirmed',
      source_type TEXT,
      confidence REAL
    );`);
    await this.safeMigration("CREATE INDEX IF NOT EXISTS idx_calendar_connection ON calendar_events(connection_id);");
    await this.safeMigration("CREATE INDEX IF NOT EXISTS idx_calendar_dates ON calendar_events(start_date, end_date);");
    await this.execute("CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, property_id TEXT, apartment_id TEXT, traveler_id TEXT, check_in TEXT, check_out TEXT, status TEXT, total_price REAL, guests INTEGER DEFAULT 1, source TEXT, external_ref TEXT, created_at INTEGER, booking_key TEXT, project_id TEXT);");
    await this.execute("CREATE TABLE IF NOT EXISTS stays (id TEXT PRIMARY KEY, traveler_id TEXT, apartment_id TEXT, check_in TEXT, check_out TEXT, source TEXT, import_batch_id TEXT, created_at INTEGER, project_id TEXT);");
    await this.execute("CREATE TABLE IF NOT EXISTS accounting_movements (id TEXT PRIMARY KEY, date TEXT, type TEXT, category TEXT, concept TEXT, apartment_id TEXT, reservation_id TEXT, traveler_id TEXT, platform TEXT, supplier TEXT, amount_gross REAL, commission REAL, vat REAL, amount_net REAL, payment_method TEXT, accounting_bucket TEXT, import_hash TEXT, import_batch_id TEXT, created_at INTEGER, updated_at INTEGER, movement_key TEXT, project_id TEXT);");

    // Safe Migrations for existing DBs (A4)
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN booking_key TEXT", "Add booking_key to bookings");
    await this.safeMigration("ALTER TABLE accounting_movements ADD COLUMN movement_key TEXT", "Add movement_key to accounting_movements");

    // Updates for Block 2 (Soft Delete & Features)
    await this.safeMigration("ALTER TABLE properties ADD COLUMN is_active INTEGER DEFAULT 1", "Add is_active to properties");
    await this.safeMigration("ALTER TABLE apartments ADD COLUMN is_active INTEGER DEFAULT 1", "Add is_active to apartments");
    await this.safeMigration("ALTER TABLE apartments ADD COLUMN ical_export_token TEXT", "Add ical_export_token to apartments");
    await this.safeMigration("ALTER TABLE apartments ADD COLUMN ical_out_url TEXT", "Add ical_out_url to apartments");
    await this.safeMigration("ALTER TABLE apartments ADD COLUMN ical_last_publish INTEGER", "Add ical_last_publish to apartments");
    await this.safeMigration("ALTER TABLE apartments ADD COLUMN ical_event_count INTEGER", "Add ical_event_count to apartments");
    await this.safeMigration("ALTER TABLE accounting_movements ADD COLUMN receipt_blob TEXT", "Add receipt_blob to accounting");

    // Updates for Block 11-A (Multi-property fields)
    await this.safeMigration("ALTER TABLE properties ADD COLUMN timezone TEXT DEFAULT 'Europe/Madrid'", "Add timezone to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN currency TEXT DEFAULT 'EUR'", "Add currency to properties");

    // Web Pública (Public Calendar API)
    await this.safeMigration("ALTER TABLE properties ADD COLUMN web_calendar_enabled INTEGER DEFAULT 0", "Add web_calendar_enabled to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN public_token TEXT", "Add public_token to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN allowed_origins_json TEXT", "Add allowed_origins_json to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN show_prices INTEGER DEFAULT 0", "Add show_prices to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN max_range_days INTEGER DEFAULT 365", "Add max_range_days to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN last_published_at INTEGER", "Add last_published_at to properties");

    // Cleaning Module (v1)
    await this.execute("CREATE TABLE IF NOT EXISTS cleaning_templates (id TEXT PRIMARY KEY, property_id TEXT, title TEXT, items_json TEXT, created_at INTEGER);");
    await this.execute("CREATE TABLE IF NOT EXISTS cleaning_tasks (id TEXT PRIMARY KEY, apartment_id TEXT, booking_id TEXT, due_date TEXT, status TEXT, assigned_to TEXT, notes TEXT, checklist_state_json TEXT, completed_at INTEGER, signature_name TEXT, created_at INTEGER, updated_at INTEGER);");
    await this.execute("CREATE TABLE IF NOT EXISTS cleaning_task_photos (id TEXT PRIMARY KEY, task_id TEXT, media_id TEXT, created_at INTEGER);");

    // Maintenance Module (v1)
    await this.execute("CREATE TABLE IF NOT EXISTS maintenance_issues (id TEXT PRIMARY KEY, apartment_id TEXT NOT NULL, title TEXT, description TEXT, priority TEXT, status TEXT, created_at INTEGER, created_by TEXT, assigned_to TEXT, resolved_at INTEGER, resolution_notes TEXT, signature_name TEXT, photos_json TEXT);");
    await this.execute("CREATE TABLE IF NOT EXISTS maintenance_photos (id TEXT PRIMARY KEY, issue_id TEXT, media_id TEXT, created_at INTEGER);");

    // Indexes
    await this.execute("CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_issues(status);");
    await this.execute("CREATE INDEX IF NOT EXISTS idx_maintenance_apt ON maintenance_issues(apartment_id);");

    // Ensure default template creates if none exists? logic elsewhere.

    // Indexes
    await this.execute("CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_date ON cleaning_tasks(due_date);");
    await this.execute("CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_apt ON cleaning_tasks(apartment_id);");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN updated_at INTEGER", "Add updated_at to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN location TEXT", "Add location to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN logo TEXT", "Add logo to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN phone TEXT", "Add phone to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN email TEXT", "Add email to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN color TEXT", "Add color to properties");

    // Updates for Flexible Import
    await this.safeMigration("ALTER TABLE travelers ADD COLUMN needs_document INTEGER DEFAULT 0", "Add needs_document to travelers");

    await this.execute(`CREATE TABLE IF NOT EXISTS fiscal_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      tipo_fiscal TEXT,
      nombre_razon_social TEXT,
      nif_cif TEXT,
      domicilio_fiscal TEXT,
      provincia TEXT,
      email TEXT,
      telefono TEXT,
      regimen_iva TEXT,
      iva_defecto REAL
    );`);

    await this.execute(`CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      business_name TEXT,
      business_description TEXT,
      fiscal_name TEXT,
      fiscal_id TEXT,
      fiscal_address TEXT,
      fiscal_city TEXT,
      fiscal_postal_code TEXT,
      fiscal_country TEXT DEFAULT 'España',
      contact_email TEXT,
      contact_phone TEXT,
      contact_website TEXT,
      default_currency TEXT DEFAULT 'EUR',
      default_timezone TEXT DEFAULT 'Europe/Madrid',
      date_format TEXT DEFAULT 'DD/MM/YYYY',
      ui_scale REAL DEFAULT 1.0,
      created_at INTEGER,
      updated_at INTEGER
    );`);

    await this.safeMigration("ALTER TABLE bookings ADD COLUMN payments_json TEXT", "Add payments_json to bookings");
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN field_sources TEXT", "Add field_sources to bookings");
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN updated_at INTEGER", "Add updated_at to bookings");
    await this.safeMigration("ALTER TABLE accounting_movements ADD COLUMN payment_id TEXT", "Add payment_id to accounting_movements");

    // Booking Policies (Inheritable)
    await this.execute(`CREATE TABLE IF NOT EXISTS booking_policies (
      id TEXT PRIMARY KEY,
      scope_type TEXT,
      scope_id TEXT,
      currency TEXT DEFAULT 'EUR',
      payment_mode TEXT,
      deposit_type TEXT,
      deposit_value REAL,
      deposit_due TEXT,
      remaining_due TEXT,
      accepted_methods TEXT,
      require_security_deposit INTEGER,
      security_deposit_amount REAL,
      security_deposit_method TEXT,
      cancellation_policy_type TEXT,
      cancellation_rules TEXT,
      no_show_policy TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      UNIQUE(scope_type, scope_id)
    );`);

    await this.execute(`CREATE TABLE IF NOT EXISTS marketing_templates (id TEXT PRIMARY KEY, name TEXT, subject TEXT, body TEXT, created_at INTEGER);`);
    await this.execute(`CREATE TABLE IF NOT EXISTS marketing_email_templates (id TEXT PRIMARY KEY, name TEXT, template_spec_json TEXT, created_at INTEGER, updated_at INTEGER);`);
    await this.execute(`CREATE TABLE IF NOT EXISTS marketing_email_logs (id TEXT PRIMARY KEY, campaign_id TEXT, to_email TEXT, status TEXT, error_message TEXT, created_at INTEGER, project_id TEXT);`);
    await this.execute(`CREATE TABLE IF NOT EXISTS marketing_campaigns (id TEXT PRIMARY KEY, type TEXT, name TEXT, automation_level TEXT, template_id TEXT, email_template_id TEXT, enabled INTEGER, config_json TEXT, created_at INTEGER, project_id TEXT);`);
    await this.execute(`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT, discount_type TEXT, discount_value REAL, expiration_date TEXT, status TEXT, created_at INTEGER, project_id TEXT);`);

    await this.execute(`CREATE TABLE IF NOT EXISTS registry_units (
      id TEXT PRIMARY KEY,
      apartment_id TEXT,
      referencia_catastral TEXT,
      licencia_turistica TEXT,
      identificador_registral TEXT,
      direccion_completa TEXT,
      municipio TEXT,
      provincia TEXT,
      codigo_postal TEXT,
      titularidad TEXT,
      estado_tramitacion TEXT,
      numero_registro_oficial TEXT,
      fecha_solicitud TEXT,
      fecha_resolucion TEXT,
      notas_internas TEXT,
      updated_at INTEGER,
      FOREIGN KEY(apartment_id) REFERENCES apartments(id) ON DELETE CASCADE
    );`);

    await this.execute(`CREATE TABLE IF NOT EXISTS registry_presentations (
      id TEXT PRIMARY KEY,
      registry_unit_id TEXT,
      tipo_tramite TEXT,
      ejercicio_fiscal INTEGER,
      fecha_presentacion TEXT,
      estado TEXT,
      csv_acuse TEXT,
      xbrl_blob TEXT,
      observaciones TEXT,
      created_at INTEGER
    );`);

    await this.execute(`CREATE TABLE IF NOT EXISTS websites (
      id TEXT PRIMARY KEY,
      name TEXT,
      subdomain TEXT,
      custom_domain TEXT,
      status TEXT,
      theme_config TEXT,
      seo_title TEXT,
      seo_description TEXT,
      sections_json TEXT,
      booking_config TEXT,
      property_ids_json TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );`);

    // Re-create web_sites with full schema (v2.1)
    // We update this table to include content fields previously missing
    await this.execute(`CREATE TABLE IF NOT EXISTS web_sites (
      id TEXT PRIMARY KEY, -- UUID
      property_id TEXT,
      name TEXT,
      subdomain TEXT UNIQUE,
      template_slug TEXT,
      plan_type TEXT, -- basic | plus | pro
      primary_domain TEXT,
      public_token TEXT,
      is_published INTEGER, -- 0 or 1
      theme_config TEXT, -- JSON
      seo_title TEXT,
      seo_description TEXT,
      sections_json TEXT, -- JSON
      booking_config TEXT, -- JSON
      property_ids_json TEXT, -- JSON
      allowed_origins_json TEXT, -- JSON array
      features_json TEXT, -- JSON
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY(property_id) REFERENCES properties(id)
    );`);
    await this.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_websites_subdomain ON web_sites(subdomain);");

    // --- COMUNICACIONES ---
    await this.execute(`CREATE TABLE IF NOT EXISTS communication_accounts (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      property_id TEXT,
      config_json TEXT,
      is_active INTEGER,
      created_at INTEGER
    );`);

    await this.execute(`CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      traveler_id TEXT NOT NULL,
      booking_id TEXT,
      property_id TEXT,
      subject TEXT,
      status TEXT DEFAULT 'OPEN',
      last_message_at INTEGER,
      last_message_preview TEXT,
      unread_count INTEGER DEFAULT 0,
      tags_json TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY(traveler_id) REFERENCES travelers(id) ON DELETE CASCADE
    );`);
    try { await this.execute("ALTER TABLE conversations ADD COLUMN last_message_direction TEXT"); } catch (e) { }
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);`);

    await this.execute(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      account_id TEXT,
      external_id TEXT,
      direction TEXT,
      channel TEXT,
      status TEXT,
      body TEXT,
      content_type TEXT DEFAULT 'text/plain',
      error_message TEXT,
      metadata_json TEXT,
      created_at INTEGER,
      scheduled_at INTEGER,
      sent_at INTEGER,
      read_at INTEGER,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );`);
    try { await this.execute("ALTER TABLE messages ADD COLUMN retry_count INTEGER DEFAULT 0"); } catch (e) { }
    try { await this.execute("ALTER TABLE messages ADD COLUMN last_attempt_at INTEGER DEFAULT 0"); } catch (e) { }
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);`);

    await this.execute(`CREATE TABLE IF NOT EXISTS message_attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      file_name TEXT,
      file_type TEXT,
      file_size INTEGER,
      local_path TEXT,
      created_at INTEGER,
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
    );`);

    try { await this.execute("ALTER TABLE bookings ADD COLUMN guests INTEGER DEFAULT 1"); } catch (e) { }
    try { await this.execute("ALTER TABLE bookings ADD COLUMN conflict_detected INTEGER DEFAULT 0"); } catch (e) { }
    try { await this.execute("ALTER TABLE bookings ADD COLUMN linked_event_id TEXT"); } catch (e) { }
    try { await this.execute("ALTER TABLE bookings ADD COLUMN rate_plan_id TEXT"); } catch (e) { }
    try { await this.execute("ALTER TABLE bookings ADD COLUMN summary TEXT"); } catch (e) { }
    try { await this.execute("ALTER TABLE bookings ADD COLUMN guest_name TEXT"); } catch (e) { }

    // Fix: Add missing columns for Demo/Bookings (2025-02-14)
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN provisional_id TEXT", "Add provisional_id to bookings");
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN enrichment_status TEXT", "Add enrichment_status to bookings");
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN policy_snapshot TEXT", "Add policy_snapshot to bookings");
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN deposit_paid_at INTEGER", "Add deposit_paid_at to bookings");
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN remaining_paid_at INTEGER", "Add remaining_paid_at to bookings");
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN payment_status TEXT", "Add payment_status to bookings");
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN payment_notes TEXT", "Add payment_notes to bookings");

    // --- AI ASSISTANT TABLES ---

    // 1. Personas (System Instructions)
    await this.execute(`CREATE TABLE IF NOT EXISTS ai_personas (
      id TEXT PRIMARY KEY,
      name TEXT,
      system_instruction TEXT,
      is_active INTEGER,
      created_at INTEGER
    );`);

    // 2. Knowledge Facts (RAG Source)
    await this.execute(`CREATE TABLE IF NOT EXISTS ai_facts (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      apartment_id TEXT,
      category TEXT,
      key TEXT,
      value TEXT,
      is_internal INTEGER DEFAULT 0,
      updated_at INTEGER,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
    );`);

    try { await this.execute("ALTER TABLE ai_facts ADD COLUMN apartment_id TEXT"); } catch (e) { }
    try { await this.execute("ALTER TABLE ai_facts ADD COLUMN is_internal INTEGER DEFAULT 0"); } catch (e) { }

    await this.execute(`CREATE INDEX IF NOT EXISTS idx_ai_facts_prop ON ai_facts(property_id);`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_ai_facts_apt ON ai_facts(apartment_id);`);

    // 3. Audit Logs (Security & Quality)
    await this.execute(`CREATE TABLE IF NOT EXISTS ai_audit_logs (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      input_context_hash TEXT,
      suggested_response TEXT,
      user_action TEXT,
      final_text_length INTEGER,
      latency_ms INTEGER,
      created_at INTEGER
    );`);

    // --- CHANNEL MANAGER (Enhanced Block 2 & 4) ---
    await this.execute(`CREATE TABLE IF NOT EXISTS channel_connections (
      id TEXT PRIMARY KEY,
      apartment_id TEXT,
      channel_name TEXT,
      alias TEXT,
      ical_url TEXT,
      last_sync INTEGER,
      last_status TEXT,
      sync_log TEXT,
      created_at INTEGER,
      FOREIGN KEY(apartment_id) REFERENCES apartments(id) ON DELETE CASCADE
    );`);

    try { await this.execute("ALTER TABLE channel_connections ADD COLUMN connection_type TEXT DEFAULT 'ICAL'"); } catch (e) { }
    try { await this.execute("ALTER TABLE channel_connections ADD COLUMN priority INTEGER DEFAULT 0"); } catch (e) { }
    try { await this.execute("ALTER TABLE channel_connections ADD COLUMN content_hash TEXT"); } catch (e) { }
    try { await this.execute("ALTER TABLE channel_connections ADD COLUMN enabled INTEGER DEFAULT 1"); } catch (e) { }

    // Block 4: HTTP Caching & PROXY
    try { await this.execute("ALTER TABLE channel_connections ADD COLUMN http_etag TEXT"); } catch (e) { }
    try { await this.execute("ALTER TABLE channel_connections ADD COLUMN http_last_modified TEXT"); } catch (e) { }
    try { await this.execute("ALTER TABLE channel_connections ADD COLUMN force_direct INTEGER DEFAULT 0"); } catch (e) { }

    // NEW TABLE: CALENDAR EVENTS
    await this.execute(`CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL,
      external_uid TEXT,
      property_id TEXT,
      apartment_id TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT,
      summary TEXT,
      description TEXT,
      raw_data TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY(connection_id) REFERENCES channel_connections(id) ON DELETE CASCADE
    );`);
    try { await this.execute("ALTER TABLE calendar_events ADD COLUMN booking_id TEXT"); } catch (e) { }
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(start_date, end_date);`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_calendar_events_apt ON calendar_events(apartment_id);`);

    // --- PRICING FOUNDATION (Block 7) ---
    await this.execute(`CREATE TABLE IF NOT EXISTS pricing_rule_sets (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      version INTEGER DEFAULT 1,
      hash TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY(unit_id) REFERENCES apartments(id) ON DELETE CASCADE
    );`);
    // Block 23: Add rate_plan_id to RuleSets
    try { await this.execute("ALTER TABLE pricing_rule_sets ADD COLUMN rate_plan_id TEXT"); } catch (e) { }
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_pricing_sets_unit_status ON pricing_rule_sets(unit_id, status);`);

    await this.execute(`CREATE TABLE IF NOT EXISTS pricing_rules (
      id TEXT PRIMARY KEY,
      rule_set_id TEXT NOT NULL,
      type TEXT,
      priority INTEGER,
      payload TEXT,
      enabled INTEGER DEFAULT 1,
      updated_at INTEGER,
      FOREIGN KEY(rule_set_id) REFERENCES pricing_rule_sets(id) ON DELETE CASCADE
    );`);

    await this.execute(`CREATE TABLE IF NOT EXISTS bookings_price_snapshot (
      booking_id TEXT PRIMARY KEY,
      snapshot_json TEXT,
      created_at INTEGER,
      FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );`);

    // --- BLOCK 22: CANCELLATION POLICIES & RATE PLANS ---
    await this.execute(`CREATE TABLE IF NOT EXISTS cancellation_policies (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      rules_json TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
    );`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_cancellation_prop ON cancellation_policies(property_id);`);

    await this.execute(`CREATE TABLE IF NOT EXISTS rate_plans (
      id TEXT PRIMARY KEY,
      apartment_id TEXT NOT NULL,
      cancellation_policy_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      price_modifier_type TEXT NOT NULL,
      price_modifier_value REAL DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY(apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
      FOREIGN KEY(cancellation_policy_id) REFERENCES cancellation_policies(id)
    );`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_rate_plans_apt ON rate_plans(apartment_id);`);

    // --- BLOCK 25: BOOKING WINDOW MODIFIERS ---
    await this.execute(`CREATE TABLE IF NOT EXISTS pricing_modifiers (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      unit_id TEXT,
      rate_plan_id TEXT,
      type TEXT NOT NULL,
      condition_json TEXT NOT NULL,
      apply_json TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 50,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
    );`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_pricing_modifiers_scope ON pricing_modifiers(property_id, unit_id, rate_plan_id);`);

    // --- BLOCK 26: FEES & TAXES ---
    await this.execute(`CREATE TABLE IF NOT EXISTS fees (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      charge_mode TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      vat_percent REAL DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
    );`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_fees_property ON fees(property_id);`);

    // --- CHECK-IN SCAN PRO TABLES ---
    await this.execute(`CREATE TABLE IF NOT EXISTS booking_locators (
      booking_id TEXT PRIMARY KEY,
      locator TEXT UNIQUE,
      created_at INTEGER
    );`);

    await this.execute(`CREATE TABLE IF NOT EXISTS checkin_tokens (
      booking_id TEXT PRIMARY KEY,
      token TEXT UNIQUE,
      created_at INTEGER
    );`);

    await this.execute(`CREATE TABLE IF NOT EXISTS checkin_requests (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      status TEXT,
      locator TEXT,
      token TEXT,
      sent_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER,
      project_id TEXT
    );`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_checkin_requests_booking ON checkin_requests(booking_id);`);

    // --- BLOCK MÓVIL 2: ZOOM UI ---
    await this.safeMigration("ALTER TABLE user_settings ADD COLUMN ui_scale REAL DEFAULT 1.0", "Add ui_scale to user_settings");

    // MODAL RESERVAS MÍNIMAS (Booking iCal)
    await this.safeMigration("ALTER TABLE user_settings ADD COLUMN enable_minimal_bookings_from_ical INTEGER DEFAULT 0", "Add enable_minimal_bookings_from_ical to user_settings");
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN needs_details INTEGER DEFAULT 0", "Add needs_details to bookings");
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN ota TEXT", "Add ota to bookings");
    await this.safeMigration("ALTER TABLE bookings ADD COLUMN locator TEXT", "Add locator to bookings");

    // BLOCK APARTMENT PRICE: PRECIO PÚBLICO
    await this.safeMigration("ALTER TABLE apartments ADD COLUMN public_base_price REAL", "Add public_base_price to apartments");
    await this.safeMigration("ALTER TABLE apartments ADD COLUMN currency TEXT DEFAULT 'EUR'", "Add currency to apartments");

    // PRICING STUDIO DATA LAYER
    await this.execute(`CREATE TABLE IF NOT EXISTS apartment_pricing_defaults (
      apartment_id TEXT PRIMARY KEY,
      currency TEXT DEFAULT 'EUR',
      base_price REAL,
      default_min_nights INTEGER DEFAULT 1,
      short_stay_mode TEXT DEFAULT 'ALLOWED',
      surcharge_type TEXT DEFAULT 'PERCENT',
      surcharge_value REAL DEFAULT 0
    );`);

    await this.execute(`CREATE TABLE IF NOT EXISTS apartment_nightly_rates (
      apartment_id TEXT,
      date TEXT,
      price REAL,
      min_nights INTEGER,
      short_stay_mode TEXT,
      surcharge_type TEXT,
      surcharge_value REAL,
      UNIQUE(apartment_id, date)
    );`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_nightly_rates_apt ON apartment_nightly_rates(apartment_id);`);
  }

  // --- CHECK-IN SCAN PRO METHODS ---
  async getBookingLocator(bookingId: string): Promise<string | null> {
    const res = await this.query("SELECT locator FROM booking_locators WHERE booking_id = ?", [bookingId]);
    return res[0]?.locator || null;
  }

  async saveBookingLocator(bookingId: string, locator: string): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO booking_locators (booking_id, locator, created_at) VALUES (?, ?, ?)",
      [bookingId, locator, Date.now()]
    );
  }

  async getCheckInToken(bookingId: string): Promise<string | null> {
    const res = await this.query("SELECT token FROM checkin_tokens WHERE booking_id = ?", [bookingId]);
    return res[0]?.token || null;
  }

  async saveCheckInToken(bookingId: string, token: string): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO checkin_tokens (booking_id, token, created_at) VALUES (?, ?, ?)",
      [bookingId, token, Date.now()]
    );
  }

  async getCheckInRequests(): Promise<CheckInRequest[]> {
    const projectId = localStorage.getItem('active_project_id');
    return await this.query("SELECT * FROM checkin_requests WHERE (project_id = ? OR project_id IS NULL)", [projectId]);
  }

  async saveCheckInRequest(req: CheckInRequest): Promise<void> {
    await this.executeWithParams(
      `INSERT OR REPLACE INTO checkin_requests (
        id, booking_id, status, locator, token, sent_at, completed_at, created_at, project_id
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        req.id, req.booking_id, req.status, req.locator || null, req.token || null,
        req.sent_at || null, req.completed_at || null, req.created_at, req.project_id || localStorage.getItem('active_project_id')
      ]
    );
  }



  // --- COMUNICACIONES METHODS ---

  async getAccounts(): Promise<CommunicationAccount[]> {
    const res = await this.query("SELECT * FROM communication_accounts WHERE is_active = 1");
    return res.map(row => ({ ...row, is_active: !!row.is_active }));
  }

  async saveAccount(acc: CommunicationAccount): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO communication_accounts (id, name, type, property_id, config_json, is_active, created_at) VALUES (?,?,?,?,?,?,?)",
      [acc.id, acc.name, acc.type, acc.property_id || null, acc.config_json, acc.is_active ? 1 : 0, acc.created_at]
    );
  }

  async deleteAccount(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM communication_accounts WHERE id=?", [id]);
  }

  async getConversations(status: ConversationStatus | 'ALL' = 'OPEN'): Promise<Conversation[]> {
    if (status === 'ALL') {
      return await this.query("SELECT * FROM conversations ORDER BY last_message_at DESC");
    }
    const sql = "SELECT * FROM conversations WHERE status = ? ORDER BY last_message_at DESC";
    return await this.query(sql, [status]);
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    const res = await this.query("SELECT * FROM conversations WHERE id = ?", [id]);
    return res[0] || null;
  }

  async getConversationByTravelerId(travelerId: string): Promise<Conversation | null> {
    const res = await this.query("SELECT * FROM conversations WHERE traveler_id = ? ORDER BY created_at DESC LIMIT 1", [travelerId]);
    return res[0] || null;
  }

  async saveConversation(c: Conversation): Promise<void> {
    await this.executeWithParams(
      `INSERT OR REPLACE INTO conversations (
        id, traveler_id, booking_id, property_id, subject, status,
        last_message_at, last_message_preview, unread_count, tags_json,
        created_at, updated_at, last_message_direction
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [c.id, c.traveler_id, c.booking_id || null, c.property_id || null, c.subject, c.status, c.last_message_at, c.last_message_preview, c.unread_count, c.tags_json, c.created_at, c.updated_at, c.last_message_direction || 'INBOUND']
    );
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    const res = await this.query("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", [conversationId]);
    return res.map(r => ({ ...r, is_read: r.is_read === 1 }));
  }

  async getPendingMessages(): Promise<Message[]> {
    return await this.query("SELECT * FROM messages WHERE status = 'PENDING' ORDER BY created_at ASC");
  }

  async saveMessage(m: Message): Promise<void> {
    await this.executeWithParams(
      `INSERT OR REPLACE INTO messages (
        id, conversation_id, account_id, external_id, direction, channel,
        status, body, content_type, error_message, metadata_json,
        created_at, scheduled_at, sent_at, read_at, retry_count, last_attempt_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [m.id, m.conversation_id, m.account_id, m.external_id || null, m.direction, m.channel, m.status, m.body, m.content_type, m.error_message || null, m.metadata_json || null, m.created_at, m.scheduled_at || null, m.sent_at || null, m.read_at || null, m.retry_count || 0, m.last_attempt_at || 0]
    );
  }

  async getAttachments(messageId: string): Promise<MessageAttachment[]> {
    return await this.query("SELECT * FROM message_attachments WHERE message_id = ?", [messageId]);
  }

  async saveAttachment(a: MessageAttachment): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO message_attachments (id, message_id, file_name, file_type, file_size, local_path, created_at) VALUES (?,?,?,?,?,?,?)",
      [a.id, a.message_id, a.file_name, a.file_type, a.file_size, a.local_path, a.created_at]
    );
  }

  // --- MEDIA ASSETS METHODS ---
  async saveMedia(asset: { id: string, site_id: string, filename: string, mime_type: string, size: number, data_base64?: string, width?: number, height?: number, created_at: number }): Promise<void> {
    const { id, site_id, filename, mime_type, size, data_base64, width, height, created_at } = asset;
    await this.executeWithParams(
      `INSERT OR REPLACE INTO media_assets (id, site_id, filename, mime_type, size, data_base64, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, site_id, filename, mime_type, size, data_base64 || null, width || null, height || null, created_at]
    );
  }

  async saveTraveler(t: Traveler) {
    if (!t.id) t.id = crypto.randomUUID();
    const projectId = localStorage.getItem('active_project_id');

    // Handle optional document
    const docValue = t.documento || null; // Ensure null if undefined/empty
    const needsDoc = t.needs_document ? 1 : 0;

    await this.executeWithParams(
      "INSERT OR REPLACE INTO travelers (id, nombre, apellidos, tipo_documento, documento, fecha_nacimiento, telefono, email, nacionalidad, provincia, cp, localidad, direccion, created_at, updated_at, needs_document, project_id, traveler_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        t.id, t.nombre, t.apellidos, t.tipo_documento || 'DNI', t.documento || null,
        t.fecha_nacimiento || null, t.telefono || null, t.email || null,
        t.nacionalidad || null,
        t.provincia || null, t.cp || null, t.localidad || null, t.direccion || null,
        t.created_at || Date.now(), t.updated_at || Date.now(), needsDoc, projectId, t.traveler_key || null
      ]
    );
  }

  async getTravelers() {
    const projectId = localStorage.getItem('active_project_id');
    const rows = await this.query(
      "SELECT * FROM travelers WHERE (project_id = ? OR project_id IS NULL) ORDER BY nombre ASC",
      [projectId]
    );
    return rows.map(r => ({
      ...r, // documento might be null now
      needs_document: r.needs_document === 1
    }));
  }

  async getTravelerById(id: string): Promise<Traveler | null> {
    const res = await this.query("SELECT * FROM travelers WHERE id = ?", [id]);
    if (!res[0]) return null;
    return { ...res[0], needs_document: res[0].needs_document === 1 };
  }

  async deleteTraveler(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM travelers WHERE id = ?", [id]);
  }

  async getStays(): Promise<Stay[]> {
    const projectId = localStorage.getItem('active_project_id');
    // We assume stays are also linked to project_id or via apartment_id that belongs to project_id
    // But for robustness let's ensure bookings/travelers are the main source of project context
    // Actually stays table lacks project_id. Let's add it.
    return await this.query("SELECT * FROM stays ORDER BY check_in DESC");
  }

  async getStaysByTravelerId(tid: string): Promise<Stay[]> {
    return await this.query("SELECT * FROM stays WHERE traveler_id = ? ORDER BY check_in DESC", [tid]);
  }

  async saveStay(s: Stay): Promise<void> {
    const projectId = localStorage.getItem('active_project_id');
    await this.executeWithParams(
      "INSERT OR REPLACE INTO stays (id, traveler_id, apartment_id, check_in, check_out, source, import_batch_id, created_at, project_id) VALUES (?,?,?,?,?,?,?,?,?)",
      [s.id, s.traveler_id, s.apartment_id, s.check_in, s.check_out, s.source, s.import_batch_id || null, s.created_at, projectId]
    );
  }

  async getBookings(): Promise<Booking[]> {
    const projectId = localStorage.getItem('active_project_id');
    const rows = await this.query(
      "SELECT * FROM bookings WHERE (project_id = ? OR project_id IS NULL) ORDER BY check_in DESC",
      [projectId]
    );
    return rows.map(b => {
      let payments = [];
      try {
        payments = b.payments_json ? JSON.parse(b.payments_json) : [];
      } catch (e) {
        console.warn("Error parsing payments_json", e);
      }

      // Normalization and defaults
      payments = payments.map((p: any) => ({
        ...p,
        type: p.type || 'extra',
        status: p.status || 'pendiente'
      }));

      // Backward compatibility: If no payments but has total_price/method, create default payment
      if (payments.length === 0 && (b.total_price > 0 || b.payment_method)) {
        payments = [{
          id: 'legacy-' + b.id,
          type: 'final',
          amount: b.total_price || 0,
          date: b.check_in, // Fallback to check_in date
          method: b.payment_method || 'Unknown',
          status: 'pendiente', // Changed from 'pagado' for safety
          note: 'Migrado de sistema anterior'
        }];
      }

      return {
        ...b,
        payments,
        conflict_detected: !!b.conflict_detected
      };
    });
  }

  async findBookingByStay(projectId: string, apartmentId: string, checkIn: string, checkOut: string): Promise<Booking | null> {
    const res = await this.query(
      "SELECT * FROM bookings WHERE project_id = ? AND apartment_id = ? AND check_in = ? AND check_out = ?",
      [projectId, apartmentId, checkIn, checkOut]
    );
    if (!res[0]) return null;
    return {
      ...res[0],
      conflict_detected: !!res[0].conflict_detected
    };
  }

  async saveBooking(b: Booking): Promise<void> {
    const columns = [
      'id', 'property_id', 'apartment_id', 'traveler_id', 'check_in', 'check_out', 'status', 'total_price', 'guests', 'source',
      'external_ref', 'created_at', 'conflict_detected', 'linked_event_id', 'rate_plan_id', 'summary', 'guest_name',
      'booking_key', 'project_id', 'ota', 'locator'
    ];
    // --- GUARDRAIL: Ensure check_out > check_in ---
    const { checkOut: validCheckOut } = ensureValidStay(b.check_in, b.check_out);
    b.check_out = validCheckOut;

    // Always update timestamp on write
    b.updated_at = Date.now();

    const values: any[] = [
      b.id, b.property_id, b.apartment_id, b.traveler_id, b.check_in, b.check_out, b.status, b.total_price, b.guests, b.source,
      b.external_ref || null, b.created_at, b.conflict_detected ? 1 : 0, b.linked_event_id || null, b.rate_plan_id || null, b.summary || null, b.guest_name || null,
      b.booking_key || null, b.project_id || localStorage.getItem('active_project_id'),
      b.ota || null, b.locator || null
    ];

    if (this.schemaFlags.bookings_provisional_id) {
      columns.push('provisional_id', 'enrichment_status', 'policy_snapshot', 'deposit_paid_at', 'remaining_paid_at', 'payment_status', 'payment_notes');
      values.push(b.provisional_id || null, b.enrichment_status || null, b.policy_snapshot || null, b.deposit_paid_at || null, b.remaining_paid_at || null, b.payment_status || null, b.payment_notes || null);
    }

    if (this.schemaFlags.bookings_payments) {
      columns.push('payments_json');
      values.push(b.payments ? JSON.stringify(b.payments) : null);
    }

    if (this.schemaFlags.bookings_event_state) {
      columns.push('event_state', 'event_origin', 'connection_id', 'ical_uid', 'raw_summary', 'raw_description');
      values.push(b.event_state || null, b.event_origin || null, b.connection_id || null, b.ical_uid || null, b.raw_summary || null, b.raw_description || null);
    }

    if (this.schemaFlags.bookings_event_kind) {
      columns.push('event_kind');
      values.push((b as any).event_kind || null);
    }

    if (this.schemaFlags.bookings_field_sources) {
      columns.push('field_sources');
      values.push(b.field_sources || null);
    }

    if (this.schemaFlags.bookings_updated_at) {
      columns.push('updated_at');
      values.push(b.updated_at || null);
    }

    if (this.schemaFlags.bookings_pax_fields) {
      columns.push('pax_total', 'pax_adults', 'pax_children', 'pax_infants');
      values.push(b.pax_total || null, b.pax_adults || null, b.pax_children || null, b.pax_infants || null);
    }

    if (this.schemaFlags.bookings_needs_details) {
      columns.push('needs_details');
      values.push(b.needs_details ? 1 : 0);
    }

    const placeholders = columns.map(() => '?').join(',');
    const sql = `INSERT OR REPLACE INTO bookings (${columns.join(',')}) VALUES (${placeholders})`;
    await this.executeWithParams(sql, values);

    console.log(`[BOOKING:SAVE] ${b.id} - ${b.guest_name || 'No Name'} (${b.check_in} to ${b.check_out})`);

    // We call the sync function which now handles all accounting for the booking
    await this.syncAccountingMovementsFromBooking(b);

    // HOTFIX (Block 9): Sync to calendar_events for grid stability
    try {
      await this.upsertCalendarEventFromBooking(b);
    } catch (e) {
      console.warn("[SQLITE:SAVE] Failed to sync calendar event", e);
    }

    // MINI-BLOQUE B3: Trigger auto-publish if confirmed
    if (b.status === 'confirmed') {
      window.dispatchEvent(new CustomEvent('rentikpro:ical-auto-publish', {
        detail: { apartmentId: b.apartment_id }
      }));
    }

    // Notify file-mode autosave (no-op if not in file mode)
    this.onWriteHook?.();

    notifyDataChanged('bookings');
  }

  async getBooking(id: string): Promise<Booking | null> {
    const rows = await this.query("SELECT * FROM bookings WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    const b = rows[0];
    let payments = [];
    try {
      payments = b.payments_json ? JSON.parse(b.payments_json) : [];
    } catch (e) {
      console.warn("Error parsing payments_json", e);
    }
    return {
      ...b,
      payments,
      conflict_detected: !!b.conflict_detected
    };
  }

  /** FIX: Lookup booking by external_ref (iCal UID). Used as fallback in Calendar
   * when the in-memory booking id is the external_ref, not the DB primary key. */
  async getBookingByExternalRef(externalRef: string): Promise<Booking | null> {
    const rows = await this.query('SELECT * FROM bookings WHERE external_ref = ? LIMIT 1', [externalRef]);
    if (!rows[0]) return null;
    let payments: any[] = [];
    try { payments = rows[0].payments_json ? JSON.parse(rows[0].payments_json) : []; } catch (e) { }
    return { ...rows[0], payments, conflict_detected: !!rows[0].conflict_detected };
  }

  async updateReservation(id: string, patch: Partial<Booking>, sourceModule: string): Promise<Booking> {
    let existing = await this.getBooking(id);

    // HOTFIX: getBookingsFromAccounting usa reservation_id (external_uid iCal) como booking id.
    // Si no encuentra por id directo, buscar el booking real por external_ref.
    if (!existing) {
      const rows = await this.query(
        'SELECT * FROM bookings WHERE external_ref = ? LIMIT 1',
        [id]
      );
      if (rows[0]) {
        let payments: any[] = [];
        try { payments = rows[0].payments_json ? JSON.parse(rows[0].payments_json) : []; } catch (e) { }
        existing = { ...rows[0], payments, conflict_detected: !!rows[0].conflict_detected };
      }
    }

    if (!existing) throw new Error(`Booking ${id} not found`);

    const updated = { ...existing, ...patch, updated_at: Date.now() };

    // Update field_sources
    let sources: Record<string, string> = {};
    if (this.schemaFlags.bookings_field_sources) {
      try {
        sources = existing.field_sources ? JSON.parse(existing.field_sources) : {};
      } catch (e) { }

      Object.keys(patch).forEach(key => {
        // Only track fields that are part of the Booking interface
        sources[key] = sourceModule;
      });
      updated.field_sources = JSON.stringify(sources);
    }

    await this.saveBooking(updated);
    return updated;
  }

  async upsertPayment(bookingId: string, payment: any, sourceModule: string): Promise<Booking> {
    const booking = await this.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");

    let payments = booking.payments || [];
    const idx = payments.findIndex((p: any) => p.id === payment.id);
    if (idx >= 0) {
      payments[idx] = { ...payments[idx], ...payment };
    } else {
      payments.push(payment);
    }

    const updated = await this.updateReservation(bookingId, { payments }, sourceModule);

    // Sync accounting movements
    await this.syncAccountingMovementsFromBooking(updated);

    return updated;
  }

  async upsertGuestData(bookingId: string, guestPatch: any, sourceModule: string): Promise<Booking> {
    return this.updateReservation(bookingId, guestPatch, sourceModule);
  }

  async syncAccountingMovementsFromBooking(b: Booking): Promise<void> {
    if (!this.schemaFlags.accounting_payment_id) return;

    const allMovements = await this.getMovements('ALL');
    const reservationMovements = allMovements.filter(m =>
      m.reservation_id === b.id ||
      // HOTFIX: movimientos iCal tienen reservation_id = external_uid, no el UUID del booking
      (b.external_ref && m.reservation_id === b.external_ref)
    );

    // HOTFIX: Si encontramos el movimiento STAY_RESERVATION, sincronizar sus fechas
    // para que getBookingsFromAccounting muestre las fechas editadas por el usuario.
    const stayMov = reservationMovements.find(m => m.source_event_type === 'STAY_RESERVATION');
    if (stayMov && (stayMov.check_in !== b.check_in || stayMov.check_out !== b.check_out)) {
      stayMov.check_in = b.check_in;
      stayMov.check_out = b.check_out;
      stayMov.updated_at = Date.now();
      await this.saveMovement(stayMov);
    }

    if (b.status === 'confirmed') {
      const traveler = b.traveler_id ? await this.getTravelerById(b.traveler_id) : null;
      const travelerName = traveler ? `${traveler.nombre} ${traveler.apellidos || ''}`.trim() : b.guest_name || 'Huésped';

      // Process each payment
      for (const p of (b.payments || [])) {
        const existingMov =
          // Búsqueda principal: movimiento creado correctamente con payment_id
          reservationMovements.find(m => m.payment_id === p.id) ||
          // HOTFIX: getBookingsFromAccounting usa r.id (PK del movimiento) como payment.id,
          // no el payment_id. Si no hay match por payment_id, buscar por el id directo
          // para evitar crear un movimiento nuevo en cada edición.
          reservationMovements.find(m => m.id === p.id && !m.payment_id);

        if (p.status === 'pagado') {
          // [HOTFIX] Ensure we don't have a "Base" movement competing with specific payments
          const baseMov = reservationMovements.find(m => m.import_hash === `base_booking_${b.id}`);
          if (baseMov) {
            console.log(`[ACCOUNTING] Deleting legacy base movement for booking ${b.id} to avoid duplication`);
            await this.deleteMovement(baseMov.id);
          }

          const concept = `Pago ${p.type} - ${travelerName} (${p.date})`;
          const bucket = p.method?.toLowerCase() === 'efectivo' ? 'B' : 'A';

          if (existingMov) {
            existingMov.amount_gross = p.amount;
            existingMov.amount_net = p.amount;
            existingMov.date = p.date;
            existingMov.payment_method = p.method;
            existingMov.accounting_bucket = bucket;
            existingMov.concept = concept;
            existingMov.updated_at = Date.now();
            await this.saveMovement(existingMov);
          } else {
            const newMov: AccountingMovement = {
              id: crypto.randomUUID(),
              date: p.date,
              type: 'income',
              category: 'Alquiler',
              concept: concept,
              apartment_id: b.apartment_id,
              reservation_id: b.id,
              traveler_id: b.traveler_id,
              amount_gross: p.amount,
              vat: 0,
              commission: 0,
              amount_net: p.amount,
              payment_method: p.method,
              accounting_bucket: bucket,
              platform: b.source,
              payment_id: p.id,
              import_hash: btoa(b.id + p.id + Date.now()).slice(0, 24),
              created_at: Date.now(),
              updated_at: Date.now()
            };
            await this.saveMovement(newMov);
          }
        } else if (existingMov) {
          // If payment became 'pendiente' but was 'pagado' before, delete it
          await this.deleteMovement(existingMov.id);
        }
      }


      // Clean up movements for payments that no longer exist
      for (const m of reservationMovements) {
        if (m.payment_id && !(b.payments || []).some(p => p.id === m.payment_id)) {
          await this.deleteMovement(m.id);
        }
        // Legacy cleanup: delete movements without payment_id if they are related to booking payments
        // (Be careful here, saveBooking also creates a movement without payment_id)
        // For now, we only clean up if it's strictly a payment-related movement that lost its payment reference
      }
    } else {
      // Not confirmed: delete all payment movements
      for (const m of reservationMovements) {
        if (m.payment_id) {
          await this.deleteMovement(m.id);
        }
      }
    }
  }

  async deleteBooking(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM bookings WHERE id = ?", [id]);
    // Notify file-mode autosave (no-op if not in file mode)
    this.onWriteHook?.();
  }

  async getCounts(): Promise<any> {
    const projectId = localStorage.getItem('active_project_id');
    const [t, s, b, m, p, ab] = await Promise.all([
      this.query("SELECT COUNT(*) as c FROM travelers WHERE project_id = ? OR project_id IS NULL", [projectId]),
      this.query("SELECT COUNT(*) as c FROM stays WHERE project_id = ? OR project_id IS NULL", [projectId]),
      this.query("SELECT COUNT(*) as c FROM bookings WHERE project_id = ? OR project_id IS NULL", [projectId]),
      this.query("SELECT COUNT(*) as c FROM accounting_movements WHERE project_id = ? OR project_id IS NULL", [projectId]),
      this.query("SELECT COUNT(*) as c FROM properties"),
      this.getBookingsFromAccounting()
    ]);
    return {
      travelers: t[0]?.c || 0,
      stays: s[0]?.c || 0,
      bookings: b[0]?.c || 0,
      accounting: m[0]?.c || 0,
      properties: p[0]?.c || 0,
      active_bookings: ab.filter(b => b.status === 'confirmed').length,
      provisional_bookings: ab.filter(b => b.event_state === 'provisional').length
    };
  }

  export(): Uint8Array {
    if (!this.db) throw new Error("DB closed");
    return this.db.export();
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }


  async getSiteMedia(siteId: string): Promise<MediaAsset[]> {
    return await this.query("SELECT * FROM media_assets WHERE site_id = ? ORDER BY created_at DESC", [siteId]);
  }

  async deleteMedia(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM media_assets WHERE id = ?", [id]);
  }

  // --- AI ASSISTANT METHODS ---

  async getAiPersonas(): Promise<AiPersona[]> {
    const res = await this.query("SELECT * FROM ai_personas");
    return res.map(p => ({ ...p, is_active: !!p.is_active }));
  }

  async saveAiPersona(p: AiPersona): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO ai_personas (id, name, system_instruction, is_active, created_at) VALUES (?,?,?,?,?)",
      [p.id, p.name, p.system_instruction, p.is_active ? 1 : 0, p.created_at]
    );
  }

  async getAiFacts(propertyId: string): Promise<AiKnowledgeFact[]> {
    const res = await this.query("SELECT * FROM ai_facts WHERE property_id = ?", [propertyId]);
    return res.map(f => ({ ...f, is_internal: !!f.is_internal }));
  }

  async getAiFactsForContext(propertyId: string, apartmentId?: string | null): Promise<Record<string, string>> {
    const rows = await this.query("SELECT * FROM ai_facts WHERE property_id = ?", [propertyId]);
    const context: Record<string, string> = {};
    rows.filter(r => !r.apartment_id).forEach(r => {
      context[r.key] = r.value;
    });
    if (apartmentId) {
      rows.filter(r => r.apartment_id === apartmentId).forEach(r => {
        context[r.key] = r.value;
      });
    }
    return context;
  }

  async saveAiFact(f: AiKnowledgeFact): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO ai_facts (id, property_id, apartment_id, category, key, value, is_internal, updated_at) VALUES (?,?,?,?,?,?,?,?)",
      [f.id, f.property_id, f.apartment_id || null, f.category, f.key, f.value, f.is_internal ? 1 : 0, f.updated_at]
    );
  }

  async deleteAiFact(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM ai_facts WHERE id = ?", [id]);
  }

  async logAiInteraction(log: AiAuditLog): Promise<void> {
    await this.executeWithParams(
      "INSERT INTO ai_audit_logs (id, conversation_id, input_context_hash, suggested_response, user_action, final_text_length, latency_ms, created_at) VALUES (?,?,?,?,?,?,?,?)",
      [log.id, log.conversation_id, log.input_context_hash, log.suggested_response, log.user_action, log.final_text_length || 0, log.latency_ms, log.created_at]
    );
  }



  async getChannelConnections(apartmentId?: string): Promise<ChannelConnection[]> {
    let sql = "SELECT * FROM channel_connections";
    if (apartmentId) sql += " WHERE apartment_id = ?";
    const res = await this.query(sql, apartmentId ? [apartmentId] : []);
    return res.map(c => ({ ...c, enabled: c.enabled !== 0, force_direct: c.force_direct === 1 }));
  }

  async saveChannelConnection(conn: ChannelConnection): Promise<void> {
    await this.executeWithParams(
      `INSERT OR REPLACE INTO channel_connections (
        id, apartment_id, channel_name, alias, ical_url, last_sync, last_status,
        sync_log, created_at, connection_type, priority, content_hash,
        enabled, http_etag, http_last_modified, force_direct
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        conn.id, conn.apartment_id, conn.channel_name, conn.alias || null,
        conn.ical_url, conn.last_sync || 0, conn.last_status || 'PENDING',
        conn.sync_log || '', conn.created_at, conn.connection_type || 'ICAL',
        conn.priority || 0, conn.content_hash || null, conn.enabled ? 1 : 0,
        conn.http_etag || null, conn.http_last_modified || null,
        conn.force_direct ? 1 : 0
      ]
    );
  }

  async deleteChannelConnection(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM channel_connections WHERE id = ?", [id]);
  }

  async getCalendarEvents(connectionId?: string): Promise<CalendarEvent[]> {
    let sql = "SELECT * FROM calendar_events";
    if (connectionId) sql += " WHERE connection_id = ?";
    return await this.query(sql, connectionId ? [connectionId] : []);
  }

  async saveCalendarEvent(evt: CalendarEvent): Promise<void> {
    const columns = [
      'id', 'connection_id', 'external_uid', 'property_id', 'apartment_id',
      'start_date', 'end_date', 'status', 'summary', 'description',
      'raw_data', 'created_at', 'updated_at', 'booking_id'
    ];
    const values: any[] = [
      evt.id, evt.connection_id, evt.external_uid, evt.property_id,
      evt.apartment_id, evt.start_date, evt.end_date, evt.status,
      evt.summary || null, evt.description || null, evt.raw_data || null,
      evt.created_at, evt.updated_at, evt.booking_id || null
    ];

    if (this.schemaFlags.calendar_event_kind) {
      columns.push('event_kind');
      values.push((evt as any).event_kind || null);
    }
    if (this.schemaFlags.calendar_project_id) {
      columns.push('project_id');
      values.push((evt as any).project_id || null);
    }
    if (this.schemaFlags.calendar_ical_uid) {
      columns.push('ical_uid');
      values.push((evt as any).ical_uid || null);
    }

    const placeholders = columns.map(() => '?').join(',');
    const sql = `INSERT OR REPLACE INTO calendar_events (${columns.join(',')}) VALUES (${placeholders})`;

    await this.executeWithParams(sql, values);
  }

  /**
   * HOTFIX (Block 9): Synchronizes a booking to the calendar_events table.
   * This ensures the grid is always fresh even if loading from calendar_events.
   */
  async upsertCalendarEventFromBooking(b: Booking): Promise<void> {
    const eventId = b.linked_event_id || `evt_${b.id}`;

    const event: any = {
      id: eventId,
      connection_id: b.connection_id || 'manual',
      external_uid: b.ical_uid || b.external_ref || b.id,
      property_id: b.property_id,
      apartment_id: b.apartment_id,
      start_date: b.check_in,
      end_date: b.check_out,
      status: b.status || 'confirmed',
      summary: b.guest_name || b.summary || 'Reserva Manual',
      description: b.payment_notes || '',
      created_at: b.created_at || Date.now(),
      updated_at: Date.now(),
      booking_id: b.id,
      event_kind: (b as any).event_kind || (isProvisionalBlock(b) ? 'BLOCK' : 'BOOKING'),
      event_state: b.status === 'confirmed' ? 'confirmed' : 'provisional',
      project_id: b.project_id || localStorage.getItem('active_project_id') || undefined
    };

    await this.saveCalendarEvent(event as CalendarEvent);
  }

  async deleteCalendarEventsByConnection(connectionId: string): Promise<void> {
    await this.executeWithParams("DELETE FROM calendar_events WHERE connection_id = ?", [connectionId]);
  }

  // --- PRICING FOUNDATION METHODS ---

  async getPricingRuleSets(unitId: string, ratePlanId?: string): Promise<PricingRuleSet[]> {
    let sql = "SELECT * FROM pricing_rule_sets WHERE unit_id = ?";
    const params: any[] = [unitId];

    if (ratePlanId) {
      sql += " AND rate_plan_id = ?";
      params.push(ratePlanId);
    } else {
      sql += " AND (rate_plan_id IS NULL OR rate_plan_id = '')";
    }

    sql += " ORDER BY version DESC";
    const res = await this.query(sql, params);
    return res.map(row => ({
      ...row,
      unitId: row.unit_id,
      ratePlanId: row.rate_plan_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })) as PricingRuleSet[];
  }

  async getPricingRuleSetById(id: string): Promise<PricingRuleSet | null> {
    const res = await this.query("SELECT * FROM pricing_rule_sets WHERE id = ?", [id]);
    if (!res[0]) return null;
    const row = res[0];
    return {
      ...row,
      unitId: row.unit_id,
      ratePlanId: row.rate_plan_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } as PricingRuleSet;
  }

  async savePricingRuleSet(set: PricingRuleSet): Promise<void> {
    // If setting active, archive previous active ones for this unit/plan combo
    if (set.status === 'active') {
      let archiveSql = "UPDATE pricing_rule_sets SET status = 'archived' WHERE unit_id = ? AND status = 'active' AND id != ?";
      const archiveParams: any[] = [set.unitId, set.id];

      if (set.ratePlanId) {
        archiveSql += " AND rate_plan_id = ?";
        archiveParams.push(set.ratePlanId);
      } else {
        archiveSql += " AND (rate_plan_id IS NULL OR rate_plan_id = '')";
      }

      await this.executeWithParams(archiveSql, archiveParams);
    }

    await this.executeWithParams(
      "INSERT OR REPLACE INTO pricing_rule_sets (id, unit_id, status, version, hash, created_at, updated_at, rate_plan_id) VALUES (?,?,?,?,?,?,?,?)",
      [set.id, set.unitId, set.status, set.version, set.hash || null, set.createdAt, set.updatedAt, set.ratePlanId || null]
    );
  }

  async getPricingRules(ruleSetId: string): Promise<PricingRule[]> {
    const res = await this.query("SELECT * FROM pricing_rules WHERE rule_set_id = ? ORDER BY priority DESC", [ruleSetId]);
    return res.map(r => ({ ...r, enabled: !!r.enabled })) as PricingRule[];
  }

  async savePricingRule(rule: PricingRule): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO pricing_rules (id, rule_set_id, type, priority, payload, enabled, updated_at) VALUES (?,?,?,?,?,?,?)",
      [rule.id, rule.ruleSetId, rule.type, rule.priority, rule.payload, rule.enabled ? 1 : 0, rule.updatedAt]
    );
  }

  async deletePricingRule(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM pricing_rules WHERE id = ?", [id]);
  }

  async saveBookingPriceSnapshot(snapshot: BookingPriceSnapshot): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO bookings_price_snapshot (booking_id, snapshot_json, created_at) VALUES (?,?,?)",
      [snapshot.bookingId, snapshot.snapshotJson, snapshot.createdAt]
    );
  }

  // --- WEBSITES ---
  async getMessages(): Promise<any[]> {
    return []; // Satisfy IDataStore
  }



  private async tableExists(tableName: string): Promise<boolean> {
    const res = await this.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [tableName]);
    return res.length > 0;
  }

  async getAllMediaAssets(): Promise<MediaAsset[]> {
    if (!await this.tableExists('media_assets')) {
      console.warn("⚠️ Tabla omitted: media_assets (no existe)");
      return [];
    }
    return await this.query("SELECT * FROM media_assets");
  }

  // --- WEBSITE METHODS (v2 strict schema) ---
  async getWebsites(): Promise<WebSite[]> {
    if (!await this.tableExists('web_sites')) { // Changed from 'websites'
      return [];
    }
    const res = await this.query("SELECT * FROM web_sites ORDER BY created_at DESC");
    return res.map(r => ({
      ...r,
      is_published: !!r.is_published, // Convert integer to boolean
    }));
  }

  async loadWebsite(id?: string): Promise<WebSite | null> {
    if (!id) return this.getMyWebsite();
    const res = await this.query("SELECT * FROM web_sites WHERE id = ?", [id]);
    if (res.length === 0) return null;
    const w = res[0];
    return {
      ...w,
      is_published: !!w.is_published,
      theme_config: w.theme_config ? JSON.parse(w.theme_config) : {},
      seo_title: w.seo_title || '',
      seo_description: w.seo_description || '',
      sections_json: w.sections_json ? JSON.parse(w.sections_json) : [],
      booking_config: w.booking_config ? JSON.parse(w.booking_config) : {},
      property_ids_json: w.property_ids_json ? JSON.parse(w.property_ids_json) : [],
      allowed_origins_json: w.allowed_origins_json ? JSON.parse(w.allowed_origins_json) : [],
      features_json: w.features_json ? JSON.parse(w.features_json) : {},
      config_json: w.config_json ? JSON.parse(w.config_json) : {},
      slug: w.slug || ''
    };
  }

  async saveWebsite(w: WebSite): Promise<void> {
    const now = Date.now();

    // 1. Ensure schema exists (vital for File Mode)
    await this.ensureWebSitesSchema();

    // 2. Atomic UPSERT using modern SQLite syntax
    // We use INSERT INTO ... ON CONFLICT DO UPDATE to ensure strict persistence
    const sql = `
      INSERT INTO web_sites (
        id, property_id, name, subdomain, template_slug, plan_type,
        primary_domain, public_token, is_published, 
        theme_config, seo_title, seo_description, 
        sections_json, booking_config, property_ids_json,
        allowed_origins_json, features_json, config_json, slug, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        property_id=excluded.property_id,
        name=excluded.name,
        subdomain=excluded.subdomain,
        template_slug=excluded.template_slug,
        plan_type=excluded.plan_type,
        primary_domain=excluded.primary_domain,
        public_token=excluded.public_token,
        is_published=excluded.is_published,
        theme_config=excluded.theme_config,
        seo_title=excluded.seo_title,
        seo_description=excluded.seo_description,
        sections_json=excluded.sections_json,
        booking_config=excluded.booking_config,
        property_ids_json=excluded.property_ids_json,
        allowed_origins_json=excluded.allowed_origins_json,
        features_json=excluded.features_json,
        config_json=excluded.config_json,
        slug=excluded.slug,
        updated_at=excluded.updated_at
    `;

    const row = [
      w.id,
      w.property_id,
      w.name || null,
      w.subdomain,
      w.template_slug,
      w.plan_type,
      w.primary_domain || null,
      w.public_token,
      w.is_published ? 1 : 0,
      w.theme_config || '{}',
      w.seo_title || '',
      w.seo_description || '',
      w.sections_json || '[]',
      w.booking_config || '{}',
      w.property_ids_json || '[]',
      w.allowed_origins_json || '[]',
      w.features_json || '{}',
      w.config_json || '{}',
      w.subdomain || '',
      w.created_at || now,
      w.updated_at || now
    ];

    await this.executeWithParams(sql, row);

    // Log result
    try {
      const changes = this.db.getRowsModified ? this.db.getRowsModified() : 'unknown';
      logger.log(`[WEB:SAVE] sql ok changes=${changes} id=${w.id}`);
    } catch (e) {
      logger.log(`[WEB:SAVE] sql ok (changes check failed) id=${w.id}`);
    }

    // Notify file-mode autosave
    this.onWriteHook?.();
  }

  async deleteWebsite(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM web_sites WHERE id=?", [id]);
  }


  // --- REGISTRY & VUDA METHODS ---
  async getRegistryUnit(apartmentId: string): Promise<RegistryUnit | null> {
    const res = await this.query("SELECT * FROM registry_units WHERE apartment_id = ?", [apartmentId]);
    return res[0] || null;
  }

  async saveRegistryUnit(ru: RegistryUnit): Promise<void> {
    const row = [
      ru.id, ru.apartment_id, ru.referencia_catastral || '', ru.licencia_turistica || '',
      ru.identificador_registral || '', ru.direccion_completa || '', ru.municipio || '',
      ru.provincia || '', ru.codigo_postal || '', ru.titularidad || 'explotacion',
      ru.estado_tramitacion || 'pendiente', ru.numero_registro_oficial || '',
      ru.fecha_solicitud || null, ru.fecha_resolucion || null, ru.notas_internas || '',
      ru.updated_at || Date.now()
    ];
    await this.executeWithParams(
      `INSERT OR REPLACE INTO registry_units (
        id, apartment_id, referencia_catastral, licencia_turistica,
        identificador_registral, direccion_completa, municipio, provincia,
        codigo_postal, titularidad, estado_tramitacion, numero_registro_oficial,
        fecha_solicitud, fecha_resolucion, notas_internas, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      row
    );
  }

  async getPresentations(unitId?: string): Promise<RegistryPresentation[]> {
    let sql = "SELECT * FROM registry_presentations";
    const params = [];
    if (unitId) {
      sql += " WHERE registry_unit_id = ?";
      params.push(unitId);
    }
    sql += " ORDER BY fecha_presentacion DESC";
    return await this.query(sql, params);
  }

  async savePresentation(p: RegistryPresentation): Promise<void> {
    const row = [
      p.id, p.registry_unit_id || null, p.tipo_tramite, p.ejercicio_fiscal || null,
      p.fecha_presentacion, p.estado, p.csv_acuse || '', p.xbrl_blob || '', p.observaciones || '',
      p.created_at || Date.now()
    ];
    await this.executeWithParams(
      "INSERT OR REPLACE INTO registry_presentations (id, registry_unit_id, tipo_tramite, ejercicio_fiscal, fecha_presentacion, estado, csv_acuse, xbrl_blob, observaciones, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      row
    );
  }

  // --- MARKETING ---

  // Helper to get today's date in specific timezone
  private getTodayInTimezone(timezone: string = 'Europe/Madrid'): Date {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return tzDate;
  }

  private getDateString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  async getBirthdaysToday(propertyId?: string, timezone: string = 'Europe/Madrid'): Promise<Traveler[]> {
    const travelers = await this.getTravelersMarketingData();
    const now = this.getTodayInTimezone(timezone);
    const todayStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Note: Filtering by propertyId for travelers is hard without joining stays. 
    // For now we return all, as birthdays are "human" events not strictly bound to a property context contextually.
    return travelers.filter((t: any) => t.fecha_nacimiento && t.fecha_nacimiento.includes(todayStr)) as Traveler[];
  }

  async getUpcomingArrivals(days: number = 7, propertyId?: string, timezone: string = 'Europe/Madrid'): Promise<Booking[]> {
    const now = this.getTodayInTimezone(timezone);
    const startDate = this.getDateString(now);

    const future = new Date(now);
    future.setDate(future.getDate() + days);
    const endDate = this.getDateString(future);

    // CANONICAL RULE: Source from accounting_movements.
    // IMPORTANT: Some projects still have manual/local bookings stored in `bookings` without
    // corresponding accounting_movements rows. To keep Dashboard/Operations consistent,
    // we fall back to `bookings` when no accounting rows are found for the range.
    const sql = `SELECT * FROM accounting_movements 
                 WHERE (project_id = ? OR project_id IS NULL)
                 AND source_event_type = 'STAY_RESERVATION'
                 AND event_state = 'confirmed'
                 AND check_in >= ? AND check_in <= ?
                 ${(propertyId && propertyId !== 'all') ? 'AND property_id = ?' : ''}
                 ORDER BY check_in ASC`;

    const projectId = localStorage.getItem('active_project_id');
    const params: any[] = [projectId, startDate, endDate];
    if (propertyId && propertyId !== 'all') params.push(propertyId);

    const rows = await this.query(sql, params);
    const fromAccounting = rows.map(r => ({
      id: r.reservation_id || r.id,
      property_id: r.property_id || 'prop_default',
      apartment_id: r.apartment_id || '',
      traveler_id: r.traveler_id || '',
      check_in: r.check_in || '',
      check_out: r.check_out || '',
      status: 'confirmed' as any,
      total_price: r.amount_gross || 0,
      guests: r.guests || 1,
      source: r.platform || 'manual',
      guest_name: r.concept || '',
      event_state: 'confirmed' as any,
      event_kind: 'BOOKING' as any,
      created_at: r.created_at || Date.now()
    }));

    if (fromAccounting.length > 0) return fromAccounting;

    // Fallback: source from `bookings` (manual/local)
    const projectId2 = localStorage.getItem('active_project_id');
    const sql2 = `SELECT * FROM bookings
                  WHERE (project_id = ? OR project_id IS NULL)
                  AND status = 'confirmed'
                  AND check_in >= ? AND check_in <= ?
                  ${(propertyId && propertyId !== 'all') ? 'AND property_id = ?' : ''}
                  ORDER BY check_in ASC`;
    const params2: any[] = [projectId2, startDate, endDate];
    if (propertyId && propertyId !== 'all') params2.push(propertyId);
    const rows2 = await this.query(sql2, params2);
    return rows2.map(r => ({
      ...r,
      conflict_detected: !!r.conflict_detected,
      total_price: Number(r.total_price) || 0,
      guests: Number(r.guests) || 1
    })) as any;
  }

  async getProvisionalArrivals(days: number = 7, propertyId?: string, timezone: string = 'Europe/Madrid'): Promise<Booking[]> {
    const now = this.getTodayInTimezone(timezone);
    const startDate = this.getDateString(now);

    const future = new Date(now);
    future.setDate(future.getDate() + days);
    const endDate = this.getDateString(future);

    // CANONICAL RULE: Source from accounting_movements.
    // Fallback to `bookings` for older/manual projects that don't create accounting rows.
    const sql = `SELECT * FROM accounting_movements 
                 WHERE (project_id = ? OR project_id IS NULL)
                 AND source_event_type = 'STAY_RESERVATION'
                 AND event_state = 'provisional'
                 AND check_in >= ? AND check_in <= ?
                 ${(propertyId && propertyId !== 'all') ? 'AND property_id = ?' : ''}
                 ORDER BY check_in ASC`;

    const projectId = localStorage.getItem('active_project_id');
    const params: any[] = [projectId, startDate, endDate];
    if (propertyId && propertyId !== 'all') params.push(propertyId);

    const rows = await this.query(sql, params);
    const fromAccounting = rows.map(r => ({
      id: r.reservation_id || r.id,
      property_id: r.property_id || 'prop_default',
      apartment_id: r.apartment_id || '',
      traveler_id: r.traveler_id || '',
      check_in: r.check_in || '',
      check_out: r.check_out || '',
      status: 'pending' as any,
      total_price: r.amount_gross || 0,
      guests: r.guests || 1,
      source: r.platform || 'manual',
      guest_name: r.concept || '',
      event_state: 'provisional' as any,
      event_kind: 'BOOKING' as any,
      created_at: r.created_at || Date.now()
    }));

    if (fromAccounting.length > 0) return fromAccounting;

    // Fallback: if your `bookings` table uses status='pending' for provisional
    const projectId2 = localStorage.getItem('active_project_id');
    const sql2 = `SELECT * FROM bookings
                  WHERE (project_id = ? OR project_id IS NULL)
                  AND status = 'pending'
                  AND check_in >= ? AND check_in <= ?
                  ${(propertyId && propertyId !== 'all') ? 'AND property_id = ?' : ''}
                  ORDER BY check_in ASC`;
    const params2: any[] = [projectId2, startDate, endDate];
    if (propertyId && propertyId !== 'all') params2.push(propertyId);
    const rows2 = await this.query(sql2, params2);
    return rows2.map(r => ({
      ...r,
      conflict_detected: !!r.conflict_detected,
      total_price: Number(r.total_price) || 0,
      guests: Number(r.guests) || 1
    })) as any;
  }

  async getPendingCheckins(days: number = 7, propertyId?: string, timezone: string = 'Europe/Madrid'): Promise<Booking[]> {
    // Defines "Pending Checkin" as any confirmed booking arriving soon.
    // In future this could exclude bookings with 'checkin_completed' flag if added.
    return this.getUpcomingArrivals(days, propertyId, timezone);
  }

  async getMarketingTemplates(): Promise<MarketingTemplate[]> {
    return await this.query("SELECT * FROM marketing_templates ORDER BY created_at DESC");
  }

  async saveMarketingTemplate(t: MarketingTemplate): Promise<void> {
    await this.executeWithParams("INSERT OR REPLACE INTO marketing_templates (id, name, subject, body, created_at) VALUES (?,?,?,?,?)", [t.id, t.name, t.subject, t.body, t.created_at]);
  }

  async getMarketingLogs(): Promise<MarketingLog[]> {
    return await this.query("SELECT * FROM marketing_logs ORDER BY created_at DESC");
  }

  async saveMarketingLog(l: MarketingLog): Promise<void> {
    await this.executeWithParams("INSERT OR REPLACE INTO marketing_logs (id, traveler_id, event_type, metadata, created_at) VALUES (?,?,?,?,?)", [l.id, l.traveler_id, l.event_type, l.metadata, l.created_at]);
  }

  // --- CAMPAIGNS & COUPONS ---

  async getCoupons(): Promise<Coupon[]> {
    const projectId = localStorage.getItem('active_project_id');
    return await this.query("SELECT * FROM coupons WHERE project_id = ?", [projectId]);
  }

  async saveCoupon(c: Coupon): Promise<void> {
    const projectId = localStorage.getItem('active_project_id');
    await this.executeWithParams(
      "INSERT OR REPLACE INTO coupons (id, code, discount_type, discount_value, expiration_date, status, created_at, project_id) VALUES (?,?,?,?,?,?,?,?)",
      [c.id, c.code, c.discount_type, c.discount_value, c.expiration_date || null, c.status, c.created_at, projectId]
    );
  }

  async deleteCoupon(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM coupons WHERE id=?", [id]);
  }

  // --- ACCOUNTING AGGREGATIONS ---
  async getAccountingSummaryByApartment(year: number, bucket: string, propId?: string) {
    let sql = `
      SELECT 
        a.id as apartment_id, 
        a.name as apartment_name, 
        a.color as apartment_color,
        p.id as property_id,
        p.name as property_name,
        SUM(CASE WHEN m.type = 'income' THEN m.amount_net ELSE 0 END) as total_income,
        SUM(CASE WHEN m.type = 'expense' THEN m.amount_net ELSE 0 END) as total_expense
      FROM apartments a 
      LEFT JOIN properties p ON a.property_id = p.id
      LEFT JOIN accounting_movements m ON a.id = m.apartment_id 
      AND (strftime('%Y', m.date) = ? OR m.date LIKE '%' || ?) ${bucket !== 'ALL' ? 'AND m.accounting_bucket = ?' : ''}
      ${propId && propId !== 'ALL' ? 'WHERE a.property_id = ?' : ''} 
      GROUP BY a.id`;

    const params: string[] = [year.toString(), year.toString()];
    if (bucket !== 'ALL') params.push(bucket);
    if (propId && propId !== 'ALL') params.push(propId);
    return await this.query(sql, params);
  }

  async getAccountingTimeSeries(year: number, bucket: string, propId?: string, apartmentId?: string) {
    let sql = `
      SELECT 
        strftime('%m', m.date) as month, 
        SUM(CASE WHEN m.type = 'income' THEN m.amount_net ELSE 0 END) as income,
        SUM(CASE WHEN m.type = 'expense' THEN m.amount_net ELSE 0 END) as expense
      FROM accounting_movements m
      LEFT JOIN apartments a ON m.apartment_id = a.id
      WHERE (strftime('%Y', m.date) = ? OR m.date LIKE '%' || ?)
    `;
    const params: any[] = [year.toString(), year.toString()];

    if (bucket !== 'ALL') {
      sql += ' AND m.accounting_bucket = ?';
      params.push(bucket);
    }
    if (propId && propId !== 'ALL') {
      sql += ' AND a.property_id = ?';
      params.push(propId);
    }
    if (apartmentId && apartmentId !== 'ALL') {
      sql += ' AND m.apartment_id = ?';
      params.push(apartmentId);
    }

    sql += ' GROUP BY month ORDER BY month ASC';

    return await this.query(sql, params);
  }


  // --- FISCAL ---
  async getFiscalProfile() {
    const res = await this.query("SELECT * FROM fiscal_profile WHERE id = 1");
    return res[0] || null;
  }
  async saveFiscalProfile(p: FiscalProfile) {
    const sql = `INSERT OR REPLACE INTO fiscal_profile (id, tipo_fiscal, nombre_razon_social, nif_cif, domicilio_fiscal, provincia, email, telefono, regimen_iva, iva_defecto) VALUES (1,?,?,?,?,?,?,?,?,?)`;
    await this.executeWithParams(sql, [p.tipo_fiscal, p.nombre_razon_social, p.nif_cif, p.domicilio_fiscal, p.provincia, p.email, p.telefono, p.regimen_iva || null, p.iva_defecto || 0]);
  }

  async ensureSettings(): Promise<UserSettings> {
    const rows = await this.query(`SELECT * FROM user_settings WHERE id = 'default' LIMIT 1`);
    if (rows.length > 0) {
      return rows[0] as UserSettings;
    }

    const defaultSettings: UserSettings = {
      id: 'default',
      fiscal_country: 'España',
      default_currency: 'EUR',
      default_timezone: 'Europe/Madrid',
      date_format: 'DD/MM/YYYY',
      ui_scale: 1.0,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    await this.saveSettings(defaultSettings);
    logger.log("Default settings created successfully.");
    return defaultSettings;
  }

  async getSettings(): Promise<UserSettings> {
    return this.ensureSettings();
  }

  async saveSettings(s: UserSettings): Promise<void> {
    const updated = { ...s, updated_at: Date.now() };
    await this.executeWithParams(
      `INSERT OR REPLACE INTO user_settings (
        id, business_name, business_description, fiscal_name, fiscal_id,
        fiscal_address, fiscal_city, fiscal_postal_code, fiscal_country,
        contact_email, contact_phone, contact_website, default_currency,
        default_timezone, date_format, ui_scale, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        updated.id || 'default',
        updated.business_name,
        updated.business_description,
        updated.fiscal_name,
        updated.fiscal_id,
        updated.fiscal_address,
        updated.fiscal_city,
        updated.fiscal_postal_code,
        updated.fiscal_country,
        updated.technical_reservations_email,
        updated.allow_manual_completion !== false ? 1 : 0,
        updated.contact_email,
        updated.contact_phone,
        updated.contact_website,
        updated.default_currency,
        updated.default_timezone,
        updated.date_format,
        updated.ui_scale || 1.0,
        updated.enable_minimal_bookings_from_ical ? 1 : 0,
        updated.created_at || Date.now(),
        updated.updated_at
      ]
    );
  }

  // --- BLOCK 22: CANCELLATION POLICIES & RATE PLANS ---
  async getCancellationPolicies(propertyId: string): Promise<CancellationPolicy[]> {
    if (propertyId === 'ALL_LEGACY') {
      return await this.query("SELECT * FROM cancellation_policies");
    }
    return await this.query("SELECT * FROM cancellation_policies WHERE property_id = ?", [propertyId]);
  }

  async saveCancellationPolicy(p: CancellationPolicy): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO cancellation_policies (id, property_id, name, type, rules_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
      [p.id, p.property_id, p.name, p.type, p.rules_json, p.created_at, p.updated_at]
    );
  }

  async deleteCancellationPolicy(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM cancellation_policies WHERE id = ?", [id]);
  }

  async getRatePlans(unitId: string): Promise<RatePlan[]> {
    const res = await this.query("SELECT * FROM rate_plans WHERE apartment_id = ?", [unitId]);
    return res.map(row => ({ ...row, is_active: !!row.is_active }));
  }

  async getRatePlanById(id: string): Promise<RatePlan | null> {
    const res = await this.query("SELECT * FROM rate_plans WHERE id = ?", [id]);
    if (!res[0]) return null;
    const row = res[0];
    return { ...row, is_active: !!row.is_active } as RatePlan;
  }

  async saveRatePlan(plan: RatePlan): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO rate_plans (id, apartment_id, cancellation_policy_id, name, is_active, price_modifier_type, price_modifier_value, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
      [
        plan.id, plan.apartment_id, plan.cancellation_policy_id,
        plan.name, plan.is_active ? 1 : 0, plan.price_modifier_type,
        plan.price_modifier_value, plan.created_at, plan.updated_at
      ]
    );
  }

  async deleteRatePlan(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM rate_plans WHERE id = ?", [id]);
  }

  // --- BLOCK 25: BOOKING WINDOW MODIFIERS ---
  async getPricingModifiers(propertyId: string): Promise<PricingModifier[]> {
    const res = await this.query("SELECT * FROM pricing_modifiers WHERE property_id = ? AND enabled = 1", [propertyId]);
    return res.map(row => ({ ...row, enabled: !!row.enabled }));
  }

  async savePricingModifier(m: PricingModifier): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO pricing_modifiers (id, property_id, unit_id, rate_plan_id, type, condition_json, apply_json, enabled, priority, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [m.id, m.property_id, m.unit_id, m.rate_plan_id, m.type, m.condition_json, m.apply_json, m.enabled ? 1 : 0, m.priority, m.created_at, m.updated_at]
    );
  }

  async deletePricingModifier(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM pricing_modifiers WHERE id = ?", [id]);
  }

  // --- BLOCK 26: FEES & TAXES ---
  async getFees(propertyId: string): Promise<Fee[]> {
    const res = await this.query("SELECT * FROM fees WHERE property_id = ? AND enabled = 1", [propertyId]);
    return res.map(row => ({ ...row, enabled: !!row.enabled }));
  }

  async saveFee(f: Fee): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO fees (id, property_id, name, type, charge_mode, amount_cents, vat_percent, enabled, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [f.id, f.property_id, f.name, f.type, f.charge_mode, f.amount_cents, f.vat_percent, f.enabled ? 1 : 0, f.created_at, f.updated_at]
    );
  }

  async deleteFee(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM fees WHERE id = ?", [id]);
  }



  async getRecentMessages(limit: number = 5): Promise<Conversation[]> {
    const sql = "SELECT * FROM conversations ORDER BY last_message_at DESC LIMIT ?";
    const rows = await this.query(sql, [limit]);
    return rows.map(r => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata) : {}
    }));
  }

  async getMyWebsite(): Promise<WebSite | null> {
    const rows = await this.query("SELECT * FROM web_sites ORDER BY updated_at DESC LIMIT 1");
    if (rows.length === 0) return null;
    const r = rows[0];
    logger.log(`[WEBBUILDER:LOAD] loaded id=${r.id} name="${r.name}"`);
    return {
      ...r,
      is_published: !!r.is_published,
    };
  }



  async getMovements(bucket?: string): Promise<AccountingMovement[]> {
    const projectId = localStorage.getItem('active_project_id');
    let sql = "SELECT * FROM accounting_movements WHERE (project_id = ? OR project_id IS NULL)";
    const params: any[] = [projectId];

    if (bucket && bucket !== 'ALL') {
      sql += " AND accounting_bucket = ?";
      params.push(bucket);
    }
    sql += " ORDER BY date DESC";
    return await this.query(sql, params);
  }

  async saveMovement(m: AccountingMovement): Promise<void> {
    const cols = [
      'id', 'date', 'type', 'category', 'concept', 'apartment_id', 'reservation_id', 'traveler_id',
      'platform', 'supplier', 'amount_gross', 'commission', 'vat', 'amount_net', 'payment_method',
      'accounting_bucket', 'import_hash', 'import_batch_id', 'receipt_blob', 'created_at', 'updated_at', 'movement_key', 'project_id',
      'property_id', 'check_in', 'check_out', 'guests', 'pax_adults', 'pax_children', 'source_event_type', 'event_state', 'ical_uid', 'connection_id', 'raw_summary', 'raw_description'
    ];
    // --- GUARDRAIL: Ensure stay movements have valid durations ---
    if (m.source_event_type === 'STAY_RESERVATION' && m.check_in && m.check_out) {
      const { checkOut: validCO } = ensureValidStay(m.check_in, m.check_out);
      m.check_out = validCO;
    }

    const vals = [
      m.id, m.date, m.type, m.category || null, m.concept, m.apartment_id || null, m.reservation_id || null, m.traveler_id || null,
      m.platform || null, m.supplier || null, m.amount_gross, m.commission || 0, m.vat || 0, m.amount_net, m.payment_method || 'Unknown',
      m.accounting_bucket, m.import_hash || null, m.import_batch_id || null, m.receipt_blob || null, m.created_at, m.updated_at, m.movement_key || null, m.project_id || localStorage.getItem('active_project_id'),
      m.property_id || null, m.check_in || null, m.check_out || null, m.guests || null, m.pax_adults || null, m.pax_children || null, m.source_event_type || null, m.event_state || null, m.ical_uid || null, m.connection_id || null, m.raw_summary || null, m.raw_description || null
    ];

    if (this.schemaFlags.accounting_pax_infants) {
      cols.push('pax_infants');
      vals.push(m.pax_infants || null);
    }

    if (this.schemaFlags.accounting_payment_id) {
      cols.push('payment_id');
      vals.push(m.payment_id || null);
    }

    const placeholders = cols.map(() => '?').join(',');
    await this.executeWithParams(
      `INSERT OR REPLACE INTO accounting_movements (${cols.join(',')}) VALUES (${placeholders})`,
      vals
    );
  }

  async getBookingByKey(key: string): Promise<Booking | null> {
    const r = await this.query("SELECT * FROM bookings WHERE booking_key = ?", [key]);
    if (!r[0]) return null;
    return {
      ...r[0],
      conflict_detected: !!r[0].conflict_detected
    };
  }

  async getMovementByKey(key: string): Promise<AccountingMovement | null> {
    const r = await this.query("SELECT * FROM accounting_movements WHERE movement_key = ?", [key]);
    if (!r[0]) return null;
    return {
      ...r[0],
      amount_gross: Number(r[0].amount_gross),
      amount_net: Number(r[0].amount_net),
      vat: Number(r[0].vat),
      commission: Number(r[0].commission)
    };
  }

  async getBookingsFromAccounting(): Promise<Booking[]> {
    const projectId = localStorage.getItem('active_project_id');

    // Query for movements that represent a stay or have a reservation link
    // We sort such that STAY_RESERVATION (primary data) comes first per group
    const rows = await this.query(
      `SELECT * FROM accounting_movements 
       WHERE (project_id = ? OR project_id IS NULL) 
       AND (reservation_id IS NOT NULL OR source_event_type = 'STAY_RESERVATION')
       ORDER BY reservation_id ASC, source_event_type DESC, created_at ASC`,
      [projectId]
    );

    const bookingsMap = new Map<string, Booking>();

    for (const r of rows) {
      const b_id = r.reservation_id || r.id;

      if (!bookingsMap.has(b_id)) {
        bookingsMap.set(b_id, {
          id: b_id,
          property_id: r.property_id || 'prop_default',
          apartment_id: r.apartment_id || '',
          traveler_id: r.traveler_id || '',
          check_in: r.check_in || r.date,
          check_out: r.check_out || r.date,
          status: 'confirmed',
          total_price: 0,
          guests: r.guests || 1,
          source: r.platform || 'manual',
          created_at: r.created_at || Date.now(),
          guest_name: r.concept,
          event_state: (r.event_state as any) || 'confirmed',
          event_kind: 'BOOKING',
          payments: [],
          ical_uid: r.ical_uid || undefined
        });
      }

      const b = bookingsMap.get(b_id)!;

      // [HOTFIX] Aggregation logic: If we have specific payment movements, ignore the "Base" movement to avoid doubling
      const hasSpecificPayments = rows.some(r2 => (r2.reservation_id === b_id || r2.id === b_id) && r2.payment_id);
      if (hasSpecificPayments && r.import_hash === `base_booking_${b_id}`) {
        // Skip base movement if we have detailed ones
        continue;
      }

      if (r.type === 'income') {
        b.total_price += Number(r.amount_gross) || 0;
      }

      // Metadata enrichment: Prioritize movement with specific stay dates
      if (r.check_in && r.check_out) {
        b.check_in = r.check_in;
        b.check_out = r.check_out;
        b.guests = r.guests || b.guests;
        if (r.source_event_type === 'STAY_RESERVATION') {
          b.guest_name = r.concept || b.guest_name;
          b.event_state = (r.event_state as any) || b.event_state;
        }
      }

      if (r.property_id) b.property_id = r.property_id;
      if (r.ical_uid) b.ical_uid = r.ical_uid;
      if (r.traveler_id) b.traveler_id = r.traveler_id;
      if (r.connection_id) b.connection_id = r.connection_id;

      // Collect payments (if movement represents a specific payment)
      if (r.type === 'income' || r.type === 'expense') {
        b.payments!.push({
          id: r.id,
          type: 'extra', // Changed from installment to satisfy type
          amount: Number(r.amount_gross) || 0,
          date: r.date,
          method: r.payment_method || 'Unknown',
          status: 'pagado',
          note: r.concept
        });
      }
    }

    return Array.from(bookingsMap.values());
  }

  async deleteMovement(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM accounting_movements WHERE id = ?", [id]);
  }

  async exportDataOnly(): Promise<DataOnlyBackup> {
    const [travelers, stays, bookings, movements, registry_units, registry_presentations, websites, accounts, conversations, messages, personas, facts, channels, calendarEvents, pricingSets, pricingRules, cancelPolicies, ratePlans, pricingModifiers, fees, settings, provisionals] = await Promise.all([
      this.getTravelers(), this.getStays(), this.getBookings(), this.getMovements('ALL'),
      this.query("SELECT * FROM registry_units"), this.query("SELECT * FROM registry_presentations"),
      this.getWebsites(),
      this.getAccounts(), this.getConversations('OPEN'), this.query("SELECT * FROM messages"),
      this.getAiPersonas(), this.query("SELECT * FROM ai_facts"),
      this.query("SELECT * FROM channel_connections"), this.query("SELECT * FROM calendar_events"),
      this.query("SELECT * FROM pricing_rule_sets"), this.query("SELECT * FROM pricing_rules"),
      this.query("SELECT * FROM cancellation_policies"), this.query("SELECT * FROM rate_plans"),
      this.query("SELECT * FROM pricing_modifiers"),
      this.query("SELECT * FROM fees"),
      this.getSettings(),
      this.getProvisionalBookings()
    ]);
    return {
      app_version: APP_VERSION,
      schema_version: SCHEMA_VERSION,
      exported_at: new Date().toISOString(),
      travelers, stays, bookings, movements, registry_units, registry_presentations, websites,
      communication_accounts: accounts, conversations, messages, ai_personas: personas, ai_facts: facts,
      channel_connections: channels, calendar_events: calendarEvents,
      pricing_rule_sets: pricingSets, pricing_rules: pricingRules,
      cancellation_policies: cancelPolicies, rate_plans: ratePlans,
      pricing_modifiers: pricingModifiers,
      fees,
      user_settings: settings,
      provisional_bookings: provisionals
    };
  }
  async exportStructureOnly(): Promise<StructureOnlyBackup> {
    const props = await this.query("SELECT * FROM properties");
    const apts = await this.query("SELECT * FROM apartments");

    // Extended fields
    let settings: UserSettings | undefined;
    if (await this.tableExists('user_settings')) {
      settings = await this.getSettings();
    }

    let websites: WebSite[] = [];
    if (await this.tableExists('websites')) {
      websites = await this.getWebsites();
    }

    let media: MediaAsset[] = [];
    if (await this.tableExists('media_assets')) {
      media = await this.getAllMediaAssets();
    }

    return {
      app_version: APP_VERSION,
      schema_version: SCHEMA_VERSION,
      exported_at: new Date().toISOString(),
      properties: props.map(p => ({ ...p, is_active: p.is_active !== 0 })),
      apartments: apts.map(a => ({ ...a, is_active: a.is_active !== 0 })),
      user_settings: settings,
      websites: websites,
      media_assets: media
    };
  }

  async importStructureOnly(data: StructureOnlyBackup): Promise<any> {
    const log: string[] = [];

    // Import Properties
    for (const p of data.properties) {
      await this.saveProperty(p);
    }
    log.push(`Properties: ${data.properties.length}`);

    // Import Apartments
    for (const a of data.apartments) {
      await this.saveApartment(a);
    }
    log.push(`Apartments: ${data.apartments.length}`);

    // Import Settings
    if (data.user_settings) {
      await this.saveSettings(data.user_settings);
      log.push(`Settings: 1`);
    }

    // Import Websites
    if (data.websites && data.websites.length > 0) {
      for (const w of data.websites) {
        await this.saveWebsite(w);
      }
      log.push(`Websites: ${data.websites.length}`);
    }

    // Import Media
    if (data.media_assets && data.media_assets.length > 0) {
      // Manual save because saveMedia expects specific args object, not entity
      // Actually saveMedia takes an object, check signature.
      // Signature: saveMedia(asset: MediaAsset) -> void (impl check needed)
      // Checking impl at line 553: saveMedia(asset: {id, ...}) matches MediaAsset roughly
      for (const m of data.media_assets) {
        // Ensure we match the signature expected by saveMedia
        await this.saveMedia(m);
      }
      log.push(`Media Assets: ${data.media_assets.length}`);
    }

    return { success: true, log };
  }

  async importDataOnly(data: any): Promise<any> {
    // 0. Ensure DB is initialized
    if (!this.db || !this.initialized) {
      await this.init();
    }
    const backupSchema = data.schema_version || 0;
    const summary: any = { success: true, counts: {} as any, errors: {} as any, wasLegacy: false };
    let tablesProcessed = 0;

    // --- MIGRATION LOGIC FOR LEGACY BACKUPS (Schema 0 or missing) ---
    if (backupSchema === 0) {
      console.log("⚠️ Legacy Backup Detected (Schema 0). Running migration adapter...");
      summary.wasLegacy = true;

      // 1. Ensure 'prop_default' for multi-property entities if missing
      const targetProp = 'prop_default';

      if (data.bookings) {
        data.bookings.forEach(b => {
          if (!b.property_id) b.property_id = targetProp;
        });
      }
      // In structure only usually, but sometimes in full data dump
      if (data.calendar_events) {
        data.calendar_events.forEach(e => {
          if (!e.property_id) e.property_id = targetProp;
        });
      }

      // 2. Accounting Movement Defaults
      if (data.movements) {
        data.movements.forEach(m => {
          if (!m.payment_method) m.payment_method = 'Unknown';
          if (!m.platform) m.platform = 'Unknown';
          if (!m.accounting_bucket) m.accounting_bucket = 'A';
        });
      }
    }

    // Disable Foreign Keys globally for the import session to prevent ordering issues
    await this.execute("PRAGMA foreign_keys = OFF;");

    const importTable = async (tableName: string, items: any[]) => {
      if (!items || items.length === 0) return;

      try {
        this.execute("BEGIN TRANSACTION");
        let inserted = 0;

        // Get valid columns for this table
        const tableInfo = await this.query(`PRAGMA table_info(${tableName})`);
        const validColumns = new Set(tableInfo.map((c: any) => c.name));

        for (const item of items) {
          const keys = Object.keys(item).filter(k => validColumns.has(k));
          if (keys.length === 0) continue;

          const cols = keys.join(',');
          const placeholders = keys.map(() => '?').join(',');
          const values = keys.map(k => {
            const v = item[k];
            return v === undefined ? null : v;
          });

          const sql = `INSERT OR REPLACE INTO ${tableName} (${cols}) VALUES (${placeholders})`;
          await this.executeWithParams(sql, values);
          inserted++;
        }

        this.execute("COMMIT");
        summary.counts[tableName] = inserted;
        tablesProcessed++;

      } catch (err: any) {
        this.execute("ROLLBACK");
        summary.errors[tableName] = err.message || String(err);
        summary.success = false;
        console.error(`Error importing table ${tableName}:`, err);
      }
    };

    try {
      // --- MIGRATION LOGIC FOR LEGACY BACKUPS (Schema 0 or missing) ---
      const backupSchema = data.schema_version || 0;
      if (backupSchema === 0) {
        console.log("⚠️ Legacy Backup Detected (Schema 0). Running migration adapter...");
        summary.wasLegacy = true;

        // 1. Ensure 'prop_default' for multi-property entities if missing
        const targetProp = 'prop_default';

        if (data.bookings) {
          data.bookings.forEach(b => {
            if (!b.property_id) b.property_id = targetProp;
          });
        }
        // In structure only usually, but sometimes in full data dump
        if (data.calendar_events) {
          data.calendar_events.forEach(e => {
            if (!e.property_id) e.property_id = targetProp;
          });
        }

        // 2. Accounting Movement Defaults
        if (data.movements) {
          data.movements.forEach(m => {
            if (!m.payment_method) m.payment_method = 'Unknown';
            if (!m.platform) m.platform = 'Unknown';
            if (!m.accounting_bucket) m.accounting_bucket = 'A';
          });
        }
      }

      // 1. Settings & Core Structure
      try {
        if (data.user_settings) await this.saveSettings(data.user_settings);
        summary.counts['settings'] = 1;
      } catch (e: any) {
        summary.errors['settings'] = e.message;
      }

      if (data.properties) await importTable('properties', data.properties);
      if (data.apartments) await importTable('apartments', data.apartments);

      // 2. Data Tables
      if (data.travelers) await importTable('travelers', data.travelers);
      if (data.stays) await importTable('stays', data.stays);
      if (data.bookings) await importTable('bookings', data.bookings);
      if (data.movements || data.accounting_movements) {
        await importTable('accounting_movements', data.movements || data.accounting_movements);
      }

      // 3b. Channel Connections (needed for calendar events)
      if (data.channel_connections) await importTable('channel_connections', data.channel_connections);

      // 3. Calendar Events with orphan filtering
      if (data.calendar_events && data.calendar_events.length > 0) {
        const validBookingIds = new Set((await this.query("SELECT id FROM bookings")).map(b => b.id));
        const validApartmentIds = new Set((await this.query("SELECT id FROM apartments")).map(a => a.id));
        const validConnectionIds = new Set((await this.query("SELECT id FROM channel_connections")).map(c => c.id));

        const safeEvents = data.calendar_events.filter((ev: any) => {
          let isSafe = true;
          if (ev.connection_id && !validConnectionIds.has(ev.connection_id)) isSafe = false;
          if (ev.booking_id && !validBookingIds.has(ev.booking_id)) isSafe = false;
          if (ev.apartment_id && !validApartmentIds.has(ev.apartment_id)) isSafe = false;
          return isSafe;
        });

        await importTable('calendar_events', safeEvents);
      }

      // 4. Other tables
      const otherTables = [
        'pricing_rule_sets', 'pricing_rules',
        'cancellation_policies', 'rate_plans', 'pricing_modifiers', 'fees',
        'registry_units', 'registry_presentations',
        'websites', 'communication_accounts', 'conversations', 'messages',
        'ai_personas', 'ai_facts'
      ];
      for (const table of otherTables) {
        if (data[table]) await importTable(table, data[table]);
      }

      // Ensure settings exist at the end
      await this.ensureSettings();

      // Final Query for REAL counts
      const tCount = await this.query("SELECT COUNT(*) as count FROM travelers");
      const bCount = await this.query("SELECT COUNT(*) as count FROM bookings");
      const mCount = await this.query("SELECT COUNT(*) as count FROM accounting_movements");

      summary.realCounts = {
        travelers: tCount[0]?.count || 0,
        bookings: bCount[0]?.count || 0,
        movements: mCount[0]?.count || 0
      };

    } finally {
      await this.execute("PRAGMA foreign_keys = ON;");
    }

    return summary;
  }



  // --- BASE HELPERS ---
  async execute(sql: string) {
    if (!this.db) {
      console.error("[DB] EXECUTE FAILED: DB not initialized or closed", sql);
      throw new Error("DB not ready/closed");
    }
    this.db.run(sql);
  }
  async executeWithParams(sql: string, params: any[]) {
    if (!this.db) {
      console.error("[DB] EXECUTE_PARAMS FAILED: DB not initialized or closed", sql);
      throw new Error("DB not ready/closed");
    }
    const sanitized = this.sanitizeParams(params);
    this.db.run(sql, sanitized);
  }

  // Generic query method
  public async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) {
      // In query we default to empty array if not ready, but arguably query should also throw if critical.
      // For now, let's throw to be strict as requested.
      console.error("[DB] QUERY FAILED: DB not initialized or closed", sql);
      throw new Error("DB not ready/closed");
    }
    const sanitized = this.sanitizeParams(params);

    const res = this.db?.exec(sql, sanitized);
    if (!res || res.length === 0) return [];
    const columns = res[0].columns;
    return res[0].values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
      return obj;
    });
  }

  private sanitizeParams(params: any[]): any[] {
    return params.map(p => {
      if (p === undefined) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p;
    });
  }

  // --- CRUD BLINDADOS ---
  async findPropertyByName(name: string) { const r = await this.query("SELECT * FROM properties WHERE name LIKE ?", [`%${name}%`]); return r[0] || null; }
  async findApartmentByName(name: string) { const r = await this.query("SELECT * FROM apartments WHERE name LIKE ?", [`%${name}%`]); return r[0] || null; }

  async getProperties() {
    const res = await this.query("SELECT * FROM properties");
    return res.map(p => ({
      ...p,
      is_active: p.is_active !== 0,
      web_calendar_enabled: p.web_calendar_enabled === 1,
      show_prices: p.show_prices === 1,
      max_range_days: p.max_range_days ?? 365,
    }));
  }
  async saveProperty(p: Property) {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO properties (id, name, description, color, created_at, updated_at, is_active, timezone, currency, web_calendar_enabled, public_token, allowed_origins_json, show_prices, max_range_days, last_published_at, location, logo, phone, email) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        p.id, p.name, p.description || '', p.color || null, p.created_at, p.updated_at || Date.now(),
        p.is_active !== false ? 1 : 0, p.timezone || 'Europe/Madrid', p.currency || 'EUR',
        p.web_calendar_enabled ? 1 : 0, p.public_token || null, p.allowed_origins_json || '[]',
        p.show_prices ? 1 : 0, p.max_range_days || 365, p.last_published_at || null,
        p.location || '', p.logo || '', p.phone || '', p.email || ''
      ]
    );
  }
  async deleteProperty(id: string) { await this.executeWithParams("DELETE FROM properties WHERE id=?", [id]); }

  async getAllApartments() {
    const res = await this.query("SELECT * FROM apartments");

    const normalizePublicBasePrice = (v: any): number | null => {
      if (v === undefined || v === null) return null;
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) return null;
      // Public contract: when not available, use null (never 0)
      if (n <= 0) return null;
      return n;
    };

    return res.map(a => ({
      ...a,
      is_active: a.is_active !== 0,
      publicBasePrice: normalizePublicBasePrice(a.public_base_price),
      currency: a.currency || 'EUR'
    }));
  }
  async getApartments(pid: string) {
    let res = [];
    try {
      // Priority: Pricing Studio defaults (base_price) > Legacy (public_base_price)
      res = await this.query(`
        SELECT a.*, d.base_price as studio_base_price
        FROM apartments a
        LEFT JOIN apartment_pricing_defaults d ON d.apartment_id = a.id
        WHERE a.property_id = ?
      `, [pid]);
    } catch (e) {
      // Pricing store unavailable/corrupt: keep payload stable.
      // IMPORTANT: For public payloads, we prefer returning null instead of a potentially stale/incorrect number.
      logger.warn("[DB] getApartments pricing defaults join failed; returning apartments with publicBasePrice=null", e);
      res = await this.query("SELECT * FROM apartments WHERE property_id=?", [pid]);
    }

    const normalizePublicBasePrice = (v: any): number | null => {
      if (v === undefined || v === null) return null;
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) return null;
      // Public contract: when not available, use null (never 0)
      if (n <= 0) return null;
      return n;
    };

    return res.map(a => {
      const joinFailed = a.studio_base_price === undefined;
      const publicBasePrice = joinFailed
        ? null
        : normalizePublicBasePrice(
          (a.studio_base_price !== null && a.studio_base_price !== undefined)
            ? a.studio_base_price
            : a.public_base_price
        );

      return ({
      ...a,
      is_active: a.is_active !== 0,
      publicBasePrice,
      currency: a.currency || 'EUR'
      });
    });
  }
  async saveApartment(a: Apartment) {
    await this.executeWithParams(
      `INSERT OR REPLACE INTO apartments (
        id, property_id, name, color, created_at, is_active, 
        ical_export_token, ical_last_publish, ical_event_count,
        public_base_price, currency
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        a.id, a.property_id, a.name || 'Unidad', a.color || '#4F46E5',
        a.created_at || Date.now(), a.is_active !== false ? 1 : 0,
        a.ical_export_token || null, a.ical_last_publish || null, a.ical_event_count || null,
        a.publicBasePrice ?? null, a.currency || 'EUR'
      ]
    );
  }
  async deleteApartment(id: string) {
    await this.executeWithParams("DELETE FROM apartments WHERE id=?", [id]);
  }

  // --- PRICING STUDIO METHODS ---

  async getPricingDefaults(apartmentId: string): Promise<PricingDefaults | null> {
    const res = await this.query("SELECT * FROM apartment_pricing_defaults WHERE apartment_id = ?", [apartmentId]);
    if (res.length === 0) return null;
    const row = res[0];
    return {
      apartmentId: row.apartment_id,
      currency: row.currency,
      basePrice: row.base_price,
      defaultMinNights: row.default_min_nights,
      shortStayMode: row.short_stay_mode,
      surchargeType: row.surcharge_type,
      surchargeValue: row.surcharge_value
    };
  }

  async savePricingDefaults(apartmentId: string, defaults: PricingDefaults): Promise<void> {
    await this.executeWithParams(
      `INSERT OR REPLACE INTO apartment_pricing_defaults (
        apartment_id, currency, base_price, default_min_nights, 
        short_stay_mode, surcharge_type, surcharge_value
      ) VALUES (?,?,?,?,?,?,?)`,
      [
        apartmentId, defaults.currency || 'EUR', defaults.basePrice,
        defaults.defaultMinNights || 1, defaults.shortStayMode || 'ALLOWED',
        defaults.surchargeType || 'PERCENT', defaults.surchargeValue || 0
      ]
    );
  }

  async getNightlyRates(apartmentId: string, from: string, to: string): Promise<NightlyRateOverride[]> {
    const res = await this.query(
      "SELECT * FROM apartment_nightly_rates WHERE apartment_id = ? AND date >= ? AND date < ?",
      [apartmentId, from, to]
    );
    return res.map(row => ({
      apartmentId: row.apartment_id,
      date: row.date,
      price: row.price,
      minNights: row.min_nights,
      shortStayMode: row.short_stay_mode,
      surchargeType: row.surcharge_type,
      surchargeValue: row.surcharge_value
    }));
  }

  async upsertNightlyRatesBulk(apartmentId: string, rates: Partial<NightlyRateOverride>[]): Promise<void> {
    await this.execute("BEGIN TRANSACTION;");
    try {
      for (const r of rates) {
        if (!r.date) continue;
        await this.executeWithParams(
          `INSERT INTO apartment_nightly_rates (
            apartment_id, date, price, min_nights, short_stay_mode, surcharge_type, surcharge_value
          ) VALUES (?,?,?,?,?,?,?)
          ON CONFLICT(apartment_id, date) DO UPDATE SET
            price = COALESCE(excluded.price, price),
            min_nights = COALESCE(excluded.min_nights, min_nights),
            short_stay_mode = COALESCE(excluded.short_stay_mode, short_stay_mode),
            surcharge_type = COALESCE(excluded.surcharge_type, surcharge_type),
            surcharge_value = COALESCE(excluded.surcharge_value, surcharge_value)`,
          [
            apartmentId, r.date, r.price ?? null, r.minNights ?? null,
            r.shortStayMode ?? null, r.surchargeType ?? null, r.surchargeValue ?? null
          ]
        );
      }
      await this.execute("COMMIT;");
    } catch (e) {
      await this.execute("ROLLBACK;");
      throw e;
    }
  }

  async deleteNightlyRatesRange(apartmentId: string, from: string, to: string): Promise<void> {
    await this.executeWithParams(
      "DELETE FROM apartment_nightly_rates WHERE apartment_id = ? AND date >= ? AND date < ?",
      [apartmentId, from, to]
    );
  }
  async loadPropertySnapshot(propertyId: string): Promise<PropertySnapshot> {
    const [propRes] = await this.query("SELECT * FROM properties WHERE id = ?", [propertyId]);
    if (!propRes) throw new Error("Property not found");

    // Convert property booleans
    const property: Property = {
      ...propRes,
      is_active: propRes.is_active !== 0,
      web_calendar_enabled: propRes.web_calendar_enabled === 1,
      show_prices: propRes.show_prices === 1,
    };

    const apartments = await this.getApartments(propertyId);

    // Settings (global)
    const settingsRows = await this.query("SELECT * FROM user_settings WHERE id = 'default'");
    const settings = settingsRows[0] || {};

    // Policies
    const policies = await this.query("SELECT * FROM booking_policies WHERE (scope_type = 'PROPERTY' AND scope_id = ?) OR (scope_type = 'GLOBAL')", [propertyId]);

    // AI Facts
    const aiFacts = await this.query("SELECT * FROM ai_facts WHERE property_id = ?", [propertyId]);

    // Media
    let media = [];
    try {
      media = await this.query("SELECT * FROM media_assets");
    } catch (e: any) {
      const msg = e?.message?.toLowerCase() || '';
      if (msg.includes("no such table: media_assets")) {
        logger.warn("[DB] Fallback: media_assets table not found, returning empty array");
      } else {
        throw e;
      }
    }

    return {
      property,
      apartments,
      media,
      settings,
      policies,
      aiFacts
    };
  }

  // --- EMAIL INGEST ---
  async saveEmailIngest(email: EmailIngest): Promise<void> {
    await this.ensureEmailIngestTables();
    await this.executeWithParams(
      `INSERT OR REPLACE INTO email_ingest (
        id, provider, message_id, gmail_message_id, received_at, from_addr, subject, body_text, body_html,
        raw_links_json, parsed_json, status, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email.id, email.provider, (email as any).message_id, email.gmail_message_id || null, email.received_at, email.from_addr, email.subject,
        email.body_text, email.body_html || null, JSON.stringify(email.raw_links_json),
        JSON.stringify(email.parsed_json), email.status, email.error_message || null, email.created_at
      ]
    );
  }

  async getEmailIngestById(id: string): Promise<EmailIngest | null> {
    const res = await this.query("SELECT * FROM email_ingest WHERE id=?", [id]);
    if (!res.length) return null;
    const e = res[0];
    return {
      ...e,
      raw_links_json: JSON.parse(e.raw_links_json || '[]'),
      parsed_json: JSON.parse(e.parsed_json || '{}')
    };
  }

  async getPendingEmailIngests(): Promise<EmailIngest[]> {
    const res = await this.query("SELECT * FROM email_ingest WHERE status IN ('NEW', 'PARSED', 'NEEDS_MANUAL') ORDER BY created_at DESC");
    return res.map(e => ({
      ...e,
      raw_links_json: JSON.parse(e.raw_links_json || '[]'),
      parsed_json: JSON.parse(e.parsed_json || '{}')
    }));
  }

  // --- PROVISIONAL BOOKINGS ---

  async getProvisionalBookings(): Promise<ProvisionalBooking[]> {
    try {
      // Logic based approach as requested: fetch bookings and filter in memory
      const allBookings = await this.query(`SELECT * FROM bookings ORDER BY created_at DESC`);

      const provisionals = allBookings.filter(b => isProvisionalBlock(b) || isProvisionalBooking(b));

      return provisionals.map((b: any) => {
        if (b.policy_snapshot) {
          try {
            const pb = JSON.parse(b.policy_snapshot);
            return {
              ...pb,
              // Ensure we use the most up-to-date core fields from the main record
              status: b.status === 'confirmed' ? 'CONFIRMED' : (b.status === 'cancelled' ? 'CANCELLED' : pb.status),
              start_date: b.check_in,
              end_date: b.check_out,
              total_price: b.total_price,
              guest_name: b.guest_name,
              connection_id: b.connection_id,
              ical_uid: b.ical_uid,
              raw_summary: b.raw_summary,
              raw_description: b.raw_description,
              apartment_id: b.apartment_id
            };
          } catch (e) {
            console.warn("Error parsing policy_snapshot as ProvisionalBooking", e);
          }
        }
        // Fallback mapping if no snapshot
        return {
          id: b.id,
          provider: b.source?.includes('Airbnb') ? 'AIRBNB' : (b.source?.includes('Booking') ? 'BOOKING' : 'OTHER'),
          status: b.status === 'confirmed' ? 'CONFIRMED' : 'PENDING_DETAILS',
          source: 'EMAIL_TRIGGER',
          created_at: b.created_at,
          updated_at: b.created_at,
          start_date: b.check_in,
          end_date: b.check_out,
          guest_name: b.guest_name || 'Guest',
          pax_adults: b.guests || 1,
          total_price: b.total_price || 0,
          currency: 'EUR',
          connection_id: b.connection_id,
          ical_uid: b.ical_uid,
          raw_summary: b.raw_summary,
          raw_description: b.raw_description,
          apartment_id: b.apartment_id
        } as ProvisionalBooking;
      });
    } catch (e) {
      console.warn("Error deriving provisional bookings from bookings table", e);
      return [];
    }
  }

  async saveProvisionalBooking(pb: ProvisionalBooking): Promise<void> {
    // Map ProvisionalBooking to Booking
    const statusMap: Record<string, 'pending' | 'confirmed' | 'cancelled'> = {
      'CONFIRMED': 'confirmed',
      'PENDING_DETAILS': 'pending',
      'INQUIRY': 'pending',
      'HOLD': 'pending',
      'PENDING_CONFIRMATION': 'pending',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'cancelled'
    };

    const booking: Booking = {
      id: pb.id,
      provisional_id: pb.id,
      property_id: 'prop_default', // Default, usually enriched later
      apartment_id: pb.apartment_id || pb.apartment_hint || 'apt_unknown',
      traveler_id: 'placeholder',
      check_in: pb.start_date || '',
      check_out: pb.end_date || '',
      status: statusMap[pb.status] || 'pending',
      total_price: pb.total_price || 0,
      guests: pb.pax_adults || 1,
      source: pb.source === 'ICAL' ? 'ICAL' : (pb.provider === 'DIRECT_WEB' ? 'DIRECT_WEB' : `EMAIL_TRIGGER (${pb.provider})`),
      external_ref: pb.provider_reservation_id,
      created_at: pb.created_at || Date.now(),
      guest_name: pb.guest_name,
      enrichment_status: pb.status === 'PENDING_DETAILS' ? 'PENDING' : 'COMPLETE',
      event_origin: pb.source === 'ICAL' ? 'ical' : 'other',
      event_state: pb.status === 'CONFIRMED' ? 'confirmed' : 'provisional',
      policy_snapshot: JSON.stringify(pb)
    };

    await this.saveBooking(booking);
  }

  async deleteProvisionalBooking(id: string): Promise<void> {
    await this.deleteBooking(id);
  }

  private async ensureEmailIngestTables() {
    try {
      // Email Ingest Table
      await this.execute(`
        CREATE TABLE IF NOT EXISTS email_ingest (
          id TEXT PRIMARY KEY,
          provider TEXT,
          message_id TEXT,
          gmail_message_id TEXT,
          received_at TEXT,
          from_addr TEXT,
          subject TEXT,
          body_text TEXT,
          body_html TEXT,
          raw_links_json TEXT,
          parsed_json TEXT,
          status TEXT,
          error_message TEXT,
          created_at INTEGER
        )
      `);
      try { await this.execute("ALTER TABLE email_ingest ADD COLUMN gmail_message_id TEXT"); } catch (e) { }
      await this.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_email_ingest_gmail ON email_ingest(gmail_message_id)");
      await this.execute("CREATE INDEX IF NOT EXISTS idx_email_ingest_provider ON email_ingest(provider)");

      // Media Assets Table
      await this.execute(`
          CREATE TABLE IF NOT EXISTS media_assets (
            id TEXT PRIMARY KEY,
            site_id TEXT,
            filename TEXT,
            mime_type TEXT,
            size INTEGER,
            data_base64 TEXT,
            width INTEGER,
            height INTEGER,
            created_at INTEGER
          )
        `);

      try {
        await this.execute("ALTER TABLE user_settings ADD COLUMN personal_email TEXT");
      } catch (e) { /* ignore if exists */ }
      try {
        await this.execute("ALTER TABLE user_settings ADD COLUMN technical_reservations_email TEXT");
      } catch (e) { /* ignore if exists */ }
      try {
        await this.execute("ALTER TABLE user_settings ADD COLUMN allow_manual_completion INTEGER DEFAULT 1");
      } catch (e) { /* ignore if exists */ }
      try {
        await this.execute("ALTER TABLE user_settings ADD COLUMN require_details_to_close INTEGER DEFAULT 0");
      } catch (e) { /* ignore if exists */ }
      try {
        await this.execute("ALTER TABLE user_settings ADD COLUMN hold_minutes INTEGER DEFAULT 15");
      } catch (e) { /* ignore if exists */ }
      try {
        await this.execute("ALTER TABLE bookings ADD COLUMN policy_snapshot TEXT");
      } catch (e) { /* ignore if exists */ }
      try {
        await this.execute("ALTER TABLE bookings ADD COLUMN deposit_paid_at INTEGER");
      } catch (e) { /* ignore if exists */ }
      try {
        await this.execute("ALTER TABLE bookings ADD COLUMN remaining_paid_at INTEGER");
      } catch (e) { /* ignore if exists */ }
      try {
        await this.execute("ALTER TABLE bookings ADD COLUMN payment_status TEXT");
      } catch (e) { /* ignore if exists */ }
      try {
        await this.execute("ALTER TABLE bookings ADD COLUMN payment_notes TEXT");
      } catch (e) { /* ignore if exists */ }

      // Website Publish Columns
      try { await this.execute("ALTER TABLE websites ADD COLUMN last_exported_at INTEGER"); } catch (e) { }
      try { await this.execute("ALTER TABLE websites ADD COLUMN last_export_hash TEXT"); } catch (e) { }
      try { await this.execute("ALTER TABLE websites ADD COLUMN publish_notes TEXT"); } catch (e) { }
    } catch (e) {
      console.error("Error ensuring email ingest tables:", e);
    }
  }



  // --- CLEANING MODULE ---

  async getCleaningTasks(startDate: string, endDate: string, apartmentId?: string): Promise<CleaningTask[]> {
    let sql = "SELECT * FROM cleaning_tasks WHERE due_date >= ? AND due_date <= ?";
    const params: any[] = [startDate, endDate];

    if (apartmentId) {
      sql += " AND apartment_id = ?";
      params.push(apartmentId);
    }

    sql += " ORDER BY due_date ASC, status ASC"; // Pending first? Or chronological.

    const rows = await this.query(sql, params);
    return rows.map(r => ({
      ...r,
      // Boolean mapping if any?
    }));
  }

  async getCleaningTaskById(id: string): Promise<CleaningTask | null> {
    const rows = await this.query("SELECT * FROM cleaning_tasks WHERE id = ?", [id]);
    return rows[0] || null;
  }

  async saveCleaningTask(t: CleaningTask): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO cleaning_tasks (id, apartment_id, booking_id, due_date, status, assigned_to, notes, checklist_state_json, completed_at, signature_name, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        t.id, t.apartment_id, t.booking_id || null, t.due_date, t.status,
        t.assigned_to || null, t.notes || null, t.checklist_state_json || null,
        t.completed_at || null, t.signature_name || null,
        t.created_at, t.updated_at
      ]
    );
  }

  async getCleaningTemplates(propertyId: string): Promise<CleaningTemplate[]> {
    return await this.query("SELECT * FROM cleaning_templates WHERE property_id = ?", [propertyId]);
  }

  async saveCleaningTemplate(t: CleaningTemplate): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO cleaning_templates (id, property_id, title, items_json, created_at) VALUES (?,?,?,?,?)",
      [t.id, t.property_id, t.title, t.items_json, t.created_at]
    );
  }

  // --- WEB BOOKING HOLDS ---

  async createWebHold(draft: any, holdMinutes: number = 15): Promise<ProvisionalBooking> {
    const expiresAt = Date.now() + (holdMinutes * 60 * 1000);
    const hold: ProvisionalBooking = {
      id: crypto.randomUUID(),
      provider: 'DIRECT_WEB', // Using 'DIRECT_WEB' literal, need to update EmailProvider type if strict? 
      // Actually I updated ProvisionalBooking provider type to allow 'DIRECT_WEB'
      status: 'HOLD',
      source: 'WEB_CHECKOUT',
      created_at: Date.now(),
      updated_at: Date.now(),
      expires_at: expiresAt,

      start_date: draft.check_in,
      end_date: draft.check_out,
      guest_name: draft.guest_name || 'Web Guest',
      pax_adults: draft.pax_adults || 2,
      total_price: draft.total_price || 0,
      currency: draft.currency || 'EUR',

      apartment_hint: draft.apartment_name, // Optional context

      // Persist logic handled by saveProvisionalBooking usually, 
      // but we might want bespoke save to ensure it doesn't conflict?
      // saveProvisionalBooking is generic. Let's use it.
    } as any; // Cast for now as 'DIRECT_WEB' might conflict if we didn't fully update types globally yet (e.g. EmailProvider)
    // Actually I updated ProvisionalBooking interface.

    // We need to save it. 
    // BUT saveProvisionalBooking uses 'provider' logic. 
    // Let's rely on generic insert/update if possible or reuse saveProvisionalBooking logic.
    await this.saveProvisionalBooking(hold);
    return hold;
  }

  async expireHolds(): Promise<number> {
    const now = Date.now();
    // Only expire HOLD status
    const result = await this.executeWithParams(
      `UPDATE bookings SET status = 'cancelled' WHERE provisional_id IS NOT NULL AND status = 'pending' AND JSON_EXTRACT(policy_snapshot, '$.expires_at') < ?`,
      [now]
    );
    // Return rows affected if possible? sqlite execute returns result usually.
    // If not, we assume it worked.
    return 0;
  }

  async confirmWebBooking(holdId: string, instructions?: string): Promise<void> {
    const status = instructions ? 'PENDING_CONFIRMATION' : 'CONFIRMED';
    await this.executeWithParams(
      `UPDATE bookings SET status = ? WHERE provisional_id = ?`,
      ['pending', holdId]
    );
    // Ideally we'd update policy_snapshot too, but for confirmation the main status is enough.
    // If more complex metadata needs to be updated, we should fetch, modify, and save.
  }

  async finalizeWebBooking(holdId: string): Promise<Booking> {
    // 1. Get Hold
    const results = await this.getProvisionalBookings();
    const hold = results.find(p => p.id === holdId);
    if (!hold) throw new Error("La reserva provisional no existe o ha expirado.");

    // 2. Resolve Apartment
    // Assuming apartment_hint holds the apartment ID in this context for DIRECT_WEB?
    // Or we need to resolve it. If it's a direct web hold, usually we set apartment_hint to the apt name or ID.
    // Let's assume we can match it by name or ID.
    const apartments = await this.query("SELECT * FROM apartments");
    const apartment = apartments.find((a: any) => a.id === hold.apartment_hint || a.name === hold.apartment_hint);

    if (!apartment) throw new Error(`Apartamento no válido: ${hold.apartment_hint}`);

    // 3. Conflict Check
    const bookings = await this.getBookings();
    const isConflict = bookings.some(b =>
      b.apartment_id === apartment.id &&
      b.status !== 'cancelled' &&
      ((b.check_in < hold.end_date! && b.check_out > hold.start_date!))
    );

    if (isConflict) {
      await this.cancelProvisionalBooking(holdId, "Conflict during confirmation", { error: "Double booking prevented" });
      throw new Error("Fechas ya no disponibles. Por favor reinicie la reserva.");
    }

    // 4. Policy Snapshot
    const policy = await this.resolveBookingPolicy(apartment.id);
    const draft = {
      check_in: hold.start_date!,
      check_out: hold.end_date!,
      total_price: hold.total_price || 0,
      guest_name: hold.guest_name,
      pax_adults: hold.pax_adults,
      currency: hold.currency
    };
    const breakdown = checkoutService.computeCheckout(draft, policy);

    const policySnapshot = JSON.stringify({
      policy_id: policy.id,
      mode: policy.payment_mode,
      breakdown: breakdown,
      captured_at: Date.now()
    });

    // 5. Payment Status Logic
    let paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 'PENDING';
    if (policy.payment_mode === 'PAY_ON_ARRIVAL') {
      paymentStatus = 'PENDING';
    } else if (policy.payment_mode === 'DEPOSIT_ONLY') {
      // If we are confirming, we assume the deposit is handled or we mark as pending?
      // User said: "Si payment_mode = DEPOSIT_ONLY: marcar depósito como DUE"
      // So we start as PENDING mostly.
      paymentStatus = 'PENDING';
    }
    // If FULL_PREPAY, also PENDING until we mark as paid? Or if Stripe, maybe PAID?
    // User said "sin integraciones externas de pago por ahora". So always PENDING.

    // 6. Create Booking
    const newBooking: Booking = {
      id: crypto.randomUUID(),
      property_id: apartment.property_id,
      apartment_id: apartment.id,
      traveler_id: hold.id, // Use hold ID as temp traveler ID or create one?
      // Let's create a new ID for the booking.
      // Store logic might expect a real traveler_id from travelers table?
      // For now, let's use a placeholder string or create a traveler record.

      check_in: hold.start_date!,
      check_out: hold.end_date!,
      status: 'confirmed',
      total_price: hold.total_price || 0,
      guests: hold.pax_adults || 1,
      source: 'DIRECT_WEB',
      created_at: Date.now(),
      guest_name: hold.guest_name,
      provisional_id: hold.id,
      enrichment_status: 'COMPLETE',
      policy_snapshot: policySnapshot,
      payment_status: paymentStatus,
      payment_notes: "Reserva Web Confirmada (Directa)"
    };

    await this.saveBooking(newBooking);

    // 7. Delete Provisional
    await this.deleteProvisionalBooking(holdId);

    console.log(`[DIRECT_WEB] Booking Confirmed: ${newBooking.id} for ${apartment.name}`);

    return newBooking;
  }

  async cancelProvisionalBooking(id: string, reason: string, outcome: any): Promise<void> {
    await this.executeWithParams(
      `UPDATE bookings SET status = 'cancelled' WHERE id = ? OR provisional_id = ?`,
      [id, id]
    );
  }

  // --- BOOKING POLICIES RESOLUTION ---

  async saveBookingPolicy(policy: BookingPolicy): Promise<void> {
    await this.executeWithParams(
      `INSERT OR REPLACE INTO booking_policies (
        id, scope_type, scope_id, currency, payment_mode, deposit_type,
        deposit_value, deposit_due, remaining_due, accepted_methods,
        require_security_deposit, security_deposit_amount, security_deposit_method,
        cancellation_policy_type, cancellation_rules, no_show_policy,
        created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        policy.id, policy.scope_type, policy.scope_id, policy.currency,
        policy.payment_mode, policy.deposit_type, policy.deposit_value,
        policy.deposit_due, policy.remaining_due,
        JSON.stringify(policy.accepted_methods),
        policy.require_security_deposit ? 1 : 0,
        policy.security_deposit_amount || 0,
        policy.security_deposit_method,
        policy.cancellation_policy_type,
        JSON.stringify(policy.cancellation_rules || []),
        JSON.stringify(policy.no_show_policy || {}),
        policy.created_at, policy.updated_at
      ]
    );
  }

  async getBookingPolicy(scopeType: PolicyScope, scopeId: string): Promise<BookingPolicy | null> {
    const res = await this.query(
      "SELECT * FROM booking_policies WHERE scope_type = ? AND scope_id = ?",
      [scopeType, scopeId]
    );
    if (!res.length) return null;
    const row = res[0];
    return {
      ...row,
      accepted_methods: JSON.parse(row.accepted_methods || '[]'),
      cancellation_rules: JSON.parse(row.cancellation_rules || '[]'),
      no_show_policy: JSON.parse(row.no_show_policy || '{}'),
      require_security_deposit: row.require_security_deposit === 1
    } as BookingPolicy;
  }

  async resolveBookingPolicy(apartmentId?: string): Promise<BookingPolicy> {
    // 1. Try Apartment specific
    if (apartmentId) {
      const aptPolicy = await this.getBookingPolicy('APARTMENT', apartmentId);
      if (aptPolicy) return aptPolicy;
    }

    // 2. Try Property specific (using active property or inferring from apartment)
    // For now, let's assume we want the default property policy if no specific apartment is gathered
    // Or we should look up the property_id for the apartment.
    let propertyId = 'prop_default';
    if (apartmentId) {
      const apt = (await this.query("SELECT property_id FROM apartments WHERE id = ?", [apartmentId]))[0];
      if (apt) propertyId = apt.property_id;
    }

    const propPolicy = await this.getBookingPolicy('PROPERTY', propertyId);
    if (propPolicy) return propPolicy;

    // 3. Fallback to Default
    return DEFAULT_POLICY;
  }



  // --- MAINTENANCE MODULE ---

  async getMaintenanceIssues(status?: string, apartmentId?: string): Promise<MaintenanceIssue[]> {
    let sql = "SELECT * FROM maintenance_issues WHERE 1=1";
    const params: any[] = [];

    if (status) {
      if (status === 'OPEN_PENDING') {
        sql += " AND status != 'RESOLVED'";
      } else {
        sql += " AND status = ?";
        params.push(status);
      }
    }

    if (apartmentId) {
      sql += " AND apartment_id = ?";
      params.push(apartmentId);
    }

    sql += " ORDER BY created_at DESC";
    return await this.query(sql, params);
  }

  async getMaintenanceIssueById(id: string): Promise<MaintenanceIssue | null> {
    const res = await this.query("SELECT * FROM maintenance_issues WHERE id = ?", [id]);
    return res.length > 0 ? res[0] : null;
  }

  async saveMaintenanceIssue(issue: MaintenanceIssue): Promise<void> {
    const exists = await this.getMaintenanceIssueById(issue.id);
    if (exists) {
      await this.executeWithParams(
        `UPDATE maintenance_issues SET 
           title=?, description=?, priority=?, status=?, 
           assigned_to=?, resolved_at=?, resolution_notes=?, signature_name=?, photos_json=? 
         WHERE id=?`,
        [
          issue.title, issue.description, issue.priority, issue.status,
          issue.assigned_to, issue.resolved_at, issue.resolution_notes, issue.signature_name, issue.photos_json,
          issue.id
        ]
      );
    } else {
      await this.executeWithParams(
        `INSERT INTO maintenance_issues (
           id, apartment_id, title, description, priority, status, 
           created_at, created_by, assigned_to, resolved_at, resolution_notes, signature_name, photos_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          issue.id, issue.apartment_id, issue.title, issue.description, issue.priority, issue.status,
          issue.created_at, issue.created_by, issue.assigned_to, issue.resolved_at, issue.resolution_notes, issue.signature_name, issue.photos_json
        ]
      );
    }
  }

  async getMaintenancePhotos(issueId: string): Promise<MaintenancePhoto[]> {
    return await this.query("SELECT * FROM maintenance_photos WHERE issue_id = ?", [issueId]);
  }

  async saveMaintenancePhoto(photo: MaintenancePhoto): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO maintenance_photos (id, issue_id, media_id, created_at) VALUES (?, ?, ?, ?)",
      [photo.id, photo.issue_id, photo.media_id, photo.created_at]
    );
  }

  async getMarketingEmailTemplates(): Promise<MarketingEmailTemplate[]> {
    return await this.query("SELECT * FROM marketing_email_templates ORDER BY created_at DESC");
  }

  async getMarketingEmailTemplateById(id: string): Promise<MarketingEmailTemplate | null> {
    const rows = await this.query("SELECT * FROM marketing_email_templates WHERE id = ?", [id]);
    return rows[0] || null;
  }

  async saveMarketingEmailTemplate(t: MarketingEmailTemplate): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO marketing_email_templates (id, name, template_spec_json, created_at, updated_at) VALUES (?,?,?,?,?)",
      [t.id, t.name, t.template_spec_json, t.created_at, t.updated_at]
    );
    notifyDataChanged('marketing_templates');
  }

  async deleteMarketingEmailTemplate(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM marketing_email_templates WHERE id = ?", [id]);
    notifyDataChanged('marketing_templates');
  }

  async duplicateMarketingEmailTemplate(id: string): Promise<void> {
    const original = await this.getMarketingEmailTemplateById(id);
    if (!original) return;
    const copy: MarketingEmailTemplate = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (Copia)`,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    await this.saveMarketingEmailTemplate(copy);
  }

  async seedMarketingEmailTemplates() {
    try {
      logger.log("[SEED] Checking for existing templates...");
      const existing = await this.getMarketingEmailTemplates();
      if (existing.length > 0) {
        logger.log(`[SEED] Found ${existing.length} templates. Skipping seeds.`);
        return;
      }

      logger.log("[SEED] No templates found. Seeding 4 base templates...");
      const baseTemplates = [
        {
          name: "Cumpleaños - Familiar",
          spec: {
            header: { business_name: "RentikPro" },
            hero: { title: "¡Feliz Cumpleaños!", subtitle: "Queremos celebrar este día especial contigo." },
            body: { text: "Hola {{nombre}},\n\nTodo el equipo de RentikPro te desea un muy feliz cumpleaños. Esperamos que pases un día fantástico rodeado de tus seres queridos." },
            offer: { badge_text: "REGALO", detail_text: "Usa el código BDAY10 para un 10% de descuento en tu próxima estancia.", enabled: true },
            cta: { button_text: "Reservar con Regalo", url: "https://rentik.pro", enabled: true },
            footer: { phone: "+34 600 000 000", social_links: ["Instagram", "Facebook"], unsubscription_notice: true }
          }
        },
        {
          name: "Escapada Romántica",
          spec: {
            header: { business_name: "RentikPro" },
            hero: { title: "Momentos para Dos", subtitle: "Sorprende a esa persona especial con una escapada inolvidable." },
            body: { text: "Descubre nuestros apartamentos más románticos, diseñados para crear recuerdos que durarán siempre. Desde cenas a la luz de las velas hasta paseos al atardecer." },
            offer: { badge_text: "PACK ROMANCE", detail_text: "Incluye botella de cava y bombones de bienvenida.", enabled: true },
            cta: { button_text: "Ver Pack Romántico", url: "https://rentik.pro/romance", enabled: true },
            footer: { phone: "+34 600 000 000", social_links: ["Instagram"], unsubscription_notice: true }
          }
        },
        {
          name: "Última hora - Descuento",
          spec: {
            header: { business_name: "RentikPro" },
            hero: { title: "¡Oferta Relámpago!", subtitle: "Solo este fin de semana. ¿Te lo vas a perder?" },
            body: { text: "A veces los mejores planes son los que no se planean. Aprovecha nuestras tarifas de última hora y escápate hoy mismo." },
            offer: { badge_text: "20% OFF", detail_text: "Descuento directo aplicado en las fechas seleccionadas.", enabled: true },
            cta: { button_text: "¡Aprovechar Oferta!", url: "https://rentik.pro/last-minute", enabled: true },
            footer: { phone: "+34 600 000 000", social_links: [], unsubscription_notice: true }
          }
        },
        {
          name: "Repetidores - Gracias",
          spec: {
            header: { business_name: "RentikPro" },
            hero: { title: "Gracias por volver", subtitle: "Es un placer tenerte de nuevo con nosotros." },
            body: { text: "Hola {{nombre}},\n\nSabemos que tienes muchas opciones, por eso valoramos enormemente que vuelvas a confiar en RentikPro para tu estancia. ¡Bienvenido a casa de nuevo!" },
            offer: { badge_text: "CLIENTE VIP", detail_text: "Como cliente recurrente, tienes un late check-out gratuito en esta estancia.", enabled: true },
            cta: { button_text: "Gestionar Reserva", url: "https://rentik.pro/my-booking", enabled: true },
            footer: { phone: "+34 600 000 000", social_links: ["Instagram", "Twitter"], unsubscription_notice: true }
          }
        }
      ];

      for (const bt of baseTemplates) {
        const t: MarketingEmailTemplate = {
          id: crypto.randomUUID(),
          name: bt.name,
          template_spec_json: JSON.stringify(bt.spec),
          created_at: Date.now(),
          updated_at: Date.now()
        };
        await this.saveMarketingEmailTemplate(t);
        logger.log(`[SEED] Template seeded: ${bt.name}`);
      }
      logger.log("[SEED] All base templates seeded successfully.");
    } catch (err) {
      logger.error("[SEED] Error during seeding:", err);
    }
  }

  async saveMarketingEmailLog(log: MarketingEmailLog): Promise<void> {
    const projectId = localStorage.getItem('active_project_id');
    await this.executeWithParams(
      "INSERT INTO marketing_email_logs (id, campaign_id, to_email, status, error_message, created_at, project_id) VALUES (?,?,?,?,?,?,?)",
      [log.id, log.campaign_id, log.to_email, log.status, log.error_message || null, log.created_at, projectId]
    );
  }

  async getMarketingEmailLogs(campaignId: string): Promise<MarketingEmailLog[]> {
    const projectId = localStorage.getItem('active_project_id');
    await this.ensureInitialized();
    if (!this.db) return [];
    const rows = await this.query(
      `SELECT * FROM marketing_email_logs WHERE campaign_id = ? AND project_id = ? ORDER BY created_at DESC`,
      [campaignId, projectId]
    );
    return rows.map((r: any) => ({
      id: r.id,
      campaign_id: r.campaign_id,
      to_email: r.to_email,
      status: r.status,
      error_message: r.error_message,
      created_at: r.created_at
    }));
  }
  async getCampaigns(): Promise<MarketingCampaign[]> {
    const projectId = localStorage.getItem('active_project_id');
    const rows = await this.query("SELECT * FROM marketing_campaigns WHERE project_id = ?", [projectId]);
    return rows.map((r: any) => ({
      ...r,
      enabled: r.enabled === 1
    }));
  }

  async saveCampaign(c: MarketingCampaign): Promise<void> {
    const projectId = localStorage.getItem('active_project_id');

    // Hardening: Dynamic SQL based on detected schema (F3 hardening)
    if (this.schemaFlags.marketing_email_template_id) {
      await this.executeWithParams(
        "INSERT OR REPLACE INTO marketing_campaigns (id, type, name, automation_level, template_id, email_template_id, enabled, config_json, created_at, project_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [c.id, c.type, c.name, c.automation_level, c.template_id || null, c.email_template_id || null, c.enabled ? 1 : 0, c.config_json || null, c.created_at, projectId]
      );
    } else {
      await this.executeWithParams(
        "INSERT OR REPLACE INTO marketing_campaigns (id, type, name, automation_level, template_id, enabled, config_json, created_at, project_id) VALUES (?,?,?,?,?,?,?,?,?)",
        [c.id, c.type, c.name, c.automation_level, c.template_id || null, c.enabled ? 1 : 0, c.config_json || null, c.created_at, projectId]
      );
    }
  }

  async getTravelersMarketingData(): Promise<any[]> {
    const projectId = localStorage.getItem('active_project_id');
    const [travelers, allBookings] = await Promise.all([
      this.query("SELECT * FROM travelers WHERE project_id = ? OR project_id IS NULL", [projectId]),
      this.query("SELECT * FROM bookings WHERE project_id = ? AND status IN ('confirmed', 'completed')", [projectId])
    ]);

    // Group bookings by traveler_id for quick access
    const bookingsByTravelerId = new Map<string, any[]>();
    allBookings.forEach((b: any) => {
      if (!bookingsByTravelerId.has(b.traveler_id)) {
        bookingsByTravelerId.set(b.traveler_id, []);
      }
      bookingsByTravelerId.get(b.traveler_id)?.push(b);
    });

    // Group bookings by Signature (identity)
    const signatureToBookings = new Map<string, any[]>();
    travelers.forEach((t: any) => {
      const sig = guestService.getGuestSignature(t);
      if (sig === 'unknown') return;

      const travelerBookings = bookingsByTravelerId.get(t.id) || [];
      if (!signatureToBookings.has(sig)) {
        signatureToBookings.set(sig, []);
      }
      signatureToBookings.get(sig)?.push(...travelerBookings);
    });

    // Enrich travelers using their signature stats
    const enriched = travelers.map((t: any) => {
      const sig = guestService.getGuestSignature(t);
      const signatureBookings = sig !== 'unknown' ? signatureToBookings.get(sig) || [] : (bookingsByTravelerId.get(t.id) || []);

      // Remove duplicate bookings (if any, although unlikely)
      const uniqueBookings = Array.from(new Map(signatureBookings.map(b => [b.id, b])).values());
      const confirmed = uniqueBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'completed');

      let lastCheckout = null;
      if (confirmed.length > 0) {
        const sorted = confirmed.sort((a: any, b: any) => new Date(b.check_out).getTime() - new Date(a.check_out).getTime());
        lastCheckout = sorted[0].check_out;
      }

      return {
        ...t,
        total_stays: confirmed.length,
        last_checkout: lastCheckout,
        total_spent: confirmed.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0)
      };
    });

    return enriched;
  }

  async generateBaseMovementsFromBookings(): Promise<number> {
    await this.ensureInitialized();
    if (!this.db) return 0;

    // 1. Fetch confirmed bookings with price > 0
    const bookings = await this.query(
      `SELECT * FROM bookings WHERE status = 'confirmed' AND total_price > 0`
    );

    let createdCount = 0;
    const now = Date.now();

    for (const b of bookings) {
      const importHash = `base_booking_${b.id}`;

      // 2. Check for existing movement with this hash (idempotency)
      const existing = await this.query(
        "SELECT id FROM accounting_movements WHERE import_hash = ?",
        [importHash]
      );

      if (existing.length === 0) {
        // 3. Create movement
        const movement: AccountingMovement = {
          id: crypto.randomUUID(),
          date: b.check_in,
          type: 'income',
          category: 'Reserva',
          concept: `Reserva: ${b.guest_name || 'Huésped'}`,
          apartment_id: b.apartment_id,
          reservation_id: b.id,
          traveler_id: b.traveler_id,
          platform: b.source || 'Directo',
          amount_gross: b.total_price,
          commission: 0,
          vat: 0,
          amount_net: b.total_price,
          payment_method: 'Transferencia',
          accounting_bucket: 'A',
          import_hash: importHash,
          created_at: now,
          updated_at: now
        };

        await this.saveMovement(movement);
        createdCount++;
      }
    }

    if (createdCount > 0) {
      notifyDataChanged('accounting');
    }

    return createdCount;
  }
}
