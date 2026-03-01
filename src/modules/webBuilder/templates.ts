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
        name: 'Modern Flow',
        description: 'Limpieza y tecnología en colores vivos. Layouts asimétricos.',
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
            spacing: { scale: '1' },
            radius: { global: '0.5rem' }
        },
        defaultVariants: {
            'Hero': 'B',
            'Features': 'B',
            'Gallery': 'B',
            'ContactFooter': 'A',
        }
    },
    {
        id: 'luxury',
        name: 'Luxury Essence',
        description: 'Tonos oscuros y elegantes con toques dorados e inmersivos.',
        theme: {
            colors: {
                primary: '#d4af37', // gold
                secondary: '#0f172a', // slate-900
                accent: '#1e293b',
                background: '#020617', // slate-950
                surface: '#0f172a', // slate-900
                text: '#f8fafc',
                textMuted: '#94a3b8',
                border: '#1e293b',
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
            'Features': 'A',
            'Gallery': 'A',
            'ContactFooter': 'A',
        }
    },
    {
        id: 'minimalist',
        name: 'Minimal Clean',
        description: 'Centrado en tipografía gigante y espacios muy amplios.',
        theme: {
            colors: {
                primary: '#000000',
                secondary: '#333333',
                accent: '#000000',
                background: '#ffffff',
                surface: '#f3f4f6',
                text: '#111827',
                textMuted: '#6b7280',
                border: '#e5e7eb',
            },
            typography: {
                headingFont: 'Helvetica, Arial, sans-serif',
                bodyFont: 'Helvetica, Arial, sans-serif',
                baseSize: '16px',
            },
            spacing: { scale: '1.2' },
            radius: { global: '2rem' }
        },
        defaultVariants: {
            'Hero': 'C',
            'Features': 'B',
            'Gallery': 'B',
            'ContactFooter': 'B',
        }
    },
    {
        id: 'nature',
        name: 'Nature Retreat',
        description: 'Colores tierra y esmeralda para un ambiente relajado.',
        theme: {
            colors: {
                primary: '#059669', // emerald-600
                secondary: '#78350f', // amber-900
                accent: '#b45309', // amber-700
                background: '#ecfdf5', // emerald-50
                surface: '#ffffff',
                text: '#064e3b', // emerald-900
                textMuted: '#047857', // emerald-700
                border: '#a7f3d0', // emerald-200
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
            'Gallery': 'A',
            'ContactFooter': 'B',
        }
    }
];
