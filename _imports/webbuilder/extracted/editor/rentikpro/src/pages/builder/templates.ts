import type { DesignTokens } from '../../modules/webBuilder/types';

export type TemplateLevel = 'BASIC' | 'STANDARD' | 'ADVANCED' | 'PREMIUM';

export interface BuilderTemplate {
    id: TemplateLevel;
    name: string;
    description: string;
    /** Clave exacta en TEMPLATE_REGISTRY de RPWeb */
    themeId: string;
    theme: DesignTokens;
}

export const BUILDER_TEMPLATES: BuilderTemplate[] = [
    {
        id: 'BASIC',
        name: 'Basic',
        description: 'Limpia y funcional. Hero + Apartamentos + Contacto.',
        themeId: 'builder-basic',
        theme: {
            colors: { primary: '#2563eb', secondary: '#1e293b', accent: '#3b82f6', background: '#ffffff', surface: '#f8fafc', text: '#0f172a', textMuted: '#64748b', border: '#e2e8f0' },
            typography: { headingFont: 'Inter, sans-serif', bodyFont: 'Inter, sans-serif', baseSize: '16px' },
            radius: { global: '0.75rem' },
            spacing: { scale: '1rem' },
        },
    },
    {
        id: 'STANDARD',
        name: 'Standard',
        description: 'Elegante y completo. Galería, testimonios y FAQ.',
        themeId: 'builder-standard',
        theme: {
            colors: { primary: '#4f46e5', secondary: '#1e293b', accent: '#818cf8', background: '#fafafa', surface: '#ffffff', text: '#1e293b', textMuted: '#64748b', border: '#e0e7ff' },
            typography: { headingFont: '"Plus Jakarta Sans", sans-serif', bodyFont: 'Inter, sans-serif', baseSize: '16px' },
            radius: { global: '1rem' },
            spacing: { scale: '1rem' },
        },
    },
    {
        id: 'ADVANCED',
        name: 'Advanced',
        description: 'Serif dorado. Calendario de disponibilidad y captura de leads.',
        themeId: 'builder-advanced',
        theme: {
            colors: { primary: '#c8a96e', secondary: '#1c1917', accent: '#d4af37', background: '#fdfbf7', surface: '#fff8f0', text: '#1c1917', textMuted: '#78716c', border: '#e7e5e4' },
            typography: { headingFont: '"Playfair Display", serif', bodyFont: 'Inter, sans-serif', baseSize: '16px' },
            radius: { global: '0.5rem' },
            spacing: { scale: '1rem' },
        },
    },
    {
        id: 'PREMIUM',
        name: 'Premium',
        description: 'Ultra premium — oscuro, dorado, Cormorant. Cinco estrellas.',
        themeId: 'builder-premium',
        theme: {
            colors: { primary: '#d4af37', secondary: '#f5f0e8', accent: '#b8953a', background: '#0f0f0f', surface: '#1a1a1a', text: '#f5f0e8', textMuted: '#a8a29e', border: '#2a2a2a' },
            typography: { headingFont: '"Cormorant Garamond", serif', bodyFont: '"EB Garamond", serif', baseSize: '17px' },
            radius: { global: '0.25rem' },
            spacing: { scale: '1.25rem' },
        },
    },
];

export const getTemplateById = (id: TemplateLevel | string): BuilderTemplate | undefined =>
    BUILDER_TEMPLATES.find(t => t.id === id);
