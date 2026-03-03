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

// Builder series (editor de RentikPro)
import { BuilderBasic } from './templates/BuilderBasic';
import { BuilderStandard } from './templates/BuilderStandard';
import { BuilderAdvanced } from './templates/BuilderAdvanced';

// Premium tier — identidad visual real de Rinconcito Matarraña
import { RinconcitoPremium } from './templates/RinconcitoPremium';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface TemplateProps {}

export type TemplateComponent = React.ComponentType<TemplateProps>;

export interface TemplateEntry {
  id: string;
  label: string;
  component: TemplateComponent;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const TEMPLATE_REGISTRY: Record<string, TemplateEntry> = {
  // Legacy
  default: { id: 'default', label: 'Default (Legacy)', component: DefaultTemplate },

  // Excellence Series (originals — no tocar)
  'excellence-default': { id: 'excellence-default', label: 'Excellence Default', component: ExcellenceDefault },
  'excellence-modern':  { id: 'excellence-modern',  label: 'Excellence Modern',  component: ExcellenceModern },
  'excellence-minimal': { id: 'excellence-minimal', label: 'Excellence Minimal', component: ExcellenceMinimal },
  'excellence-luxe':    { id: 'excellence-luxe',    label: 'Excellence Luxe',    component: ExcellenceLuxe },
  'excellence-v0':      { id: 'excellence-v0',      label: 'Excellence V0',      component: ExcellenceV0 },

  // Aliases de compatibilidad (originales — no tocar)
  'rural-warm':      { id: 'rural-warm',      label: 'Rural Warm',      component: ExcellenceDefault },
  'bold-conversion': { id: 'bold-conversion', label: 'Bold Conversion', component: ExcellenceModern },
  'minimal-lux':     { id: 'minimal-lux',     label: 'Minimal Lux',     component: ExcellenceLuxe },

  // ── Builder Series (editor de RentikPro) ─────────────────────────────────
  'builder-basic':    { id: 'builder-basic',    label: 'Builder Basic',    component: BuilderBasic },
  'builder-standard': { id: 'builder-standard', label: 'Builder Standard', component: BuilderStandard },
  'builder-advanced': { id: 'builder-advanced', label: 'Builder Advanced', component: BuilderAdvanced },

  // ── Premium Tier — Rinconcito ─────────────────────────────────────────────
  //
  // Template "Ferrari" basada en El Rinconcito Matarraña (producción real).
  // Adapta identidad visual completa al sistema multi-tenant via useBootstrapState().
  // themeIds: 'builder-premium' (editor) o 'rinconcito-premium' (directo)
  //
  'builder-premium':      { id: 'builder-premium',      label: 'Builder Premium (Rinconcito)', component: RinconcitoPremium },
  'rinconcito-premium':   { id: 'rinconcito-premium',   label: 'Rinconcito Premium',           component: RinconcitoPremium },
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

/**
 * Lista todas las plantillas para mostrar en el picker del editor.
 */
export function listTemplates(): TemplateEntry[] {
  return Object.values(TEMPLATE_REGISTRY);
}

export { DefaultTemplate, ExcellenceDefault, ExcellenceModern, ExcellenceMinimal, ExcellenceLuxe, ExcellenceV0, RinconcitoPremium };
