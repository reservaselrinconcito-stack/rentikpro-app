/**
 * src/site-config — Barrel de exportaciones.
 *
 * Importar desde aquí para centralizar el acceso al contrato de configuración.
 *
 * Ejemplo:
 *   import type { SiteConfig } from '../site-config';
 *   import { DEFAULT_SITE_CONFIG } from '../site-config';
 *   import { validateSiteConfig } from '../site-config';
 */

export type {
    SiteConfig,
    SiteConfigMeta,
    SiteThemeConfig,
    SiteLocalesConfig,
    SiteBrandConfig,
    SiteSocialConfig,
    SiteSeoConfig,
    SiteLocation,
    SiteApartment,
    SiteExperience,
    SiteGuide,
    SiteBlogPost,
    SiteContentConfig,
    SiteSectionsEnabled,
    RentikProIntegration,
    SiteIntegrationsConfig,
    SiteComingSoonConfig,
    ComingSoonItem,
    LocationStatus,
    ApartmentStatus,
} from './types';

export { DEFAULT_SITE_CONFIG } from './default';
export { validateSiteConfig, assertSiteConfig } from './schema';
export type { ValidationResult, ValidationError } from './schema';
export { loadSiteConfig, resetSiteConfigCache } from './loadSiteConfig';
export { SiteConfigProvider, SiteConfigContext } from './SiteConfigProvider';
export type { SiteConfigContextValue } from './SiteConfigProvider';
export { useSiteConfig, useSiteConfigState } from './useSiteConfig';
