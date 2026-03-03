/**
 * SiteConfigProvider — Proveedor global async de configuración multi-tenant.
 *
 * Flujo:
 *   1. Al mount, llama loadSiteConfig() (window → fetch → default).
 *   2. Mientras carga, muestra un skeleton global minimalista.
 *   3. Cuando la config está lista, la pone en contexto y monta la app.
 *   4. Si hay error (solo posible si loadSiteConfig lanza — muy improbable),
 *      muestra un mensaje de error y usa DEFAULT_SITE_CONFIG como fallback.
 *
 * Los componentes acceden a la config via useSiteConfig() o useSiteConfigState().
 */

import React, {
    createContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import type { SiteConfig } from './types';
import { loadSiteConfig } from './loadSiteConfig';
import { DEFAULT_SITE_CONFIG } from './default';

// ─── Context ──────────────────────────────────────────────────────────────────

export interface SiteConfigContextValue {
    config: SiteConfig | null;
    isLoading: boolean;
    error: string | Error | null;
}

/**
 * El contexto se exporta para que useSiteConfig.ts pueda importarlo directamente.
 * No lo uses en componentes — usa los hooks en su lugar.
 */
export const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

// ─── Skeleton de carga ────────────────────────────────────────────────────────

const LoadingSkeleton: React.FC = () => (
    <div
        style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            background: '#fafaf9', // stone-50
            fontFamily: 'Inter, system-ui, sans-serif',
        }}
    >
        {/* Spinner */}
        <div
            style={{
                width: 40,
                height: 40,
                border: '3px solid #e7e5e4', // stone-200
                borderTopColor: '#c2410c',   // orange-700
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }}
        />
        {/* Keyframes via <style> inline — no requiere CSS externo */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#78716c', fontSize: 14, margin: 0 }}>Cargando...</p>
    </div>
);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface SiteConfigProviderProps {
    children: ReactNode;
    /**
     * Config pre-cargada para testing o SSR.
     * Si se provee, skipea loadSiteConfig() completamente.
     */
    preloadedConfig?: SiteConfig;
}

export const SiteConfigProvider: React.FC<SiteConfigProviderProps> = ({
    children,
    preloadedConfig,
}) => {
    const [config, setConfig] = useState<SiteConfig | null>(
        preloadedConfig ?? null
    );
    const [isLoading, setIsLoading] = useState(!preloadedConfig);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        // Si ya tenemos config preloaded, no hacemos nada
        if (preloadedConfig) return;

        let cancelled = false;

        (async () => {
            try {
                const cfg = await loadSiteConfig();
                if (!cancelled) {
                    setConfig(cfg);
                    setIsLoading(false);
                }
            } catch (err) {
                if (!cancelled) {
                    const e = err instanceof Error ? err : new Error(String(err));
                    console.error('[SiteConfigProvider] Error loading config:', e.message);

                    // User requested NEVER return null: Fallback to DEFAULT_SITE_CONFIG
                    setError(e);
                    setConfig(DEFAULT_SITE_CONFIG);
                    setIsLoading(false);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [preloadedConfig]);

    // Mientras carga, mostrar skeleton
    if (isLoading || !config) {
        return <LoadingSkeleton />;
    }

    const value: SiteConfigContextValue = {
        config,
        isLoading: false,
        error,
    };

    return (
        <SiteConfigContext.Provider value={value}>
            {children}
        </SiteConfigContext.Provider>
    );
};

export const useSiteConfigContext = () => {
    const context = React.useContext(SiteConfigContext);
    const [slug, setSlug] = useState<string | null>(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('slug') || null;
    });

    // Listen for changes if needed (though usually slug doesn't change without reload in this architecture)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setSlug(params.get('slug') || null);
    }, []);

    if (!context) {
        return {
            slug,
            loading: false, // User requested loading false provided missing
            error: 'PROVIDER_MISSING',
            config: null,
            attemptedUrl: null,
            reload: () => window.location.reload()
        };
    }

    return {
        slug,
        loading: context.isLoading,
        error: context.error ? (context.error.message || 'UNKNOWN') : null, // Flatten error to string if possible, or keep object if App expects it. User said strings.
        config: context.config,
        attemptedUrl: null,
        reload: () => window.location.reload()
    };
};

export default SiteConfigProvider;
