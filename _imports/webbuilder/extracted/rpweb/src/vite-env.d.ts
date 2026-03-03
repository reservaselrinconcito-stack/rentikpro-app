/// <reference types="vite/client" />

/**
 * Variables de entorno de Vite tipadas.
 * Añadir aquí cada VITE_* que se use en el proyecto.
 */
interface ImportMetaEnv {
    /** URL desde donde cargar el SiteConfig del tenant en runtime */
    readonly VITE_SITE_CONFIG_URL?: string;
    /** Base URL de la API de RentikPro */
    readonly VITE_RENTIKPRO_API_BASE?: string;
    readonly VITE_RENTIKPRO_WEB_BASE?: string;
    /** Coordenadas de la localización principal (fallback) */
    readonly VITE_OPEN_METEO_LAT?: string;
    readonly VITE_OPEN_METEO_LON?: string;
    /** Gemini AI */
    readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

/**
 * Tipado global para window.__SITE_CONFIG__.
 *
 * Puede inyectarse vía:
 *   - Script inline en index.html: <script>window.__SITE_CONFIG__ = {...}</script>
 *   - CDN/edge worker que modifica el HTML antes de servir
 *   - Cloudflare Workers con Workers Sites
 */
declare global {
    interface Window {
        __SITE_CONFIG__?: any;
        SITE_CONFIG?: any;
    }
}

export { };
