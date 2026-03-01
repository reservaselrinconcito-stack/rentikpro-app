/**
 * useSiteConfig — Hook para acceder a la SiteConfig del tenant activo.
 *
 * Lanza un error claro si se usa fuera del SiteConfigProvider,
 * lo que facilita detectar errores de arquitectura en desarrollo.
 *
 * Uso:
 *   const cfg = useSiteConfig();
 *   console.log(cfg.brand.name);
 */

import { useContext } from 'react';
import { SiteConfigContext } from './SiteConfigProvider';
import type { SiteConfig } from './types';

export function useSiteConfig(): SiteConfig {
    const ctx = useContext(SiteConfigContext);
    if (!ctx) {
        throw new Error(
            '[useSiteConfig] Debe usarse dentro de <SiteConfigProvider>. ' +
            'Asegúrate de que la app esté envuelta en el provider raíz.'
        );
    }
    return ctx.config;
}

/**
 * Variante que expone también el estado de carga y error.
 * Útil para componentes que quieren mostrar un estado alternativo.
 */
export function useSiteConfigState(): {
    config: SiteConfig | null;
    isLoading: boolean;
    error: Error | null;
} {
    const ctx = useContext(SiteConfigContext);
    if (!ctx) {
        throw new Error('[useSiteConfigState] Debe usarse dentro de <SiteConfigProvider>.');
    }
    return ctx;
}
