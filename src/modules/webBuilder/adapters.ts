import { SiteConfig } from './types';
import { DEFAULT_SITE_CONFIG } from './defaults';

/**
 * Migrates any existing config (string, array, or partial object) to strictly typed SiteConfig.
 * Ensures no data loss if possible.
 */
export const migrateConfig = (
    savedJson: string | null | undefined,
    projectInfo?: { name?: string, phone?: string, email?: string }
): SiteConfig => {

    // Start with defaults
    let config: SiteConfig = { ...DEFAULT_SITE_CONFIG };

    // Hydrate from Project Info if available (and config is empty/default)
    if (projectInfo) {
        config.brand.name = projectInfo.name || '';
        config.brand.phone = projectInfo.phone || '';
        config.brand.email = projectInfo.email || '';
        config.contact.email = projectInfo.email || '';
        // If phone is mobile, maybe whatsapp too
        if (projectInfo.phone?.startsWith('+') || projectInfo.phone?.startsWith('6')) {
            config.contact.whatsapp = projectInfo.phone;
        }
    }

    if (!savedJson) return config;

    try {
        const parsed = JSON.parse(savedJson);

        // CASE A: Old Array Format (from previous builder default)
        if (Array.isArray(parsed)) {
            // Attempt to extract known sections
            const hero = parsed.find((s: any) => s.type === 'hero');
            if (hero && hero.content) {
                config.hero.title = hero.content.title || config.hero.title;
                config.hero.subtitle = hero.content.subtitle || config.hero.subtitle;
                config.hero.imageUrl = hero.content.bg_image || config.hero.imageUrl;
            }

            const about = parsed.find((s: any) => s.type === 'text');
            if (about && about.content) {
                // We don't have a direct field for "about", maybe put it in hero subtitle or ignore for now?
                // Or mapped to a generic field. For now, we prefer cleaning up.
            }

            const contact = parsed.find((s: any) => s.type === 'contact');
            if (contact && contact.content) {
                config.contact.email = contact.content.email || config.contact.email;
                config.contact.phone = contact.content.phone || config.contact.phone;
            }

            return config;
        }

        // CASE B: Already a SiteConfig object (or partial)
        if (typeof parsed === 'object' && parsed !== null) {
            // Merge recursively-ish or just spread if structure matches
            // match keys
            return {
                ...config,
                ...parsed,
                brand: { ...config.brand, ...(parsed.brand || {}) },
                hero: { ...config.hero, ...(parsed.hero || {}) },
                contact: { ...config.contact, ...(parsed.contact || {}) },
                location: { ...config.location, ...(parsed.location || {}) },
                chatbot: { ...config.chatbot, ...(parsed.chatbot || {}) },
                // Arrays: replace or merge? Replace is safer for lists to avoid dupe
                apartments: Array.isArray(parsed.apartments) ? { title: 'Alojamientos', items: parsed.apartments } : (parsed.apartments || config.apartments),
                experiences: Array.isArray(parsed.experiences) ? { title: 'Experiencias', items: parsed.experiences } : (parsed.experiences || config.experiences),
                sectionOrder: Array.isArray(parsed.sectionOrder) ? parsed.sectionOrder : ['hero', 'apartments', 'location', 'contact']
            };
        }

    } catch (e) {
        console.warn("Failed to migrate config JSON", e);
    }

    return config;
};

// --- HYDRATION & VALIDATION HELPERS ---

/**
 * Perform a deep merge of the partial config onto the default config.
 */
export const hydrateConfig = (partial: Partial<SiteConfig>): SiteConfig => {
    // Deep clone defaults
    const base = JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG));

    if (!partial) return base;

    return {
        ...base,
        ...partial,
        // Nested Objects Merging
        brand: { ...base.brand, ...partial.brand },
        hero: { ...base.hero, ...partial.hero },
        location: { ...base.location, ...partial.location },
        contact: { ...base.contact, ...partial.contact },
        chatbot: { ...base.chatbot, ...partial.chatbot },
        integrations: { ...base.integrations, ...partial.integrations },

        // Arrays: Overwrite if present and valid array
        sectionOrder: Array.isArray(partial.sectionOrder) ? partial.sectionOrder : base.sectionOrder,

        apartments: partial.apartments ? { ...base.apartments, ...partial.apartments } : base.apartments,
        experiences: partial.experiences ? { ...base.experiences, ...partial.experiences } : base.experiences,
    };
};

export const validateConfig = (config: SiteConfig): string[] => {
    const errors: string[] = [];
    if (!config.slug) errors.push('Slug is required');
    return errors;
};
