/**
 * SiteConfig — Contrato único de configuración multi-tenant.
 *
 * Este es el único tipo que describe TODO lo que puede variar entre tenants.
 * Las páginas y componentes son templates; este tipo es el dato.
 *
 * Hoja de ruta:
 *   1. Cada tenant tiene su propio archivo que cumple este contrato.
 *   2. En tiempo de build se selecciona via VITE_SITE_CONFIG env var.
 *   3. En multi-tenant SaaS se carga desde /api/sites/{id}/config
 */

// ─── Meta ──────────────────────────────────────────────────────────────────────

export interface SiteConfigMeta {
    /** Unique tenant identifier (slug) — e.g. "el-rinconcito-matarrana" */
    propertyId: string;
    /** ISO 8601 timestamp of when this config was generated/last modified */
    generatedAt: string;
    /** Semver of the SiteConfig schema this config targets — e.g. "1.0.0" */
    templateVersion: string;
}

// ─── Theme ─────────────────────────────────────────────────────────────────────

export interface SiteThemeConfig {
    /** Identifier for the visual theme — e.g. "bold-conversion", "minimal-lux" */
    themeId: string;
    /** Identifier for the template layout — e.g. "standard", "one-page" */
    templateId?: string;
    /** Primary accent color (Tailwind color name or CSS value) */
    primaryColor?: string;
    /** Google Font name for serif headings */
    serifFont?: string;
    /** Google Font name for sans-serif body */
    sansFont?: string;
}

// ─── Locales ───────────────────────────────────────────────────────────────────

export interface SiteLocalesConfig {
    /** BCP 47 tag — e.g. "es", "en" */
    defaultLocale: string;
    /** All supported locales */
    enabled: string[];
}

// ─── Brand ─────────────────────────────────────────────────────────────────────

export interface SiteBrandConfig {
    name: string;
    shortName?: string;
    slogan?: string;
    owners?: string;
    license?: string;
    logoUrl?: string;
    /** Full international format — e.g. "+34 629 83 73 69" */
    phone?: string;
    /** Digits only for tel:/wa.me links — e.g. "34629837369" */
    phoneRaw?: string;
    email?: string;
    rentikproLandingUrl?: string;
    rentikproContactUrl?: string;
}

// ─── Location ──────────────────────────────────────────────────────────────────

export type LocationStatus = 'active' | 'coming_soon' | 'archived';

export interface SiteLocation {
    id: string;
    name: string;
    town: string;
    province: string;
    addressLine?: string;
    postalCode?: string;
    lat?: number;
    lon?: number;
    status?: LocationStatus;
}

// ─── Social / OTAs ─────────────────────────────────────────────────────────────

export interface SiteSocialConfig {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
    googleMaps?: string;
    whatsapp?: string;
}

// ─── SEO ───────────────────────────────────────────────────────────────────────

export interface SiteSeoConfig {
    defaultTitle: string;
    /** Use %s as placeholder — e.g. "%s | El Rinconcito Matarraña" */
    titleTemplate: string;
    defaultDescription: string;
    siteUrl: string;
    ogImage?: string;
    /** ISO 3166-1 locale string — e.g. "es_ES" */
    locale: string;
    /** ISO 4217 currency code — e.g. "EUR" */
    currency: string;
}

// ─── Apartment ─────────────────────────────────────────────────────────────────

export type ApartmentStatus = 'active' | 'coming_soon' | 'archived';

export interface SiteApartment {
    slug: string;
    name: string;
    locationId: string;
    status: ApartmentStatus;
    sizeM2?: number | null;
    capacity?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    /** Short description (≤ 160 chars) */
    description?: string;
    /** Longer marketing copy */
    longDescription?: string;
    highlights?: string[];
    /** Ordered list of image URLs or paths */
    photos: string[];
    priceFrom?: number;
    priceCurrency?: string;
    publicBasePrice?: number | null;
    currency?: string | null;
    layout?: string;
}

// ─── Content ───────────────────────────────────────────────────────────────────

export interface SiteExperience {
    slug: string;
    title: string;
    shortSummary: string;
    category: string;
    town?: string;
    featured?: boolean;
    photos: string[];
    [key: string]: unknown;
}

export interface SiteGuide {
    slug: string;
    title: string;
    subtitle?: string;
    content?: string;
    imageUrl?: string;
    [key: string]: unknown;
}

export interface SiteBlogPost {
    slug: string;
    title: string;
    excerpt?: string;
    content?: string;
    date?: string;
    author?: string;
    imageUrl?: string;
    category?: string;
}

export interface SiteReview {
    author: string;
    text: string;
    rating: number;
    platform: 'Google' | 'Booking' | 'Airbnb' | 'Direct';
    date?: string;
}

export interface SiteFAQ {
    question: string;
    answer: string;
    tags?: string[];
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

export type BlockType =
    | 'hero'
    | 'gallery'
    | 'features'
    | 'apartments'
    | 'experiences'
    | 'blog'
    | 'contact'
    | 'map'
    | 'reviews'
    | 'faq'
    | 'cta';

export interface SiteBlock {
    id: string;
    type: BlockType;
    variant?: string; // e.g. "hero-a", "hero-b"
    title?: string;
    subtitle?: string;
    description?: string;
    photos?: string[];
    settings?: Record<string, unknown>;
    items?: any[]; // For specific block items
}

export interface SiteContentConfig {
    experiences: SiteExperience[];
    reviews: SiteReview[];
    guides?: SiteGuide[];
    faqs?: SiteFAQ[];
    blog: SiteBlogPost[];
}

// ─── Sections ──────────────────────────────────────────────────────────────────

export interface SiteSectionsEnabled {
    home: boolean;
    apartments: boolean;
    availability: boolean;
    experiences: boolean;
    guides: boolean;
    blog: boolean;
    contact: boolean;
    rentikpro: boolean;
    comingSoon: boolean;
}

// ─── Integrations ──────────────────────────────────────────────────────────────

export interface RentikProIntegration {
    apiBase: string;
    propertyId: string;
    /** Public read-only token */
    publicToken: string;
    /** Show "Powered by RentikPro" badge */
    showBadge?: boolean;
    /** Direct booking URL when engine is live */
    bookingUrl?: string;
}

export interface SiteIntegrationsConfig {
    rentikpro: RentikProIntegration;
    googleBusinessUrl?: string;
    tripAdvisorUrl?: string;
    /** Primary OTA booking URL (Booking.com, etc.) */
    bookingUrl?: string;
    /** Airbnb listing URL */
    airbnbUrl?: string;
}

// ─── Coming Soon ───────────────────────────────────────────────────────────────

export interface ComingSoonItem {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    status?: 'planned' | 'building' | 'ready';
}

export interface SiteComingSoonConfig {
    enabled: boolean;
    title: string;
    description?: string;
    items: ComingSoonItem[];
}

// ─── Root SiteConfig ───────────────────────────────────────────────────────────

export interface SiteConfig {
    meta: SiteConfigMeta;
    theme: SiteThemeConfig;
    locales: SiteLocalesConfig;
    brand: SiteBrandConfig;
    social: SiteSocialConfig;
    seo: SiteSeoConfig;
    locations: SiteLocation[];
    apartments: SiteApartment[];
    sectionsEnabled: SiteSectionsEnabled;
    integrations: SiteIntegrationsConfig;
    content: SiteContentConfig;
    /** If present, uses the block-based renderer instead of fixed sections */
    blocks?: SiteBlock[];
    comingSoon?: SiteComingSoonConfig;
}
