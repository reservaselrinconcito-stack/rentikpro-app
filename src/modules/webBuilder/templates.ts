import { DesignTokens } from './types';

export interface TemplateDefinition {
    id: string;
    name: string;
    description: string;
    theme: DesignTokens;
    defaultVariants: Record<string, string>;
}

export const BUILDER_TEMPLATES: TemplateDefinition[] = [
    {
        id: 'modern',
        name: 'Apartamento Urbano',
        description: 'Limpia, moderna e ideal para estancias cortas en la ciudad.',
        theme: {
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
            spacing: { scale: '1' },
            radius: { global: '0.5rem' }
        },
        defaultVariants: {
            'Hero': 'A',
            'Features': 'A',
            'Gallery': 'A',
            'ContactFooter': 'A',
        }
    },
    {
        id: 'nature',
        name: 'Casa Rural',
        description: 'Atmósfera rústica y cálida para entornos naturales.',
        theme: {
            colors: {
                primary: '#059669',
                secondary: '#78350f',
                accent: '#b45309',
                background: '#fefce8',
                surface: '#ffffff',
                text: '#064e3b',
                textMuted: '#047857',
                border: '#a7f3d0',
            },
            typography: {
                headingFont: '"Merriweather", serif',
                bodyFont: '"Open Sans", sans-serif',
                baseSize: '16px',
            },
            spacing: { scale: '1' },
            radius: { global: '1.5rem' }
        },
        defaultVariants: {
            'Hero': 'B',
            'Features': 'A',
            'Gallery': 'B',
            'ContactFooter': 'B',
        }
    },
    {
        id: 'luxury',
        name: 'Complejo Premium',
        description: 'Elegancia y exclusividad para edificios y servicios VIP.',
        theme: {
            colors: {
                primary: '#1e293b',
                secondary: '#0f172a',
                accent: '#d4af37',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#0f172a',
                textMuted: '#475569',
                border: '#e2e8f0',
            },
            typography: {
                headingFont: '"Playfair Display", serif',
                bodyFont: 'Inter, sans-serif',
                baseSize: '16px',
            },
            spacing: { scale: '1' },
            radius: { global: '1rem' }
        },
        defaultVariants: {
            'Hero': 'A',
            'Features': 'B',
            'Gallery': 'A',
            'ContactFooter': 'A',
        }
    }
];
