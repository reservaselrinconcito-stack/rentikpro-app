/**
 * loadSiteConfig — Loader único de configuración multi-tenant.
 */

import type { SiteConfig } from './types';
import { validateSiteConfig } from './schema';
import { DEFAULT_SITE_CONFIG } from './default';

// ─── Cache en memoria ─────────────────────────────────────────────────────────

let _cached: { config: SiteConfig; timestamp: number } | null = null;
let _loadingPromise: Promise<SiteConfig> | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

/** Resetea la cache. Útil en tests o cuando se recarga la config en runtime. */
export function resetSiteConfigCache(): void {
    _cached = null;
    _loadingPromise = null;
}

// ─── Helpers privados ─────────────────────────────────────────────────────────

/**
 * Deep merge utility for SiteConfig.
 * Priority: source values override target values from DEFAULT_SITE_CONFIG.
 */
function mergeDeep(target: any, source: any): any {
    if (!source || typeof source !== 'object') return target;
    const output = { ...target };

    Object.keys(source).forEach(key => {
        const sourceVal = source[key];
        const targetVal = target[key];

        if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
            output[key] = mergeDeep(targetVal || {}, sourceVal);
        } else if (sourceVal !== undefined && sourceVal !== null) {
            output[key] = sourceVal;
        }
    });

    return output;
}

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ñ/g, 'n')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Ensures apartments have all mandatory fields for the UI.
 */
function repairApartments(config: SiteConfig): SiteConfig {
    if (!config.apartments || !Array.isArray(config.apartments)) {
        config.apartments = DEFAULT_SITE_CONFIG.apartments;
        return config;
    }

    config.apartments = config.apartments.map((apt: any, i: number) => {
        const repaired = { ...apt };
        if (!repaired.slug) {
            repaired.slug = repaired.name ? slugify(repaired.name) : `apartment-${i}`;
        }
        if (!repaired.locationId) {
            repaired.locationId = config.locations?.[0]?.id || 'principal';
        }
        if (!repaired.status) repaired.status = 'active';
        if (!repaired.photos) repaired.photos = [];
        return repaired;
    });

    return config;
}

function getSlugFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);

    // 1. Query param ?slug=
    const querySlug = params.get('slug');
    if (querySlug) return querySlug.trim();

    // 2. Path /:slug
    // Si usamos BrowserRouter, el primer segmento suele ser el slug
    const pathSegments = window.location.pathname.split('/').filter(Boolean);

    // Ignorar archivos estáticos y rutas especiales
    const ignored = ['index.html', 'assets', 'api', 'admin'];
    if (pathSegments.length > 0 && !ignored.includes(pathSegments[0])) {
        return decodeURIComponent(pathSegments[0]).trim();
    }

    return null;
}

function normalizeSlug(input: string): string {
    return input
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n").replace(/Ñ/g, "n")
        .replace(/\s+/g, "-")
        .trim();
}

/**
 * Carga desde una URL explícita (?config_url=...)
 */
async function fromConfigUrl(): Promise<SiteConfig | null> {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const configUrl = params.get('config_url');
    if (!configUrl) return null;

    try {
        const res = await fetch(configUrl);
        if (res.ok) {
            const data = await res.json();
            let merged = mergeDeep(DEFAULT_SITE_CONFIG, data);
            merged = repairApartments(merged);
            const val = validateSiteConfig(merged);
            if (val.valid) return merged;
        }
    } catch (e) {
        console.warn('[loadSiteConfig] Failed to load from config_url', e);
    }
    return null;
}

async function fromFetch(slug: string): Promise<SiteConfig | null> {
    const rawApiBase = import.meta.env.VITE_SITE_CONFIG_URL || 'https://rentikpro-public-api.reservas-elrinconcito.workers.dev';
    const apiBase = rawApiBase.replace(/\/$/, '');

    const triedSlugs: string[] = [slug];
    const normalized = normalizeSlug(slug);
    if (normalized !== slug) triedSlugs.push(normalized);

    // special case: demo slug
    if (slug === 'pepito') {
        const demoConfig = {
            ...DEFAULT_SITE_CONFIG,
            brand: {
                ...DEFAULT_SITE_CONFIG.brand,
                name: 'RentikPro Demo Premium',
            },
            blocks: [
                { id: 'hero-1', type: 'hero', title: 'Experiencia Premium', description: 'Esto es una demo del motor de bloques de RentikPro.' },
                { id: 'apartments-1', type: 'apartments', title: 'Inmuebles Destacados' },
                { id: 'reviews-1', type: 'reviews' },
                { id: 'contact-1', type: 'contact' }
            ] as any[]
        };
        return repairApartments(demoConfig);
    }

    for (const s of triedSlugs) {
        const url = `${apiBase}/public/site-config?slug=${encodeURIComponent(s)}`;
        try {
            const res = await fetch(url, {
                headers: { Accept: 'application/json' },
                signal: AbortSignal.timeout(8000),
            });

            if (res.status === 200) {
                const data = await res.json();
                let merged = mergeDeep(DEFAULT_SITE_CONFIG, data);
                merged = repairApartments(merged);

                // Si la config no tiene propertyId (slug), le inyectamos el que funcionó
                if (!merged.meta.propertyId) merged.meta.propertyId = s;

                return merged;
            }
        } catch (e: any) {
            console.error(`[loadSiteConfig] Error fetching ${s}:`, e.message);
        }
    }
    return null;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function loadSiteConfig(): Promise<SiteConfig> {
    const now = Date.now();

    // Check cache
    if (_cached && (now - _cached.timestamp < CACHE_TTL_MS)) {
        return _cached.config;
    }

    if (_loadingPromise) return _loadingPromise;

    _loadingPromise = (async () => {
        try {
            console.log('[loadSiteConfig] Loading configuration...');

            // 1. Window injection
            if (typeof window !== 'undefined' && window.__SITE_CONFIG__) {
                let merged = mergeDeep(DEFAULT_SITE_CONFIG, window.__SITE_CONFIG__);
                merged = repairApartments(merged);
                _cached = { config: merged, timestamp: now };
                return merged;
            }

            // 2. Explicit config_url
            const fromUrl = await fromConfigUrl();
            if (fromUrl) {
                _cached = { config: fromUrl, timestamp: now };
                return fromUrl;
            }

            // 3. Fetch remoto (Slug)
            const slug = getSlugFromUrl();
            if (slug) {
                const fetched = await fromFetch(slug);
                if (fetched) {
                    _cached = { config: fetched, timestamp: now };
                    return fetched;
                }
            }

            // Default absoluto (Demo Mode or Missing Slug depends on App level, here we return DEFAULT)
            return DEFAULT_SITE_CONFIG;
        } finally {
            _loadingPromise = null;
        }
    })();

    return _loadingPromise;
}
