import { SiteConfig as MinimalConfig } from './types';
import { SiteConfig as FullConfig } from '../site-config/types';
import { DEFAULT_SITE_CONFIG } from '../site-config/default';

export function normalizeConfig(minimal: MinimalConfig): FullConfig {
    // 1. Deep clone default config to use as base
    const full = JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG)) as FullConfig;

    // 2. Map Brand
    if (minimal.brand) {
        full.brand.name = minimal.brand.name;
        if (minimal.brand.logoUrl) full.brand.logoUrl = minimal.brand.logoUrl;
        if (minimal.brand.phone) full.brand.phone = minimal.brand.phone;
        if (minimal.brand.email) full.brand.email = minimal.brand.email;
        if (minimal.brand.rentikproLandingUrl) full.brand.rentikproLandingUrl = minimal.brand.rentikproLandingUrl;

        // SEO defaults based on brand
        full.seo.defaultTitle = `${minimal.brand.name}`;
        full.seo.titleTemplate = `%s | ${minimal.brand.name}`;
    }

    // 3. Map Integrations
    if (minimal.integrations?.rentikpro) {
        full.integrations.rentikpro.propertyId = minimal.integrations.rentikpro.propertyId;
        full.integrations.rentikpro.publicToken = minimal.integrations.rentikpro.publicToken;
        if (minimal.integrations.rentikpro.apiBase) {
            full.integrations.rentikpro.apiBase = minimal.integrations.rentikpro.apiBase;
        }
        // Enable rentikpro section/badge if we have credentials
        full.integrations.rentikpro.showBadge = true;
    }

    // 4. Map Apartments
    if (minimal.apartments && Array.isArray(minimal.apartments)) {
        full.apartments = minimal.apartments.map(apt => ({
            slug: apt.slug || apt.id, // Fallback to ID if slug missing
            name: apt.name,
            locationId: full.locations[0].id, // Default to first location
            status: 'active',
            sizeM2: apt.sizeM2 || null,
            capacity: apt.capacity || null,
            bedrooms: null,
            bathrooms: null,
            description: apt.description || '',
            longDescription: apt.description || '',
            highlights: [],
            photos: apt.photos || [],
            priceFrom: undefined, // Not in minimal config currently?
            priceCurrency: 'EUR'
        }));
    }

    // 5. Map Experiences (if any)
    if (minimal.experiences && Array.isArray(minimal.experiences)) {
        full.content.experiences = minimal.experiences.map(exp => ({
            slug: exp.slug,
            title: exp.title,
            shortSummary: exp.shortSummary || '',
            category: exp.category || 'General',
            photos: [],
            town: full.locations[0].town
        }));
    }

    // 6. Map Guides (if any)
    if (minimal.guides && Array.isArray(minimal.guides)) {
        full.content.guides = minimal.guides.map(guide => ({
            slug: guide.slug,
            title: guide.title,
            subtitle: guide.intro || '',
            content: '',
            imageUrl: undefined
        }));
    }

    // 7. Update Meta
    full.meta.generatedAt = new Date().toISOString();
    if (minimal.integrations?.rentikpro?.propertyId) {
        full.meta.propertyId = minimal.integrations.rentikpro.propertyId;
    }

    // 8. Derive Sections Enabled
    full.sectionsEnabled.apartments = (full.apartments.length > 0);
    full.sectionsEnabled.experiences = (full.content.experiences.length > 0);
    full.sectionsEnabled.guides = (full.content.guides && full.content.guides.length > 0) || false;
    full.sectionsEnabled.rentikpro = !!full.integrations.rentikpro.publicToken;
    full.sectionsEnabled.contact = true; // Always enable contact

    // 9. Set Default Theme
    // If templateId is 'modern', force modern-warm or specific theme settings
    if (minimal.templateId === 'modern') {
        full.theme.themeId = 'modern-warm';
    } else {
        full.theme.themeId = 'modern-warm'; // Default fallback
    }

    // 10. Pass through version/templateId
    if (minimal.version) full.meta.templateVersion = minimal.version.toString();
    // We could store templateId in meta if needed, or just rely on themeId for now.

    return full;
}
