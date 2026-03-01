/**
 * useSEO — Injects JSON-LD structured data, document title, and preloads assets
 */

import { useEffect } from 'react';
import { SiteConfig, SiteApartment } from '../site-config/types';

// ─── Schema builders ──────────────────────────────────────────────────────────

export function buildLodgingBusinessSchema(cfg: SiteConfig) {
  const brand = cfg.brand;
  const locations = cfg.locations || [];
  const location = locations.length > 0 ? locations[0] : null;

  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: brand.name,
    description: brand.slogan || `${brand.name} - ${brand.shortName || ''}`,
    url: window.location.href, // Dynamic URL
    telephone: brand.phone,
    email: brand.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: location?.town || 'Matarraña',
      addressRegion: location?.province || '',
      addressCountry: 'ES',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: location?.lat || 40.8069, // Default or from config
      longitude: location?.lon || 0.0639,
    },
    priceRange: '€€',
    image: brand.logoUrl, // Use logo or maybe a hero image if available elsewhere
    sameAs: [
      cfg.social?.instagram,
      cfg.social?.facebook,
      cfg.integrations?.tripAdvisorUrl, // Was reviewsUrl
    ].filter(Boolean) as string[],
  };
}

export function buildApartmentSchema(apt: SiteApartment, cfg: SiteConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Accommodation',
    name: apt.name,
    description: apt.description,
    image: apt.photos?.slice(0, 3) || [],
    numberOfRooms: apt.capacity ? Math.ceil(apt.capacity / 2) : undefined,
    occupancy: {
      '@type': 'QuantitativeValue',
      maxValue: apt.capacity,
    },
    offers: {
      '@type': 'Offer',
      price: apt.priceFrom,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
    containedInPlace: {
      '@type': 'LodgingBusiness',
      name: cfg.brand.name,
      url: window.location.origin,
    },
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface SEOProps {
  title?: string;
  description?: string;
  schema?: object | object[];
  noindex?: boolean;
  preloadImage?: string;
}

export function useSEO({ title, description, schema, noindex = false, preloadImage }: SEOProps = {}) {
  useEffect(() => {
    // Title
    if (title) {
      document.title = title;
    }

    // Meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      if (description) metaDesc.setAttribute('content', description);
    } else if (description) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = description;
      document.head.appendChild(meta);
    }

    // OG tags
    const updateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    if (title) updateMeta('og:title', title);
    if (description) updateMeta('og:description', description);
    updateMeta('og:url', window.location.href);

    // Robots
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', noindex ? 'noindex,nofollow' : 'index,follow');

    // Preload Image
    if (preloadImage) {
      let link = document.querySelector('link[rel="preload"][as="image"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'preload');
        link.setAttribute('as', 'image');
        document.head.appendChild(link);
      }
      link.setAttribute('href', preloadImage);
    }

    // JSON-LD
    if (schema) {
      const schemas = Array.isArray(schema) ? schema : [schema];
      // Remove any previously injected schemas from this hook
      const existing = document.querySelectorAll('script[data-seo="true"]');
      existing.forEach(el => el.remove());

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
  }, [title, description, schema, noindex, preloadImage]);
}
