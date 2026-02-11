
export interface Property {
  id: string;
  name: string;
  description?: string;
  timezone?: string; // Default 'Europe/Madrid'
  currency?: string; // Default 'EUR'
  created_at: number;
  updated_at?: number;
  is_active?: boolean;
}

export interface Apartment {
  id: string;
  property_id: string;
  name: string;
  color?: string;
  created_at: number;
  is_active?: boolean;
}

export interface Traveler {
  id: string;
  nombre: string;
  apellidos: string;
  tipo_documento: string;
  documento: string;
  fecha_nacimiento?: string;
  telefono?: string;
  email?: string;
  nacionalidad?: string;
  created_at: number;
  updated_at?: number;
  total_stays?: number; // Added for marketing view
  last_checkout?: string; // Added for marketing view
}

export interface Booking {
  id: string;
  property_id: string;
  apartment_id: string;
  traveler_id: string;
  check_in: string;
  check_out: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  total_price: number;
  guests: number;
  source: string;
  external_ref?: string;
  created_at: number;
  conflict_detected?: boolean;
  linked_event_id?: string;
  rate_plan_id?: string; // Block 24
}

export interface Stay {
  id: string;
  traveler_id: string;
  apartment_id: string | null;
  check_in: string;
  check_out: string;
  source: string;
  import_batch_id?: string;
  created_at: number;
}

export interface AccountingMovement {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category?: string;
  concept: string;
  apartment_id: string | null;
  reservation_id?: string | null;
  traveler_id?: string | null;
  platform?: string;
  supplier?: string;
  amount_gross: number;
  commission: number;
  vat: number;
  amount_net: number;
  payment_method: string;
  accounting_bucket: 'A' | 'B'; // 'A' = White/Official, 'B' = Cash/Unofficial
  import_hash?: string;
  import_batch_id?: string;
  receipt_blob?: string;
  created_at: number;
  updated_at: number;
}

export interface FiscalProfile {
  tipo_fiscal: 'IRPF_PARTICULAR' | 'AUTONOMO' | 'SOCIEDAD_SL';
  nombre_razon_social: string;
  nif_cif: string;
  domicilio_fiscal: string;
  provincia: string;
  email: string;
  telefono: string;
  regimen_iva?: string;
  iva_defecto?: number;
}

export interface UserSettings {
  id: string; // Always 'default'

  // Business Data
  business_name?: string;
  business_description?: string;

  // Fiscal Information
  fiscal_name?: string; // Legal name
  fiscal_id?: string; // NIF/CIF
  fiscal_address?: string;
  fiscal_city?: string;
  fiscal_postal_code?: string;
  fiscal_country?: string;

  // Contact (Marketing & Communications)
  contact_email?: string; // Primary email for marketing
  contact_phone?: string; // Phone for WhatsApp/SMS
  contact_website?: string;

  // Preferences
  default_currency?: string; // EUR, USD, etc.
  default_timezone?: string; // Europe/Madrid
  date_format?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

  // Metadata
  created_at: number;
  updated_at: number;
}

// Marketing
export interface MarketingTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: number;
}

export interface MarketingLog {
  id: string;
  traveler_id: string;
  event_type: string;
  metadata: string;
  created_at: number;
}

export interface MarketingCampaign {
  id: string;
  type: 'birthday' | 'anniversary' | 'seasonal' | 'other';
  name: string;
  automation_level: 'automatic' | 'semi' | 'manual';
  template_id?: string;
  enabled: boolean;
  config_json?: string;
  created_at: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  expiration_date?: string;
  status: 'active' | 'expired' | 'used';
  created_at: number;
}

// Registry
export interface RegistryUnit {
  id: string;
  apartment_id: string;
  referencia_catastral?: string;
  licencia_turistica?: string;
  identificador_registral?: string;
  direccion_completa?: string;
  municipio?: string;
  provincia?: string;
  codigo_postal?: string;
  titularidad?: string;
  estado_tramitacion?: 'pendiente' | 'en_curso' | 'registrado' | 'subsanacion' | 'rechazado';
  numero_registro_oficial?: string;
  fecha_solicitud?: string;
  fecha_resolucion?: string;
  notas_internas?: string;
  updated_at: number;
}

