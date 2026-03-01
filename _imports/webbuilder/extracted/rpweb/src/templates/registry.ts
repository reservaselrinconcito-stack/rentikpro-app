/**
 * templates/registry.ts — Registro de plantillas disponibles.
 *
 * Para añadir una plantilla:
 *  1. Crear src/templates/MiPlantilla.tsx
 *  2. Importarla aquí
 *  3. Añadirla al TEMPLATE_REGISTRY
 *
 * La plantilla activa se selecciona desde property.theme.themeId.
 */

import React from 'react';
import { DefaultTemplate } from './DefaultTemplate';
import { ExcellenceDefault } from './templates/ExcellenceDefault';
import { ExcellenceModern } from './templates/ExcellenceModern';
import { ExcellenceMinimal } from './templates/ExcellenceMinimal';
import { ExcellenceLuxe } from './templates/ExcellenceLuxe';
import { ExcellenceV0 } from './templates/ExcellenceV0';

// ─── Tipo de plantilla ─────────────────────────────────────────────────────────

/**
 * TemplateProps — Props base para todas las plantillas.
 * Actualmente las plantillas consumen via useBootstrapState,
 * pero exponemos este tipo para futura extensibilidad.
 */
export interface TemplateProps { }

export type TemplateComponent = React.ComponentType<TemplateProps>;

export interface TemplateEntry {
  id: string;
  label: string;
  component: TemplateComponent;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const TEMPLATE_REGISTRY: Record<string, TemplateEntry> = {
  // Legacy
  default: {
    id: 'default',
    label: 'Default (Legacy)',
    component: DefaultTemplate,
  },
  // Excellence Series
  'excellence-default': {
    id: 'excellence-default',
    label: 'Excellence Default',
    component: ExcellenceDefault,
  },
  'excellence-modern': {
    id: 'excellence-modern',
    label: 'Excellence Modern',
    component: ExcellenceModern,
  },
  'excellence-minimal': {
    id: 'excellence-minimal',
    label: 'Excellence Minimal',
    component: ExcellenceMinimal,
  },
  'excellence-luxe': {
    id: 'excellence-luxe',
    label: 'Excellence Luxe',
    component: ExcellenceLuxe,
  },
  'excellence-v0': {
    id: 'excellence-v0',
    label: 'Excellence V0 (Minimal)',
    component: ExcellenceV0,
  },
  // Aliases / Compatibility
  'rural-warm': {
    id: 'rural-warm',
    label: 'Rural Warm',
    component: ExcellenceDefault,
  },
  'bold-conversion': {
    id: 'bold-conversion',
    label: 'Bold Conversion',
    component: ExcellenceModern,
  },
  'minimal-lux': {
    id: 'minimal-lux',
    label: 'Minimal Lux',
    component: ExcellenceLuxe,
  },
};

// ─── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Devuelve el componente de plantilla para el themeId dado.
 * Si no existe, devuelve ExcellenceDefault (nunca null).
 */
export function resolveTemplate(themeId?: string | null): TemplateComponent {
  if (!themeId) return ExcellenceDefault;
  return TEMPLATE_REGISTRY[themeId]?.component ?? ExcellenceDefault;
}

export { DefaultTemplate, ExcellenceDefault, ExcellenceModern, ExcellenceMinimal, ExcellenceLuxe, ExcellenceV0 };
