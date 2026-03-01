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
import { SITE_CONFIG, SiteConfig } from '../config/site.config';

const SiteConfigContext = createContext<SiteConfig>(SITE_CONFIG);

export const SiteConfigProvider: React.FC<{
  config?: SiteConfig;
  children: ReactNode;
}> = ({ config = SITE_CONFIG, children }) => (
  <SiteConfigContext.Provider value={config}>
    {children}
  </SiteConfigContext.Provider>
);

/**
 * Hook to access site configuration.
 * Replace all direct SITE_CONFIG imports with this hook for multi-tenant support.
 */
export const useSiteConfig = (): SiteConfig => useContext(SiteConfigContext);

export default SiteConfigContext;