export interface RegistryPresentation {
  id: string;
  registry_unit_id: string | null;
  tipo_tramite: 'modelo_anual_xbrl' | 'registro_actividad' | 'otro';
  ejercicio_fiscal?: number;
  fecha_presentacion: string;
  estado: 'borrador' | 'presentado' | 'rechazado' | 'aceptado';
  csv_acuse?: string;
  xbrl_blob?: string;
  observaciones?: string;
  created_at: number;
}

// Websites
export interface WebSite {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string;
  status: 'draft' | 'published';
  theme_config: any;
  seo_title: string;
  seo_description: string;
  sections_json: string;
  booking_config: any;
  property_ids_json: string;
  created_at: number;
  updated_at: number;
}

// Communications
export type CommunicationChannel = 'EMAIL' | 'WHATSAPP' | 'SMS' | 'AIRBNB' | 'BOOKING';
export type ConversationStatus = 'OPEN' | 'ARCHIVED' | 'SPAM';

export interface CommunicationAccount {
  id: string;
  name: string;
  type: CommunicationChannel;
  property_id: string | null;
  config_json: string; // Encrypted
  is_active: boolean;
  created_at: number;
}

export interface Conversation {
  id: string;
  traveler_id: string;
  booking_id?: string;
  property_id?: string;
  subject?: string;
  status: ConversationStatus;
  last_message_at: number;
  last_message_preview: string;
  unread_count: number;
  tags_json: string;
  created_at: number;
  updated_at: number;
  last_message_direction?: 'INBOUND' | 'OUTBOUND';
}

export interface Message {
  id: string;
  conversation_id: string;
  account_id?: string;
  external_id?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  channel: CommunicationChannel;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  body: string;
  content_type: 'text/plain' | 'text/html' | 'image' | 'file' | 'template';
  error_message?: string;
  metadata_json?: string;
  created_at: number;
  scheduled_at?: number;
  sent_at?: number;
  read_at?: number;
  retry_count?: number;
  last_attempt_at?: number;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  local_path: string;
  created_at: number;
}

// AI
export interface AiPersona {
  id: string;
  name: string;
  system_instruction: string;
  is_active: boolean;
  created_at: number;
}

export interface AiKnowledgeFact {
  id: string;
  property_id: string;
  apartment_id?: string | null;
  category: string;
  key: string;
  value: string;
  is_internal: boolean;
  updated_at: number;
}

export interface AiAuditLog {
  id: string;
  conversation_id?: string;
  input_context_hash?: string;
  suggested_response?: string;
  user_action?: string;
  final_text_length?: number;
  latency_ms?: number;
  created_at: number;
}

// Channel Manager
export interface ChannelConnection {
  id: string;
  apartment_id: string;
  channel_name: 'AIRBNB' | 'BOOKING' | 'VRBO' | 'WEBSITE' | 'AGENCY' | 'OTHER';
  alias?: string;
  ical_url: string;
  last_sync: number;
  last_status: 'PENDING' | 'OK' | 'ERROR' | 'OFFLINE';
  sync_log?: string;
  created_at: number;
  connection_type?: 'ICAL' | 'API';
  priority?: number;
  content_hash?: string;
  enabled: boolean;
  http_etag?: string;
  http_last_modified?: string;
  force_direct?: boolean;
}

export interface CalendarEvent {
  id: string;
  connection_id: string;
  external_uid: string;
  property_id?: string;
  apartment_id?: string;
  start_date: string;
  end_date: string;
  status: 'confirmed' | 'cancelled' | 'tentative';
  summary?: string;
  description?: string;
  raw_data?: string;
  created_at: number;
  updated_at: number;
}

// Pricing
export type PricingRuleType = 'BASE_PRICE' | 'SEASON_RANGE' | 'DAY_OF_WEEK' | 'DATE_OVERRIDE' | 'RESTRICTION';

