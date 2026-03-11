/**
 * src/pages/builder/webpro/themes.ts
 *
 * Sistema global de temas WebPro.
 * Cada tema define colores + tipografías + radio + espaciados.
 * Cambiar tema → actualiza TODO el sitio instantáneamente.
 */

import { DesignTokens } from './types';

export interface WebProTheme {
    id: string;
    name: string;
    emoji: string;
    description: string;
    tokens: DesignTokens;
}

export const WEBPRO_THEMES: WebProTheme[] = [
    {
        id: 'indigo',
        name: 'Indigo Pro',
        emoji: '💎',
        description: 'Azul profesional. Confianza y tecnología.',
        tokens: {
            colors: { primary: '#4f46e5', secondary: '#1e293b', accent: '#06b6d4', background: '#f8fafc', surface: '#ffffff', text: '#1e293b', textMuted: '#64748b', border: '#e2e8f0' },
            typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
            spacing: { scale: '1.25' },
            radius: { global: '12px' }
        }
    },
    {
        id: 'midnight',
        name: 'Midnight',
        emoji: '🌑',
        description: 'Fondo oscuro. Lujo y modernidad.',
        tokens: {
            colors: { primary: '#a78bfa', secondary: '#8b5cf6', accent: '#f472b6', background: '#0f0f1a', surface: '#1e1b4b', text: '#f1f5f9', textMuted: '#94a3b8', border: '#2d2b55' },
            typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
            spacing: { scale: '1.3' },
            radius: { global: '18px' }
        }
    },
    {
        id: 'ember',
        name: 'Ember',
        emoji: '🔥',
        description: 'Naranja vibrante. Energía y conversión.',
        tokens: {
            colors: { primary: '#ea580c', secondary: '#7c2d12', accent: '#eab308', background: '#fff7ed', surface: '#ffffff', text: '#431407', textMuted: '#9a3412', border: '#fed7aa' },
            typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
            spacing: { scale: '1.25' },
            radius: { global: '12px' }
        }
    },
    {
        id: 'forest',
        name: 'Forest',
        emoji: '🌿',
        description: 'Verde natural. Frescura y sostenibilidad.',
        tokens: {
            colors: { primary: '#059669', secondary: '#064e3b', accent: '#10b981', background: '#ecfdf5', surface: '#ffffff', text: '#064e3b', textMuted: '#047857', border: '#a7f3d0' },
            typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
            spacing: { scale: '1.2' },
            radius: { global: '16px' }
        }
    },
    {
        id: 'rose',
        name: 'Rose',
        emoji: '🌹',
        description: 'Rosa intenso. Audaz y femenino.',
        tokens: {
            colors: { primary: '#e11d48', secondary: '#881337', accent: '#f97316', background: '#fff1f2', surface: '#ffffff', text: '#1e293b', textMuted: '#64748b', border: '#fecdd3' },
            typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
            spacing: { scale: '1.2' },
            radius: { global: '20px' }
        }
    },
    {
        id: 'aurum',
        name: 'Aurum',
        emoji: '✨',
        description: 'Dorado serio. Lujo y exclusividad.',
        tokens: {
            colors: { primary: '#b4975a', secondary: '#1c1917', accent: '#d97706', background: '#fafaf9', surface: '#ffffff', text: '#1c1917', textMuted: '#78716c', border: '#e7e5e4' },
            typography: { headingFont: 'Georgia', bodyFont: 'Inter', baseSize: '16px' },
            spacing: { scale: '1.4' },
            radius: { global: '4px' }
        }
    },
    {
        id: 'sky',
        name: 'Sky',
        emoji: '☁️',
        description: 'Azul cielo. Limpio y fresco.',
        tokens: {
            colors: { primary: '#0891b2', secondary: '#164e63', accent: '#10b981', background: '#f0fdfa', surface: '#ffffff', text: '#0f172a', textMuted: '#0e7490', border: '#99f6e4' },
            typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
            spacing: { scale: '1.2' },
            radius: { global: '10px' }
        }
    },
    {
        id: 'slate',
        name: 'Slate',
        emoji: '🪨',
        description: 'Gris profundo. Serio y corporativo.',
        tokens: {
            colors: { primary: '#0f172a', secondary: '#334155', accent: '#f59e0b', background: '#f1f5f9', surface: '#ffffff', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1' },
            typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
            spacing: { scale: '1.25' },
            radius: { global: '8px' }
        }
    },
    {
        id: 'violet',
        name: 'Violet',
        emoji: '🔮',
        description: 'Violeta vibrante. Creativo e innovador.',
        tokens: {
            colors: { primary: '#7c3aed', secondary: '#4c1d95', accent: '#ec4899', background: '#f5f3ff', surface: '#ffffff', text: '#1e293b', textMuted: '#6d28d9', border: '#ddd6fe' },
            typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: '16px' },
            spacing: { scale: '1.25' },
            radius: { global: '14px' }
        }
    },
    {
        id: 'harvest',
        name: 'Harvest',
        emoji: '🍂',
        description: 'Tonos cálidos de otoño. Natural y acogedor.',
        tokens: {
            colors: { primary: '#d97706', secondary: '#78350f', accent: '#dc2626', background: '#fffbeb', surface: '#ffffff', text: '#451a03', textMuted: '#92400e', border: '#fde68a' },
            typography: { headingFont: 'Georgia', bodyFont: 'Inter', baseSize: '16px' },
            spacing: { scale: '1.3' },
            radius: { global: '6px' }
        }
    },
];

export function getThemeById(id: string): WebProTheme | undefined {
    return WEBPRO_THEMES.find(t => t.id === id);
}
