/**
 * api/rentikpro.ts — Endpoints tipados para la API pública de RentikPro.
 *
 * REGLA DE ORO: Estas funciones lanzan ApiError en fallo.
 * El caller (safeLoadAll) decide si hacer fallback a demo.
 *
 * Nunca leer directamente desde componentes.
 */

import { apiFetch, apiPost, type ApiClientConfig } from './client';
import type { LeadPayload } from '../domain/types';

// ─── Configuración ────────────────────────────────────────────────────────────

/** Resuelve la base URL sin depender de ENV obligatorio */
function resolveApiBase(): string {
  const fromEnv = import.meta.env.VITE_RENTIKPRO_API_BASE as string | undefined;
  if (fromEnv && fromEnv !== 'MOCK' && fromEnv.startsWith('http')) return fromEnv;
  // URL pública por defecto — cambia al dominio real de producción si lo tienes
  return 'https://rentikpro-public-api.reservas-elrinconcito.workers.dev';
}

function resolvePublicToken(siteToken?: string): string | undefined {
  return (
    siteToken ||
    (import.meta.env.VITE_RENTIKPRO_PUBLIC_TOKEN as string | undefined)
  );
}

function buildConfig(slug: string, siteToken?: string): ApiClientConfig {
  return {
    baseUrl: resolveApiBase(),
    publicToken: resolvePublicToken(siteToken),
    timeoutMs: 8_000,
  };
}

// ─── Raw API shapes (lo que devuelve realmente RentikPro) ─────────────────────

interface RawSiteConfig {
  meta?: { propertyId?: string };
  brand?: Record<string, any>;
  [key: string]: any;
}

interface RawApartment {
  slug?: string;
  name?: string;
  publicBasePrice?: number | null;
  currency?: string | null;
  [key: string]: any;
}

interface RawAvailabilityDay {
  date: string;
  isAvailable: boolean;
  minNights?: number | null;
  price?: number | null;
}

interface RawApartmentAvailability {
  apartmentSlug: string;
  days: RawAvailabilityDay[];
}

interface RawAvailabilityResponse {
  propertyId?: string;
  from?: string;
  to?: string;
  apartments: RawApartmentAvailability[];
}

// ─── Endpoints públicos ───────────────────────────────────────────────────────

/**
 * Obtiene la configuración del sitio (property) por slug.
 * Throws ApiError si el slug no existe (404) u ocurre un error de red.
 */
export async function getProperty(slug: string, siteToken?: string): Promise<RawSiteConfig> {
  const config = buildConfig(slug, siteToken);
  return apiFetch<RawSiteConfig>(config, '/public/site-config', { slug });
}

/**
 * Obtiene la lista de apartamentos del propertyId dado.
 * Nota: algunos backends los incluyen en site-config; en ese caso
 * este endpoint devuelve lo mismo. Adaptable.
 */
export async function getApartments(
  propertyId: string,
  siteToken?: string,
): Promise<RawApartment[]> {
  const config = buildConfig(propertyId, siteToken);
  // Intenta endpoint dedicado; si no existe, el caller lo atrapa y usa config.apartments
  const data = await apiFetch<{ apartments?: RawApartment[] } | RawApartment[]>(
    config,
    '/public/apartments',
    { propertyId },
  );
  // Normaliza respuesta: puede ser array directo o { apartments: [] }
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as any)?.apartments)) return (data as any).apartments;
  return [];
}

/**
 * Obtiene disponibilidad para los próximos 90 días.
 */
export async function getAvailability(
  propertyId: string,
  siteToken?: string,
): Promise<RawAvailabilityResponse> {
  const config = buildConfig(propertyId, siteToken);

  const from = new Date().toISOString().split('T')[0];
  const to = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0];

  return apiFetch<RawAvailabilityResponse>(config, '/public/availability', {
    propertyId,
    from,
    to,
  });
}

/**
 * Envía un lead (contacto/reserva) a RentikPro.
 * Devuelve true si OK, false en cualquier error (no bloquea la UI).
 */
export async function createLead(
  propertyId: string,
  payload: LeadPayload,
  siteToken?: string,
): Promise<boolean> {
  const config = buildConfig(propertyId, siteToken);
  try {
    await apiPost(config, '/public/leads', { ...payload, propertyId });
    return true;
  } catch (err) {
    console.error('[RentikPro] Lead failed:', err);
  }
}

/**
 * getQuote — Stub para descarga de presupuesto.
 * NO implementado por ahora, se deja stubbed para alinearse con requerimientos.
 */
export async function getQuote(
  _propertyId: string,
  _params: { apartmentSlug: string; checkIn: string; checkOut: string },
  _siteToken?: string,
): Promise<any> {
  console.warn('[RentikPro] getQuote() called but not implemented.');
  return null;
}
