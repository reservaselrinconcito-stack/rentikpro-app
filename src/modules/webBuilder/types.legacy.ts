export type ThemeId = 'modern' | 'rural' | 'minimal' | 'premium' | 'modernWarm' | 'rusticPremium' | 'minimalLux';

export interface SiteConfig {
    slug: string;
    themeId: ThemeId;
    brand: {
        name: string;
        shortName?: string;
        phone?: string;
        email?: string;
        logoUrl?: string;
        tagline?: string;
        address?: string;
    };
    hero: {
        title?: string;
        subtitle?: string;
        imageUrl?: string;
        ctaLabel?: string;
        ctaHref?: string;
    };
    apartments: {
        title: string;
        items: ApartmentSummary[];
    };
    experiences: {
        title: string;
        items: Experience[];
    };
    location: {
        lat?: number;
        lng?: number;
        addressText?: string;
        mapUrl?: string; // Google Maps Embed URL
        mapEnabled: boolean;
    };
    contact: {
        whatsapp?: string;
        email?: string;
        phone?: string;
    };
    chatbot: {
        enabled: boolean;
        welcomeMessage?: string;
        leadCapture?: boolean;
    };
    integrations?: {
        rentikpro?: {
            propertyId?: string;
            publicToken?: string;
        };
    };
    sectionOrder: string[]; // Array of section IDs (e.g., ['hero', 'apartments', 'contact'])
}

export interface ApartmentSummary {
    id: string;
    name: string;
    description?: string;
    capacity?: number;
    photos?: string[];
    priceStart?: number;
}

export interface Experience {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    price?: string;
}
