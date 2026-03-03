/**
 * El Rinconcito Matarraña — Config de tenant real.
 *
 * Implementa el contrato SiteConfig (src/site-config/types.ts).
 * Todos los datos verificados de www.elrinconcitomatarraña.com
 *
 * Propietarios: Toni y Evelyn | Licencia: 2021-E-RC-453
 */

import type { SiteConfig } from './types';

export const RINCONCITO_CONFIG: SiteConfig = {
    // ─── Meta ───────────────────────────────────────────────────────────────────
    meta: {
        propertyId: 'el-rinconcito-matarrana',
        generatedAt: '2026-02-19T00:00:00Z',
        templateVersion: '1.0.0',
    },

    // ─── Theme ──────────────────────────────────────────────────────────────────
    theme: {
        themeId: 'rural-warm',
        primaryColor: 'orange',
        serifFont: 'Playfair Display',
        sansFont: 'Inter',
    },

    // ─── Locales ────────────────────────────────────────────────────────────────
    locales: {
        defaultLocale: 'es',
        enabled: ['es', 'en'],
    },

    // ─── Brand ──────────────────────────────────────────────────────────────────
    brand: {
        name: 'El Rinconcito Matarraña',
        shortName: 'El Rinconcito',
        slogan: 'Apartamentos rurales en el corazón del Matarraña',
        owners: 'Toni y Evelyn',
        license: '2021-E-RC-453',
        logoUrl: undefined,
        phone: '+34 629 83 73 69',
        phoneRaw: '34629837369',
        email: 'reservas.elrinconcito@gmail.com',
        rentikproLandingUrl: 'https://rentikpro.com',
        rentikproContactUrl: 'https://rentikpro.com/contacto',
    },

    // ─── Social / OTAs ──────────────────────────────────────────────────────────
    social: {
        instagram: 'https://instagram.com/elrinconcitomatarranya',
        facebook: 'https://m.facebook.com/elrinconcito.rinconcito.5',
        googleMaps: 'https://www.google.com/maps/place/ElRinconcito/@40.8071848,0.0641494,17z',
        whatsapp: 'https://api.whatsapp.com/send?phone=34629837369',
    },

    // ─── SEO ────────────────────────────────────────────────────────────────────
    seo: {
        defaultTitle: 'El Rinconcito Matarraña — Apartamentos Rurales en Fuentespalda, Teruel',
        titleTemplate: '%s | El Rinconcito Matarraña',
        defaultDescription:
            'Apartamentos rurales con encanto en Fuentespalda (Teruel). Naturaleza, estrellas, gastronomía y aventura en el corazón de la "Toscana española". Desde 90€/noche.',
        siteUrl: 'https://www.elrinconcitomatarraña.com',
        ogImage: 'https://cdn.turisapps.com/site-2302/c7da52d5-fa23-4989-8f2d-2ef267e6cab8/main.webp',
        locale: 'es_ES',
        currency: 'EUR',
    },

    // ─── Locations ──────────────────────────────────────────────────────────────
    locations: [
        {
            id: 'rinconcito',
            name: 'El Rinconcito Matarraña',
            town: 'Fuentespalda',
            province: 'Teruel',
            addressLine: 'Calle San Lorenzo 4',
            postalCode: '44587',
            lat: 40.80713190255378,
            lon: 0.06415288424000742,
            status: 'active',
        },
        {
            id: 'mas-matarrana',
            name: 'Mas Matarraña',
            town: 'Valjunquera',
            province: 'Teruel',
            status: 'coming_soon',
        },
    ],

    // ─── Apartments ─────────────────────────────────────────────────────────────
    apartments: [
        {
            slug: 'los-almendros',
            name: 'LOS ALMENDROS',
            locationId: 'rinconcito',
            status: 'active',
            priceFrom: 90,
            sizeM2: 50,
            capacity: 4,
            bedrooms: 1,
            bathrooms: 1,
            description: 'Acogedor y luminoso, perfecto para familias o grupos de hasta 4 personas (2 adultos más dos niños). Cocina equipada, salón amplio y preciosas vistas a la naturaleza del Matarraña.',
            longDescription: 'Los Almendros es el hogar ideal para quienes buscan confort sin renunciar a la autenticidad rural. El salón amplio y luminoso, con TV y equipo de música, invita al relax después de un día de excursiones. La cocina está completamente equipada para que prepares lo que quieras. La habitación doble con cama de 160 cm garantiza un descanso perfecto, y el sofá cama permite alojar cómodamente a dos niños más.',
            highlights: [
                'Salón amplio con TV y equipo de música',
                'Cocina totalmente equipada (menaje completo, microondas, lavadora)',
                'Habitación con cama doble matrimonial 160 cm',
                'Sofá cama para hasta 2 niños',
                'Servicio de limpieza incluido',
                'Zona de juegos infantil compartida',
                'Vistas a la naturaleza del Matarraña',
                'Ubicación en calle tranquila y silenciosa de Fuentespalda',
            ],
            photos: [
                '/assets/rooms/los-almendros/01.webp',
                '/assets/rooms/los-almendros/03.png',
                '/assets/rooms/los-almendros/04.png',
                '/assets/rooms/los-almendros/05.png',
                '/assets/rooms/los-almendros/06.png',
                '/assets/rooms/los-almendros/07.png',
                '/assets/rooms/los-almendros/08.png',
                '/assets/rooms/los-almendros/09.png',
                '/assets/rooms/los-almendros/02.gif',
                '/assets/rooms/los-almendros/10.gif',
            ],
        },
        {
            slug: 'la-ermita',
            name: 'LA ERMITA',
            locationId: 'rinconcito',
            status: 'active',
            priceFrom: 90,
            sizeM2: 50,
            capacity: 4,
            bedrooms: 1,
            bathrooms: 1,
            description: 'Ideal para parejas que buscan tranquilidad. Cama de matrimonio, ambiente rústico con detalles modernos y todo lo necesario para una escapada romántica en el Matarraña.',
            longDescription: 'La Ermita es nuestro apartamento más especial para parejas. Decorado con muy buen gusto y cuidado hasta el último detalle, mezcla lo rústico con lo moderno de forma elegante. La cama doble de 160 cm ocupa el protagonismo de la habitación, pero el sofá cama también permite traer a los peques.',
            highlights: [
                'Salón con TV y equipo de música',
                'Cocina totalmente equipada (menaje completo, microondas, lavadora)',
                'Habitación con cama doble matrimonial 160 cm',
                'Sofá cama para hasta 2 niños',
                'Servicio de limpieza incluido',
                'Decoración rústica de gran gusto con detalles modernos',
                'Ambiente romántico y tranquilo',
                'Ubicación en calle silenciosa en el corazón de Fuentespalda',
            ],
            photos: [
                '/assets/rooms/la-ermita/01.webp',
                '/assets/rooms/la-ermita/03.png',
                '/assets/rooms/la-ermita/04.png',
                '/assets/rooms/la-ermita/05.png',
                '/assets/rooms/la-ermita/06.png',
                '/assets/rooms/la-ermita/07.png',
                '/assets/rooms/la-ermita/08.png',
                '/assets/rooms/la-ermita/09.png',
                '/assets/rooms/la-ermita/02.gif',
                '/assets/rooms/la-ermita/10.gif',
            ],
        },
        {
            slug: 'la-tirolina',
            name: 'LA TIROLINA',
            locationId: 'rinconcito',
            status: 'active',
            priceFrom: 150,
            sizeM2: 95,
            capacity: 6,
            bedrooms: 2,
            bathrooms: 2,
            description: 'Espacioso y funcional, con capacidad para 6 personas (4 adultos y dos niños). 95 m² de estilo rural auténtico con dos habitaciones y dos baños.',
            longDescription: 'La Tirolina es nuestro apartamento estrella para grupos y familias numerosas. Con 95 m² distribuidos en dos habitaciones (cada una con cama doble de 160 cm y baño propio) más sofá cama, ofrece la comodidad de un hogar sin perder el encanto rural.',
            highlights: [
                '2 habitaciones con cama doble matrimonial 160 cm cada una',
                '2 baños completos (uno por habitación)',
                'Salón amplio con TV y equipo de música',
                'Cocina totalmente equipada (menaje completo, microondas, lavadora)',
                'Sofá cama para hasta 2 niños',
                'Servicio de limpieza incluido',
                '95 m² de espacio — el apartamento más grande',
                'Ideal para dos familias o grupos de amigos',
            ],
            photos: [
                '/assets/rooms/la-tirolina/01.webp',
                '/assets/rooms/la-tirolina/03.png',
                '/assets/rooms/la-tirolina/04.png',
                '/assets/rooms/la-tirolina/05.png',
                '/assets/rooms/la-tirolina/06.png',
                '/assets/rooms/la-tirolina/07.png',
                '/assets/rooms/la-tirolina/08.png',
                '/assets/rooms/la-tirolina/09.png',
                '/assets/rooms/la-tirolina/02.gif',
                '/assets/rooms/la-tirolina/10.gif',
            ],
        },
        {
            slug: 'mas-matarrana-el-olivo',
            name: 'El Olivo',
            locationId: 'mas-matarrana',
            status: 'coming_soon',
            priceFrom: 90,
            sizeM2: 50,
            capacity: 4,
            bedrooms: null,
            bathrooms: 1,
            layout: 'Loft abierto',
            description: 'Loft abierto con cocina-comedor y baño. Próximamente en Valjunquera.',
            longDescription: 'El Olivo será parte del nuevo proyecto Mas Matarraña en Valjunquera — dos refugios gemelos diseñados para fundirse con el paisaje de olivos centenarios.',
            highlights: [
                'Zona de barbacoa privada',
                'Terreno propio con olivos',
                'Cielo sin contaminación lumínica — ideal para estrellas',
                'A 30 min de El Rinconcito',
            ],
            photos: ['/placeholders/coming-soon-1.svg'],
        },
        {
            slug: 'mas-matarrana-la-parra',
            name: 'La Parra',
            locationId: 'mas-matarrana',
            status: 'coming_soon',
            priceFrom: 90,
            sizeM2: 50,
            capacity: 4,
            bedrooms: null,
            bathrooms: 1,
            layout: 'Loft abierto',
            description: 'Loft abierto con cocina-comedor y baño. Próximamente en Valjunquera.',
            longDescription: 'La Parra formará pareja con El Olivo en el proyecto Mas Matarraña — dos alojamientos gemelos pensados para grupos que quieren compartir el entorno pero mantener su privacidad.',
            highlights: [
                'Zona de barbacoa privada',
                'Terreno propio con olivos',
                'Cielo sin contaminación lumínica — ideal para estrellas',
                'A 30 min de El Rinconcito',
            ],
            photos: ['/placeholders/coming-soon-2.svg'],
        },
    ],

    // ─── Sections ───────────────────────────────────────────────────────────────
    sectionsEnabled: {
        home: true,
        apartments: true,
        availability: true,
        experiences: true,
        guides: true,
        blog: true,
        contact: true,
        rentikpro: true,
        comingSoon: true,
    },

    // ─── Integrations ────────────────────────────────────────────────────────────
    integrations: {
        rentikpro: {
            apiBase: 'https://api.rentikpro.com',
            propertyId: 'el-rinconcito-matarrana',
            publicToken: '',
            showBadge: true,
            bookingUrl: undefined,
        },
        googleBusinessUrl: 'https://www.google.com/maps/place/ElRinconcito/@40.8071848,0.0641494,17z',
        bookingUrl: 'https://www.booking.com/hotel/es/el-rinconcito-fuentespalda12.es.html',
        airbnbUrl: 'https://www.airbnb.es/rooms/577228298619723410',
    },

    // ─── Content (cargados desde SiteConfig) ───────────────────────────
    content: {
        experiences: [
            {
                slug: 'bike-park-fuentespalda',
                title: 'Matarraña Bike Park & Dirt Park',
                category: 'deportivo',
                town: 'Fuentespalda',
                shortSummary: 'El nuevo centro BTT de referencia del Matarraña con 5 líneas de descenso y un dirt park para saltos de todos los niveles.',
                featured: true,
                photos: [
                    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1544191696-102dbdaeeaa0?w=1200&auto=format&fit=crop'
                ],
                highlights: [
                    '5 líneas de descenso con 290 m de desnivel',
                    'Dirt Park con 4 líneas de saltos',
                    'Acceso libre 365 días al año'
                ],
                practicalInfo: [
                    'Ubicación: Explanada del Camping de Fuentespalda',
                    'Acceso libre y gratuito',
                    'Casco obligatorio'
                ],
                seasonality: 'Abierto todo el año',
                tags: ['MTB', 'Descenso', 'Adrenalina', 'Gratis'],
                sources: ['https://www.matarranyaturismo.es']
            },
            {
                slug: 'parrizal-beceite-ruta',
                title: 'Ruta del Parrizal de Beceite',
                category: 'aire_y_agua',
                town: 'Beceite',
                shortSummary: 'La ruta más icónica del Matarraña. Pasarelas de madera sobre aguas turquesas.',
                featured: true,
                photos: [
                    'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1596662951482-0be24d28e89f?w=1200&auto=format&fit=crop'
                ],
                highlights: [
                    'Pasarelas sobre aguas cristalinas',
                    'Estrets del Parrissal: cañón de 60m de alto',
                    'Pinturas rupestres Patrimonio de la Humanidad'
                ],
                practicalInfo: [
                    'Ticket obligatorio online (5€)',
                    'Prohibido el baño y perros',
                    'Calzado de trekking imprescindible'
                ],
                seasonality: 'Todo el año',
                tags: ['Senderismo', 'Naturaleza', 'Beceite'],
                sources: ['https://www.beceite.es']
            }
        ],
        reviews: [
            {
                author: 'María José',
                text: 'Un lugar mágico para desconectar. El apartamento es precioso y no le falta detalle.',
                rating: 5,
                platform: 'Google',
                date: '2023-08-15'
            },
            {
                author: 'Carlos Ruiz',
                text: 'La atención de Toni y su equipo es excepcional. Repetiremos seguro.',
                rating: 5,
                platform: 'Booking',
                date: '2023-09-02'
            }
        ],
        guides: [
            {
                slug: 'zonas-de-bano-matarrana',
                title: 'Las mejores zonas de baño del Matarraña',
                subtitle: 'Guía completa 2026',
                content: 'El Matarraña es mucho más que un paisaje de olivos: sus ríos mantienen un caudal constante y una calidad de agua excepcional.',
                imageUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&auto=format&fit=crop',
                category: 'zonas_de_bano',
                intro: 'El Matarraña es mucho más que un paisaje de olivos...',
                sections: [
                    {
                        title: 'La Pesquera de Beceite',
                        paragraphs: ['La estrella indiscutible. 15 pozas de agua turquesa.'],
                        bullets: ['Acceso regulado en verano', 'Escarpines imprescindibles']
                    }
                ],
                faqs: [
                    { q: '¿Hay que reservar?', a: 'En verano sí, ticket en beceite.es' }
                ],
                safetyNotes: ['Prohibido el baño en el Parrizal'],
                sources: ['https://www.beceite.es'],
                photos: ['https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&auto=format&fit=crop']
            }
        ],
        blog: [
            {
                slug: 'nuevo-bike-park-2026',
                title: 'Inauguración del Matarraña Bike Park',
                excerpt: 'Fuentespalda se convierte en el epicentro del BTT con la apertura de su nuevo Dirt Park.',
                content: 'El próximo 28 de febrero de 2026 se inaugura oficialmente...',
                date: '2026-02-19',
                author: 'Toni Gutierrez',
                imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&auto=format&fit=crop',
                category: 'Deportes'
            }
        ],
        faqs: [
            {
                question: '¿Aceptáis mascotas?',
                answer: 'Sí, somos pet-friendly en El Rinconcito. Admitimos mascotas bajo petición y con un pequeño suplemento de limpieza. Por favor, avísanos al reservar.',
                tags: ['mascotas', 'pet-friendly', 'normas']
            },
            {
                question: '¿Hay WiFi?',
                answer: 'Sí, disponemos de conexión WiFi de alta velocidad (fibra óptica) gratuita en todos los apartamentos.',
                tags: ['wifi', 'internet', 'servicios']
            },
            {
                question: '¿Hora de entrada y salida?',
                answer: 'El check-in es a partir de las 16:00h y el check-out hasta las 11:00h. Ofrecemos Late Check-out sujeto a disponibilidad.',
                tags: ['horarios', 'check-in', 'check-out']
            },
            {
                question: '¿Cómo funciona la entrada autónoma?',
                answer: 'Utilizamos cerraduras inteligentes. El día de tu llegada recibirás un código personal para acceder tanto al edificio como a tu apartamento directamente, sin esperas.',
                tags: ['check-in', 'acceso', 'llaves']
            }
        ]
    },

    // ─── Coming Soon ─────────────────────────────────────────────────────────────
    comingSoon: {
        enabled: true,
        title: 'Mas Matarraña',
        description: 'Un nuevo concepto en Valjunquera. Dos refugios gemelos diseñados para fundirse con el paisaje de olivos.',
        items: [
            {
                id: 'mas-matarrana-el-olivo',
                name: 'El Olivo',
                description: 'Loft abierto con cocina-comedor y baño. Próximamente en Valjunquera.',
                status: 'building',
            },
            {
                id: 'mas-matarrana-la-parra',
                name: 'La Parra',
                description: 'Loft abierto con cocina-comedor y baño. Próximamente en Valjunquera.',
                status: 'building',
            },
        ],
    },
};
