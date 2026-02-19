import { SiteConfig } from './types';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
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
    apartments: [], // Will be populated from existing properties if available
    experiences: [],
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
    }
};
