/**
 * RentikPro – Public Availability Worker
 * Cloudflare Worker (TypeScript)
 *
 * Routes:
 *   POST /public/publish   – Admin: upload availability payload + config
 *   GET  /public/availability – Public: query availability by propertyId + date range
 *   OPTIONS *              – CORS preflight
 */

export interface Env {
    /** KV namespace bound in wrangler.toml */
    AVAILABILITY_KV: KVNamespace;
    /** Secret admin key for POST /public/publish */
    ADMIN_API_KEY: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AvailabilityDay {
    date: string;       // YYYY-MM-DD
    isAvailable: boolean;
    minNights?: number;
    price?: number;
}

interface ApartmentAvailability {
    apartmentId: string;
    apartmentSlug: string;
    publicBasePrice?: number | null;
    currency?: string;
    days: AvailabilityDay[];
}

interface AvailabilityPayload {
    propertyId: string;
    from: string;
    to: string;
    generatedAt: string;
    apartments: ApartmentAvailability[];
}

interface PropertyConfig {
    tokenHash: string;          // SHA-256 hex of the public token
    allowedOrigins: string[];
    showPrices: boolean;
    maxRangeDays: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** SHA-256 of a string, returns lowercase hex */
async function tokenHash(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Converts a YYYY-MM-DD string to a Date (UTC midnight) */
function dateToISO(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00Z`);
}

/**
 * Parses and validates from/to query params.
 * Returns { from, to } or throws a Response on error.
 */
function parseDateRange(
    fromStr: string | null,
    toStr: string | null,
    maxRangeDays: number
): { from: string; to: string } {
    if (!fromStr || !toStr) {
        throw new Response(
            JSON.stringify({ error: 'Missing required params: from, to' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
    if (!ISO_DATE.test(fromStr) || !ISO_DATE.test(toStr)) {
        throw new Response(
            JSON.stringify({ error: 'Dates must be YYYY-MM-DD' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const fromDate = dateToISO(fromStr);
    const toDate = dateToISO(toStr);

    if (toDate <= fromDate) {
        throw new Response(
            JSON.stringify({ error: 'to must be after from' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > maxRangeDays) {
        throw new Response(
            JSON.stringify({ error: `Date range exceeds maximum of ${maxRangeDays} days` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    return { from: fromStr, to: toStr };
}

/**
 * Returns CORS headers for a given origin, validated against allowedOrigins.
 * If origin is null (server-side request), returns empty headers (no ACAO).
 */
function corsHeaders(
    origin: string | null,
    allowedOrigins: string[],
    method: string = 'GET'
): HeadersInit {
    if (!origin) return {};

    const normalised = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(o => o.replace(/\/$/, '') === normalised);

    if (!isAllowed) return {};

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-PUBLIC-TOKEN, Authorization',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
    };
}

/**
 * Sliding-window rate limiter (60 req / min per token hash).
 * Uses KV key: rl:<tokenHash>:<minute>
 * Returns true if request is allowed, false if rate-limited.
 */
async function rateLimitCheck(
    kv: KVNamespace,
    hash: string,
    limitPerMinute = 60
): Promise<boolean> {
    const minute = Math.floor(Date.now() / 60_000);
    const key = `rl:${hash}:${minute}`;

    const current = await kv.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= limitPerMinute) return false;

    // Increment, expire after 90 s (covers the full minute + buffer)
    await kv.put(key, String(count + 1), { expirationTtl: 90 });
    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// KV key helpers
// ─────────────────────────────────────────────────────────────────────────────

const kvConfigKey = (propertyId: string) => `config:${propertyId}`;
const kvPayloadKey = (propertyId: string) => `payload:${propertyId}`;

// ─────────────────────────────────────────────────────────────────────────────
// Response helpers
// ─────────────────────────────────────────────────────────────────────────────

function jsonResponse(
    body: unknown,
    status: number,
    extraHeaders: HeadersInit = {}
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...extraHeaders,
        },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /public/publish
 * Authenticated with Bearer ADMIN_API_KEY.
 * Stores config + availability payload in KV.
 */
async function handlePublish(request: Request, env: Env): Promise<Response> {
    // Auth
    const authHeader = request.headers.get('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token || token !== env.ADMIN_API_KEY) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    let body: {
        propertyId: string;
        propertyPublicToken: string;
        allowedOrigins: string[];
        showPrices: boolean;
        maxRangeDays: number;
        payload: AvailabilityPayload;
    };

    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { propertyId, propertyPublicToken, allowedOrigins, showPrices, maxRangeDays, payload } = body;

    if (!propertyId || !propertyPublicToken || !payload) {
        return jsonResponse({ error: 'Missing required fields: propertyId, propertyPublicToken, payload' }, 400);
    }

    // Store config (with hashed token – never store plaintext)
    const hash = await tokenHash(propertyPublicToken);
    const config: PropertyConfig = {
        tokenHash: hash,
        allowedOrigins: allowedOrigins ?? [],
        showPrices: showPrices ?? false,
        maxRangeDays: maxRangeDays ?? 365,
    };

    await env.AVAILABILITY_KV.put(kvConfigKey(propertyId), JSON.stringify(config));

    // Strip prices from payload if showPrices is false (defence in depth)
    const safePayload: AvailabilityPayload = {
        ...payload,
        apartments: payload.apartments.map(apt => ({
            ...apt,
            days: apt.days.map(day => ({
                date: day.date,
                isAvailable: day.isAvailable,
                ...(day.minNights !== undefined ? { minNights: day.minNights } : {}),
                ...(showPrices && day.price !== undefined ? { price: day.price } : {}),
            })),
        })),
    };

    await env.AVAILABILITY_KV.put(kvPayloadKey(propertyId), JSON.stringify(safePayload));

    return jsonResponse({ ok: true }, 200);
}

/**
 * GET /public/availability?propertyId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Requires header: X-PUBLIC-TOKEN: <token>
 */
async function handleGetAvailability(
    request: Request,
    env: Env,
    url: URL,
    origin: string | null
): Promise<Response> {
    const propertyId = url.searchParams.get('propertyId');
    if (!propertyId) {
        return jsonResponse({ error: 'Missing required param: propertyId' }, 400);
    }

    // Load config
    const configRaw = await env.AVAILABILITY_KV.get(kvConfigKey(propertyId));
    if (!configRaw) {
        return jsonResponse({ error: 'Property not found' }, 404);
    }
    const config: PropertyConfig = JSON.parse(configRaw);

    // CORS check (before heavy work)
    const cors = corsHeaders(origin, config.allowedOrigins);
    if (origin && Object.keys(cors).length === 0) {
        return jsonResponse({ error: 'Origin not allowed' }, 403);
    }

    // Token validation
    const publicToken = request.headers.get('X-PUBLIC-TOKEN') ?? '';
    if (!publicToken) {
        return jsonResponse({ error: 'Missing X-PUBLIC-TOKEN header' }, 401, cors);
    }
    const incomingHash = await tokenHash(publicToken);
    if (incomingHash !== config.tokenHash) {
        return jsonResponse({ error: 'Invalid token' }, 401, cors);
    }

    // Rate limit
    const allowed = await rateLimitCheck(env.AVAILABILITY_KV, incomingHash);
    if (!allowed) {
        return jsonResponse(
            { error: 'Rate limit exceeded. Max 60 requests/minute.' },
            429,
            { ...cors, 'Retry-After': '60' }
        );
    }

    // Date range validation
    let from: string, to: string;
    try {
        ({ from, to } = parseDateRange(
            url.searchParams.get('from'),
            url.searchParams.get('to'),
            config.maxRangeDays
        ));
    } catch (errResponse) {
        if (errResponse instanceof Response) {
            // Re-wrap with CORS headers
            const body = await errResponse.text();
            return new Response(body, {
                status: errResponse.status,
                headers: { 'Content-Type': 'application/json', ...cors },
            });
        }
        throw errResponse;
    }

    // Load payload
    const payloadRaw = await env.AVAILABILITY_KV.get(kvPayloadKey(propertyId));
    if (!payloadRaw) {
        return jsonResponse({ error: 'Availability data not yet published' }, 404, cors);
    }
    const fullPayload: AvailabilityPayload = JSON.parse(payloadRaw);

    // Filter days to requested range
    const filtered: AvailabilityPayload = {
        propertyId: fullPayload.propertyId,
        from,
        to,
        generatedAt: fullPayload.generatedAt,
        apartments: fullPayload.apartments.map(apt => ({
            apartmentId: apt.apartmentId,
            apartmentSlug: apt.apartmentSlug,
            publicBasePrice: apt.publicBasePrice,
            currency: apt.currency,
            days: apt.days.filter(d => d.date >= from && d.date < to),
        })),
    };

    return jsonResponse(filtered, 200, {
        ...cors,
        'Cache-Control': 'public, max-age=600', // 10-min CDN cache
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main fetch handler
// ─────────────────────────────────────────────────────────────────────────────

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method.toUpperCase();
        const origin = request.headers.get('Origin');

        // CORS preflight
        if (method === 'OPTIONS') {
            // For preflight we need to know the property to get allowedOrigins.
            // If propertyId is present, use its config; otherwise deny.
            const propertyId = url.searchParams.get('propertyId');
            if (propertyId) {
                const configRaw = await env.AVAILABILITY_KV.get(kvConfigKey(propertyId));
                if (configRaw) {
                    const config: PropertyConfig = JSON.parse(configRaw);
                    const cors = corsHeaders(origin, config.allowedOrigins);
                    return new Response(null, { status: 204, headers: cors });
                }
            }
            return new Response(null, { status: 204 });
        }

        // POST /public/publish
        if (path === '/public/publish' && method === 'POST') {
            return handlePublish(request, env);
        }

        // GET /public/availability
        if (path === '/public/availability' && method === 'GET') {
            return handleGetAvailability(request, env, url, origin);
        }

        return new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    },
};
