/**
 * domain/normalizers.ts — Conversión segura de datos externos a tipos de dominio.
 *
 * CRÍTICO: Estas funciones NUNCA deben lanzar ni retornar null.
 * Si un campo falta, se usa un valor por defecto sensato.
 */

import type {
  DomainProperty,
  DomainApartment,
  DomainAvailability,
  ApartmentAvailability,
  AvailabilityDay,
} from './types';

// ─── Property normalizer ──────────────────────────────────────────────────────

export function normalizeProperty(raw: any, slug: string): DomainProperty {
  const brand = raw?.brand ?? {};
  const loc = (raw?.locations ?? [])[0] ?? {};
  const social = raw?.social ?? {};
  const theme = raw?.theme ?? {};
  const meta = raw?.meta ?? {};

  return {
    slug: slug,
    propertyId: String(meta?.propertyId ?? slug ?? 'demo'),
    name: String(brand?.name ?? 'Alojamiento Rural'),
    shortName: String(brand?.shortName ?? brand?.name ?? 'Alojamiento'),
    slogan: String(brand?.slogan ?? 'Tu escapada rural'),
    email: String(brand?.email ?? ''),
    phone: String(brand?.phone ?? ''),
    phoneRaw: String(brand?.phoneRaw ?? ''),
    logoUrl: brand?.logoUrl ?? null,
    location: {
      town: String(loc?.town ?? ''),
      province: String(loc?.province ?? ''),
      country: String(loc?.country ?? 'ES'),
      lat: typeof loc?.lat === 'number' ? loc.lat : null,
      lon: typeof loc?.lon === 'number' ? loc.lon : null,
    },
    social: {
      instagram: social?.instagram ?? null,
      facebook: social?.facebook ?? null,
      whatsapp: social?.whatsapp ?? null,
      googleMaps: social?.googleMaps ?? null,
    },
    theme: {
      themeId: String(theme?.themeId ?? 'rural-warm'),
      primaryColor: String(theme?.primaryColor ?? 'orange'),
    },
    locale: String(raw?.locales?.defaultLocale ?? 'es'),
    siteUrl: String(raw?.seo?.siteUrl ?? window.location.origin),
  };
}

// ─── Apartment normalizer ─────────────────────────────────────────────────────

export function normalizeApartment(raw: any, index: number): DomainApartment {
  return {
    id: String(raw?.id ?? raw?.slug ?? `apt-${index}`),
    slug: String(raw?.slug ?? `apt-${index}`),
    name: String(raw?.name ?? `Apartamento ${index + 1}`),
    description: String(raw?.description ?? ''),
    longDescription: String(raw?.longDescription ?? raw?.description ?? ''),
    capacity: Number(raw?.capacity) || 2,
    bedrooms: Number(raw?.bedrooms) || 1,
    bathrooms: Number(raw?.bathrooms) || 1,
    sizeM2: typeof raw?.sizeM2 === 'number' ? raw.sizeM2 : null,
    priceFrom: typeof raw?.priceFrom === 'number' ? raw.priceFrom : null,
    publicBasePrice: typeof raw?.publicBasePrice === 'number'
      ? raw.publicBasePrice
      : (typeof raw?.priceFrom === 'number' ? raw.priceFrom : null),
    currency: raw?.currency ? String(raw.currency) : null,
    photos: Array.isArray(raw?.photos) ? raw.photos.filter(Boolean) : [],
    highlights: Array.isArray(raw?.highlights) ? raw.highlights.filter(Boolean) : [],
    status: raw?.status === 'coming_soon' ? 'coming_soon' : 'active',
  };
}

export function normalizeApartments(raw: any[]): DomainApartment[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((a, i) => normalizeApartment(a, i));
}

// ─── Availability normalizer ──────────────────────────────────────────────────

export function normalizeAvailabilityDay(raw: any): AvailabilityDay {
  return {
    date: String(raw?.date ?? ''),
    isAvailable: Boolean(raw?.isAvailable ?? true),
    minNights: typeof raw?.minNights === 'number' ? raw.minNights : null,
    price: typeof raw?.price === 'number' ? raw.price : null,
  };
}

export function normalizeAvailability(raw: any): DomainAvailability {
  const apartments: ApartmentAvailability[] = Array.isArray(raw?.apartments)
    ? raw.apartments.map((apt: any) => ({
      apartmentSlug: String(apt?.apartmentSlug ?? ''),
      days: Array.isArray(apt?.days)
        ? apt.days.map(normalizeAvailabilityDay)
        : [],
    }))
    : [];

  return {
    from: String(raw?.from ?? ''),
    to: String(raw?.to ?? ''),
    apartments,
  };
}