export interface PricingRuleSet {
  id: string;
  unitId: string;
  ratePlanId?: string; // Block 23: Associated Rate Plan
  status: 'draft' | 'active' | 'archived';
  version: number;
  hash?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PricingRule {
  id: string;
  ruleSetId: string;
  type: PricingRuleType;
  priority: number;
  payload: string; // JSON
  enabled: boolean;
  updatedAt: number;
}

export interface BookingPriceSnapshot {
  bookingId: string;
  snapshotJson: string;
  createdAt: number;
}

// --- BLOCK 22: CANCELLATION POLICIES & RATE PLANS ---

export type CancellationPolicyType = 'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_REFUNDABLE' | 'CUSTOM';

export interface CancellationRules {
  freeCancellationUntilHoursBefore?: number;
  refundPercentageAfter?: number;
  noShowPenaltyPercentage?: number;
  nonRefundable?: boolean;
}

export interface CancellationPolicy {
  id: string;
  property_id: string;
  name: string;
  type: CancellationPolicyType;
  rules_json: string; // JSON of CancellationRules
  created_at: number;
  updated_at: number;
}

export interface RatePlan {
  id: string;
  apartment_id: string;
  cancellation_policy_id: string;
  name: string;
  is_active: boolean;
  price_modifier_type: 'FIXED' | 'PERCENTAGE';
  price_modifier_value: number; // e.g. -10 for 10% discount on non-ref
  created_at: number;
  updated_at: number;
}

// --- BLOCK 25: BOOKING WINDOW MODIFIERS ---
export type PricingModifierType = 'EARLY_BIRD' | 'LAST_MINUTE';

export interface PricingModifierCondition {
  daysBeforeCheckinMin?: number;
  daysBeforeCheckinMax?: number;
}

export interface PricingModifierApply {
  type: 'PERCENT_DISCOUNT' | 'PERCENT_SURCHARGE';
  value: number;
}

export interface PricingModifier {
  id: string;
  property_id: string;
  unit_id?: string | null;
  rate_plan_id?: string | null;
  type: PricingModifierType;
  condition_json: string; // JSON of PricingModifierCondition
  apply_json: string; // JSON of PricingModifierApply
  enabled: boolean;
  priority: number;
  created_at: number;
  updated_at: number;
}

// --- BLOCK 26: FEES & TAXES ---
export type FeeType = 'CLEANING' | 'TOURIST_TAX' | 'SERVICE_FEE' | 'CUSTOM';
export type FeeChargeMode = 'PER_STAY' | 'PER_NIGHT' | 'PER_GUEST_PER_NIGHT';

export interface Fee {
  id: string;
  property_id: string;
  name: string;
  type: FeeType;
  charge_mode: FeeChargeMode;
  amount_cents: number;
  vat_percent: number;
  enabled: boolean;
  created_at: number;
  updated_at: number;
}

// --- BOOKING REQUEST & QUOTE BREAKDOWN ---
export interface FeeBreakdownItem {
  feeId: string;
  name: string;
  amount: number; // in cents
  details: string;
}

export interface TaxBreakdownItem {
  name: string;
  amount: number; // in cents
  sourceFeeId?: string;
}


// Backups
export interface DataOnlyBackup {
  travelers: Traveler[];
  stays: Stay[];
  bookings: Booking[];
  movements: AccountingMovement[];
  registry_units?: RegistryUnit[];
  registry_presentations?: RegistryPresentation[];
  websites?: WebSite[];
  communication_accounts?: CommunicationAccount[];
  conversations?: Conversation[];
  messages?: Message[];
  ai_personas?: AiPersona[];
  ai_facts?: AiKnowledgeFact[];
  channel_connections?: ChannelConnection[];
  calendar_events?: CalendarEvent[];
  pricing_rule_sets?: PricingRuleSet[];
  pricing_rules?: PricingRule[];
  cancellation_policies?: CancellationPolicy[];
  rate_plans?: RatePlan[];
  pricing_modifiers?: PricingModifier[];
  fees?: Fee[];
}

export interface StructureOnlyBackup {
  properties: Property[];
  apartments: Apartment[];
}

// Interfaces for Services
export interface IDataStore {
  // Common
  init(customPath?: string): Promise<void>;
  export(): Uint8Array;
  load(data: Uint8Array): Promise<void>;
  close(): Promise<void>;

  // Backups
  exportDataOnly(): Promise<DataOnlyBackup>;
  exportStructureOnly(): Promise<StructureOnlyBackup>;
  importDataOnly(data: DataOnlyBackup): Promise<any>;
  importStructureOnly(data: StructureOnlyBackup): Promise<any>;

