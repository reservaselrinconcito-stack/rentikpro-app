
import { WebSpec, WebSection, WebBrand } from '../types';

export const DEFAULT_TEMPLATE: WebSpec['templateId'] = 'modern';

export const createDefaultSections = (): WebSection[] => [
    {
        id: 'hero',
        type: 'hero',
        enabled: true,
        order: 0,
        data: {
            title: 'Bienvenido a nuestra casa',
            subtitle: 'Disfruta de una estancia inolvidable en el corazón de la ciudad.',
            ctaText: 'Ver Disponibilidad',
            imageUrl: '' // Todo: Default placeholder
        }
    },
    {
        id: 'apartments',
        type: 'apartments',
        enabled: true,
        order: 1,
        data: {
            layout: 'cards', // cards | list | grid
            showPrices: true
        }
    },
    {
        id: 'features',
        type: 'features',
        enabled: true,
        order: 2,
        data: {
            title: 'Lo que ofrecemos'
        }
    },
    {
        id: 'location',
        type: 'location',
        enabled: true,
        order: 3,
        data: {
            title: 'Ubicación'
        }
    },
    {
        id: 'contact',
        type: 'contact',
        enabled: true,
        order: 4,
        data: {
            title: 'Contacto',
            showForm: true
        }
    },
    {
        id: 'chatbot',
        type: 'chatbot',
        enabled: true,
        order: 99,
        data: {
            enabled: true,
            welcomeText: '¡Hola! ¿En qué puedo ayudarte hoy?'
        }
    }
];

export const normalizeWebSpec = (rawConfig: any): WebSpec => {
    // 1. If already v1, return as is (with fail-safes)
    if (rawConfig && rawConfig.version === 1) {
        return {
            version: 1,
            templateId: rawConfig.templateId || DEFAULT_TEMPLATE,
            brand: rawConfig.brand || { name: 'Mi Sitio' },
            theme: rawConfig.theme || {},
            sections: Array.isArray(rawConfig.sections) ? rawConfig.sections : createDefaultSections(),
            integrations: rawConfig.integrations
        };
    }

    // 2. Migration from Legacy (config_json structure)
    // Legacy had: brand: { name, phone, email }, apartments: [], etc.
    const brand: WebBrand = {
        name: rawConfig?.brand?.name || 'Mi Alojamiento',
        phone: rawConfig?.brand?.phone,
        email: rawConfig?.brand?.email,
        logoUrl: rawConfig?.brand?.logoUrl
    };

    // If migrating, we assume a fresh section structure but keeping legacy intent where possible
    // (Actual apartment data is fetched fresh from DB usually, but here we just set up the spec)

    return {
        version: 1,
        templateId: rawConfig?.template_slug === 'universal-v1' ? 'modern' : (rawConfig?.templateId || 'modern'),
        brand,
        theme: rawConfig?.theme || {},
        sections: createDefaultSections(),
        integrations: rawConfig?.integrations
    };
};
