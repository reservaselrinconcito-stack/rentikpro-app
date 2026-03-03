/**
 * domain/safeData.ts — Motor de carga segura de datos.
 *
 * CONTRATO: Cada función intenta la API real.
 * Si falla por cualquier motivo → devuelve datos demo.
 * NUNCA lanza. NUNCA devuelve null.
 *
 * Esto garantiza que la UI siempre tiene datos para renderizar.
 */

import { getProperty, getApartments, getAvailability } from '../api/rentikpro';
import { ApiError } from '../api/client';
import { normalizeProperty, normalizeApartments, normalizeAvailability } from './normalizers';
import {
  DEMO_PROPERTY,
  DEMO_APARTMENTS,
  DEMO_AVAILABILITY,
} from '../demo/demoData';
import type {
  DomainProperty,
  DomainApartment,
  DomainAvailability,
  DataSource,
  ApiErrorCode,
  BootstrapDebug,
  BootstrapLoadStep,
} from './types';

// ─── Resultado compuesto ──────────────────────────────────────────────────────

export interface SafeLoadResult {
  property: DomainProperty;
  apartments: DomainApartment[];
  availability: DomainAvailability;
  source: DataSource;
  /** true si el slug no existe en el backend (HTTP 404) */
  notFound: boolean;
  /** Debugging: tiempos/errores de cada paso (solo dev lo muestra) */
  debug?: BootstrapDebug;
}

// ─── Helper: intenta + fallback ───────────────────────────────────────────────

async function tryOr<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<{ value: T; ok: boolean; err: unknown | null }> {
  try {
    const value = await fn();
    return { value, ok: true, err: null };
  } catch (err) {
    console.warn('[safeData] Falling back to demo:', (err as Error).message);
    return { value: fallback, ok: false, err };
  }
}

function toLoadStep(ok: boolean, at: number | null, err: unknown | null): BootstrapLoadStep {
  if (ok) {
    return { ok: true, at, errCode: null, errMessage: null };
  }

  if (err instanceof ApiError) {
    return { ok: false, at, errCode: err.code, errMessage: err.message };
  }

  const message = err instanceof Error ? err.message : err != null ? String(err) : null;
  return { ok: false, at, errCode: (message ? 'UNKNOWN' : null) as ApiErrorCode | null, errMessage: message };
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Carga todos los datos del tenant de forma segura.
 *
 * Flujo:
 *  1. getProperty(slug) → si 404, marca notFound=true y usa demo
 *  2. getApartments(propertyId) → si falla, usa los apartamentos de site-config o demo
 *  3. getAvailability(propertyId) → si falla, usa disponibilidad demo
 *
 * Siempre devuelve un SafeLoadResult completo.
 */
export async function safeLoadAll(slug: string, siteToken?: string): Promise<SafeLoadResult> {
  const startedAt = Date.now();
  const debug: BootstrapDebug = {
    startedAt,
    finishedAt: null,
    property: { ok: false, at: null, errCode: null, errMessage: null },
    apartments: { ok: false, at: null, errCode: null, errMessage: null },
    availability: { ok: false, at: null, errCode: null, errMessage: null },
  };

  // ── 1. Propiedad ──────────────────────────────────────────────────────────
  const propertyAttempt = await tryOr(
    () => getProperty(slug, siteToken),
    null as any,
  );

  debug.property = toLoadStep(propertyAttempt.ok, Date.now(), propertyAttempt.err);

  const notFound =
    propertyAttempt.err instanceof ApiError && propertyAttempt.err.code === 'NOT_FOUND';

  // 404 real → notfound. Errores de red/timeout/server → demo/mixed, pero NO notFound.
  if (notFound) {
    debug.finishedAt = Date.now();
    return {
      property: { ...DEMO_PROPERTY, slug },
      apartments: DEMO_APARTMENTS,
      availability: DEMO_AVAILABILITY,
      source: 'demo',
      notFound: true,
      debug,
    };
  }

  // Si falla la carga de property por cualquier otra razón, no intentamos endpoints
  // dependientes de propertyId (evita timeouts encadenados) y entramos en demo.
  if (!propertyAttempt.ok || !propertyAttempt.value) {
    debug.finishedAt = Date.now();
    return {
      property: { ...DEMO_PROPERTY, slug },
      apartments: DEMO_APARTMENTS,
      availability: DEMO_AVAILABILITY,
      source: 'demo',
      notFound: false,
      debug,
    };
  }

  const rawConfig = propertyAttempt.value;
  const propertyOk = true;
  const property: DomainProperty = normalizeProperty(rawConfig, slug);
  // Los apartamentos a veces vienen dentro del site-config
  const rawApartmentsFromConfig: any[] = rawConfig?.apartments ?? [];

  const propertyId = property.propertyId;

  // ── 2. Apartamentos ───────────────────────────────────────────────────────
  let apartments: DomainApartment[];
  let apartmentsOk = false;

  // Primero intentamos endpoint dedicado
  const apartmentsAttempt = await tryOr(
    () => getApartments(propertyId, siteToken),
    [] as any[],
  );

  debug.apartments = toLoadStep(apartmentsAttempt.ok, Date.now(), apartmentsAttempt.err);

  const rawApts = apartmentsAttempt.value;
  const aptsOk = apartmentsAttempt.ok;

  if (aptsOk && Array.isArray(rawApts) && rawApts.length > 0) {
    apartments = normalizeApartments(rawApts);
    apartmentsOk = true;
  } else if (rawApartmentsFromConfig.length > 0) {
    // Fallback: los que vienen en site-config
    apartments = normalizeApartments(rawApartmentsFromConfig);
    apartmentsOk = true;
  } else {
    apartments = DEMO_APARTMENTS;
  }

  // ── 3. Disponibilidad ─────────────────────────────────────────────────────
  let availability: DomainAvailability;
  let availabilityOk = false;

  const availabilityAttempt = await tryOr(
    () => getAvailability(propertyId, siteToken),
    null as any,
  );

  debug.availability = toLoadStep(
    availabilityAttempt.ok,
    Date.now(),
    availabilityAttempt.err,
  );

  const rawAvail = availabilityAttempt.value;
  const availOk = availabilityAttempt.ok;

  if (availOk && rawAvail) {
    availability = normalizeAvailability(rawAvail);
    availabilityOk = true;
  } else {
    // Generamos disponibilidad demo pero con los slugs de los apartamentos reales
    availability = {
      ...DEMO_AVAILABILITY,
      apartments: apartments.map((apt) => {
        const demoApt = DEMO_AVAILABILITY.apartments[0];
        return { ...demoApt, apartmentSlug: apt.slug };
      }),
    };
  }

  // ── 4. Determinar fuente ──────────────────────────────────────────────────
  const allFromApi = propertyOk && apartmentsOk && availabilityOk;
  const noneFromApi = !propertyOk && !apartmentsOk && !availabilityOk;
  const source: DataSource = allFromApi ? 'api' : noneFromApi ? 'demo' : 'mixed';

  debug.finishedAt = Date.now();

  return { property, apartments, availability, source, notFound: false, debug };
}
