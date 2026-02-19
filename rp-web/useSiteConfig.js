/**
 * useSiteConfig - Universal Configuration Service
 * Handles slug detection and configuration retrieval with in-memory caching.
 */

const SiteConfigService = (() => {
    const configCache = new Map();

    const getSlug = () => {
        const params = new URLSearchParams(window.location.search);
        // 1. Priority: Query param ?slug=
        if (params.has('slug')) return params.get('slug');

        // 2. Secondary: First segment of the path (eg /rinconcito)
        const pathSegments = window.location.pathname.split('/').filter(s => s.length > 0);
        if (pathSegments.length > 0) return pathSegments[0];

        return null;
    };

    const fetchConfig = async (slug) => {
        // Check cache first
        if (configCache.has(slug)) return configCache.get(slug);

        // Check if injected via window (Server-Side Injection mode)
        if (window.SITE_CONFIG && window.SITE_CONFIG.slug === slug) {
            configCache.set(slug, window.SITE_CONFIG);
            return window.SITE_CONFIG;
        }

        const response = await fetch(`/public/site-config?slug=${slug}`);
        if (!response.ok) {
            const error = new Error(`Site config fetch failed: ${response.status}`);
            error.status = response.status;
            throw error;
        }

        const config = await response.json();
        configCache.set(slug, config);
        return config;
    };

    return { getSlug, fetchConfig };
})();

// Exported globally for site.js
window.SiteConfigService = SiteConfigService;
