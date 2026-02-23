
export interface Property {
  id: string;
  name: string;
  description?: string;
  timezone?: string; // Default 'Europe/Madrid'
  currency?: string; // Default 'EUR'
  created_at: number;
  updated_at?: number;
  is_active?: boolean;
  // Web Pública (Public Calendar API)
  web_calendar_enabled?: boolean;
  public_token?: string;        // stored in plaintext locally only
  allowed_origins_json?: string; // JSON string of string[]
  show_prices?: boolean;
  max_range_days?: number;      // default 365
  last_published_at?: number;
  email?: string;
  location?: string;
  logo?: string;
  phone?: string;
  color?: string;
}

export interface Apartment {
  id: string;
  property_id: string;
  name: string;
  color?: string;
  created_at: number;
  is_active?: boolean;
  ical_export_token?: string;
  ical_out_url?: string;
  ical_last_publish?: number;
  ical_event_count?: number;
  publicBasePrice?: number | null;
  currency?: string;
}
// --- PRICING STUDIO ---
export type ShortStayMode = 'ALLOWED' | 'NOT_ALLOWED' | 'WITH_SURCHARGE';
export type SurchargeType = 'PERCENT' | 'FIXED';

export interface DayStayRule {
  date: string;
  price: number;
  minNights: number;
  shortStayMode: ShortStayMode;
  surchargeType: SurchargeType;
  surchargeValue: number;
  isOverride: boolean;
}

export interface PricingDefaults {
  apartmentId: string;
  currency: string;
  basePrice: number;
  defaultMinNights: number;
  shortStayMode: ShortStayMode;
  surchargeType: SurchargeType;
  surchargeValue: number;
}

export interface NightlyRateOverride {
  apartmentId: string;
  date: string; // YYYY-MM-DD
  price?: number | null;
  minNights?: number | null;
  shortStayMode?: ShortStayMode | null;
  surchargeType?: SurchargeType | null;
  surchargeValue?: number | null;
}

export interface Traveler {
  id: string;
  nombre: string;
  apellidos: string;
  tipo_documento: string;
  documento?: string; // Made optional for flexible import
  fecha_nacimiento?: string;
  telefono?: string;
  email?: string;
  nacionalidad?: string;
  provincia?: string;
  cp?: string;
  localidad?: string;
  direccion?: string;
  created_at: number;
  updated_at?: number;
  total_stays?: number;
  last_checkout?: string;
  needs_document?: boolean; // Flag for pending document
  traveler_key?: string; // UUID-based key for deduplication without DNI
}

// --- EMAIL INGEST & PROVISIONAL BOOKINGS ---
export interface BookingEmailNotification {
  id: string;
  message_id: string; // Links to Message.id
  subject: string;
  sender: string;
  received_at: number;
  processed: boolean;
  provisional_booking_id?: string;
}

// --- EMAIL INGEST & PARSING ---

export type EmailProvider = 'BOOKING' | 'AIRBNB' | 'VRBO' | 'ESCAPADA_RURAL' | 'DIRECT_WEB' | 'OTHER';
export type EmailIngestStatus = 'NEW' | 'PARSED' | 'LINKED' | 'NEEDS_MANUAL' | 'ERROR';

export interface EmailIngest {
  id: string;
  provider: EmailProvider;
  gmail_message_id?: string;
  received_at: string; // ISO
  from_addr: string;
  subject: string;
  body_text: string; // limited
  body_html?: string; // limited
  raw_links_json: string[];
  parsed_json: any;
  status: EmailIngestStatus;
  error_message?: string;
  created_at: number;
}

export type ProvisionalBookingStatus = 'PENDING_DETAILS' | 'CONFIRMED' | 'CANCELLED' | 'INQUIRY' | 'HOLD' | 'PENDING_CONFIRMATION' | 'EXPIRED';

export interface ProvisionalBooking {
  id: string; // UUID
  provider: EmailProvider | 'DIRECT_WEB'; // Added DIRECT_WEB
  provider_reservation_id?: string; // Optional if direct

