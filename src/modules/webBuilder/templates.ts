/**
 * src/pages/builder/webpro/templates.ts
 *
 * 10 plantillas completas WebPro.
 * Cada plantilla tiene:
 *  - Metadatos (id, name, category, description, emoji)
 *  - Tema completo (colores + tipografías)
 *  - Bloques precargados con datos reales de ejemplo
 *
 * Para añadir una nueva plantilla:
 *  1. Añadir entrada a WEBPRO_TEMPLATES
 *  2. No cambiar nada más en el core
 */

import { SiteConfigV1, BlockInstance } from './types';

// ─── Helper ───────────────────────────────────────────────────────────────────

let _id = 0;
function uid(type: string): string {
    return `${type.toLowerCase()}-${Date.now()}-${++_id}`;
}

function block(type: string, variant: string, data: Record<string, any>): BlockInstance {
    return {
        id: uid(type),
        type,
        variant,
        data,
        styles: { desktop: {}, tablet: {}, mobile: {} },
        hidden: false,
    };
}

// ─── Template Type ─────────────────────────────────────────────────────────────

export interface WebProTemplate {
    id: string;
    name: string;
    emoji: string;
    category: 'saas' | 'business' | 'hospitality' | 'food' | 'health' | 'portfolio' | 'event' | 'agency' | 'commerce' | 'marketing';
    description: string;
    previewColor: string; // dominant brand color for thumbnail
    config: SiteConfigV1;

    // Marketplace metadata
    tags?: string[];
    author?: string;
    rating?: number;        // 1-5
    downloads?: number;
    isFree?: boolean;
    price?: number;         // EUR, 0 = free
    previewImages?: string[]; // Unsplash URLs for the marketplace gallery
    features?: string[];    // bullet list of what's included
    isPro?: boolean;        // Pro plan only
}

// ─── Shared theme presets ──────────────────────────────────────────────────────

