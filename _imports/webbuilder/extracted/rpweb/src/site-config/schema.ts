/**
 * schema.ts — Validador estructural de SiteConfig.
 *
 * No requiere Zod ni ninguna dependencia externa.
 * Exporta validateSiteConfig() para detectar configuraciones mal formadas
 * en tiempo de desarrollo (ej: en scripts/import_*.ts o en CI).
 *
 * Uso:
 *   import { validateSiteConfig } from '../site-config/schema';
 *   const result = validateSiteConfig(rawConfig);
 *   if (!result.valid) console.error(result.errors);
 */

import type { SiteConfig } from './types';

// ─── Tipos de resultado ────────────────────────────────────────────────────────

export interface ValidationError {
    path: string;
    message: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function err(path: string, message: string): ValidationError {
    return { path, message };
}

function isString(v: unknown): v is string {
    return typeof v === 'string';
}

function isNonEmptyString(v: unknown): v is string {
    return isString(v) && v.trim().length > 0;
}

function isArray(v: unknown): v is unknown[] {
    return Array.isArray(v);
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// ─── Reglas de validación ─────────────────────────────────────────────────────

export function validateSiteConfig(config: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!isObject(config)) {
        return { valid: false, errors: [err('root', 'SiteConfig debe ser un objeto')] };
    }

    const cfg = config as Partial<SiteConfig>;

    // meta
    if (!isObject(cfg.meta)) {
        errors.push(err('meta', 'Requerido'));
    } else {
        if (!isNonEmptyString(cfg.meta.propertyId)) errors.push(err('meta.propertyId', 'Requerido y no vacío'));
        if (!isNonEmptyString(cfg.meta.generatedAt)) errors.push(err('meta.generatedAt', 'Requerido'));
        if (!isNonEmptyString(cfg.meta.templateVersion)) errors.push(err('meta.templateVersion', 'Requerido'));
    }

    // theme
    if (!isObject(cfg.theme)) {
        errors.push(err('theme', 'Requerido'));
    } else {
        if (!isNonEmptyString(cfg.theme.themeId)) errors.push(err('theme.themeId', 'Requerido'));
    }

    // locales
    if (!isObject(cfg.locales)) {
        errors.push(err('locales', 'Requerido'));
    } else {
        if (!isNonEmptyString(cfg.locales.defaultLocale)) errors.push(err('locales.defaultLocale', 'Requerido'));
        if (!isArray(cfg.locales.enabled) || cfg.locales.enabled.length === 0) {
            errors.push(err('locales.enabled', 'Debe ser un array con al menos un locale'));
        }
    }

    // brand
    if (!isObject(cfg.brand)) {
        errors.push(err('brand', 'Requerido'));
    } else {
        if (!isNonEmptyString(cfg.brand.name)) errors.push(err('brand.name', 'Requerido'));
    }

    // social (optional object, just check it's present)
    if (cfg.social !== undefined && !isObject(cfg.social)) {
        errors.push(err('social', 'Debe ser un objeto o estar ausente'));
    }

    // seo
    if (!isObject(cfg.seo)) {
        errors.push(err('seo', 'Requerido'));
    } else {
        if (!isNonEmptyString(cfg.seo.defaultTitle)) errors.push(err('seo.defaultTitle', 'Requerido'));
        if (!isNonEmptyString(cfg.seo.titleTemplate)) errors.push(err('seo.titleTemplate', 'Requerido'));
        if (!isNonEmptyString(cfg.seo.siteUrl)) errors.push(err('seo.siteUrl', 'Requerido'));
        if (!isNonEmptyString(cfg.seo.locale)) errors.push(err('seo.locale', 'Requerido'));
        if (!isNonEmptyString(cfg.seo.currency)) errors.push(err('seo.currency', 'Requerido'));
    }

    // locations
    if (!isArray(cfg.locations)) {
        errors.push(err('locations', 'Debe ser un array'));
    } else {
        cfg.locations.forEach((loc, i) => {
            if (!isObject(loc)) { errors.push(err(`locations[${i}]`, 'Debe ser un objeto')); return; }
            if (!isNonEmptyString((loc as Record<string, unknown>).id)) errors.push(err(`locations[${i}].id`, 'Requerido'));
            if (!isNonEmptyString((loc as Record<string, unknown>).name)) errors.push(err(`locations[${i}].name`, 'Requerido'));
            if (!isNonEmptyString((loc as Record<string, unknown>).town)) errors.push(err(`locations[${i}].town`, 'Requerido'));
        });
    }

    // apartments
    if (!isArray(cfg.apartments)) {
        errors.push(err('apartments', 'Debe ser un array'));
    } else {
        cfg.apartments.forEach((apt, i) => {
            if (!isObject(apt)) { errors.push(err(`apartments[${i}]`, 'Debe ser un objeto')); return; }
            const a = apt as Record<string, unknown>;
            // Slug y locationId ya no son estrictamente obligatorios aquí
            // (se generan/limpian en loadSiteConfig si faltan)
            if (a.slug !== undefined && !isString(a.slug)) errors.push(err(`apartments[${i}].slug`, 'Debe ser string'));
            if (!isNonEmptyString(a.name)) errors.push(err(`apartments[${i}].name`, 'Requerido'));
            if (a.locationId !== undefined && !isString(a.locationId)) errors.push(err(`apartments[${i}].locationId`, 'Debe ser string'));
            if (!isNonEmptyString(a.status)) errors.push(err(`apartments[${i}].status`, 'Requerido'));
            if (!isArray(a.photos)) errors.push(err(`apartments[${i}].photos`, 'Debe ser un array'));
        });
    }

    // sectionsEnabled
    if (!isObject(cfg.sectionsEnabled)) {
        errors.push(err('sectionsEnabled', 'Requerido'));
    } else {
        const requiredSections: Array<keyof SiteConfig['sectionsEnabled']> = [
            'home', 'apartments', 'availability', 'experiences',
            'guides', 'blog', 'contact', 'rentikpro', 'comingSoon',
        ];
        requiredSections.forEach((key) => {
            if (typeof (cfg.sectionsEnabled as unknown as Record<string, unknown>)[key] !== 'boolean') {
                errors.push(err(`sectionsEnabled.${key}`, 'Debe ser boolean'));
            }
        });
    }

    // integrations
    if (!isObject(cfg.integrations)) {
        errors.push(err('integrations', 'Requerido'));
    } else {
        if (!isObject(cfg.integrations.rentikpro)) {
            errors.push(err('integrations.rentikpro', 'Requerido'));
        } else {
            const rp = cfg.integrations.rentikpro as Record<string, unknown>;
            if (!isString(rp.apiBase)) errors.push(err('integrations.rentikpro.apiBase', 'Requerido'));
            if (!isString(rp.propertyId)) errors.push(err('integrations.rentikpro.propertyId', 'Requerido'));
            if (!isString(rp.publicToken)) errors.push(err('integrations.rentikpro.publicToken', 'Requerido'));
        }
    }

    if (!isObject(cfg.content)) {
        errors.push(err('content', 'Requerido'));
    } else {
        if (!isArray(cfg.content.experiences)) errors.push(err('content.experiences', 'Debe ser un array'));
        if (!isArray(cfg.content.guides)) errors.push(err('content.guides', 'Debe ser un array'));
        if (!isArray(cfg.content.blog)) errors.push(err('content.blog', 'Debe ser un array'));
    }

    // blocks (optional)
    if (cfg.blocks !== undefined) {
        if (!isArray(cfg.blocks)) {
            errors.push(err('blocks', 'Debe ser un array'));
        } else {
            cfg.blocks.forEach((block, i) => {
                if (!isObject(block)) {
                    errors.push(err(`blocks[${i}]`, 'Debe ser un objeto'));
                } else {
                    const b = block as Record<string, unknown>;
                    if (!isNonEmptyString(b.id)) errors.push(err(`blocks[${i}].id`, 'Requerido'));
                    if (!isNonEmptyString(b.type)) errors.push(err(`blocks[${i}].type`, 'Requerido'));
                }
            });
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Lanza un error en desarrollo si la config no pasa la validación.
 * No-op en producción para no impactar el bundle.
 */
export function assertSiteConfig(config: unknown, label = 'SiteConfig'): asserts config is SiteConfig {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
    const result = validateSiteConfig(config);
    if (!result.valid) {
        const messages = result.errors.map(e => `  [${e.path}] ${e.message}`).join('\n');
        throw new Error(`${label} inválido:\n${messages}`);
    }
}
