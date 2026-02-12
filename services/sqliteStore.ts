
import {
  IDataStore, Property, Apartment, Traveler, Stay, AccountingMovement,
  Booking, FiscalProfile, DataOnlyBackup, StructureOnlyBackup,
  MarketingTemplate, MarketingLog, MarketingCampaign, Coupon,
  RegistryUnit, RegistryPresentation, WebSite,
  CommunicationAccount, Conversation, Message, MessageAttachment, ConversationStatus,
  AiPersona, AiKnowledgeFact, AiAuditLog, ChannelConnection, CalendarEvent,
  PricingRuleSet, PricingRule, BookingPriceSnapshot,
  CancellationPolicy, RatePlan, PricingModifier, Fee, UserSettings
} from '../types';
import { logger } from './logger';

declare const initSqlJs: any;

export class SQLiteStore implements IDataStore {
  private db: any = null;
  private SQL: any = null;

  private async getSQL() {
    if (this.SQL) return this.SQL;
    this.SQL = await initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });
    return this.SQL;
  }

  async init(customPath?: string): Promise<void> {
    const SQL = await this.getSQL();
    this.db = new SQL.Database();
    this.db.run("PRAGMA foreign_keys = ON;");
    await this.runMigrations();
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

  async runMigrations() {
    await this.execute("CREATE TABLE IF NOT EXISTS properties (id TEXT PRIMARY KEY, name TEXT, description TEXT, created_at INTEGER);");
    await this.execute("CREATE TABLE IF NOT EXISTS apartments (id TEXT PRIMARY KEY, property_id TEXT, name TEXT, color TEXT, created_at INTEGER);");
    await this.execute("CREATE TABLE IF NOT EXISTS travelers (id TEXT PRIMARY KEY, nombre TEXT, apellidos TEXT, tipo_documento TEXT, documento TEXT, fecha_nacimiento TEXT, telefono TEXT, email TEXT, nacionalidad TEXT, created_at INTEGER, updated_at INTEGER);");
    await this.execute("CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, property_id TEXT, apartment_id TEXT, traveler_id TEXT, check_in TEXT, check_out TEXT, status TEXT, total_price REAL, guests INTEGER DEFAULT 1, source TEXT, external_ref TEXT, created_at INTEGER);");
    await this.execute("CREATE TABLE IF NOT EXISTS stays (id TEXT PRIMARY KEY, traveler_id TEXT, apartment_id TEXT, check_in TEXT, check_out TEXT, source TEXT, import_batch_id TEXT, created_at INTEGER);");
    await this.execute("CREATE TABLE IF NOT EXISTS accounting_movements (id TEXT PRIMARY KEY, date TEXT, type TEXT, category TEXT, concept TEXT, apartment_id TEXT, reservation_id TEXT, traveler_id TEXT, platform TEXT, supplier TEXT, amount_gross REAL, commission REAL, vat REAL, amount_net REAL, payment_method TEXT, accounting_bucket TEXT, import_hash TEXT, import_batch_id TEXT, created_at INTEGER, updated_at INTEGER);");

    // Updates for Block 2 (Soft Delete & Features)
    await this.safeMigration("ALTER TABLE properties ADD COLUMN is_active INTEGER DEFAULT 1", "Add is_active to properties");
    await this.safeMigration("ALTER TABLE apartments ADD COLUMN is_active INTEGER DEFAULT 1", "Add is_active to apartments");
    await this.safeMigration("ALTER TABLE accounting_movements ADD COLUMN receipt_blob TEXT", "Add receipt_blob to accounting");

    // Updates for Block 11-A (Multi-property fields)
    await this.safeMigration("ALTER TABLE properties ADD COLUMN timezone TEXT DEFAULT 'Europe/Madrid'", "Add timezone to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN currency TEXT DEFAULT 'EUR'", "Add currency to properties");
    await this.safeMigration("ALTER TABLE properties ADD COLUMN updated_at INTEGER", "Add updated_at to properties");

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
      created_at INTEGER,
      updated_at INTEGER
    );`);

    await this.execute(`CREATE TABLE IF NOT EXISTS marketing_templates (id TEXT PRIMARY KEY, name TEXT, subject TEXT, body TEXT, created_at INTEGER);`);
    await this.execute(`CREATE TABLE IF NOT EXISTS marketing_logs (id TEXT PRIMARY KEY, traveler_id TEXT, event_type TEXT, metadata TEXT, created_at INTEGER);`);
    await this.execute(`CREATE TABLE IF NOT EXISTS marketing_campaigns (id TEXT PRIMARY KEY, type TEXT, name TEXT, automation_level TEXT, template_id TEXT, enabled INTEGER, config_json TEXT, created_at INTEGER);`);
    await this.execute(`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT, discount_type TEXT, discount_value REAL, expiration_date TEXT, status TEXT, created_at INTEGER);`);

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
  }

  private sanitizeParams(params: any[]): any[] {
    return params.map(p => (p === undefined || (typeof p === 'number' && isNaN(p))) ? null : p);
  }

  // --- COMUNICACIONES METHODS ---

  async getAccounts(): Promise<CommunicationAccount[]> {
    const res = await this.query("SELECT * FROM communication_accounts WHERE is_active = 1");
    return res.map(row => ({ ...row, is_active: !!row.is_active }));
  }

  async saveAccount(acc: CommunicationAccount): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO communication_accounts VALUES (?,?,?,?,?,?,?)",
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
      "INSERT OR REPLACE INTO conversations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [c.id, c.traveler_id, c.booking_id || null, c.property_id || null, c.subject, c.status, c.last_message_at, c.last_message_preview, c.unread_count, c.tags_json, c.created_at, c.updated_at, c.last_message_direction || 'INBOUND']
    );
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return await this.query("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", [conversationId]);
  }

  async getPendingMessages(): Promise<Message[]> {
    return await this.query("SELECT * FROM messages WHERE status = 'PENDING' ORDER BY created_at ASC");
  }

  async saveMessage(m: Message): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO messages VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [m.id, m.conversation_id, m.account_id, m.external_id || null, m.direction, m.channel, m.status, m.body, m.content_type, m.error_message || null, m.metadata_json || null, m.created_at, m.scheduled_at || null, m.sent_at || null, m.read_at || null, m.retry_count || 0, m.last_attempt_at || 0]
    );
  }

  async getAttachments(messageId: string): Promise<MessageAttachment[]> {
    return await this.query("SELECT * FROM message_attachments WHERE message_id = ?", [messageId]);
  }

  async saveAttachment(a: MessageAttachment): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO message_attachments VALUES (?,?,?,?,?,?,?)",
      [a.id, a.message_id, a.file_name, a.file_type, a.file_size, a.local_path, a.created_at]
    );
  }

  // --- AI ASSISTANT METHODS ---

  async getAiPersonas(): Promise<AiPersona[]> {
    const res = await this.query("SELECT * FROM ai_personas");
    return res.map(p => ({ ...p, is_active: !!p.is_active }));
  }

  async saveAiPersona(p: AiPersona): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO ai_personas VALUES (?,?,?,?,?)",
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
      "INSERT OR REPLACE INTO ai_facts VALUES (?,?,?,?,?,?,?,?)",
      [f.id, f.property_id, f.apartment_id || null, f.category, f.key, f.value, f.is_internal ? 1 : 0, f.updated_at]
    );
  }

  async deleteAiFact(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM ai_facts WHERE id = ?", [id]);
  }

  async logAiInteraction(log: AiAuditLog): Promise<void> {
    await this.executeWithParams(
      "INSERT INTO ai_audit_logs VALUES (?,?,?,?,?,?,?,?)",
      [log.id, log.conversation_id, log.input_context_hash, log.suggested_response, log.user_action, log.final_text_length || 0, log.latency_ms, log.created_at]
    );
  }

  // --- CHANNEL MANAGER METHODS ---
  async getChannelConnections(apartmentId?: string): Promise<ChannelConnection[]> {
    let sql = "SELECT * FROM channel_connections";
    if (apartmentId) sql += " WHERE apartment_id = ?";
    const res = await this.query(sql, apartmentId ? [apartmentId] : []);
    return res.map(c => ({ ...c, enabled: c.enabled !== 0, force_direct: c.force_direct === 1 }));
  }

  async saveChannelConnection(conn: ChannelConnection): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO channel_connections VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
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
    await this.executeWithParams(
      "INSERT OR REPLACE INTO calendar_events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [evt.id, evt.connection_id, evt.external_uid, evt.property_id, evt.apartment_id, evt.start_date, evt.end_date, evt.status, evt.summary || null, evt.description || null, evt.raw_data || null, evt.created_at, evt.updated_at]
    );
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
      "INSERT OR REPLACE INTO pricing_rule_sets VALUES (?,?,?,?,?,?,?,?)",
      [set.id, set.unitId, set.status, set.version, set.hash || null, set.createdAt, set.updatedAt, set.ratePlanId || null]
    );
  }

  async getPricingRules(ruleSetId: string): Promise<PricingRule[]> {
    const res = await this.query("SELECT * FROM pricing_rules WHERE rule_set_id = ? ORDER BY priority DESC", [ruleSetId]);
    return res.map(r => ({ ...r, enabled: !!r.enabled })) as PricingRule[];
  }

  async savePricingRule(rule: PricingRule): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO pricing_rules VALUES (?,?,?,?,?,?,?)",
      [rule.id, rule.ruleSetId, rule.type, rule.priority, rule.payload, rule.enabled ? 1 : 0, rule.updatedAt]
    );
  }

  async deletePricingRule(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM pricing_rules WHERE id = ?", [id]);
  }

  async saveBookingPriceSnapshot(snapshot: BookingPriceSnapshot): Promise<void> {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO bookings_price_snapshot VALUES (?,?,?)",
      [snapshot.bookingId, snapshot.snapshotJson, snapshot.createdAt]
    );
  }

  // --- WEBSITES ---
  async getWebsites(): Promise<WebSite[]> {
    const res = await this.query("SELECT * FROM websites ORDER BY created_at DESC");
    return res.map(row => ({
      ...row,
      theme_config: JSON.parse(row.theme_config || '{}'),
      sections_json: row.sections_json || '[]',
      booking_config: JSON.parse(row.booking_config || '{}'),
      property_ids_json: row.property_ids_json || '[]'
    }));
  }

  async saveWebsite(ws: WebSite): Promise<void> {
    const row = [
      ws.id, ws.name, ws.subdomain, ws.custom_domain || null, ws.status,
      JSON.stringify(ws.theme_config), ws.seo_title, ws.seo_description,
      ws.sections_json, JSON.stringify(ws.booking_config), ws.property_ids_json,
      ws.created_at, ws.updated_at
    ];
    await this.executeWithParams(
      "INSERT OR REPLACE INTO websites VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      row
    );
  }

  async deleteWebsite(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM websites WHERE id=?", [id]);
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
      "INSERT OR REPLACE INTO registry_units VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
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
      "INSERT OR REPLACE INTO registry_presentations VALUES (?,?,?,?,?,?,?,?,?,?)",
      row
    );
  }

  // --- MARKETING ---
  async getTravelersMarketingData(): Promise<any[]> {
    const sql = `
      SELECT t.*, COUNT(s.id) as total_stays, MAX(s.check_out) as last_checkout,
      (SELECT COUNT(*) FROM marketing_logs WHERE traveler_id = t.id AND event_type = 'birthday_greeted' AND strftime('%Y', datetime(created_at/1000, 'unixepoch')) = strftime('%Y', 'now')) as greeted_this_year
      FROM travelers t LEFT JOIN stays s ON t.id = s.traveler_id GROUP BY t.id`;
    return await this.query(sql);
  }

  async getMarketingTemplates(): Promise<MarketingTemplate[]> {
    return await this.query("SELECT * FROM marketing_templates ORDER BY created_at DESC");
  }

  async saveMarketingTemplate(t: MarketingTemplate): Promise<void> {
    await this.executeWithParams("INSERT OR REPLACE INTO marketing_templates VALUES (?,?,?,?,?)", [t.id, t.name, t.subject, t.body, t.created_at]);
  }

  async getMarketingLogs(): Promise<MarketingLog[]> {
    return await this.query("SELECT * FROM marketing_logs ORDER BY created_at DESC");
  }

  async saveMarketingLog(l: MarketingLog): Promise<void> {
    await this.executeWithParams("INSERT OR REPLACE INTO marketing_logs VALUES (?,?,?,?,?)", [l.id, l.traveler_id, l.event_type, l.metadata, l.created_at]);
  }

  // --- CAMPAIGNS & COUPONS ---
  async getCampaigns(): Promise<MarketingCampaign[]> {
    const res = await this.query("SELECT * FROM marketing_campaigns");
    return res.map(c => ({ ...c, enabled: !!c.enabled }));
  }

  async saveCampaign(c: MarketingCampaign): Promise<void> {
    await this.executeWithParams("INSERT OR REPLACE INTO marketing_campaigns VALUES (?,?,?,?,?,?,?,?)",
      [c.id, c.type, c.name, c.automation_level, c.template_id || null, c.enabled ? 1 : 0, c.config_json || null, c.created_at]
    );
  }

  async getCoupons(): Promise<Coupon[]> {
    return await this.query("SELECT * FROM coupons ORDER BY created_at DESC");
  }

  async saveCoupon(c: Coupon): Promise<void> {
    await this.executeWithParams("INSERT OR REPLACE INTO coupons VALUES (?,?,?,?,?,?,?)",
      [c.id, c.code, c.discount_type, c.discount_value, c.expiration_date || null, c.status, c.created_at]
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
      AND strftime('%Y', m.date) = ? ${bucket !== 'ALL' ? 'AND m.accounting_bucket = ?' : ''}
      ${propId ? 'WHERE a.property_id = ?' : ''} 
      GROUP BY a.id`;

    const params: string[] = [year.toString()];
    if (bucket !== 'ALL') params.push(bucket);
    if (propId) params.push(propId);
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
      WHERE strftime('%Y', m.date) = ?
    `;
    const params: any[] = [year.toString()];

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

  async getSettings(): Promise<UserSettings> {
    const rows = await this.query(`SELECT * FROM user_settings WHERE id = 'default' LIMIT 1`);
    if (rows.length > 0) {
      return rows[0] as UserSettings;
    }
    // Return default settings if none exist
    const defaultSettings: UserSettings = {
      id: 'default',
      fiscal_country: 'España',
      default_currency: 'EUR',
      default_timezone: 'Europe/Madrid',
      date_format: 'DD/MM/YYYY',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    return defaultSettings;
  }

  async saveSettings(s: UserSettings): Promise<void> {
    const updated = { ...s, updated_at: Date.now() };
    await this.executeWithParams(
      `INSERT OR REPLACE INTO user_settings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        updated.contact_email,
        updated.contact_phone,
        updated.contact_website,
        updated.default_currency,
        updated.default_timezone,
        updated.date_format,
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
      "INSERT OR REPLACE INTO cancellation_policies VALUES (?,?,?,?,?,?,?)",
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
      "INSERT OR REPLACE INTO rate_plans VALUES (?,?,?,?,?,?,?,?,?)",
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
      "INSERT OR REPLACE INTO pricing_modifiers VALUES (?,?,?,?,?,?,?,?,?,?,?)",
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
      "INSERT OR REPLACE INTO fees VALUES (?,?,?,?,?,?,?,?,?,?)",
      [f.id, f.property_id, f.name, f.type, f.charge_mode, f.amount_cents, f.vat_percent, f.enabled ? 1 : 0, f.created_at, f.updated_at]
    );
  }

  async deleteFee(id: string): Promise<void> {
    await this.executeWithParams("DELETE FROM fees WHERE id = ?", [id]);
  }

  // --- BACKUP / EXPORT ---
  async exportDataOnly(): Promise<DataOnlyBackup> {
    const [travelers, stays, bookings, movements, registry_units, registry_presentations, websites, accounts, conversations, messages, personas, facts, channels, calendarEvents, pricingSets, pricingRules, cancelPolicies, ratePlans, pricingModifiers, fees, settings] = await Promise.all([
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
      this.getSettings()
    ]);
    return {
      travelers, stays, bookings, movements, registry_units, registry_presentations, websites,
      communication_accounts: accounts, conversations, messages, ai_personas: personas, ai_facts: facts,
      channel_connections: channels, calendar_events: calendarEvents,
      pricing_rule_sets: pricingSets, pricing_rules: pricingRules,
      cancellation_policies: cancelPolicies, rate_plans: ratePlans,
      pricing_modifiers: pricingModifiers,
      fees,
      user_settings: settings
    };
  }
  async exportStructureOnly(): Promise<StructureOnlyBackup> {
    const [properties, apartments] = await Promise.all([this.getProperties(), this.getAllApartments()]);
    return { properties, apartments };
  }
  async importDataOnly(data: DataOnlyBackup) {
    if (!data.travelers && !data.movements) throw new Error("El archivo no contiene datos operacionales válidos.");
    if (data.travelers) for (const t of data.travelers) await this.saveTraveler(t);
    if (data.stays) for (const s of data.stays) await this.saveStay(s);
    if (data.bookings) for (const b of data.bookings) await this.saveBooking(b);
    if (data.movements) for (const m of data.movements) await this.saveMovement(m);
    if (data.registry_units) for (const u of data.registry_units) await this.saveRegistryUnit(u);
    if (data.registry_presentations) for (const p of data.registry_presentations) await this.savePresentation(p);
    if (data.websites) for (const w of data.websites) await this.saveWebsite(w);
    // Comms import
    if (data.communication_accounts) for (const a of data.communication_accounts) await this.saveAccount(a);
    if (data.conversations) for (const c of data.conversations) await this.saveConversation(c);
    if (data.messages) for (const m of data.messages) await this.saveMessage(m);
    // AI Import
    if (data.ai_personas) for (const p of data.ai_personas) await this.saveAiPersona(p);
    if (data.ai_facts) for (const f of data.ai_facts) await this.saveAiFact(f);
    // Channel Manager
    if (data.channel_connections) for (const c of data.channel_connections) await this.saveChannelConnection(c);
    if (data.calendar_events) for (const e of data.calendar_events) await this.saveCalendarEvent(e);
    // Pricing Import
    if (data.pricing_rule_sets) for (const s of data.pricing_rule_sets) await this.savePricingRuleSet(s);
    if (data.pricing_rules) for (const r of data.pricing_rules) await this.savePricingRule(r);
    // Block 22 Import
    if (data.cancellation_policies) for (const p of data.cancellation_policies) await this.saveCancellationPolicy(p);
    if (data.rate_plans) for (const rp of data.rate_plans) await this.saveRatePlan(rp);
    if (data.pricing_modifiers) for (const m of data.pricing_modifiers) await this.savePricingModifier(m);
    if (data.fees) for (const f of data.fees) await this.saveFee(f);
    // Settings Import
    if (data.user_settings) await this.saveSettings(data.user_settings);

    return {
      travelers: data.travelers?.length || 0,
      stays: data.stays?.length || 0,
      bookings: data.bookings?.length || 0,
      movements: data.movements?.length || 0
    };
  }
  async importStructureOnly(data: StructureOnlyBackup) {
    if (!data.properties && !data.apartments) throw new Error("El archivo no contiene una estructura válida.");
    if (data.properties) for (const p of data.properties) await this.saveProperty(p);
    if (data.apartments) for (const a of data.apartments) await this.saveApartment(a);
    return {
      properties: data.properties?.length || 0,
      apartments: data.apartments?.length || 0
    };
  }

  // --- BASE HELPERS ---
  private async execute(sql: string) {
    if (!this.db) {
      console.warn("DB not initialized during execute:", sql);
      return;
    }
    this.db.run(sql);
  }
  private async executeWithParams(sql: string, params: any[]) {
    if (!this.db) {
      console.warn("DB not initialized during executeWithParams:", sql);
      return;
    }
    const sanitized = this.sanitizeParams(params);
    this.db.run(sql, sanitized);
  }
  private async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) {
      return [];
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

  // --- CRUD BLINDADOS ---
  async findPropertyByName(name: string) { const r = await this.query("SELECT * FROM properties WHERE name LIKE ?", [`%${name}%`]); return r[0] || null; }
  async findApartmentByName(name: string) { const r = await this.query("SELECT * FROM apartments WHERE name LIKE ?", [`%${name}%`]); return r[0] || null; }

  async getProperties() {
    const res = await this.query("SELECT * FROM properties");
    return res.map(p => ({ ...p, is_active: p.is_active !== 0 })); // Convert sqlite int to bool
  }
  async saveProperty(p: Property) {
    await this.executeWithParams(
      "INSERT OR REPLACE INTO properties (id, name, description, created_at, is_active, timezone, currency, updated_at) VALUES (?,?,?,?,?,?,?,?)",
      [
        p.id,
        p.name || 'Sin nombre',
        p.description || null,
        p.created_at || Date.now(),
        p.is_active !== false ? 1 : 0,
        p.timezone || 'Europe/Madrid',
        p.currency || 'EUR',
        p.updated_at || Date.now()
      ]
    );
  }
  async deleteProperty(id: string) { await this.executeWithParams("DELETE FROM properties WHERE id=?", [id]); }

  async getAllApartments() {
    const res = await this.query("SELECT * FROM apartments");
    return res.map(a => ({ ...a, is_active: a.is_active !== 0 }));
  }
  async getApartments(pid: string) {
    const res = await this.query("SELECT * FROM apartments WHERE property_id=?", [pid]);
    return res.map(a => ({ ...a, is_active: a.is_active !== 0 }));
  }
  async saveApartment(a: Apartment) {
    await this.executeWithParams("INSERT OR REPLACE INTO apartments VALUES (?,?,?,?,?,?)", [a.id, a.property_id, a.name || 'Unidad', a.color || '#4F46E5', a.created_at || Date.now(), a.is_active !== false ? 1 : 0]);
  }
  async deleteApartment(id: string) { await this.executeWithParams("DELETE FROM apartments WHERE id=?", [id]); }

  async getTravelers() { return await this.query("SELECT * FROM travelers"); }
  async getTravelerById(id: string) { const r = await this.query("SELECT * FROM travelers WHERE id=?", [id]); return r[0] || null; }
  async saveTraveler(t: Traveler) {
    const row = [t.id, t.nombre || 'Huésped', t.apellidos || '', t.tipo_documento || 'DNI', t.documento || 'PENDIENTE', t.fecha_nacimiento || '', t.telefono || '', t.email || '', t.nacionalidad || '', t.created_at || Date.now(), t.updated_at || Date.now()];
    await this.executeWithParams("INSERT OR REPLACE INTO travelers VALUES (?,?,?,?,?,?,?,?,?,?,?)", row);
  }
  async deleteTraveler(id: string) { await this.executeWithParams("DELETE FROM travelers WHERE id=?", [id]); }
  async getStays() { return await this.query("SELECT * FROM stays"); }
  async getStaysByTravelerId(tid: string) { return await this.query("SELECT * FROM stays WHERE traveler_id=?", [tid]); }
  async saveStay(s: Stay) {
    const row = [s.id, s.traveler_id, s.apartment_id || null, s.check_in, s.check_out, s.source || 'Manual', s.import_batch_id || null, s.created_at || Date.now()];
    await this.executeWithParams("INSERT OR REPLACE INTO stays VALUES (?,?,?,?,?,?,?,?)", row);
  }
  async getBookings() { return await this.query("SELECT * FROM bookings"); }
  async saveBooking(b: Booking) {
    const row = [b.id, b.property_id, b.apartment_id, b.traveler_id, b.check_in, b.check_out, b.status || 'confirmed', b.total_price || 0, b.guests || 1, b.source || 'Manual', b.external_ref || null, b.created_at || Date.now(), b.conflict_detected ? 1 : 0, b.linked_event_id || null, b.rate_plan_id || null, b.summary || null, b.guest_name || null];
    await this.executeWithParams("INSERT OR REPLACE INTO bookings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", row);
  }
  async deleteBooking(id: string) { await this.executeWithParams("DELETE FROM bookings WHERE id=?", [id]); }
  async getMovements(bucket: string = 'ALL') {
    let sql = "SELECT * FROM accounting_movements";
    if (bucket !== 'ALL') sql += ` WHERE accounting_bucket='${bucket}'`;
    return await this.query(sql + " ORDER BY date DESC");
  }
  async saveMovement(m: AccountingMovement) {
    const row = [
      m.id, m.date, m.type || 'income', m.category || null, m.concept || 'Movimiento',
      m.apartment_id || null, m.reservation_id || null, m.traveler_id || null,
      m.platform || null, m.supplier || null, m.amount_gross ?? 0, m.commission ?? 0,
      m.vat ?? 0, m.amount_net ?? 0, m.payment_method || 'Manual', m.accounting_bucket || 'A',
      m.import_hash || null, m.import_batch_id || null, m.receipt_blob || null, m.created_at || Date.now(), m.updated_at || Date.now()
    ];
    await this.executeWithParams("INSERT OR REPLACE INTO accounting_movements VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", row);
  }
  async deleteMovement(id: string) { await this.executeWithParams("DELETE FROM accounting_movements WHERE id=?", [id]); }
  async getCounts() {
    const r = await this.query("SELECT (SELECT COUNT(*) FROM travelers) as travelers, (SELECT COUNT(*) FROM stays) as stays, (SELECT COUNT(*) FROM properties) as properties, (SELECT COUNT(*) FROM bookings) as bookings, (SELECT COUNT(*) FROM accounting_movements) as movements");
    return r[0] || { travelers: 0, stays: 0, properties: 0, bookings: 0, movements: 0 };
  }
  export(): Uint8Array {
    if (!this.db) { console.warn("DB not initialized during export"); return new Uint8Array(); }
    return this.db.export();
  }
  async load(data: Uint8Array) {
    this.db = new this.SQL.Database(data);
  }
  async close() { if (this.db) this.db.close(); }
}
