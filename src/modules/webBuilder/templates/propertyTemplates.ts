import { SiteConfigV1, BlockInstance } from '../types';
import { createDefaultBlock } from '../../../pages/builder/blocks/defaults';

export interface PropertyTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    seed: (info: { name: string; location?: string }) => SiteConfigV1;
}

const commonTheme = {
    colors: {
        primary: '#4f46e5',
        secondary: '#1e293b',
        accent: '#10b981',
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#1e293b',
        textMuted: '#64748b',
        border: '#e2e8f0',
    },
    typography: {
        headingFont: 'Inter, sans-serif',
        bodyFont: 'Inter, sans-serif',
        baseSize: '16px',
    },
    spacing: { scale: '1rem' },
    radius: { global: '0.75rem' }
};

export const PROPERTY_TEMPLATES: PropertyTemplate[] = [
    {
        id: 'apartamento-turistico',
        name: 'Apartamento Turístico',
        description: 'Ideal para apartamentos urbanos o de playa. Enfoque claro en confort y ubicación.',
        icon: '🏢',
        seed: (info) => ({
            version: '1.0',
            slug: '',
            themeId: 'modern',
            globalData: { brandName: info.name || 'Apartamento El Rincón' },
            assets: [],
            theme: commonTheme,
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: info.name || 'Apartamento El Rincón',
                    description: `Reserva tu estancia en ${info.name || 'Apartamento El Rincón'}`,
                    blocks: [
                        { ...createDefaultBlock('Navigation'), data: { brandName: info.name || 'Apartamento El Rincón' } },
                        {
                            ...createDefaultBlock('Hero'),
                            data: {
                                title: info.name || 'Apartamento El Rincón',
                                subtitle: `Tu estancia perfecta en ${info.location || 'Fuentespalda (Teruel)'}. Confort, diseño y una ubicación inmejorable.`,
                                ctaLabel: 'Ver Disponibilidad',
                                imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2000&auto=format&fit=crop'
                            }
                        },
                        {
                            ...createDefaultBlock('Features'),
                            data: {
                                title: 'Tu hogar en la ciudad',
                                features: [
                                    { title: 'Capacidad', description: 'Hasta 4 huéspedes con total confort.', icon: 'Users' },
                                    { title: 'Habitaciones', description: '2 dormitorios amplios y luminosos.', icon: 'Bed' },
                                    { title: 'Baños', description: '1 baño completo con amenities de cortesía.', icon: 'Droplets' },
                                    { title: 'WiFi Alta Velocidad', description: 'Ideal para teletrabajo o ocio.', icon: 'Wifi' }
                                ]
                            }
                        },
                        { ...createDefaultBlock('Gallery'), data: { title: 'Explora el apartamento' } },
                        {
                            ...createDefaultBlock('Location'),
                            data: {
                                title: 'Ubicación Inmejorable',
                                address: info.location || 'Fuentespalda (Teruel)',
                                phone: '+34 900 000 000'
                            }
                        },
                        {
                            ...createDefaultBlock('CTA'),
                            data: {
                                title: '¿Quieres confirmar tus fechas?',
                                subtitle: 'Consulta disponibilidad en tiempo real y reserva al mejor precio garantizado.',
                                ctaLabel: 'Reservar Ahora'
                            }
                        },
                        { ...createDefaultBlock('ContactFooter'), data: { brandName: info.name || 'Apartamento El Rincón' } }
                    ]
                }
            }
        })
    },
    {
        id: 'casa-rural',
        name: 'Casa Rural',
        description: 'Atmósfera cálida y rústica. Perfecta para escapadas de naturaleza y grupos.',
        icon: '🏡',
        seed: (info) => ({
            version: '1.0',
            slug: '',
            themeId: 'nature',
            globalData: { brandName: info.name || 'Casa Rural El Sauco' },
            assets: [],
            theme: {
                ...commonTheme,
                colors: {
                    ...commonTheme.colors,
                    primary: '#059669',
                    secondary: '#78350f',
                    accent: '#d97706',
                    background: '#fefce8',
                    text: '#451a03',
                }
            },
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: info.name || 'Casa Rural El Sauco',
                    description: `Desconecta en ${info.name || 'Casa Rural El Sauco'}`,
                    blocks: [
                        { ...createDefaultBlock('Navigation'), data: { brandName: info.name || 'Casa Rural El Sauco' } },
                        {
                            ...createDefaultBlock('Hero'),
                            variant: 'B',
                            data: {
                                title: info.name || 'Casa Rural El Sauco',
                                subtitle: `Desconexión total en el corazón de ${info.location || 'Fuentespalda'}. Un entorno natural único donde el tiempo se detiene.`,
                                ctaLabel: 'Ver Galería',
                                imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop'
                            }
                        },
                        {
                            ...createDefaultBlock('Features'),
                            data: {
                                title: 'Naturaleza y Confort',
                                features: [
                                    { title: 'Entorno Natural', description: 'Rutas de senderismo y aire puro desde la puerta.', icon: 'Sun' },
                                    { title: 'Barbacoa y Jardín', description: 'Espacios exteriores para disfrutar en grupo.', icon: 'Utensils' },
                                    { title: 'Chimenea', description: 'Noches acogedoras junto al fuego.', icon: 'Zap' },
                                    { title: 'Mascotas Bienvenidas', description: 'Trae a tu mejor amigo contigo.', icon: 'Heart' }
                                ]
                            }
                        },
                        { ...createDefaultBlock('Gallery'), data: { title: 'Nuestra Casa y Entorno' } },
                        {
                            ...createDefaultBlock('Location'),
                            data: {
                                title: 'Dónde estamos',
                                address: info.location || 'Fuentespalda, Teruel',
                                phone: '+34 900 000 000'
                            }
                        },
                        {
                            ...createDefaultBlock('CTA'),
                            data: {
                                title: 'Descubre la magia de lo rural',
                                subtitle: 'Reserva tu próxima escapada y vuelve a conectar con lo que importa.',
                                ctaLabel: 'Reservar mi Estancia'
                            }
                        },
                        { ...createDefaultBlock('ContactFooter'), data: { brandName: info.name || 'Casa Rural El Sauco' } }
                    ]
                }
            }
        })
    },
    {
        id: 'edificio-apartamentos',
        name: 'Edificio de Apartamentos',
        description: 'Varios alojamientos en una misma web. Ideal para complejos y aparthoteles.',
        icon: '🏢',
        seed: (info) => ({
            version: '1.0',
            slug: '',
            themeId: 'luxury',
            globalData: { brandName: info.name || 'Residencial El Rincón' },
            assets: [],
            theme: {
                ...commonTheme,
                colors: {
                    ...commonTheme.colors,
                    primary: '#1e293b',
                    secondary: '#0f172a',
                    accent: '#d4af37',
                    background: '#ffffff',
                }
            },
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: info.name || 'Residencial El Rincón',
                    description: `Nuestros apartamentos en ${info.name || 'Residencial El Rincón'}`,
                    blocks: [
                        { ...createDefaultBlock('Navigation'), data: { brandName: info.name || 'Residencial El Rincón' } },
                        {
                            ...createDefaultBlock('Hero'),
                            data: {
                                title: info.name || 'Residencial El Rincón',
                                subtitle: `Colección de alojamientos premium en ${info.location || 'Fuentespalda'}. Calidad garantizada para viajeros exigentes.`,
                                ctaLabel: 'Ver Catálogo',
                                imageUrl: 'https://images.unsplash.com/photo-1545324418-f1d3c5b5a744?q=80&w=2000&auto=format&fit=crop'
                            }
                        },
                        {
                            ...createDefaultBlock('ApartmentsGrid'),
                            data: {
                                title: 'Nuestras Unidades',
                                subtitle: 'Elige el apartamento que mejor se adapte a tu grupo o familia.'
                            }
                        },
                        {
                            ...createDefaultBlock('Features'),
                            data: {
                                title: 'Servicios de Clase Mundial',
                                features: [
                                    { title: 'Check-in Autónomo', description: 'Acceso fácil y seguro en cualquier momento.', icon: 'Key' },
                                    { title: 'Limpieza Profesional', description: 'Estándares de higiene rigurosos en cada estancia.', icon: 'Check' },
                                    { title: 'Conserjería Digital', description: 'Estamos a un mensaje de distancia.', icon: 'MessageSquare' },
                                    { title: 'Parking Privado', description: 'Seguridad para tu vehículo durante la estancia.', icon: 'Truck' }
                                ]
                            }
                        },
                        { ...createDefaultBlock('Gallery'), data: { title: 'Instalaciones Comunes' } },
                        {
                            ...createDefaultBlock('CTA'),
                            data: {
                                title: 'Tu próxima aventura comienza aquí',
                                subtitle: 'Garantizamos el mejor precio reservando directamente con nosotros.',
                                ctaLabel: 'Consultar Disponibilidad'
                            }
                        },
                        { ...createDefaultBlock('ContactFooter'), data: { brandName: info.name || 'Residencial El Rincón' } }
                    ]
                }
            }
        })
    }
];
