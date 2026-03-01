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

        // Enforce proper V1 detection and return early if fully compliant
        if (parsed && parsed.version === '1.0' && parsed.pages && parsed.pages['/']) {
            if (!parsed.assets) parsed.assets = [];

            // Clean up potentially corrupted blocks (like objects in features)
            const cleanedBlocks = parsed.pages['/'].blocks.map((b: any) => {
                if (b.type === 'Features' && Array.isArray(b.data?.features)) {
                    b.data.features = b.data.features.map((f: any) =>
                        typeof f === 'string' ? f : (f.title || f.description || String(f))
                    );
                }
                return b;
            });
            parsed.pages['/'].blocks = cleanedBlocks;

            return parsed as SiteConfigV1;
        }

        // --- MIGRATION FROM LEGACY --- //
        console.log("[WEBBUILDER] Migrating legacy config format to V1");

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

        // Build new V1 blocks based on legacy or defaults
        if (legacyData.brand?.name) v1Config.globalData.brandName = legacyData.brand.name;

        // We always use the robust default V1 layout, avoiding complex merging that causes whitescreens
        console.log(`[WEBBUILDER] Hydrated fallback config from defaults`);

    } catch (e) {
        console.warn("[WEBBUILDER] Failed to parse/migrate config JSON to V1, using defaults", e);
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