  status: ProvisionalBookingStatus;

  // Link to raw source
  source: 'EMAIL_TRIGGER' | 'MANUAL' | 'WEB_CHECKOUT' | 'ICAL';
  email_ingest_id?: string;
  connection_id?: string; // New: for iCal/Channel source
  ical_uid?: string;      // New: robust iCal UID link
  details_email_ingest_id?: string;
  manual_completed_at?: number;

  // Metadata
  created_at: number;
  updated_at: number;

  // Parsed / Draft Data
  apartment_hint?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  guest_name: string;
  traveler_id?: string; // New: manual link to traveler
  pax_adults: number;
  pax_children?: number; // Optional

  total_price: number;
  currency: string;
  notes?: string;   // New: manual notes

  // Validation / Confidence
  confidence?: number; // 0.0 to 1.0
  confidence_reason?: string; // New: explain why low/high
  missing_fields?: string[];

  // Parsing snippet for debugging
  raw_text_snippet?: string;

  // Legacy/Compat fields to ease merge into Booking
  check_in?: string;
  check_out?: string;
  platform?: string; // e.g. 'Airbnb', 'Booking'
  source_email_id?: string;

  // Extra Parsing
  metadata?: any; // Extra parsing details
  apartment_id?: string; // Resolved ID
  linked_calendar_event_id?: string;
  history?: string[]; // Audit Log

  // Raw Metadata (from iCal/Email)
  raw_summary?: string;
  raw_description?: string;

  // Web Booking / Hold
  expires_at?: number; // Timestamp for HOLD expiration
  payment_instructions?: string; // For manual transfer instructions

  // Cancellation
  cancelled_at?: number;
  cancellation_reason?: string;
  cancellation_outcome?: {
    refund_percent: number;
    refund_amount: number;
    explanation: string;
    cancellation_fee: number;
  };
}

export interface Payment {
  id: string;
  type: 'confirmacion' | 'final' | 'extra';
  amount: number;
  date: string;
  method: string;
  status: 'pendiente' | 'pagado';
  note?: string;
}

export interface Booking {
  id: string;
  property_id: string;
  apartment_id: string;
  traveler_id: string;
  check_in: string;
  check_out: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'blocked';
  total_price: number;
  guests: number;
  source: string;
  external_ref?: string;
  created_at: number;
  conflict_detected?: boolean;
  linked_event_id?: string;
  rate_plan_id?: string;
  summary?: string;
  guest_name?: string;
  event_kind?: 'BOOKING' | 'BLOCK';
  event_origin?: 'ical' | 'manual' | 'accounting' | 'other';
  event_state?: 'provisional' | 'confirmed';

  // RentikPro 2.0 Ingest Fields
  provisional_id?: string;
  enrichment_status?: 'PENDING' | 'COMPLETE';

  policy_snapshot?: string; // JSON of policy + payment breakdown

  // Traceability & Provisional Meta
  connection_id?: string;
  ical_uid?: string;
  raw_summary?: string;
  raw_description?: string;

  // Payment Tracking (Direct Bookings)
  deposit_paid_at?: number;
  remaining_paid_at?: number;
  payment_status?: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  payment_notes?: string;
  payments?: Payment[];
  booking_key?: string; // Unique key for consolidation (MINI-BLOQUE A4)
  project_id?: string;
  field_sources?: string; // JSON: {field: module}
  updated_at?: number;

  // Occupancy Details (Block 10)
  pax_total?: number;
  pax_adults?: number;
  pax_children?: number;
  pax_infants?: number;
  ota?: string;
  locator?: string;
  notes?: string;
  needs_details?: boolean;
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
  payment_id?: string; // Link to specific payment within a reservation
  movement_key?: string; // Unique key for individual movements (MINI-BLOQUE A4)
  project_id?: string;
  property_id?: string;

