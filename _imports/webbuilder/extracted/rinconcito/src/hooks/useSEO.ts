/**
 * useSEO — Injects JSON-LD structured data and document title
 *
 * Usage:
 *   useSEO({ title: 'Apartamento Los Almendros', description: '...' })
 *   useSEO({ schema: buildApartmentSchema(apartment) })
 *
 * For multi-tenant: replace SITE_CONFIG references with useSiteConfig()
 */

import { useEffect } from 'react';
import { SITE_CONFIG } from '../config/site.config';

// ─── Schema builders ──────────────────────────────────────────────────────────

export function buildLodgingBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.seo.defaultDescription,
    url: SITE_CONFIG.seo.siteUrl,
    telephone: SITE_CONFIG.contact.phone,
    email: SITE_CONFIG.contact.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_CONFIG.contact.address,
      addressLocality: SITE_CONFIG.contact.city,
      addressRegion: SITE_CONFIG.contact.province,
      postalCode: SITE_CONFIG.contact.zip,
      addressCountry: 'ES',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: SITE_CONFIG.contact.lat,
      longitude: SITE_CONFIG.contact.lon,
    },
    priceRange: '€€',
    starRating: {
      '@type': 'Rating',
      ratingValue: '4',
    },
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'WiFi gratuito', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Cocina equipada', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Lavadora', value: true },
    ],
    sameAs: [
      SITE_CONFIG.social.instagram,
      SITE_CONFIG.social.facebook,
      SITE_CONFIG.social.googleMaps,
    ].filter(Boolean) as string[],
  };
}

export function buildApartmentSchema(apt: {
  name: string;
  description: string;
  priceFrom: number;
  capacity: number | null;
  photos: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Accommodation',
    name: apt.name,
    description: apt.description,
    image: apt.photos.slice(0, 3),
    numberOfRooms: apt.capacity ? Math.ceil(apt.capacity / 2) : undefined,
    occupancy: {
      '@type': 'QuantitativeValue',
      maxValue: apt.capacity,
    },
    offers: {
      '@type': 'Offer',
      price: apt.priceFrom,
      priceCurrency: SITE_CONFIG.seo.currency,
      availability: 'https://schema.org/InStock',
    },
    containedInPlace: {
      '@type': 'LodgingBusiness',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.seo.siteUrl,
    },
  };
}

export function buildTouristAttractionSchema(exp: {
  title: string;
  shortSummary: string;
  town: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: exp.title,
    description: exp.shortSummary,
    address: {
      '@type': 'PostalAddress',
      addressLocality: exp.town,
      addressRegion: 'Teruel',
      addressCountry: 'ES',
    },
    touristType: 'Naturaleza y Aventura',
  };
}

export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: `${SITE_CONFIG.seo.siteUrl}${item.url}`,
    })),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface SEOProps {
  title?: string;
  description?: string;
  schema?: object | object[];
  noindex?: boolean;
}

export function useSEO({ title, description, schema, noindex = false }: SEOProps = {}) {
  const cfg = SITE_CONFIG.seo;

  useEffect(() => {
    // Title
    const fullTitle = title
      ? cfg.titleTemplate.replace('%s', title)
      : cfg.defaultTitle;
    document.title = fullTitle;

    // Meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description ?? cfg.defaultDescription);
    }

    // OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', fullTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description ?? cfg.defaultDescription);

    // Robots
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.setAttribute('content', noindex ? 'noindex,nofollow' : 'index,follow');

    // JSON-LD
    if (schema) {
      const schemas = Array.isArray(schema) ? schema : [schema];
      // Remove any previously injected schemas from this hook
      document.querySelectorAll('script[data-seo="true"]').forEach(el => el.remove());
      schemas.forEach((s) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo', 'true');
        script.textContent = JSON.stringify(s);
        document.head.appendChild(script);
      });
    }

    return () => {
      // Cleanup JSON-LD on unmount
      if (schema) {
        document.querySelectorAll('script[data-seo="true"]').forEach(el => el.remove());
      }
    };
  }, [title, description, schema, noindex]);
}
