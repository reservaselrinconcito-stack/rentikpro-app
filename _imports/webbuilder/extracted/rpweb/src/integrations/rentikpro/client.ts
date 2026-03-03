import {
    AvailabilityResponse,
    RentikProApiResponse,
    RentikProError,
    RentikProConnectionConfig,
} from './types';
import { getMockAvailability } from './mock';
import { RENTIKPRO_SLUG_MAP } from '../../config/rentikproMapping';
import { APARTMENTS } from '../../content/apartments';

// ─── Configuration ────────────────────────────────────────────────────────────

// Env vars as fallback (legacy/dev support)
const ENV_API_BASE = import.meta.env.VITE_RENTIKPRO_API_BASE as string | undefined;
const ENV_PROPERTY_ID = import.meta.env.VITE_RENTIKPRO_PROPERTY_ID as string | undefined;
const ENV_PUBLIC_TOKEN = import.meta.env.VITE_RENTIKPRO_PUBLIC_TOKEN as string | undefined;

const IS_DEV = import.meta.env.DEV;
// Force mock if explicit ENV var says so, or if we want to force it globally
const FORCE_MOCK = ENV_API_BASE === 'MOCK';

// Known internal slugs for filtering
const KNOWN_SLUGS = new Set(APARTMENTS.map(a => a.slug));

// ─── Slug resolution ──────────────────────────────────────────────────────────

function resolveSlug(apiSlug: string): string | null {
    const mapped = RENTIKPRO_SLUG_MAP[apiSlug];
    if (mapped) return KNOWN_SLUGS.has(mapped) ? mapped : null;
    return KNOWN_SLUGS.has(apiSlug) ? apiSlug : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEffectiveConfig(provided?: RentikProConnectionConfig): RentikProConnectionConfig | null {
    if (provided?.apiBase && provided?.propertyId && provided?.publicToken) {
        return provided;
    }
    if (ENV_API_BASE && ENV_PROPERTY_ID && ENV_PUBLIC_TOKEN) {
        return {
            apiBase: ENV_API_BASE,
            propertyId: ENV_PROPERTY_ID,
            publicToken: ENV_PUBLIC_TOKEN,
        };
    }
    return null;
}

// ─── API fetch ────────────────────────────────────────────────────────────────

async function fetchFromApi(
    from: string,
    to: string,
    config: RentikProConnectionConfig
): Promise<AvailabilityResponse> {
    const { apiBase, propertyId, publicToken } = config;

    const url = new URL(`${apiBase}/public/availability`);
    url.searchParams.set('propertyId', propertyId);
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);

    let response: Response;
    try {
        response = await fetch(url.toString(), {
            headers: {
                'X-PUBLIC-TOKEN': publicToken,
            },
        });
    } catch {
        throw new RentikProError('CORS', 'fetch() failed — likely CORS or network unreachable.');
    }

    if (response.status === 401 || response.status === 403) {
        throw new RentikProError('UNAUTHORIZED', `HTTP ${response.status}`);
    }
    if (response.status === 400) {
        throw new RentikProError('DATE_RANGE', 'HTTP 400 — date range too large or invalid.');
    }
    if (!response.ok) {
        throw new RentikProError('UNKNOWN', `HTTP ${response.status}`);
    }

    const data: RentikProApiResponse = await response.json();

    const apartments = data.apartments
        .map(apt => {
            const internalSlug = resolveSlug(apt.apartmentSlug);
            if (!internalSlug) return null;
            return { apartmentSlug: internalSlug, days: apt.days };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);

    return { apartments };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches availability for the given date range.
 *
 * - Uses `config` if provided, otherwise falls back to env vars.
 * - If credentials missing:
 *   - DEV: returns Mock data (warns).
 *   - PROD: throws Error.
 * - If API call fails:
 *   - DEV: returns Mock data (warns).
 *   - PROD: throws Error.
 */
export const fetchAvailability = async (
    from: string,
    to: string,
    config?: RentikProConnectionConfig,
    _apartmentSlug?: string // kept for compat
): Promise<AvailabilityResponse> => {
    // 1. Check for forced mock
    if (FORCE_MOCK) {
        return getMockAvailability(from, to);
    }

    // 2. Resolve credentials
    const effectiveConfig = getEffectiveConfig(config);

    // 3. Handle missing credentials
    if (!effectiveConfig) {
        if (IS_DEV) {
            console.warn('[RentikPro] Missing credentials in DEV. Serving mock data.');
            return getMockAvailability(from, to);
        } else {
            // PROD: Fail hard if no config
            console.error('[RentikPro] Missing credentials in PROD. Cannot fetch availability.');
            throw new RentikProError('UNAUTHORIZED', 'Missing configuration.');
        }
    }

    // 4. Try Real API
    try {
        return await fetchFromApi(from, to, effectiveConfig);
    } catch (err) {
        // 5. Handle fallback on error
        if (IS_DEV) {
            console.warn('[RentikPro] API call failed in DEV. Falling back to mock.', err);
            return getMockAvailability(from, to);
        } else {
            // PROD: Propagate error
            throw err;
        }
    }
};

/**
 * Sends a lead (from contact form or chat) to RentikPro.
 */
export const sendLead = async (
    lead: {
        name?: string;
        email?: string;
        phone?: string;
        message: string;
        source?: string;
    },
    config?: RentikProConnectionConfig
): Promise<boolean> => {
    const effectiveConfig = getEffectiveConfig(config);

    if (FORCE_MOCK || (!effectiveConfig && IS_DEV)) {
        console.log('[RentikPro] Mock Lead Sent (Dev/Mock mode):', lead);
        return true;
    }

    if (!effectiveConfig) {
        console.error('[RentikPro] Cannot send lead: Missing credentials.');
        return false;
    }

    try {
        const { apiBase, propertyId, publicToken } = effectiveConfig;
        const response = await fetch(`${apiBase}/public/leads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-PUBLIC-TOKEN': publicToken,
            },
            body: JSON.stringify({
                ...lead,
                propertyId,
            }),
        });

        return response.ok;
    } catch (err) {
        console.error('[RentikPro] Failed to send lead:', err);
        return false;
    }
};
