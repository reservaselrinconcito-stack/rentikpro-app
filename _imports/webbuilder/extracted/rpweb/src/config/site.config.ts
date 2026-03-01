/**
 * SITE CONFIG — El Rinconcito Matarraña
 *
 * This is the single source of truth for all site-specific data.
 * To create a new tenant (Create Web), duplicate this file, fill in their data,
 * and swap it via the SiteConfigProvider context or build-time env var.
 *
 * Architecture:
 *   - SiteConfig = what changes per tenant (data + branding)
 *   - UI components = what stays constant (templates)
 *
 * Multi-tenant roadmap:
 *   1. Move to API-fetched config: fetch(`/api/sites/${SITE_ID}/config`)
 *   2. Wrap App in <SiteConfigProvider config={config}>
 *   3. Use useSiteConfig() hook everywhere instead of direct import
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThemeConfig {
  /** Tailwind color name for primary accent (e.g., 'orange') */
  primary: string;
  /** Font family tokens: already loaded in index.html */
  serifFont: string;
  sansFont: string;
}

export interface ContactConfig {
  phone: string;
  phoneRaw: string; // digits only, for tel: and wa.me links
  email: string;
  address: string;
  zip: string;
  city: string;
  province: string;
  country: string;
  lat: number;
  lon: number;
}

export interface SocialConfig {
  instagram?: string;
  facebook?: string;
  booking?: string;
  airbnb?: string;
  googleMaps?: string;
  whatsapp?: string;
}

export interface RentikProConfig {
  /** Set to true when the tenant uses RentikPro */
  enabled: boolean;
  /** When RentikPro booking engine is live, set the direct booking URL */
  bookingUrl?: string;
  /** Show "Powered by RentikPro" badge across the site */
  showBadge: boolean;
  /** Landing page URL for RentikPro (owner-facing) */
  landingUrl?: string;
  /** Contact URL for RentikPro sales */
  contactUrl?: string;
}

export interface SeoConfig {
  defaultTitle: string;
  titleTemplate: string; // e.g. '%s | El Rinconcito Matarraña'
  defaultDescription: string;
  siteUrl: string;
  ogImage?: string;
  locale: string;
  /** ISO 4217 currency code */
  currency: string;
  /** BCP 47 language tags for hreflang */
  languages: string[];
}

export interface FeatureFlags {
  /** Show the Live Environment Widget (weather/AQI) */
  liveEnvironmentWidget: boolean;
  /** Show the AI chatbot widget */
  chatbot: boolean;
  /** Show the "Mas Matarraña" coming soon section */
  comingSoonSection: boolean;
  /** Show the RentikPro section on the home page */
  rentikproSection: boolean;
}

export interface SiteConfig {
  /** Unique identifier — will be used as tenant ID in multi-tenant SaaS */
  id: string;
  name: string;
  shortName: string;
  slogan: string;
  owners?: string;
  license?: string;
  theme: ThemeConfig;
  contact: ContactConfig;
  social: SocialConfig;
  rentikpro: RentikProConfig;
  seo: SeoConfig;
  features: FeatureFlags;
}

// ─── El Rinconcito Matarraña — Config ─────────────────────────────────────────

export const SITE_CONFIG: SiteConfig = {
  id: 'el-rinconcito-matarrana',
  name: 'El Rinconcito Matarraña',
  shortName: 'El Rinconcito',
  slogan: 'Apartamentos rurales en el corazón del Matarraña',
  owners: 'Toni y Evelyn',
  license: '2021-E-RC-453',

  theme: {
    primary: 'orange',
    serifFont: 'Playfair Display',
    sansFont: 'Inter',
  },

  contact: {
    phone: '+34 629 83 73 69',
    phoneRaw: '34629837369',
    email: 'reservas.elrinconcito@gmail.com',
    address: 'Calle San Lorenzo 4',
    zip: '44587',
    city: 'Fuentespalda',
    province: 'Teruel',
    country: 'España',
    lat: 40.80713190255378,
    lon: 0.06415288424000742,
  },

  social: {
    instagram: 'https://instagram.com/elrinconcitomatarranya',
    facebook: 'https://m.facebook.com/elrinconcito.rinconcito.5',
    booking: 'https://www.booking.com/hotel/es/el-rinconcito-fuentespalda12.es.html',
    airbnb: 'https://www.airbnb.es/rooms/577228298619723410',
    googleMaps: 'https://www.google.com/maps/place/ElRinconcito/@40.8071848,0.0641494,17z',
    whatsapp: 'https://api.whatsapp.com/send?phone=34629837369',
  },

  rentikpro: {
    enabled: true,
    // bookingUrl: undefined, // TODO: set when RentikPro booking engine is live
    showBadge: true,
    landingUrl: 'https://rentikpro.com',
    contactUrl: 'https://rentikpro.com/contacto',
  },

  seo: {
    defaultTitle: 'El Rinconcito Matarraña — Apartamentos Rurales en Fuentespalda, Teruel',
    titleTemplate: '%s | El Rinconcito Matarraña',
    defaultDescription:
      'Apartamentos rurales con encanto en Fuentespalda (Teruel). Naturaleza, estrellas, gastronomía y aventura en el corazón de la "Toscana española". Desde 90€/noche.',
    siteUrl: 'https://www.elrinconcitomatarraña.com',
    ogImage: 'https://cdn.turisapps.com/site-2302/c7da52d5-fa23-4989-8f2d-2ef267e6cab8/main.webp',
    locale: 'es_ES',
    currency: 'EUR',
    languages: ['es', 'en'],
  },

  features: {
    liveEnvironmentWidget: true,
    chatbot: true,
    comingSoonSection: true,
    rentikproSection: true,
  },
};

// ─── Convenience re-exports ────────────────────────────────────────────────────
// These preserve backward compatibility with code that imports from brand.ts
// In a multi-tenant setup, replace with useSiteConfig() from context.

export const SITE_ID = SITE_CONFIG.id;
export const SITE_NAME = SITE_CONFIG.name;
export const BOOKING_URL =
  SITE_CONFIG.rentikpro.bookingUrl ??
  SITE_CONFIG.social.booking ??
  SITE_CONFIG.social.whatsapp ??
  '#';
