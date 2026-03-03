/**
 * DEFAULT_SITE_CONFIG — Placeholder mínimo.
 *
 * Sirve como:
 *   - Valor de respaldo cuando no hay config de tenant cargada.
 *   - Referencia de estructura completa con todos los campos.
 *   - Punto de partida para crear configs de nuevos tenants.
 *
 * NO contiene datos reales de ningún tenant.
 */

import type { SiteConfig } from './types';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
    meta: {
        propertyId: 'placeholder',
        generatedAt: '2026-01-01T00:00:00Z',
        templateVersion: '1.0.0',
    },

    theme: {
        themeId: 'rural-warm',
        primaryColor: 'orange',
        serifFont: 'Playfair Display',
        sansFont: 'Inter',
    },

    locales: {
        defaultLocale: 'es',
        enabled: ['es', 'en'],
    },

    brand: {
        name: 'Mi Alojamiento Rural',
        shortName: 'Mi Alojamiento',
        slogan: 'Apartamentos rurales con encanto',
        owners: '',
        license: '',
        logoUrl: undefined,
        phone: '',
        phoneRaw: '',
        email: '',
        rentikproLandingUrl: 'https://rentikpro.com',
        rentikproContactUrl: 'https://rentikpro.com/contacto',
    },

    social: {
        instagram: undefined,
        facebook: undefined,
        youtube: undefined,
        tiktok: undefined,
        googleMaps: undefined,
        whatsapp: undefined,
    },

    seo: {
        defaultTitle: 'Mi Alojamiento Rural — Apartamentos con encanto',
        titleTemplate: '%s | Mi Alojamiento Rural',
        defaultDescription: 'Apartamentos rurales con encanto. Naturaleza, descanso y autenticidad.',
        siteUrl: 'https://example.com',
        ogImage: undefined,
        locale: 'es_ES',
        currency: 'EUR',
    },

    locations: [
        {
            id: 'principal',
            name: 'Alojamiento Principal',
            town: 'Mi Pueblo',
            province: 'Mi Provincia',
            addressLine: '',
            postalCode: '',
            lat: undefined,
            lon: undefined,
            status: 'active',
        },
    ],

    apartments: [
        {
            slug: 'apartamento-1',
            name: 'Apartamento 1',
            locationId: 'principal',
            status: 'active',
            sizeM2: null,
            capacity: null,
            bedrooms: null,
            bathrooms: null,
            description: '',
            longDescription: '',
            highlights: [],
            photos: [],
            priceFrom: undefined,
        },
    ],

    sectionsEnabled: {
        home: true,
        apartments: true,
        availability: true,
        experiences: true,
        guides: true,
        blog: true,
        contact: true,
        rentikpro: false,
        comingSoon: false,
    },

    integrations: {
        rentikpro: {
            apiBase: 'https://api.rentikpro.com',
            propertyId: '',
            publicToken: '',
            showBadge: false,
            bookingUrl: undefined,
        },
        googleBusinessUrl: undefined,
        tripAdvisorUrl: undefined,
        bookingUrl: undefined,
        airbnbUrl: undefined,
    },

    content: {
        experiences: [],
        guides: [],
        blog: [],
    },

    comingSoon: {
        enabled: false,
        title: 'Próximamente',
        description: '',
        items: [],
    },
};
