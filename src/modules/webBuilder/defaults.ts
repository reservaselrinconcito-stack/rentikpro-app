import { SiteConfigLegacy, SiteConfigV1 } from './types';

export const DEFAULT_SITE_CONFIG: SiteConfigLegacy = {
    slug: '',
    themeId: 'modernWarm',
    brand: {
        name: '',
        shortName: '',
        phone: '',
        email: ''
    },
    hero: {
        title: 'Bienvenido',
        subtitle: 'Descubre nuestros alojamientos únicos.',
        imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80',
        ctaLabel: 'Reservar Ahora',
        ctaHref: '#apartments'
    },
    apartments: {
        title: 'Nuestros Alojamientos',
        items: []
    },
    experiences: {
        title: 'Experiencias',
        items: []
    },
    location: {
        mapEnabled: true,
        addressText: ''
    },
    contact: {
        whatsapp: '',
        email: ''
    },
    chatbot: {
        enabled: true,
        welcomeMessage: '¡Hola! ¿En qué puedo ayudarte hoy?',
        leadCapture: true
    },
    sectionOrder: ['hero', 'apartments', 'location', 'contact']
};

export const DEFAULT_SITE_CONFIG_V1: SiteConfigV1 = {
    version: "1.0",
    slug: '',
    themeId: 'modern',
    globalData: {
        brandName: 'Apartamento El Rincón',
    },
    assets: [],
    theme: {
        colors: {
            primary: '#4f46e5', // indigo-600
            secondary: '#1e293b', // slate-800
            accent: '#10b981', // emerald-500
            background: '#f8fafc', // slate-50
            surface: '#ffffff', // white
            text: '#1e293b', // slate-800
            textMuted: '#64748b', // slate-500
            border: '#e2e8f0', // slate-200
        },
        typography: {
            headingFont: 'Inter, sans-serif',
            bodyFont: 'Inter, sans-serif',
            baseSize: '16px',
        },
        spacing: {
            scale: '1rem',
        },
        radius: {
            global: '0.5rem',
        }
    },
    pages: {
        '/': {
            id: 'page-home',
            path: '/',
            title: 'Inicio',
            description: 'Reserva tu estancia en Apartamento El Rincón (Fuentespalda).',
            blocks: [
                {
                    id: 'block-nav-1',
                    type: 'Navigation',
                    data: { brandName: 'Apartamento El Rincón' },
                    styles: {}
                },
                {
                    id: 'block-hero-1',
                    type: 'Hero',
                    data: {
                        title: 'Tu estancia perfecta en Fuentespalda',
                        subtitle: 'Descubre un alojamiento exclusivo diseñado para tu máximo confort y descanso.',
                        ctaLabel: 'Ver Disponibilidad',
                        ctaHref: '#apartments'
                    },
                    styles: {}
                },
                {
                    id: 'block-features-1',
                    type: 'Features',
                    data: {
                        features: [
                            { title: '4 Huéspedes', description: 'Espacio ideal para familias o grupos.', icon: 'Users' },
                            { title: '2 Habitaciones', description: 'Dormitorios amplios y equipados.', icon: 'Bed' },
                            { title: '1 Baño', description: 'Baño completo con ducha y amenities.', icon: 'Droplets' }
                        ]
                    },
                    styles: {}
                },
                {
                    id: 'block-grid-1',
                    type: 'ApartmentsGrid',
                    data: { title: 'Nuestras Unidades' },
                    styles: {}
                },
                {
                    id: 'block-gallery-1',
                    type: 'Gallery',
                    data: { title: 'Galería de Fotos' },
                    styles: {}
                },
                {
                    id: 'block-location-1',
                    type: 'Location',
                    data: { title: 'Ubicación', address: 'Fuentespalda (Teruel)' },
                    styles: {}
                },
                {
                    id: 'block-footer-1',
                    type: 'ContactFooter',
                    data: { brandName: 'Apartamento El Rincón' },
                    styles: {}
                }
            ]
        }
    }
};
