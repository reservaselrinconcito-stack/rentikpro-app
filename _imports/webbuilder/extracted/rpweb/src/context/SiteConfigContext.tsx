/**
 * SiteConfigContext — Multi-tenant architecture foundation
 *
 * Current state: provides SITE_CONFIG as default value (single-tenant).
 * Future state: wraps App with <SiteConfigProvider config={fetchedConfig}>
 *   to support dynamic, API-loaded configurations per tenant.
 *
 * Migration path:
 *   1. Replace hardcoded imports of SITE_CONFIG with useSiteConfig()
 *   2. Add <SiteConfigProvider config={config}> to App.tsx
 *   3. Load config from API: fetch(`/api/sites/${SITE_ID}/config`)
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { SITE_CONFIG as STATIC_CONFIG } from '../config/site.config';
import { SiteConfig } from '../site-config/types';

// Cast the static config to the dynamic type for fallback purposes
// This assumes they are roughly compatible or we accept the difference for the fallback
const FALLBACK_CONFIG = STATIC_CONFIG as unknown as SiteConfig;

import { useSiteConfig as useV2Config } from '../site-config/useSiteConfig';

// Make the context nullable to represent "not yet loaded" or "error" state
const SiteConfigContext = createContext<SiteConfig | null>(null);

export const SiteConfigProvider: React.FC<{
  config?: SiteConfig;
  children: ReactNode;
}> = ({ config, children }) => (
  <SiteConfigContext.Provider value={config || null}>
    {children}
  </SiteConfigContext.Provider>
);

/**
 * Hook to access site configuration.
 * Bridge: Tries to use the V2 hook first.
 * Falls back to static config only as an emergency.
 */
export const useSiteConfig = (): SiteConfig => {
  // 1. Try to get config from the new V2 Provider (SiteConfigProvider.tsx)
  try {
    const v2Config = useV2Config();
    return v2Config;
  } catch (e) {
    // 2. Fallback to V1 context if V2 is not high enough or failed
    const context = useContext(SiteConfigContext);
    if (context) return context;

    // 3. Absolute fallback to static config
    return FALLBACK_CONFIG;
  }
};

export default SiteConfigContext;
