export interface SiteBrand {
    name: string;
    logoUrl?: string;
    phone?: string;
    email?: string;
    rentikproLandingUrl?: string;
    tagline?: string;
    address?: string;
    city?: string;
    province?: string;
    zip?: string;
}

export interface SiteApartment {
    id: string;
    slug?: string;
    name: string;
    capacity?: number;
    sizeM2?: number;
    photos?: string[];
    description?: string;
    priceFrom?: number;
    bathrooms?: number;
    bedrooms?: string | number;
    status?: 'active' | 'inactive' | 'coming_soon';
    locationId?: string;
    highlights?: string[];
    longDescription?: string;
}

export interface SiteLocation {
    id: string;
    town: string;
    // Add other location fields if needed
}

export interface SiteExperience {
    slug: string;
    title: string;
    category?: string;
    shortSummary?: string;
    photos: string[];
    featured?: boolean;
}

export interface SiteGuide {
    slug: string;
    title: string;
    category?: string;
    intro?: string;
}

export interface SiteIntegrationRentikPro {
    apiBase?: string;
    propertyId: string;
    publicToken: string;
}

export interface SiteIntegrations {
    rentikpro: SiteIntegrationRentikPro;
    bookingUrl?: string;
    airbnbUrl?: string;
}

export interface SiteSocial {
    instagram?: string;
    facebook?: string;
    googleMaps?: string;
    reviewsUrl?: string;
    whatsapp?: string;
}

export interface SiteHero {
    subtitle?: string;
    backgroundImage?: string;
}

export interface SiteComingSoon {
    enabled: boolean;
    title?: string;
    description?: string;
    items?: any[];
}

export interface SiteContent {
    experiences?: SiteExperience[];
    guides?: SiteGuide[];
    reviews?: any[];
}

export interface SiteConfig {
    slug?: string;
    brand: SiteBrand;
    apartments: SiteApartment[];
    locations?: SiteLocation[];
    experiences?: SiteExperience[]; // Legacy? Content.experiences seems preferred
    guides?: SiteGuide[];
    integrations: SiteIntegrations;
    social?: SiteSocial;
    hero?: SiteHero;
    comingSoon?: SiteComingSoon;
    content?: SiteContent;
    version?: number;
    templateId?: string;
    webspec?: any;
    sections?: any;
    // Legacy/Extra fields
    owners?: string;
    license?: string;
}
