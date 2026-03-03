/**
 * RentikPro API Layer — El Rinconcito Matarraña
 *
 * ENV variables (from spec):
 *   VITE_RP_WORKER_URL    — base URL of RentikPro Worker (no trailing slash)
 *   VITE_RP_PROPERTY_ID   — your property ID
 *   VITE_RP_PUBLIC_TOKEN  — public read-only token (safe for browser)
 *
 * Rules:
 *   - Never throws — always returns { data, error, isDemo }
 *   - Timeout protection (8s)
 *   - If ENV missing → AUTO DEMO MODE
 *   - If API fails → DEMO MODE with visible badge
 */

import {
    AvailabilityResponse,
    RentikProApiAvailabilityResponse,
    RentikProError,
    RentikProLead,
    RentikProLeadResponse,
    ApiResult,
    RentikProApiApartment,
} from './types';
import { getMockAvailability } from './mock';
import { SLUG_MAP } from '../../config/rentikproMapping';
import { APARTMENTS } from '../../content/apartments';

// ─── Config ────────────────────────────────────────────────────────────────────

const WORKER_URL = import.meta.env.VITE_RP_WORKER_URL as string | undefined;
const PROPERTY_ID = import.meta.env.VITE_RP_PROPERTY_ID as string | undefined;
const PUBLIC_TOKEN = import.meta.env.VITE_RP_PUBLIC_TOKEN as string | undefined;

const TIMEOUT_MS = 8000;

// Demo mode when any required config is missing
export const IS_DEMO = !WORKER_URL || !PROPERTY_ID || !PUBLIC_TOKEN;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const KNOWN_SLUGS = new Set(APARTMENTS.map(a => a.slug));

function resolveSlug(apiSlug: string): string | null {
    const mapped = SLUG_MAP[apiSlug];
    if (mapped) return KNOWN_SLUGS.has(mapped) ? mapped : null;
    return KNOWN_SLUGS.has(apiSlug) ? apiSlug : null;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function authHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'X-PUBLIC-TOKEN': PUBLIC_TOKEN ?? '',
    };
}

function ok<T>(data: T): ApiResult<T> {
    return { data, error: null, isDemo: false };
}

function demo<T>(data: T, error?: string): ApiResult<T> {
    return { data, error: error ?? null, isDemo: true };
}

function fail<T>(error: string): ApiResult<T> {
    return { data: null, error, isDemo: true };
}

// ─── getAvailability ──────────────────────────────────────────────────────────

export async function getAvailability(
    from: string,
    to: string,
): Promise<ApiResult<AvailabilityResponse>> {
    // Demo mode — missing config
    if (IS_DEMO) {
        const data = await getMockAvailability(from, to);
        return demo(data, 'Demo mode: configure VITE_RP_WORKER_URL, VITE_RP_PROPERTY_ID, VITE_RP_PUBLIC_TOKEN');
    }

    try {
        const url = new URL(`${WORKER_URL}/public/availability`);
        url.searchParams.set('propertyId', PROPERTY_ID!);
        url.searchParams.set('from', from);
        url.searchParams.set('to', to);

        const response = await fetchWithTimeout(url.toString(), {
            headers: { 'X-PUBLIC-TOKEN': PUBLIC_TOKEN! },
        });

        if (response.status === 401 || response.status === 403) {
            throw new RentikProError('UNAUTHORIZED', `HTTP ${response.status}`);
        }
        if (response.status === 400) {
            throw new RentikProError('DATE_RANGE', 'HTTP 400');
        }
        if (!response.ok) {
            throw new RentikProError('UNKNOWN', `HTTP ${response.status}`);
        }

        const raw: RentikProApiAvailabilityResponse = await response.json();

        // Map API slugs → internal slugs, filter unknown
        const apartments = raw.apartments
            .map(apt => {
                const slug = resolveSlug(apt.apartmentSlug);
                if (!slug) {
                    if (import.meta.env.DEV) {
                        console.warn('[RentikPro] availability for unknown apartmentSlug:', apt.apartmentSlug);
                    }
                    return null;
                }
                return { apartmentSlug: slug, days: apt.days };
            })
            .filter((a): a is NonNullable<typeof a> => a !== null);

        return ok({ apartments });

    } catch (err) {
        // AbortError = timeout
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        const errMsg = isTimeout
            ? 'Tiempo de espera agotado — mostrando disponibilidad de ejemplo.'
            : err instanceof RentikProError
                ? `Error API: ${err.message}`
                : 'No se pudo conectar con RentikPro. Mostrando disponibilidad de ejemplo.';

        // Always fall back to demo — NEVER blank screen
        const data = await getMockAvailability(from, to);
        return demo(data, errMsg);
    }
}

