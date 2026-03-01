/**
 * brand.ts — thin compatibility re-export from site.config.ts
 *
 * All source-of-truth lives in src/config/site.config.ts.
 * This file preserves backward compatibility with code that still imports from brand.ts.
 *
 * For multi-tenant: replace all direct imports with useSiteConfig() from context.
 */

import { SITE_CONFIG } from '../config/site.config';

export const BRAND = {
  name: SITE_CONFIG.name,
  slogan: SITE_CONFIG.slogan,
  owners: SITE_CONFIG.owners,
  license: SITE_CONFIG.license,
  rentikproLandingUrl: SITE_CONFIG.rentikpro.landingUrl ?? 'https://rentikpro.com',
  rentikproContactUrl: SITE_CONFIG.rentikpro.contactUrl ?? 'https://rentikpro.com/contacto',
  contact: {
    phone: SITE_CONFIG.contact.phone,
    phoneRaw: SITE_CONFIG.contact.phoneRaw,
    email: SITE_CONFIG.contact.email,
    address: SITE_CONFIG.contact.address,
    zip: SITE_CONFIG.contact.zip,
    city: SITE_CONFIG.contact.city,
    province: SITE_CONFIG.contact.province,
    country: SITE_CONFIG.contact.country,
    lat: SITE_CONFIG.contact.lat,
    lon: SITE_CONFIG.contact.lon,
    instagram: SITE_CONFIG.social.instagram ?? '',
    facebook: SITE_CONFIG.social.facebook ?? '',
    booking: SITE_CONFIG.social.booking ?? '',
    airbnb: SITE_CONFIG.social.airbnb ?? '',
    google: SITE_CONFIG.social.googleMaps ?? '',
    whatsapp: SITE_CONFIG.social.whatsapp ?? '',
  },
  rentikPro: {
    enabled: SITE_CONFIG.rentikpro.enabled,
    badgeText: 'Gestionado con RentikPro',
    description: 'Tecnología de vanguardia para una experiencia rural sin fisuras.',
    features: [
      'Calendario en tiempo real',
      'Check-in 100% digital',
      'Comunicación unificada',
      'Climatización inteligente',
    ],
  },
};