  // stay-related metadata (Source of Truth)
  check_in?: string; // YYYY-MM-DD
  check_out?: string; // YYYY-MM-DD
  guests?: number;
  pax_adults?: number;
  pax_children?: number;
  pax_infants?: number;
  source_event_type?: string; // e.g. 'STAY_RESERVATION', 'PAYMENT', 'ADJUSTMENT'
  event_state?: 'provisional' | 'confirmed';
  ical_uid?: string;
  connection_id?: string;
  raw_summary?: string;
  raw_description?: string;
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

export interface FiscalOwner {
  id: string;
  name: string;
  nif: string;
  share: number;
}

export interface UserSettings {
  id: string; // Always 'default'

  // Business Data
  business_name?: string;
  business_description?: string;

  // Fiscal Information
  fiscal_name?: string; // Legal name
  fiscal_id?: string; // NIF/CIF
  fiscal_type?: 'IRPF_PARTICULAR' | 'AUTONOMO' | 'SOCIEDAD_SL';
  fiscal_address?: string;
  fiscal_city?: string;
  fiscal_postal_code?: string;
  fiscal_country?: string;

  // For IRPF_PARTICULAR
  owners?: FiscalOwner[];

  // Contact (Marketing & Communications)
  contact_email?: string; // Primary email for marketing
  accountant_email?: string; // NEW: Email for tax draft
  technical_channel_email?: string; // NEW: Technical contact for Channel Manager
  contact_phone?: string; // Phone for WhatsApp/SMS
  contact_website?: string;

  // Social Media
  social_instagram?: string;
  social_facebook?: string;
  social_tiktok?: string;
  social_x?: string;
  social_youtube?: string;

  // Preferences
  default_currency?: string; // EUR, USD, etc.
  default_timezone?: string; // Europe/Madrid
  date_format?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

  // Email Ingest Settings
  personal_email?: string;
  technical_reservations_email?: string;
  allow_manual_completion?: boolean; // Default true
  enable_minimal_bookings_from_ical?: boolean;
  require_details_to_close?: boolean; // Default false
  hold_minutes?: number; // Default 15

  // SMTP & Safety Settings
  email_outgoing_from?: string; // Personal email for sending
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string; // Stored locally
  smtp_secure?: boolean;
  marketing_send_mode?: 'manual' | 'automatic'; // Default 'manual'

  // Metadata
  created_at: number;
  updated_at: number;

  // UI Settings
  ui_scale?: number; // 0.9 to 1.2

  // Cloudflare Settings
  cloudflare_worker_url?: string;
  cloudflare_admin_api_key?: string;

  // WebDAV Sync (BYOC)
  webdav_url?: string;
  webdav_user?: string;
  webdav_pass?: string;
  webdav_sync_enabled?: boolean;
}

export interface SyncState {
  version: number;
  lastModified: number;
  sha256: string;
  clientId: string;
}


// --- BOOKING POLICIES ---

export type PolicyScope = 'PROPERTY' | 'APARTMENT';
export type PaymentMode = 'DEPOSIT_ONLY' | 'FULL_PREPAY' | 'PAY_ON_ARRIVAL' | 'SPLIT_CUSTOM';
export type DepositType = 'PERCENT' | 'FIXED';
export type DepositDue = 'IMMEDIATE' | 'HOURS_AFTER_BOOKING';
export type RemainingDue = 'ON_ARRIVAL' | 'DAYS_BEFORE_CHECKIN';
export type SecurityDepositMethod = 'HOLD_CARD' | 'CASH' | 'TRANSFER' | 'NONE';

// CancellationPolicyType defined later in the file


export interface CancellationRule {
  until_days_before: number;
  refund_percent: number;
}

export interface BookingPolicy {
  id: string; // UUID
  scope_type: PolicyScope;
  scope_id: string; // property_id or apartment_id
  currency: string; // Default 'EUR'

  // Payment
  payment_mode: PaymentMode;
  deposit_type: DepositType;
  deposit_value: number;
  deposit_due: DepositDue;
  deposit_due_hours?: number; // if HOURS_AFTER_BOOKING
  remaining_due: RemainingDue;
  remaining_due_days?: number; // if DAYS_BEFORE_CHECKIN

  accepted_methods: string[]; // JSON stored as string