  // Basic CRUD
  getProperties(): Promise<Property[]>;
  saveProperty(p: Property): Promise<void>;
  deleteProperty(id: string): Promise<void>;

  getAllApartments(): Promise<Apartment[]>;
  getApartments(propId: string): Promise<Apartment[]>;
  saveApartment(a: Apartment): Promise<void>;
  deleteApartment(id: string): Promise<void>;

  getTravelers(): Promise<Traveler[]>;
  getTravelerById(id: string): Promise<Traveler | null>;
  saveTraveler(t: Traveler): Promise<void>;
  deleteTraveler(id: string): Promise<void>;

  getStays(): Promise<Stay[]>;
  getStaysByTravelerId(tid: string): Promise<Stay[]>;
  saveStay(s: Stay): Promise<void>;

  getBookings(): Promise<Booking[]>;
  saveBooking(b: Booking): Promise<void>;
  deleteBooking(id: string): Promise<void>;

  getMovements(bucket?: string): Promise<AccountingMovement[]>;
  saveMovement(m: AccountingMovement): Promise<void>;
  deleteMovement(id: string): Promise<void>;

  getCounts(): Promise<any>;

  // Fiscal
  getFiscalProfile(): Promise<FiscalProfile | null>;
  saveFiscalProfile(p: FiscalProfile): Promise<void>;

  // Settings
  getSettings(): Promise<UserSettings>;
  saveSettings(s: UserSettings): Promise<void>;

  // Marketing
  getTravelersMarketingData(): Promise<any[]>;
  getMarketingTemplates(): Promise<MarketingTemplate[]>;
  saveMarketingTemplate(t: MarketingTemplate): Promise<void>;
  getCampaigns(): Promise<MarketingCampaign[]>;
  saveCampaign(c: MarketingCampaign): Promise<void>;
  getCoupons(): Promise<Coupon[]>;
  saveCoupon(c: Coupon): Promise<void>;
  deleteCoupon(id: string): Promise<void>;

  // Registry
  getRegistryUnit(apartmentId: string): Promise<RegistryUnit | null>;
  saveRegistryUnit(ru: RegistryUnit): Promise<void>;
  getPresentations(): Promise<RegistryPresentation[]>;
  savePresentation(p: RegistryPresentation): Promise<void>;

  // Websites
  getWebsites(): Promise<WebSite[]>;
  saveWebsite(ws: WebSite): Promise<void>;
  deleteWebsite(id: string): Promise<void>;

  // Accounting Aggregates
  getAccountingSummaryByApartment(year: number, bucket: string, propId?: string): Promise<any[]>;
  getAccountingTimeSeries(year: number, bucket: string, propId?: string, apartmentId?: string): Promise<any[]>;

  // Comms
  getAccounts(): Promise<CommunicationAccount[]>;
  saveAccount(acc: CommunicationAccount): Promise<void>;
  deleteAccount(id: string): Promise<void>;

  getConversations(status?: ConversationStatus | 'ALL'): Promise<Conversation[]>;
  getConversationById(id: string): Promise<Conversation | null>;
  getConversationByTravelerId(travelerId: string): Promise<Conversation | null>;
  saveConversation(c: Conversation): Promise<void>;

  getMessages(conversationId: string): Promise<Message[]>;
  getPendingMessages(): Promise<Message[]>;
  saveMessage(m: Message): Promise<void>;
  getAttachments(messageId: string): Promise<MessageAttachment[]>;
  saveAttachment(a: MessageAttachment): Promise<void>;

  // AI
  getAiPersonas(): Promise<AiPersona[]>;
  saveAiPersona(p: AiPersona): Promise<void>;
  getAiFacts(propertyId: string): Promise<AiKnowledgeFact[]>;
  getAiFactsForContext(propertyId: string, apartmentId?: string | null): Promise<Record<string, string>>;
  saveAiFact(f: AiKnowledgeFact): Promise<void>;
  deleteAiFact(id: string): Promise<void>;
  logAiInteraction(log: AiAuditLog): Promise<void>;

  // Channel Manager
  getChannelConnections(apartmentId?: string): Promise<ChannelConnection[]>;
  saveChannelConnection(c: ChannelConnection): Promise<void>;
  deleteChannelConnection(id: string): Promise<void>;
  getCalendarEvents(connectionId?: string): Promise<CalendarEvent[]>;
  saveCalendarEvent(e: CalendarEvent): Promise<void>;
  deleteCalendarEventsByConnection(connectionId: string): Promise<void>;

