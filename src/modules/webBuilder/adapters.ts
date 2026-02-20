import { SiteConfigLegacy, SiteConfigV1, BlockInstance } from './types';
import { DEFAULT_SITE_CONFIG, DEFAULT_SITE_CONFIG_V1 } from './defaults';


/**
 * Migrates any existing config (string, array, or object) to strictly typed SiteConfigV1.
 */
export const migrateToV1 = (
    savedJson: string | null | undefined,
    projectInfo?: { name?: string, phone?: string, email?: string }
): SiteConfigV1 => {

    // Start with the solid V1 default
    let v1Config: SiteConfigV1 = JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG_V1));

    if (projectInfo && projectInfo.name) {
        v1Config.globalData.brandName = projectInfo.name;
    }

    if (!savedJson) return v1Config;

    try {
        const parsed = JSON.parse(savedJson);

        // If it's already V1, just return it (after deep merging with defaults if needed)
        if (parsed && parsed.version === '1.0') {
            if (!parsed.assets) parsed.assets = [];
            return parsed as SiteConfigV1;
        }

        // --- MIGRATION FROM LEGACY --- //
        // Determine if it was legacy shape (SiteConfigLegacy)
        const isLegacyObject = typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null;

        let legacyData: Partial<SiteConfigLegacy> = {};

        if (isLegacyObject) {
            legacyData = parsed;
        } else if (Array.isArray(parsed)) {
            // Very old array format
            const hero = parsed.find((s: any) => s.type === 'hero');
            if (hero && hero.content) {
                legacyData.hero = { title: hero.content.title, subtitle: hero.content.subtitle, imageUrl: hero.content.bg_image };
            }
        }

        // Apply Legacy Data to V1 Structure
        if (legacyData.slug) v1Config.slug = legacyData.slug;
        if (legacyData.brand?.name) v1Config.globalData.brandName = legacyData.brand.name;

        // Build the blocks for the home page based on legacy data
        const homeBlocks: BlockInstance[] = [];

        // 1. Navigation (derived from global/brand if needed, or use default)
        homeBlocks.push({
            id: 'block-nav-1',
            type: 'Navigation',
            data: {
                brandName: legacyData.brand?.name || v1Config.globalData.brandName,
                links: [{ label: 'Inicio', href: '/' }, { label: 'Alojamientos', href: '#apartments' }]
            },
            styles: {}
        });

        // 2. Hero
        if (legacyData.hero) {
            homeBlocks.push({
                id: 'block-hero-1',
                type: 'Hero',
                data: {
                    title: legacyData.hero.title || 'Bienvenido',
                    subtitle: legacyData.hero.subtitle || '',
                    ctaLabel: legacyData.hero.ctaLabel || 'Reservar Ahora',
                    ctaHref: legacyData.hero.ctaHref || '#apartments',
                    imageUrl: legacyData.hero.imageUrl || DEFAULT_SITE_CONFIG.hero.imageUrl
                },
                styles: {
                    desktop: { padding: '8rem 2rem' },
                    mobile: { padding: '4rem 1rem' }
                }
            });
        } else {
            // Keep default hero
            homeBlocks.push(v1Config.pages['/'].blocks.find(b => b.type === 'Hero')!);
        }

        // 3. Add the rest of the default blocks to complete the page layout
        const otherBlocks = v1Config.pages['/'].blocks.filter(b => b.type !== 'Hero' && b.type !== 'Navigation');
        homeBlocks.push(...otherBlocks);

        v1Config.pages['/'].blocks = homeBlocks.filter(Boolean);

    } catch (e) {
        console.warn("Failed to migrate config JSON to V1", e);
    }

    return v1Config;
};

// Deprecated: keeping only so we don't break until we wire everything up
export const migrateConfig = migrateToV1;
// --- HYDRATION & VALIDATION HELPERS ---

export const hydrateConfig = (partial: Partial<SiteConfigV1>): SiteConfigV1 => {
    const base = JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG_V1));
    if (!partial) return base;
    return { ...base, ...partial, pages: { ...base.pages, ...(partial.pages || {}) } };
};

export const validateConfig = (config: SiteConfigV1): string[] => {
    const errors: string[] = [];
    if (!config.slug) errors.push('Slug is required');
    return errors;
};