  // Security Deposit
  require_security_deposit: boolean;
  security_deposit_amount?: number;
  security_deposit_method: SecurityDepositMethod;

  // Cancellation
  cancellation_policy_type: CancellationPolicyType;
  cancellation_rules?: CancellationRule[]; // JSON
  no_show_policy?: any; // JSON

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

export interface MarketingEmailLog {
  id: string;
  campaign_id: string;
  to_email: string;
  status: 'SENT' | 'FAILED';
  error_message?: string;
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
  type: 'birthday' | 'anniversary' | 'seasonal' | 'other' | 'stay_followup';
  name: string;
  automation_level: 'automatic' | 'semi' | 'manual';
  template_id?: string; // Legacy text template
  email_template_id?: string; // New visual template
  enabled: boolean;
  config_json?: string;
  created_at: number;
}

export interface MarketingEmailTemplate {
  id: string;
  name: string;
  template_spec_json: string; // JSON string of EmailTemplateSpec
  created_at: number;
  updated_at: number;
}

export interface EmailTemplateSpec {
  header: { logo_media_id?: string; business_name: string };
  hero: { image_media_id?: string; title: string; subtitle: string };
  body: { text: string };
  offer: { badge_text: string; detail_text: string; enabled: boolean };
  cta: { button_text: string; url: string; enabled: boolean };
  footer: { phone: string; social_links: string[]; unsubscription_notice: boolean };
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

// Websites & WebSpec v1
export type WebTemplateId = 'modern' | 'classic' | 'minimal';
export type WebSectionType = 'hero' | 'apartments' | 'calendar' | 'chatbot' | 'contact' | 'gallery' | 'location' | 'features';

export interface WebSection {
  id: string; // unique
  type: WebSectionType;
  enabled: boolean;
  order: number;
  data: any; // Flexible payload per type
}

export interface WebBrand {
  name: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  socials?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
}

export interface WebTheme {
  primaryColor?: string;
  borderRadius?: string;
  fontHeading?: string;
  fontBody?: string;
}

export interface WebSpec {
  version: 1;
  templateId: WebTemplateId;
  brand: WebBrand;
  theme: WebTheme;
  sections: WebSection[];

  // Flattened settings for easy access
  integrations?: {
    rentikpro?: {
      propertyId: string;
      publicToken: string;
    }
  };
}

export interface WebSite {
  id: string;
  name?: string;
  property_id?: string; // Made optional
  subdomain: string;
  template_slug: string; // Legacy, maps to WebSpec.templateId
  plan_type: 'basic' | 'plus' | 'pro';
  primary_domain?: string;
  public_token: string;
  is_published: boolean;
  status?: 'draft' | 'published'; // Added
  theme_config: string; // JSON (Legacy backup)
  seo_title: string;
  seo_description: string;
  sections_json: string; // JSON (Legacy backup)
  booking_config: string; // JSON
  property_ids_json: string; // JSON
  allowed_origins_json: string;
  features_json: string;
  config_json?: string; // Main content JSON -> WebSpec v1
  slug?: string;
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

export interface MediaAsset {
  id: string;
  site_id: string;
  filename: string;
  mime_type: string;
  size: number;
  data_base64: string;
  width?: number;
  height?: number;
  created_at: number;
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
  last_status: 'PENDING' | 'OK' | 'ERROR' | 'OFFLINE' | 'INVALID_TOKEN' | 'TOKEN_CADUCADO';
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
  booking_id?: string;
  external_uid: string; // Legacy/API UID
  ical_uid?: string;    // Robust iCal UID
  event_kind?: 'BOOKING' | 'BLOCK';
  project_id?: string;
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
  // Metadata (added for backward compatibility v2.1.0)
  app_version?: string;
  schema_version?: number;
  exported_at?: string;
  version?: string; // Legacy

  // Optional structure fields (for mixed backups)
  properties?: Property[];
  apartments?: Apartment[];

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
  user_settings?: UserSettings;
  provisional_bookings?: ProvisionalBooking[];
}

export interface StructureOnlyBackup {
  // Metadata
  app_version?: string;
  schema_version?: number;
  exported_at?: string;

