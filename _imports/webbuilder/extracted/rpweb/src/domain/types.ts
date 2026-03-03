/**
 * domain/types.ts — Contratos de dominio SaaS multi-tenant.
 *
 * Estos tipos son INDEPENDIENTES de la API y del config del tenant.
 * Todo lo que entra de fuera se normaliza a estos tipos.
 */

// ─── Property ────────────────────────────────────────────────────────────────

export interface DomainProperty {
  slug: string;
  propertyId: string;
  name: string;
  shortName: string;
  slogan: string;
  email: string;
  phone: string;
  phoneRaw: string;
  logoUrl: string | null;
  location: {
    town: string;
    province: string;
    country: string;
    lat: number | null;
    lon: number | null;
  };
  social: {
    instagram: string | null;
    facebook: string | null;
    whatsapp: string | null;
    googleMaps: string | null;
  };
  theme: {
    themeId: string;
    primaryColor: string;
  };
  locale: string;
  siteUrl: string;
}

// ─── Apartment ────────────────────────────────────────────────────────────────

export interface DomainApartment {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  sizeM2: number | null;
  priceFrom: number | null; // Legacy field
  publicBasePrice: number | null;
  currency: string | null;
  photos: string[];
  highlights: string[];
  status: 'active' | 'coming_soon';
}

// ─── Availability ─────────────────────────────────────────────────────────────

export interface AvailabilityDay {
  date: string;        // YYYY-MM-DD
  isAvailable: boolean;
  minNights: number | null;
  price: number | null;
}

export interface ApartmentAvailability {
  apartmentSlug: string;
  days: AvailabilityDay[];
}

export interface DomainAvailability {
  from: string;
  to: string;
  apartments: ApartmentAvailability[];
}

// ─── Lead ─────────────────────────────────────────────────────────────────────

export interface LeadPayload {
  name?: string;
  email?: string;
  phone?: string;
  message: string;
  source?: string;
  checkIn?: string;
  checkOut?: string;
  apartmentSlug?: string;
}

// ─── Bootstrap State Machine ──────────────────────────────────────────────────

export type BootstrapStatus = 'loading' | 'ready' | 'demo' | 'notfound' | 'missing_slug' | 'error';

export type DataSource = 'api' | 'demo' | 'mixed';

export type ApiErrorCode = 'NOT_FOUND' | 'UNAUTHORIZED' | 'NETWORK' | 'SERVER' | 'TIMEOUT' | 'UNKNOWN';

export interface BootstrapLoadStep {
  ok: boolean;
  at: number | null;
  errCode: ApiErrorCode | null;
  errMessage: string | null;
}

export interface BootstrapDebug {
  startedAt: number;
  finishedAt: number | null;
  property: BootstrapLoadStep;
  apartments: BootstrapLoadStep;
  availability: BootstrapLoadStep;
}

export interface BootstrapState {
  status: BootstrapStatus;
  slug: string | null;
  lang: string;
  property: DomainProperty | null;
  apartments: DomainApartment[];
  availability: DomainAvailability | null;
  source: DataSource;
  error: Error | null;
  /** Solo para debugging; puede ser null incluso en ready/demo */
  debug?: BootstrapDebug | null;
}