const THEME_INDIGO = {
    colors: { primary: '#4f46e5', secondary: '#1e293b', accent: '#06b6d4', background: '#f8fafc', surface: '#ffffff', text: '#1e293b', textMuted: '#64748b', border: '#e2e8f0' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
    spacing: { scale: '1.25' },
    radius: { global: '12px' }
};

const THEME_SLATE = {
    colors: { primary: '#0f172a', secondary: '#334155', accent: '#f59e0b', background: '#f1f5f9', surface: '#ffffff', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
    spacing: { scale: '1.25' },
    radius: { global: '8px' }
};

const THEME_AMBER = {
    colors: { primary: '#d97706', secondary: '#78350f', accent: '#dc2626', background: '#fffbeb', surface: '#ffffff', text: '#451a03', textMuted: '#92400e', border: '#fde68a' },
    typography: { headingFont: 'Georgia', bodyFont: 'Inter', baseSize: '16px' },
    spacing: { scale: '1.3' },
    radius: { global: '6px' }
};

const THEME_EMERALD = {
    colors: { primary: '#059669', secondary: '#064e3b', accent: '#10b981', background: '#ecfdf5', surface: '#ffffff', text: '#064e3b', textMuted: '#047857', border: '#a7f3d0' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
    spacing: { scale: '1.2' },
    radius: { global: '16px' }
};

const THEME_ROSE = {
    colors: { primary: '#e11d48', secondary: '#881337', accent: '#f97316', background: '#fff1f2', surface: '#ffffff', text: '#1e293b', textMuted: '#64748b', border: '#fecdd3' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
    spacing: { scale: '1.2' },
    radius: { global: '20px' }
};

const THEME_VIOLET = {
    colors: { primary: '#7c3aed', secondary: '#4c1d95', accent: '#ec4899', background: '#f5f3ff', surface: '#ffffff', text: '#1e293b', textMuted: '#6d28d9', border: '#ddd6fe' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
    spacing: { scale: '1.25' },
    radius: { global: '14px' }
};

const THEME_DARK = {
    colors: { primary: '#a78bfa', secondary: '#8b5cf6', accent: '#f472b6', background: '#0f0f1a', surface: '#1e1b4b', text: '#f1f5f9', textMuted: '#94a3b8', border: '#2d2b55' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
    spacing: { scale: '1.3' },
    radius: { global: '18px' }
};

const THEME_STONE = {
    colors: { primary: '#57534e', secondary: '#1c1917', accent: '#a16207', background: '#fafaf9', surface: '#ffffff', text: '#1c1917', textMuted: '#78716c', border: '#e7e5e4' },
    typography: { headingFont: 'Georgia', bodyFont: 'Inter', baseSize: '16px' },
    spacing: { scale: '1.4' },
    radius: { global: '4px' }
};

const THEME_TEAL = {
    colors: { primary: '#0891b2', secondary: '#164e63', accent: '#10b981', background: '#f0fdfa', surface: '#ffffff', text: '#0f172a', textMuted: '#0e7490', border: '#99f6e4' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
    spacing: { scale: '1.2' },
    radius: { global: '10px' }
};

const THEME_ORANGE = {
    colors: { primary: '#ea580c', secondary: '#7c2d12', accent: '#eab308', background: '#fff7ed', surface: '#ffffff', text: '#431407', textMuted: '#9a3412', border: '#fed7aa' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
    spacing: { scale: '1.25' },
    radius: { global: '12px' }
};

// ─── 10 Full Templates ─────────────────────────────────────────────────────────

export const WEBPRO_TEMPLATES: WebProTemplate[] = [

    // ─── 1. SaaS Landing ──────────────────────────────────────────────────────
    {
        id: 'saas-landing',
        name: 'SaaS Landing',
        emoji: '🚀',
        category: 'saas',
        description: 'Convierte visitantes en clientes. Hero potente, features, pricing y CTA final.',
        previewColor: '#4f46e5',
        tags: ['saas', 'startup', 'tech', 'conversión'],
        author: 'WebPro Team',
        rating: 4.9,
        downloads: 3241,
        isFree: true,
        price: 0,
        features: ['9 bloques incluidos', 'Pricing con 3 planes', 'Sección de features', 'CTA de alta conversión', 'Optimizado para SaaS'],
        previewImages: [
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop',
        ],
        config: {
            version: '1.0',
            slug: 'saas-landing',
            themeId: 'builder-standard',
            globalData: { brandName: 'Potencore App', contactEmail: 'hola@potencore.io' },
            theme: THEME_INDIGO,
            assets: [],
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: 'Potencore – El futuro de tu negocio',
                    description: 'Automatiza, crece y escala con Potencore.',
                    blocks: [
                        block('Navigation', 'A', { brandName: 'Potencore', links: [{ label: 'Características', href: '#features' }, { label: 'Precios', href: '#pricing' }, { label: 'Iniciar sesión', href: '#login' }], ctaLabel: 'Empezar gratis' }),
                        block('Hero', 'A', { kicker: 'Nuevo en 2025', title: 'Tu negocio en piloto automático', subtitle: 'Potencore automatiza tus procesos, conecta tu equipo y acelera tu crecimiento. Sin código. Sin complicaciones.', ctaLabel: 'Empezar gratis', ctaHref: '#pricing', secondaryCtaLabel: 'Ver demo', imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop' }),
                        block('LogoCloud', 'A', { title: 'Confían en nosotros más de 2,000 empresas', logos: ['Airbnb', 'Spotify', 'Notion', 'Figma', 'Linear', 'Vercel'] }),
                        block('Features', 'A', { title: '¿Por qué Potencore?', subtitle: 'Todo lo que necesitas, nada de lo que no necesitas.', features: [{ title: 'Automatización real', description: 'Conecta tus herramientas y crea flujos sin escribir código.', icon: '⚡' }, { title: 'Colaboración en tiempo real', description: 'Tu equipo trabaja unido desde cualquier lugar del mundo.', icon: '🤝' }, { title: 'Analítica profunda', description: 'Decisiones basadas en datos, no en intuición.', icon: '📊' }, { title: 'Seguridad enterprise', description: 'Cifrado de extremo a extremo y cumplimiento GDPR.', icon: '🔒' }, { title: 'Integraciones nativas', description: 'Conecta con más de 500 apps en un clic.', icon: '🔌' }, { title: 'Soporte 24/7', description: 'Equipo humano siempre disponible para ti.', icon: '💬' }] }),
                        block('Stats', 'A', { items: [{ value: '2,400+', label: 'Empresas activas' }, { value: '98%', label: 'Satisfacción cliente' }, { value: '40h', label: 'Ahorradas/mes' }, { value: '< 2min', label: 'Setup inicial' }] }),
                        block('Testimonials', 'A', { title: 'Lo que dicen nuestros clientes', testimonials: [{ name: 'Laura Sánchez', role: 'CEO, Kira Agency', text: 'Potencore transformó cómo gestionamos proyectos. Ahorramos 40 horas semanales.', rating: 5, avatar: 'https://i.pravatar.cc/80?img=5' }, { name: 'Miguel Torres', role: 'CTO, BuildBase', text: 'La integración con nuestro stack fue en 10 minutos. Increíble.', rating: 5, avatar: 'https://i.pravatar.cc/80?img=12' }, { name: 'Ana Ruiz', role: 'Directora de Ops, SkaleUp', text: 'El ROI fue visible en el primer mes. No lo cambio por nada.', rating: 5, avatar: 'https://i.pravatar.cc/80?img=9' }] }),
                        block('Pricing', 'A', { title: 'Precios simples y transparentes', subtitle: 'Sin sorpresas. Cancela cuando quieras.', plans: [{ name: 'Starter', price: '0', period: '/mes', features: ['5 usuarios', '10 proyectos', 'Integraciones básicas', 'Soporte email'], cta: 'Empezar gratis' }, { name: 'Pro', price: '49', period: '/mes', features: ['Usuarios ilimitados', 'Proyectos ilimitados', '500+ integraciones', 'Soporte prioritario', 'Analítica avanzada'], cta: 'Empezar Pro', featured: true }, { name: 'Enterprise', price: 'Custom', period: '', features: ['Todo en Pro', 'SSO', 'SLA garantizado', 'Manager dedicado'], cta: 'Contactar ventas' }] }),
                        block('CTA', 'A', { title: 'Listo para despegar', subtitle: 'Únete a 2,400 empresas que ya automatizan con Potencore.', ctaLabel: 'Empezar gratis – 14 días', ctaHref: '#signup' }),
                        block('ContactFooter', 'A', { brandName: 'Potencore', email: 'hola@potencore.io', links: [{ label: 'Términos', href: '#' }, { label: 'Privacidad', href: '#' }, { label: 'Blog', href: '#' }] }),
                    ]
                }
            }
        }
    },

    // ─── 2. Corporativa ───────────────────────────────────────────────────────
    {
        id: 'corporate',
        name: 'Corporativa',
        emoji: '🏢',
        category: 'business',
        description: 'Presencia institucional sólida. Ideal para empresas B2B y servicios profesionales.',
        previewColor: '#0f172a',
        tags: ['corporativo', 'b2b', 'empresa', 'profesional'],
        author: 'WebPro Team',
        rating: 4.8,
        downloads: 2180,
        isFree: true,
        price: 0,
        features: ['9 bloques', 'Diseño institucional', 'Sección de servicios', 'Equipo y testimonios', 'Formulario de contacto'],
        previewImages: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop'],
        config: {
            version: '1.0',
            slug: 'corporativa',
            themeId: 'builder-standard',
            globalData: { brandName: 'Grupo Meridian', contactEmail: 'info@meridian.es' },
            theme: THEME_SLATE,
            assets: [],
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: 'Grupo Meridian – Soluciones empresariales',
                    description: 'Consultoría estratégica y soluciones empresariales desde 1998.',
                    blocks: [
                        block('Navigation', 'A', { brandName: 'Meridian', links: [{ label: 'Servicios', href: '#services' }, { label: 'Nosotros', href: '#about' }, { label: 'Equipo', href: '#team' }, { label: 'Contacto', href: '#contact' }] }),
                        block('Hero', 'B', { kicker: 'Consultoría Estratégica', title: 'Transformamos empresas en líderes de mercado', subtitle: 'Más de 25 años acompañando a organizaciones en sus momentos de mayor crecimiento.', ctaLabel: 'Hablar con un experto', imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000&auto=format&fit=crop' }),
                        block('Stats', 'A', { items: [{ value: '25+', label: 'Años de experiencia' }, { value: '300+', label: 'Clientes globales' }, { value: '98%', label: 'Tasa de retención' }, { value: '€800M', label: 'Valor gestionado' }] }),
                        block('Features', 'A', { title: 'Nuestros servicios', features: [{ title: 'Consultoría estratégica', description: 'Acompañamos tus decisiones críticas con metodología probada.', icon: '🎯' }, { title: 'Transformación digital', description: 'Modernizamos tu empresa para el mundo actual.', icon: '💻' }, { title: 'M&A y Corporate Finance', description: 'Fusiones, adquisiciones y reestructuraciones.', icon: '📈' }, { title: 'Recursos Humanos', description: 'Talento estratégico para escalar tu equipo.', icon: '👥' }] }),
                        block('Team', 'A', { title: 'Nuestro equipo directivo', members: [{ name: 'Carlos Meridian', role: 'CEO & Fundador', bio: '25 años en consultoría global.', avatar: 'https://i.pravatar.cc/200?img=60' }, { name: 'Elena Vega', role: 'Directora de Estrategia', bio: 'Ex McKinsey. Especialista en mercados emergentes.', avatar: 'https://i.pravatar.cc/200?img=47' }, { name: 'Roberto Lara', role: 'Director de Digital', bio: 'Ingeniero y MBA. Lider en transformación tech.', avatar: 'https://i.pravatar.cc/200?img=53' }] }),
                        block('Testimonials', 'A', { title: 'Clientes que confían en nosotros', testimonials: [{ name: 'Marta Gutiérrez', role: 'CFO, InmoGroup', text: 'Meridian nos ayudó a crecer un 60% en 18 meses.', rating: 5 }, { name: 'Pablo Ferrer', role: 'CEO, TechNord', text: 'La mejor inversión que hemos hecho en consultoría.', rating: 5 }] }),
                        block('CTA', 'A', { title: '¿Listo para transformar tu empresa?', subtitle: 'Hablemos de tu proyecto. Primera consulta gratuita.', ctaLabel: 'Solicitar consulta', ctaHref: '#contact' }),
                        block('ContactForm', 'A', { title: 'Contacta con nosotros', subtitle: 'Te respondemos en menos de 24 horas.' }),
                        block('ContactFooter', 'A', { brandName: 'Grupo Meridian', email: 'info@meridian.es', address: 'Paseo de la Castellana 45, Madrid' }),
                    ]
                }
            }
        }
    },

    // ─── 3. Inmobiliaria ──────────────────────────────────────────────────────
    {
        id: 'real-estate',
        name: 'Inmobiliaria',
        emoji: '🏠',
        category: 'hospitality',
        description: 'Para agencias y propiedades. Galería visual, disponibilidad y formulario de contacto.',
        previewColor: '#059669',
        tags: ['inmobiliaria', 'proptech', 'vivienda', 'propiedades'],
        author: 'WebPro Team',
        rating: 4.7,
        downloads: 1876,
        isFree: true,
        price: 0,
        features: ['8 bloques', 'Grid de propiedades', 'Calendario disponibilidad', 'Galería con zoom', 'CTA conversión'],
        previewImages: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop'],
        config: {
            version: '1.0',
            slug: 'inmobiliaria',
            themeId: 'builder-standard',
            globalData: { brandName: 'Vivenda Premium', contactEmail: 'ventas@vivenda.es' },
            theme: THEME_EMERALD,
            assets: [],
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: 'Vivenda Premium – Propiedades exclusivas',
                    description: 'Encuentra tu hogar ideal con Vivenda Premium.',
                    blocks: [
                        block('Navigation', 'A', { brandName: 'Vivenda', links: [{ label: 'Propiedades', href: '#properties' }, { label: 'Galería', href: '#gallery' }, { label: 'Nosotros', href: '#about' }, { label: 'Contacto', href: '#contact' }] }),
                        block('Hero', 'A', { kicker: 'Propiedades Exclusivas', title: 'Encuentra el hogar de tus sueños', subtitle: 'Más de 200 propiedades seleccionadas en las mejores ubicaciones de España.', ctaLabel: 'Ver propiedades', ctaHref: '#properties', secondaryCtaLabel: 'Contactar asesor', imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000&auto=format&fit=crop' }),
                        block('ApartmentsGrid', 'A', { title: 'Propiedades destacadas', subtitle: 'Selección curada de los mejores inmuebles disponibles.', items: [{ id: '1', title: 'Villa Mediterránea', location: 'Marbella, Málaga', guests: 8, bedrooms: 4, price: '2.100.000€', image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=800' }, { id: '2', title: 'Ático de Lujo', location: 'Madrid Centro', guests: 4, bedrooms: 2, price: '950.000€', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800' }, { id: '3', title: 'Chalet Rural', location: 'Sierra de Gredos', guests: 6, bedrooms: 3, price: '480.000€', image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=800' }] }),
                        block('Gallery', 'A', { title: 'Galería de propiedades', images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=800', 'https://images.unsplash.com/photo-1600607687644-c7e7d9e2e5f9?q=80&w=800', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?q=80&w=800', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=800'] }),
                        block('Features', 'A', { title: 'Por qué elegir Vivenda', features: [{ title: 'Asesoramiento personalizado', description: 'Un agente experto te guía en todo el proceso.', icon: '👤' }, { title: 'Propiedades verificadas', description: 'Cada inmueble pasa por nuestro protocolo de calidad.', icon: '✅' }, { title: 'Financiación preferente', description: 'Accede a condiciones hipotecarias exclusivas.', icon: '🏦' }] }),
                        block('Testimonials', 'A', { title: 'Familias felices en su nuevo hogar', testimonials: [{ name: 'Juan y María López', role: 'Compradores en Marbella', text: 'Encontramos nuestra villa soñada en solo 3 semanas. Servicio impecable.', rating: 5 }, { name: 'Andrea Martín', role: 'Inversora, Madrid', text: 'La mejor decisión de inversión inmobiliaria que he tomado.', rating: 5 }] }),
                        block('ContactForm', 'A', { title: 'Habla con un asesor', subtitle: 'Te llamamos en menos de 2 horas. Sin compromiso.' }),
                        block('ContactFooter', 'A', { brandName: 'Vivenda Premium', email: 'ventas@vivenda.es', phone: '+34 900 123 456' }),
                    ]
                }
            }
        }
    },

    // ─── 4. Restaurante ───────────────────────────────────────────────────────
    {
        id: 'restaurant',
        name: 'Restaurante',
        emoji: '🍽️',
        category: 'food',
        description: 'Presencia perfecta para restaurantes. Menú, galería, reservas y ubicación.',
        previewColor: '#d97706',
        tags: ['restaurante', 'food', 'hostelería', 'menú'],
        author: 'WebPro Team',
        rating: 4.9,
        downloads: 2950,
        isFree: true,
        price: 0,
        features: ['8 bloques', 'Menú visual', 'Galería de platos', 'Sección reservas', 'Mapa y horarios'],
        previewImages: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop'],
        config: {
            version: '1.0',
            slug: 'restaurante',
            themeId: 'builder-standard',
            globalData: { brandName: 'Casa Buena', contactEmail: 'reservas@casabuena.es' },
            theme: THEME_AMBER,
            assets: [],
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: 'Casa Buena – Cocina de autor en Madrid',
                    description: 'Experiencia gastronómica única en el corazón de Madrid.',
                    blocks: [
                        block('Navigation', 'A', { brandName: 'Casa Buena', links: [{ label: 'Menú', href: '#menu' }, { label: 'Historia', href: '#about' }, { label: 'Reservar', href: '#reservas' }], ctaLabel: 'Reservar mesa' }),
                        block('Hero', 'A', { kicker: 'Cocina de autor', title: 'Una experiencia que no olvidarás', subtitle: 'Ingredientes de proximidad, técnicas de vanguardia y el calor de lo auténtico.', ctaLabel: 'Reservar mesa', ctaHref: '#reservas', imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2000&auto=format&fit=crop' }),
                        block('Features', 'A', { title: 'Nuestra propuesta', features: [{ title: 'Producto de temporada', description: 'Carta que cambia cada semana según los mejores ingredientes del mercado.', icon: '🌿' }, { title: 'Vinos seleccionados', description: 'Bodega con más de 200 referencias españolas e internacionales.', icon: '🍷' }, { title: 'Privado y grupos', description: 'Sala privada hasta 30 personas para celebraciones especiales.', icon: '🎉' }] }),
                        block('Gallery', 'A', { title: 'Nuestro espacio', images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800', 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?q=80&w=800', 'https://images.unsplash.com/photo-1502364271109-0a9a75a2a9df?q=80&w=800'] }),
                        block('Testimonials', 'A', { title: 'Lo que dicen nuestros comensales', testimonials: [{ name: 'Alejandro R.', role: 'Cliente habitual', text: 'La mejor cena de mi vida. El pulpo con trufa es un sueño.', rating: 5 }, { name: 'Carmen S.', role: 'Celebración de aniversario', text: 'Organizaron toda la velada a la perfección. Gracias infinitas.', rating: 5 }] }),
                        block('Location', 'A', { title: 'Dónde estamos', address: 'Calle Serrano 89, Madrid 28006', phone: '+34 91 123 45 67', hours: 'Martes a Domingo: 13:30 – 16:00 / 20:30 – 23:30' }),
                        block('ContactForm', 'A', { title: 'Reservar mesa', subtitle: 'Te confirmamos en menos de 1 hora.', submitLabel: 'Solicitar reserva' }),
                        block('ContactFooter', 'A', { brandName: 'Casa Buena', email: 'reservas@casabuena.es', phone: '+34 91 123 45 67' }),
                    ]
                }
            }
        }
    },

    // ─── 5. Barbería / Salón ──────────────────────────────────────────────────
    {
        id: 'barbershop',
        name: 'Barbería & Salón',
        emoji: '✂️',
        category: 'health',
        description: 'Web perfecta para barberías, peluquerías y salones de belleza.',
        previewColor: '#e11d48',
        tags: ['barbería', 'peluquería', 'belleza', 'servicios'],
        author: 'WebPro Team',
        rating: 4.6,
        downloads: 1340,
        isFree: true,
        price: 0,
        features: ['7 bloques', 'Servicios y precios', 'Galería de trabajos', 'Reserva de cita', 'Testimonios'],
        previewImages: ['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop'],
        config: {
            version: '1.0',
            slug: 'barberia',
            themeId: 'builder-standard',
            globalData: { brandName: 'The Blade Room', contactEmail: 'cita@bladeroom.es' },
            theme: THEME_ROSE,
            assets: [],
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: 'The Blade Room – Barbería de Autor',
                    description: 'Cortes y afeitados premium en un ambiente exclusivo.',
                    blocks: [
                        block('Navigation', 'A', { brandName: 'The Blade Room', links: [{ label: 'Servicios', href: '#services' }, { label: 'Galería', href: '#gallery' }, { label: 'Equipo', href: '#team' }, { label: 'Cita', href: '#cita' }], ctaLabel: 'Reservar cita' }),
                        block('Hero', 'C', { kicker: 'Barbería Premium', title: 'El arte del corte perfecto', subtitle: 'Experiencia y estilo. Cada cliente merece lo mejor.', ctaLabel: 'Pedir cita', ctaHref: '#cita', imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2000&auto=format&fit=crop' }),
                        block('Pricing', 'A', { title: 'Nuestros servicios', plans: [{ name: 'Corte Clásico', price: '25', period: '', features: ['Consulta personalizada', 'Lavado premium', 'Corte a tijera', 'Secado y peinado'], cta: 'Reservar' }, { name: 'Corte + Barba', price: '40', period: '', features: ['Todo en Clásico', 'Perfilado de barba', 'Aceite de barba artesanal', 'Navaja clásica'], cta: 'Reservar', featured: true }, { name: 'Paquete VIP', price: '75', period: '', features: ['Todo incluido', 'Masaje capilar', 'Tratamiento hidratante', 'Copa de bienvenida'], cta: 'Reservar VIP' }] }),
                        block('Gallery', 'A', { title: 'Nuestros trabajos', images: ['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800', 'https://images.unsplash.com/photo-1521490683712-35a1cb235d1e?q=80&w=800', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=800', 'https://images.unsplash.com/photo-1636621341467-a9be9e90e9af?q=80&w=800'] }),
                        block('Team', 'A', { title: 'Nuestros maestros', members: [{ name: 'Diego Valls', role: 'Master Barber', bio: '15 años de experiencia. Especialista en degradados.', avatar: 'https://i.pravatar.cc/200?img=33' }, { name: 'Alex Moreno', role: 'Senior Barber', bio: 'Arte en cada corte. Formado en Londres y Berlín.', avatar: 'https://i.pravatar.cc/200?img=50' }] }),
                        block('Testimonials', 'A', { title: 'Clientes que vuelven siempre', testimonials: [{ name: 'Marco A.', text: 'El mejor corte que me han hecho. Ya no voy a ningún otro sitio.', rating: 5 }, { name: 'Rodrigo S.', text: 'Diego sabe exactamente lo que quieres incluso antes de explicarlo.', rating: 5 }] }),
                        block('Location', 'A', { title: 'Encuéntranos', address: 'Calle Fuencarral 110, Madrid 28010', phone: '+34 657 890 123', hours: 'Lunes a Sábado: 10:00 – 20:30' }),
                        block('ContactFooter', 'A', { brandName: 'The Blade Room' }),
                    ]
                }
            }
        }
    },

    // ─── 6. Portfolio ─────────────────────────────────────────────────────────
    {
        id: 'portfolio',
        name: 'Portfolio',
        emoji: '🎨',
        category: 'portfolio',
        description: 'Para creativos, diseñadores y fotógrafos. Muestra tu trabajo al mundo.',
        previewColor: '#7c3aed',
        tags: ['portfolio', 'diseñador', 'freelance', 'creativo'],
        author: 'WebPro Team',
        rating: 4.8,
        downloads: 3780,
        isFree: false,
        price: 29,
        isPro: true,
        features: ['8 bloques', 'Grid de proyectos', 'Sección sobre mí', 'Proceso de trabajo', 'Formulario de contacto'],
        previewImages: ['https://images.unsplash.com/photo-1545235617-9465d2a55698?w=800&auto=format&fit=crop'],
        config: {
            version: '1.0',
            slug: 'portfolio',
            themeId: 'builder-standard',
            globalData: { brandName: 'Marta Reyes Studio', contactEmail: 'hola@martareyes.io' },
            theme: THEME_VIOLET,
            assets: [],
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: 'Marta Reyes – Diseñadora de Producto',
                    description: 'Portfolio de diseño UX/UI y branding.',
                    blocks: [
                        block('Navigation', 'A', { brandName: 'MR Studio', links: [{ label: 'Proyectos', href: '#projects' }, { label: 'Sobre mí', href: '#about' }, { label: 'Contacto', href: '#contact' }] }),
                        block('Hero', 'C', { kicker: 'Diseñadora UX/UI & Brand', title: 'Diseño que convierte y enamora', subtitle: 'Creo experiencias digitales memorables para startups y marcas en crecimiento.', ctaLabel: 'Ver proyectos', ctaHref: '#projects', imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=2000&auto=format&fit=crop' }),
                        block('Gallery', 'A', { title: 'Proyectos seleccionados', images: ['https://images.unsplash.com/photo-1558655146-9f40138edfeb?q=80&w=800', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800', 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=800', 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?q=80&w=800'] }),
                        block('Features', 'A', { title: 'Servicios', features: [{ title: 'UI/UX Design', description: 'Interfaces que los usuarios adoran. Desde el wireframe hasta el prototipo final.', icon: '🖥️' }, { title: 'Brand Identity', description: 'Identidades visuales que comunican la esencia de tu marca.', icon: '✨' }, { title: 'Design Systems', description: 'Sistemas escalables para equipos en crecimiento.', icon: '📐' }] }),
                        block('Stats', 'A', { items: [{ value: '60+', label: 'Proyectos completados' }, { value: '30+', label: 'Clientes satisfechos' }, { value: '5', label: 'Años de experiencia' }, { value: '12', label: 'Premios recibidos' }] }),
                        block('Testimonials', 'A', { title: 'Lo que dicen mis clientes', testimonials: [{ name: 'Sam Park', role: 'CEO, Flowit App', text: 'Marta rediseñó nuestra app y el engagement subió un 80%. Extraordinaria.', rating: 5 }, { name: 'Lucia Fernández', role: 'CMO, NordBrand', text: 'La identidad que creó para nosotros es perfectamente fiel a nuestra visión.', rating: 5 }] }),
                        block('ContactForm', 'A', { title: 'Hablemos de tu proyecto', subtitle: 'Siempre abierta a nuevos retos interesantes.' }),
                        block('ContactFooter', 'A', { brandName: 'Marta Reyes Studio', email: 'hola@martareyes.io' }),
                    ]
                }
            }
        }
    },

    // ─── 7. Evento ────────────────────────────────────────────────────────────
    {
        id: 'event',
        name: 'Evento',
        emoji: '🎪',
        category: 'event',
        description: 'Landing de evento, congreso o festival. Programa, ponentes y registro.',
        previewColor: '#a78bfa',
        tags: ['evento', 'conferencia', 'concierto', 'festival'],
        author: 'WebPro Team',
        rating: 4.7,
        downloads: 1120,
        isFree: false,
        price: 19,
        features: ['8 bloques', 'Cuenta atrás', 'Programa/Agenda', 'Speakers', 'Venta de entradas'],
        previewImages: ['https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop'],
        config: {
            version: '1.0',
            slug: 'evento',
            themeId: 'builder-standard',
            globalData: { brandName: 'Summit 2025', contactEmail: 'hola@summit2025.io' },
            theme: THEME_DARK,
            assets: [],
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: 'Summit 2025 – El evento de tecnología del año',
                    description: 'El mayor evento de innovación y tecnología. 15–17 Sept 2025.',
                    blocks: [
                        block('Navigation', 'A', { brandName: 'Summit 2025', links: [{ label: 'Programa', href: '#program' }, { label: 'Ponentes', href: '#speakers' }, { label: 'Entradas', href: '#tickets' }], ctaLabel: 'Reservar entrada' }),
                        block('Hero', 'A', { kicker: '15–17 Septiembre 2025 · Madrid', title: 'El futuro empieza aquí', subtitle: '3 días de conferencias, talleres y networking con los líderes que están redefiniendo el mundo.', ctaLabel: 'Reservar entrada', ctaHref: '#tickets', secondaryCtaLabel: 'Ver programa', imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2000&auto=format&fit=crop' }),
                        block('Stats', 'A', { items: [{ value: '50+', label: 'Ponentes internacionales' }, { value: '2.000', label: 'Asistentes esperados' }, { value: '30+', label: 'Talleres prácticos' }, { value: '3', label: 'Días de contenido' }] }),
                        block('Team', 'A', { title: 'Ponentes principales', members: [{ name: 'Dr. Elena Voss', role: 'AI Research Lead, OpenAI', bio: 'Pionera en IA aplicada a la salud.', avatar: 'https://i.pravatar.cc/200?img=47' }, { name: 'Marcus Kim', role: 'CTO, Stripe', bio: 'Construyendo la infraestructura financiera del futuro.', avatar: 'https://i.pravatar.cc/200?img=51' }, { name: 'Priya Nair', role: 'Founder, Anthropic India', bio: 'Seguridad en IA: cómo hacerlo bien.', avatar: 'https://i.pravatar.cc/200?img=45' }] }),
                        block('Pricing', 'A', { title: 'Entradas', plans: [{ name: 'Online', price: '0', period: '', features: ['Streaming en vivo', 'Grabaciones', 'Comunidad Discord'], cta: 'Registrarse gratis' }, { name: 'Presencial', price: '299', period: '', features: ['Acceso completo 3 días', 'Talleres prácticos', 'Networking dinners', 'Kit del asistente'], cta: 'Comprar entrada', featured: true }, { name: 'VIP', price: '799', period: '', features: ['Todo en Presencial', 'Cena con ponentes', 'Asiento front row', 'Grabaciones HD'], cta: 'Comprar VIP' }] }),
                        block('FAQ', 'A', { title: 'Preguntas frecuentes', items: [{ question: '¿Dónde se celebra?', answer: 'Palacio de Congresos de Madrid, Av. del Congreso Eucarístico Internacional 1.' }, { question: '¿Puedo cancelar mi entrada?', answer: 'Reembolso completo hasta 30 días antes del evento.' }, { question: '¿Hay descuento para grupos?', answer: 'Sí, contacta con nosotros para grupos de más de 5 personas.' }] }),
                        block('ContactForm', 'A', { title: '¿Preguntas?', subtitle: 'Estamos para ayudarte.' }),
                        block('ContactFooter', 'A', { brandName: 'Summit 2025', email: 'hola@summit2025.io' }),
                    ]
                }
            }
        }
    },

    // ─── 8. Agencia Digital ───────────────────────────────────────────────────
    {
        id: 'agency',
        name: 'Agencia',
        emoji: '🎯',
        category: 'agency',
        description: 'Para agencias de marketing, diseño y desarrollo. Servicios, casos de éxito y contacto.',
        previewColor: '#57534e',
        tags: ['agencia', 'marketing', 'diseño', 'digital'],
        author: 'WebPro Team',
        rating: 4.9,
        downloads: 4200,
        isFree: false,
        price: 39,
        isPro: true,
        features: ['9 bloques', 'Showcase de proyectos', 'Equipo creativo', 'Proceso de trabajo', 'Pricing transparente'],
        previewImages: ['https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop'],
        config: {
            version: '1.0',
            slug: 'agencia',
            themeId: 'builder-standard',
            globalData: { brandName: 'Método Studio', contactEmail: 'hola@metodo.studio' },
            theme: THEME_STONE,
            assets: [],
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: 'Método Studio – Diseño que funciona',
                    description: 'Agencia de diseño y estrategia digital.',
                    blocks: [
                        block('Navigation', 'A', { brandName: 'Método', links: [{ label: 'Servicios', href: '#services' }, { label: 'Trabajo', href: '#work' }, { label: 'Nosotros', href: '#about' }, { label: 'Contacto', href: '#contact' }] }),
                        block('Hero', 'B', { kicker: 'Agencia de Diseño Estratégico', title: 'Diseño que vende', subtitle: 'Creamos marcas, webs y campañas que convierten visitantes en clientes.', ctaLabel: 'Hablar de tu proyecto', ctaHref: '#contact', imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=2000&auto=format&fit=crop' }),
                        block('LogoCloud', 'A', { title: 'Marcas que han confiado en nosotros', logos: ['Renfe', 'Telefónica', 'Bankinter', 'BBVA', 'Mapfre', 'Iberdrola'] }),
                        block('Features', 'A', { title: 'Lo que hacemos', features: [{ title: 'Branding & Identidad', description: 'Marcas que se recuerdan y comunican quién eres de verdad.', icon: '🎨' }, { title: 'Diseño Web', description: 'Sites que convierten con velocidad, belleza y UX impecable.', icon: '💻' }, { title: 'Performance Marketing', description: 'Campañas de paid media con ROI medible.', icon: '📈' }, { title: 'Estrategia de Contenidos', description: 'SEO y contenidos que posicionan y educan.', icon: '✍️' }] }),
                        block('Stats', 'A', { items: [{ value: '120+', label: 'Proyectos' }, { value: '8', label: 'Años activos' }, { value: '3x', label: 'ROI medio' }, { value: '100%', label: 'Clientes recurrentes' }] }),
                        block('Testimonials', 'A', { title: 'Clientes', testimonials: [{ name: 'Isabel Mora', role: 'CMO, Fintech Nordik', text: 'Método rediseñó nuestra marca entera y los resultados se vieron en 2 semanas.', rating: 5 }, { name: 'Carlos Huerta', role: 'CEO, Dropi', text: 'La mejor agencia con la que hemos trabajado. Punto.', rating: 5 }] }),
                        block('CTA', 'A', { title: 'Tu próximo gran proyecto empieza aquí', subtitle: 'Primera reunión gratis. Sin compromiso.', ctaLabel: 'Reservar reunión', ctaHref: '#contact' }),
                        block('ContactForm', 'A', { title: 'Cuéntanos tu proyecto', subtitle: 'Te respondemos en 24 horas.' }),
                        block('ContactFooter', 'A', { brandName: 'Método Studio', email: 'hola@metodo.studio' }),
                    ]
                }
            }
        }
    },

    // ─── 9. Ecommerce básica ──────────────────────────────────────────────────
    {
        id: 'ecommerce',
        name: 'Ecommerce',
        emoji: '🛍️',
        category: 'commerce',
        description: 'Landing de tienda online. Productos destacados, beneficios y carrito simplificado.',
        previewColor: '#0891b2',
        tags: ['ecommerce', 'tienda', 'productos', 'online'],
        author: 'WebPro Team',
        rating: 4.8,
        downloads: 3100,
        isFree: false,
        price: 49,
        isPro: true,
        features: ['8 bloques', 'Grid de productos', 'Logos de confianza', 'Reviews', 'Newsletter integrado'],
        previewImages: ['https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop'],
        config: {
            version: '1.0',
            slug: 'tienda',
            themeId: 'builder-standard',
            globalData: { brandName: 'Baya Cosmetics', contactEmail: 'hola@bayacosmetics.com' },
            theme: THEME_TEAL,
            assets: [],
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: 'Baya Cosmetics – Natural & Efectivo',
                    description: 'Cosmética natural de alta eficacia. Sin ingredientes innecesarios.',
                    blocks: [
                        block('Navigation', 'A', { brandName: 'Baya', links: [{ label: 'Productos', href: '#products' }, { label: 'Ingredientes', href: '#ingredients' }, { label: 'Blog', href: '#blog' }, { label: 'Cesta', href: '#cart' }], ctaLabel: 'Comprar ahora' }),
                        block('Hero', 'A', { kicker: 'Cosmética limpia', title: 'Tu piel merece lo mejor de la naturaleza', subtitle: 'Fórmulas probadas científicamente. Ingredientes éticos. Packaging 100% reciclado.', ctaLabel: 'Descubrir productos', ctaHref: '#products', secondaryCtaLabel: 'Leer historia', imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=2000&auto=format&fit=crop' }),
                        block('LogoCloud', 'A', { title: 'Certificaciones y premios', logos: ['Vegan Society', 'Leaping Bunny', 'COSMOS Natural', 'Elle Best', 'Allure Award'] }),
                        block('Features', 'A', { title: '¿Por qué Baya?', features: [{ title: '100% Natural', description: 'Solo ingredientes que podrías pronunciar. Sin tóxicos.', icon: '🌿' }, { title: 'Clínicamente probado', description: 'Dermatológicamente testado en todos los tipos de piel.', icon: '🔬' }, { title: 'Packaging circular', description: '100% reciclable. Programa de devolución de envases.', icon: '♻️' }, { title: 'Envío ecológico', description: 'Gratis a partir de 40€. Entrega en 24-48h.', icon: '🚚' }] }),
                        block('Stats', 'A', { items: [{ value: '50K+', label: 'Clientas satisfechas' }, { value: '100%', label: 'Ingredientes naturales' }, { value: '4.9 ⭐', label: 'Valoración media' }, { value: '-0', label: 'Ingredientes tóxicos' }] }),
                        block('Testimonials', 'A', { title: 'Pieles que brillan', testimonials: [{ name: 'Sofía N.', role: 'Piel sensible', text: 'Por fin una marca que no me irrita. El sérum es mágico.', rating: 5 }, { name: 'Laura T.', role: 'Compra recurrente', text: 'Me la recomendó mi dermatóloga y no lo cambio por nada.', rating: 5 }, { name: 'Inés M.', role: 'Piel mixta', text: 'La crema facial es el producto de skincare que más me ha funcionado.', rating: 5 }] }),
                        block('NewsletterSignup', 'A', { title: 'Únete a la tribu Baya', subtitle: 'Descuento del 15% en tu primera compra + tips de skincare cada semana.', ctaLabel: 'Suscribirme', placeholder: 'tu@email.com' }),
                        block('ContactFooter', 'A', { brandName: 'Baya Cosmetics', email: 'hola@bayacosmetics.com' }),
                    ]
                }
            }
        }
    },

    // ─── 10. App Marketing ────────────────────────────────────────────────────
    {
        id: 'app-marketing',
        name: 'App Marketing',
        emoji: '📱',
        category: 'marketing',
        description: 'Landing para apps móviles. Conversión hacia App Store y Google Play.',
        previewColor: '#ea580c',
        tags: ['app', 'móvil', 'producto digital', 'descarga'],
        author: 'WebPro Team',
        rating: 4.7,
        downloads: 2400,
        isFree: true,
        price: 0,
        features: ['8 bloques', 'App Store badges', 'Screenshots app', 'Features móvil', 'Stats de usuarios'],
        previewImages: ['https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop'],
        config: {
            version: '1.0',
            slug: 'app',
            themeId: 'builder-standard',
            globalData: { brandName: 'Kora App', contactEmail: 'hola@koraapp.io' },
            theme: THEME_ORANGE,
            assets: [],
            pages: {
                '/': {
                    id: 'home',
                    path: '/',
                    title: 'Kora – La app que cambia cómo ahorras',
                    description: 'Ahorra sin esfuerzo. Kora analiza tus gastos y te ayuda a llegar a tus metas.',
                    blocks: [
                        block('Navigation', 'A', { brandName: 'Kora', links: [{ label: 'Funciones', href: '#features' }, { label: 'Precios', href: '#pricing' }, { label: 'Blog', href: '#blog' }], ctaLabel: 'Descargar gratis' }),
                        block('Hero', 'A', { kicker: 'App de finanzas personales', title: 'Ahorra sin pensar. Crece sin límites.', subtitle: 'Kora analiza tus gastos automáticamente, te muestra dónde pierdes dinero y te ayuda a alcanzar tus metas.', ctaLabel: 'Descargar en iOS', ctaHref: '#appstore', secondaryCtaLabel: 'Descargar en Android', imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=2000&auto=format&fit=crop' }),
                        block('Stats', 'A', { items: [{ value: '500K+', label: 'Descargas' }, { value: '4.8★', label: 'Valoración App Store' }, { value: '€280', label: 'Ahorro medio/mes' }, { value: '#1', label: 'Finanzas en España' }] }),
                        block('Features', 'A', { title: 'Por qué Kora funciona', features: [{ title: 'Análisis automático', description: 'Conecta tu banco y Kora categoriza cada gasto al instante.', icon: '🤖' }, { title: 'Metas inteligentes', description: 'Crea objetivos de ahorro y Kora te dice exactamente qué cambiar.', icon: '🎯' }, { title: 'Alertas personalizadas', description: 'Notificaciones cuando detecta gastos inusuales o duplicados.', icon: '🔔' }, { title: 'Privacidad total', description: 'Cifrado bancario. Kora nunca almacena tus credenciales.', icon: '🔒' }] }),
                        block('Testimonials', 'A', { title: 'Usuarios que ya ahorran con Kora', testimonials: [{ name: 'David L.', role: 'Usuario desde 2023', text: 'Ahorré 3.000€ en 6 meses sin cambiar mi estilo de vida. Increíble.', rating: 5 }, { name: 'Natalia G.', role: 'Freelancer', text: 'Por fin tengo control real de mis finanzas. La categorización es perfecta.', rating: 5 }] }),
                        block('Pricing', 'A', { title: 'Un precio simple', plans: [{ name: 'Gratis', price: '0', period: '/siempre', features: ['2 cuentas bancarias', 'Análisis básico', 'Alertas de gasto', 'Metas de ahorro'], cta: 'Descargar gratis' }, { name: 'Pro', price: '4.99', period: '/mes', features: ['Cuentas ilimitadas', 'IA de ahorro avanzada', 'Informes PDF', 'Soporte prioritario'], cta: 'Empezar Pro', featured: true }] }),
                        block('NewsletterSignup', 'A', { title: 'Únete a la lista de espera', subtitle: 'Sé el primero en probar las nuevas funciones. Te avisamos antes que a nadie.', ctaLabel: 'Unirme', placeholder: 'tu@email.com' }),
                        block('ContactFooter', 'A', { brandName: 'Kora App', email: 'hola@koraapp.io' }),
                    ]
                }
            }
        }
    },
];

// ─── Helper to get a template by id ───────────────────────────────────────────

export function getWebProTemplate(id: string): WebProTemplate | undefined {
    return WEBPRO_TEMPLATES.find(t => t.id === id);
}

// ─── Clone a template config with fresh block IDs ─────────────────────────────

export function cloneTemplateConfig(template: WebProTemplate, slug: string, brandName: string): SiteConfigV1 {
    const fresh = JSON.parse(JSON.stringify(template.config)) as SiteConfigV1;
    fresh.slug = slug;
    fresh.globalData.brandName = brandName;
    // Regenerate block IDs to avoid collisions
    const page = fresh.pages['/'];
    if (page) {
        page.blocks = page.blocks.map((b, i) => ({
            ...b,
            id: `${b.type.toLowerCase()}-${Date.now()}-${i}`,
        }));
    }
    return fresh;
}