  properties: Property[];
  apartments: Apartment[];

  // Extended Structure (v2)
  user_settings?: UserSettings; // Single object or array if needed, usually single 'default'
  websites?: WebSite[];
  media_assets?: MediaAsset[];
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
  getBookingsFromAccounting(): Promise<Booking[]>;
  generateBaseMovementsFromBookings(): Promise<number>;
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
  getTravelersMarketingData(): Promise<any[]>;
  getBirthdaysToday(propertyId?: string, timezone?: string): Promise<Traveler[]>;
  getUpcomingArrivals(days?: number, propertyId?: string, timezone?: string): Promise<Booking[]>;
  getPendingCheckins(days?: number, propertyId?: string, timezone?: string): Promise<Booking[]>;
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
  getAccountingSummaryByApartment(year: number, bucket: string, propId?: string): Promise<any[]>;
  getAccountingTimeSeries(year: number, bucket: string, propId?: string, apartmentId?: string): Promise<any[]>;

  // Media
  getAllMediaAssets(): Promise<MediaAsset[]>;

  // Cleaning
  getCleaningTasks(startDate: string, endDate: string, apartmentId?: string): Promise<CleaningTask[]>;
  getCleaningTaskById(id: string): Promise<CleaningTask | null>;
  saveCleaningTask(task: CleaningTask): Promise<void>;

  getCleaningTemplates(propertyId: string): Promise<CleaningTemplate[]>;
  saveCleaningTemplate(tmpl: CleaningTemplate): Promise<void>;

  // Maintenance
  getMaintenanceIssues(status?: string, apartmentId?: string): Promise<MaintenanceIssue[]>;
  getMaintenanceIssueById(id: string): Promise<MaintenanceIssue | null>;
  saveMaintenanceIssue(issue: MaintenanceIssue): Promise<void>;
  getMaintenancePhotos(issueId: string): Promise<MaintenancePhoto[]>;
  saveMaintenancePhoto(photo: MaintenancePhoto): Promise<void>;

  // Comms
  getAccounts(): Promise<CommunicationAccount[]>;
  saveAccount(acc: CommunicationAccount): Promise<void>;
  deleteAccount(id: string): Promise<void>;

  getConversations(status?: ConversationStatus | 'ALL'): Promise<Conversation[]>;
  getRecentMessages(limit?: number): Promise<Conversation[]>;
  getConversationById(id: string): Promise<Conversation | null>;
  getConversationByTravelerId(travelerId: string): Promise<Conversation | null>;
  saveConversation(c: Conversation): Promise<void>;

  // Helper for single site
  getMyWebsite(): Promise<WebSite | null>;

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

  // Block 2.0: Email Ingest
  saveEmailIngest(email: EmailIngest): Promise<void>;
  getEmailIngestById(id: string): Promise<EmailIngest | null>;
  getPendingEmailIngests(): Promise<EmailIngest[]>;

  getProvisionalBookings(): Promise<ProvisionalBooking[]>;
  saveProvisionalBooking(pb: ProvisionalBooking): Promise<void>;
  deleteProvisionalBooking(id: string): Promise<void>;
  loadPropertySnapshot(propertyId: string): Promise<PropertySnapshot>;

