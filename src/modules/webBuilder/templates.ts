import { SiteConfig } from './types';
import { DEFAULT_SITE_CONFIG } from './defaults';

// --- TEMPLATE DEFINITIONS ---
// Each template exports a partial SiteConfig that will be deeply merged with defaults.

export type TemplateId = 'modern' | 'rural' | 'minimal' | 'premium';

export interface TemplateDefinition {
    id: TemplateId;
    name: string;
    description: string;
    thumbnail: string; // Placeholder or Color
    config: Partial<SiteConfig>;
}

// 1. MODERN (Comercial, conversion focused)
const MODERN_CONFIG: Partial<SiteConfig> = {
    themeId: 'modern',
    sectionOrder: [
        'hero',
        'apartments', // AccommodationsGrid
        'features',   // Highlights3 / AmenitiesIcons combined idea? Let's use generic names mapped to components
        'gallery',
        'testimonials',
        'faq',
        'location',
        'contact'
    ],
    hero: {
        title: 'Bienvenido a Tu Próximo Destino',
        subtitle: 'Descubre la comodidad y el estilo en nuestros alojamientos exclusivos.',
        ctaLabel: 'Reservar Ahora',
        ctaHref: '#apartments',
        imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80'
    },
    // We can pre-fill other sections if SiteConfig supports them specifically, 
    // otherwise they rely on the renderer handling the 'sectionOrder'
};

// 2. RURAL (Warm, storytelling)
const RURAL_CONFIG: Partial<SiteConfig> = {
    themeId: 'rural',
    sectionOrder: [
        'hero',
        'story',      // "Nuestra casa" 
        'experiences', // ExperienceTiles
        'apartments', // AccommodationsList
        'location',   // LocalGuide
        'gallery',
        'contact'
    ],
    hero: {
        title: 'Escápate a la Naturaleza',
        subtitle: 'Desconecta de la rutina y respira aire puro en un entorno inigualable.',
        ctaLabel: 'Ver Disponibilidad',
        ctaHref: '#apartments',
        imageUrl: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80'
    }
};

// 3. MINIMAL (Fast, simple)
const MINIMAL_CONFIG: Partial<SiteConfig> = {
    themeId: 'minimal',
    sectionOrder: [
        'hero',
        'apartments',
        'location',
        'contact'
    ],
    hero: {
        title: 'Simplicidad y Confort',
        subtitle: 'Todo lo que necesitas para tu estancia perfecta.',
        ctaLabel: 'Reservar',
        ctaHref: '#apartments',
        imageUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80'
    }
};

// 4. PREMIUM (Hotel style, trust)
const PREMIUM_CONFIG: Partial<SiteConfig> = {
    themeId: 'premium',
    sectionOrder: [
        'hero',
        'features', // TrustBar / Amenities
        'apartments', // RoomShowcase
        'experiences',
        'gallery',
        'testimonials', // ReviewsExtended
        'faq',
        'location',
        'contact'
    ],
    hero: {
        title: 'Experiencia de Lujo Inolvidable',
        subtitle: 'Servicio exclusivo y atención al detalle para los huéspedes más exigentes.',
        ctaLabel: 'Reserva Tu Estancia',
        ctaHref: '#apartments',
        imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80'
    }
};

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
    modern: {
        id: 'modern',
        name: 'Modern Stay',
        description: 'Diseño limpio y comercial, ideal para maximizar reservas.',
        thumbnail: 'bg-gradient-to-br from-blue-500 to-indigo-600',
        config: MODERN_CONFIG
    },
    rural: {
        id: 'rural',
        name: 'Casa Rural',
        description: 'Tonos cálidos y enfoque en la experiencia y el entorno.',
        thumbnail: 'bg-gradient-to-br from-amber-600 to-orange-700',
        config: RURAL_CONFIG
    },
    minimal: {
        id: 'minimal',
        name: 'Minimalist',
        description: 'Elegancia simple. Carga rápida y va directo al grano.',
        thumbnail: 'bg-gradient-to-br from-slate-700 to-slate-900',
        config: MINIMAL_CONFIG
    },
    premium: {
        id: 'premium',
        name: 'Grand Hotel',
        description: 'Estilo lujoso para propiedades de alto valor.',
        thumbnail: 'bg-gradient-to-br from-slate-800 to-amber-500',
        config: PREMIUM_CONFIG
    }
};

export const getTemplateConfig = (id: TemplateId): SiteConfig => {
    const tmpl = TEMPLATES[id];
    if (!tmpl) return DEFAULT_SITE_CONFIG;

    // Simplistic merge for now, real App uses deep merge in adapters
    return {
        ...DEFAULT_SITE_CONFIG,
        ...tmpl.config,
        brand: { ...DEFAULT_SITE_CONFIG.brand, ...tmpl.config.brand },
        hero: { ...DEFAULT_SITE_CONFIG.hero, ...tmpl.config.hero },
        contact: { ...DEFAULT_SITE_CONFIG.contact, ...tmpl.config.contact },
        // Ensure arrays are overwritten if present in template, else use default
        sectionOrder: tmpl.config.sectionOrder || DEFAULT_SITE_CONFIG.sectionOrder
    };
};