  // Pricing
  getPricingRuleSets(unitId: string, ratePlanId?: string): Promise<PricingRuleSet[]>;
  getPricingRuleSetById(id: string): Promise<PricingRuleSet | null>;
  savePricingRuleSet(set: PricingRuleSet): Promise<void>;
  getPricingRules(ruleSetId: string): Promise<PricingRule[]>;
  savePricingRule(rule: PricingRule): Promise<void>;
  deletePricingRule(id: string): Promise<void>;
  saveBookingPriceSnapshot(snapshot: BookingPriceSnapshot): Promise<void>;

  // Block 22: Cancellation Policies & Rate Plans
  getCancellationPolicies(propertyId: string): Promise<CancellationPolicy[]>;
  saveCancellationPolicy(policy: CancellationPolicy): Promise<void>;
  deleteCancellationPolicy(id: string): Promise<void>;
  getRatePlans(unitId: string): Promise<RatePlan[]>;
  getRatePlanById(id: string): Promise<RatePlan | null>;
  saveRatePlan(plan: RatePlan): Promise<void>;
  deleteRatePlan(id: string): Promise<void>;

  // Block 25: Booking Window Modifiers
  getPricingModifiers(propertyId: string): Promise<PricingModifier[]>;
  savePricingModifier(modifier: PricingModifier): Promise<void>;
  deletePricingModifier(id: string): Promise<void>;

  // Block 26: Fees & Taxes
  getFees(propertyId: string): Promise<Fee[]>;
  saveFee(fee: Fee): Promise<void>;
  deleteFee(id: string): Promise<void>;
}

// Channel Provider Interface
export interface IChannelProvider {
  channelType: CommunicationChannel;
  validateConfig(config: any): Promise<boolean>;
  syncInbound(): Promise<void>;
  processQueue(): Promise<void>;
  startBackgroundSync(): void;
  stop(): void;
}

// Config Types
export interface EmailConfig {
  provider: 'GMAIL' | 'OUTLOOK' | 'CUSTOM';
  email: string;
  imap_host: string;
  smtp_host: string;
  encrypted_password?: string;
  last_sync_at?: number;
}

export interface WhatsAppConfig {
  phone_number_id: string;
  waba_id: string;
  access_token: string;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
  components: { type: string; text: string }[];
}

// Pricing Payloads
export interface PricingPayloadBase {
  amount: number; // Integer cents
  currency: string;
}

export interface PricingPayloadSeason {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  apply: {
    type: 'FIXED_PRICE' | 'MULTIPLIER';
    amount?: number;
    value?: number;
  };
}

export type WeekDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface PricingPayloadDayOfWeek {
  days: WeekDay[];
  apply: {
    type: 'DELTA'; // +/- amount
    amount: number;
  };
}

export interface PricingPayloadOverride {
  date: string; // YYYY-MM-DD
  apply: {
    amount: number;
  };
}

export interface PricingPayloadRestriction {
  minNights?: number;
  maxNights?: number;
  closedToArrival?: string[]; // Dates
  closedToDeparture?: string[];
  checkinAllowedDays?: WeekDay[];
}

// --- BOOKING REQUEST SCHEMA (WEBSITE) ---
export interface BookingRequestSchema {
  schema: string; // "rentikpro.booking_request.v1.1"
  createdAt: string; // ISO
  source: {
    channel: string;
    publicCalendarVersion: {
      calendarRevision: number;
      unitId: string;
      ruleSetId: string;
      ruleSetVersion: number;
      hash: string;
    };
  };
  stay: {
    unitId: string;
    from: string;
    to: string;
    guests: number;
    ratePlanId: string;
  };
  priceQuote: {
    baseTotal: number;
    grandTotal: number;
    cancellationPolicyId: string;
    fees: FeeBreakdownItem[];
    taxes: TaxBreakdownItem[];
    modifierApplied?: {
      type: 'FIXED' | 'PERCENTAGE';
      value: number;
      amount: number;
    };
  };
  guest: {
    name: string;
    email: string;
    phone: string;
    message?: string;
  };
  idempotencyKey: string;
}