  // Pricing Studio
  getPricingDefaults(apartmentId: string): Promise<PricingDefaults | null>;
  savePricingDefaults(apartmentId: string, defaults: PricingDefaults): Promise<void>;
  getNightlyRates(apartmentId: string, from: string, to: string): Promise<NightlyRateOverride[]>;
  upsertNightlyRatesBulk(apartmentId: string, rates: Partial<NightlyRateOverride>[]): Promise<void>;
  deleteNightlyRatesRange(apartmentId: string, from: string, to: string): Promise<void>;
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

// --- CLEANING MODULE (v1) ---

export interface CleaningTemplate {
  id: string; // e.g., 'tmpl_default'
  property_id: string; // 'prop_default' or specific
  title: string;
  items_json: string; // JSON array of strings (checklist items)
  created_at: number;
}

export type CleaningTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface CleaningTask {
  id: string;
  apartment_id: string;
  booking_id?: string; // Optional link to specific booking (checkout)
  due_date: string; // YYYY-MM-DD
  status: CleaningTaskStatus;

  assigned_to?: string; // Name of staff
  notes?: string;

  // Checklist State
  checklist_state_json?: string; // JSON: Record<string, boolean> (item -> completed)

  // Completion
  completed_at?: number;
  signature_name?: string; // "Signed by X"

  created_at: number;
  updated_at: number;
}

// Photos are stored in media_assets, but we link them here
export interface CleaningTaskPhoto {
  id: string;
  task_id: string;
  media_id: string;
  created_at: number;
}

// --- MAINTENANCE MODULE ---

export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MaintenanceIssue {
  id: string;
  apartment_id: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;

  created_at: number;
  created_by?: string; // "Limpieza" or Name
  assigned_to?: string;

  resolved_at?: number;
  resolution_notes?: string;
  signature_name?: string;

  // We can join with photos table or store JSON
  photos_json?: string;
}

export interface MaintenancePhoto {
  id: string;
  issue_id: string;
  media_id: string;
  created_at: number;
}

// --- WEBSITE BUILDER CORE TYPES ---

export type DeviceMode = "desktop" | "tablet" | "mobile";
export type InspectorTab = "content" | "style" | "responsive";

export type BlockType =
  | "Header"
  | "Hero"
  | "CTA"
  | "Features"
  | "Gallery"
  | "Testimonials"
  | "ApartmentsGrid"
  | "Pricing"
  | "FAQ"
  | "Location"
  | "ContactForm"
  | "Footer"
  | "AvailabilityWidget"
  | "LeadsForm"
  | "SocialProof";

export type BlockStyle = {
  background?: string;
  text?: string;
  padding?: string;
  rounded?: string;
  shadow?: string;
  border?: string;
  align?: "left" | "center" | "right";
  maxWidth?: "full" | "screen" | "prose";
};

export interface BlockNode {
  id: string;
  type: BlockType;
  props: Record<string, any>;
  style: BlockStyle;
  styleOverrides?: Partial<Record<DeviceMode, Partial<BlockStyle>>>;
}

export interface PageState {
  meta: {
    template: "Minimal" | "Luxury" | "Conversion" | "Rustic";
    name: string;
    updatedAt: number;
    publishedAt?: number;
  };
  blocks: BlockNode[];
}

export interface HistoryState {
  past: PageState[];
  present: PageState;
  future: PageState[];
}

// --- SITE GENERATION FROM REAL DATA ---

export interface PropertySnapshot {
  property: Property;
  apartments: Apartment[];
  media: any[];
  settings: Record<string, any>;
  policies: BookingPolicy[];
  aiFacts: AiKnowledgeFact[];
}

export interface SiteDraft {
  propertyId: string;
  templateLevel: 'BASIC' | 'STANDARD' | 'PRO' | 'PRO_TOP';
  bindings: Record<string, string>; // Prop path -> Snapshot path
  blocks: BlockNode[];
  meta: PageState['meta'];
}

export interface SiteOverrides {
  touchedFields: string[];
  overridesByPath: Record<string, any>;
  hiddenEntities: string[];
  ordering: Record<string, string[]>;
}

// --- CHECK-IN SCAN PRO ---

export interface BookingLocator {
  booking_id: string;
  locator: string;
  created_at: number;
}

export interface CheckInToken {
  booking_id: string;
  token: string;
  created_at: number;
}

export type CheckInRequestStatus = 'PENDING' | 'SENT' | 'COMPLETED';

export interface CheckInRequest {
  id: string; // reservation_id or booking_id
  booking_id: string;
  status: CheckInRequestStatus;
  locator?: string;
  token?: string;
  sent_at?: number;
  completed_at?: number;
  created_at: number;
  project_id?: string;
}
