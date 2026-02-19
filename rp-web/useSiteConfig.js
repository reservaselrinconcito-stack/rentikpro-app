/**
 * useSiteConfig - Universal Configuration Service
 * Handles slug detection and configuration retrieval with in-memory caching.
 */

const SiteConfigService = (() => {
    const configCache = new Map();

    const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

    const getSlug = () => {
        const params = new URLSearchParams(window.location.search);
        if (params.has('slug')) return params.get('slug');
        const pathSegments = window.location.pathname.split('/').filter(s => s.length > 0);
        if (pathSegments.length > 0) return pathSegments[0];
        return null;
    };

    const fetchConfig = async (slug) => {
        // 1. Memory Cache
        if (configCache.has(slug)) return configCache.get(slug);

        // 2. Server-Side Injection
        if (window.SITE_CONFIG && window.SITE_CONFIG.slug === slug) {
            configCache.set(slug, window.SITE_CONFIG);
            return window.SITE_CONFIG;
        }

        // 3. LocalStorage Cache (with TTL)
        const cacheKey = `rp_config_${slug}`;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TTL) {
                    // Cache hit - Valid
                    configCache.set(slug, data);
                    // Background revalidate (stale-while-revalidate pattern optional, 
                    // but for now we simply return cached to avoid flicker)
                    return data;
                }
            }
        } catch (e) {
            console.warn("Cache parse error", e);
            localStorage.removeItem(cacheKey);
        }

        // 4. Network Fetch
        const start = performance.now();

        // Use configured API Base or fallback
        const apiBase = import.meta.env.VITE_PUBLIC_API_BASE || "https://rentikpro-public-api.reservas-elrinconcito.workers.dev";
        const fetchUrl = `${apiBase}/public/site-config?slug=${slug}`;

        console.log(`[SiteConfig] Fetching from: ${fetchUrl}`);

        const response = await fetch(fetchUrl, { mode: 'cors' });

        if (!response.ok) {
            const errorMsg = `Site config fetch failed. 
URL: ${fetchUrl}
Status: ${response.status} ${response.statusText}
Slug: ${slug}`;
            console.error(errorMsg);
            const error = new Error(errorMsg);
            error.status = response.status;
            throw error;
        }

        const config = await response.json();

        // Enrich config with metadata for Debug Mode
        config._meta = {
            fetchedAt: Date.now(),
            fetchDuration: (performance.now() - start).toFixed(2) + 'ms',
            source: 'network'
        };

        // Update Caches
        configCache.set(slug, config);
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                data: config,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn("LocalStorage write failed (quota?)", e);
        }

        return config;
    };

    return { getSlug, fetchConfig };
})();

// Exported globally for site.js
window.SiteConfigService = SiteConfigService;