// ─── createLead (buzón) ───────────────────────────────────────────────────────

export async function createLead(
    payload: RentikProLead,
): Promise<ApiResult<RentikProLeadResponse>> {
    // Demo mode — log and pretend success
    if (IS_DEMO) {
        console.log('[RentikPro Demo] Lead would be sent:', payload);
        await new Promise(r => setTimeout(r, 600));
        return demo({ success: true, leadId: 'demo-' + Date.now() });
    }

    try {
        const response = await fetchWithTimeout(`${WORKER_URL}/public/leads`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ ...payload, propertyId: PROPERTY_ID }),
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            return fail(`HTTP ${response.status}: ${text}`);
        }

        const data = await response.json().catch(() => ({ success: true }));
        return ok({ success: true, leadId: data.leadId, message: data.message });

    } catch (err) {
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        return fail(isTimeout ? 'Tiempo de espera agotado.' : 'Error de red al enviar el mensaje.');
    }
}

// ─── createBookingRequest ─────────────────────────────────────────────────────

export async function createBookingRequest(params: {
    name: string;
    email: string;
    phone?: string;
    apartmentSlug: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    message?: string;
    language?: string;
}): Promise<ApiResult<RentikProLeadResponse>> {
    const apt = APARTMENTS.find(a => a.slug === params.apartmentSlug);
    const dates = `${params.checkIn} → ${params.checkOut}`;
    return createLead({
        name: params.name,
        email: params.email,
        phone: params.phone,
        apartment: params.apartmentSlug,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        dates,
        guests: params.guests,
        language: params.language ?? 'es',
        message: params.message
            ?? `Solicitud de reserva: ${apt?.name ?? params.apartmentSlug}, ${dates}, ${params.guests} personas.`,
        source: 'web-booking-request',
    });
}

// ─── getPublicApartments ──────────────────────────────────────────────────────

export async function getPublicApartments(): Promise<ApiResult<RentikProApiApartment[]>> {
    // Demo mode / Missing config
    if (IS_DEMO) {
        const mockApts: RentikProApiApartment[] = APARTMENTS.map(apt => ({
            id: apt.id,
            slug: apt.slug,
            name: apt.name,
            priceFrom: apt.priceFrom,
            publicBasePrice: apt.priceFrom, // Fallback in demo
            currency: 'EUR'
        }));
        return demo(mockApts, 'Demo mode: providing local apartments structure.');
    }

    try {
        const url = `${WORKER_URL}/public/apartments?propertyId=${PROPERTY_ID}`;

        const response = await fetchWithTimeout(url, {
            headers: authHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data: RentikProApiApartment[] = await response.json();
        return ok(data);

    } catch (err) {
        console.error('[RentikPro] getPublicApartments error:', err);

        // Fallback to local structure (as RentikProApiApartment[])
        const fallback: RentikProApiApartment[] = APARTMENTS.map(apt => ({
            id: apt.id,
            slug: apt.slug,
            name: apt.name,
            priceFrom: apt.priceFrom,
            currency: 'EUR'
        }));

        return demo(fallback, 'API Error: using local fallback structure.');
    }
}
