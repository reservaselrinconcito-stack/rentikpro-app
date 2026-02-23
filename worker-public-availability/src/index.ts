/**
 * public-availability — Cloudflare Worker
 *
 * Routes:
 *   GET  /public/availability?propertyId=&from=YYYY-MM-DD&to=YYYY-MM-DD
 *        Headers: X-PUBLIC-TOKEN
 *   POST /public/publish
 *        Headers: Authorization: Bearer <ADMIN_API_KEY>
 *   OPTIONS * — CORS preflight
 */

// ─── Env bindings ─────────────────────────────────────────────────────────────

export interface Env {
    PUBLIC_AVAIL_KV: KVNamespace;
    PUBLIC_AVAIL_R2: R2Bucket;
    ADMIN_API_KEY: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyConfig {
    tokenHash: string;
    allowedOrigins: string[];
    showPrices: boolean;
    maxRangeDays: number;
    updatedAt: string;
}

interface AvailabilityDay {
    date: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse YYYY-MM-DD robustly — returns null if invalid */
function parseISODate(s: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    // Verify no date overflow (e.g. Feb 30)
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return dt;
}

/** Format Date as YYYY-MM-DD (UTC) */
function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/** Difference in calendar days (UTC): to - from */
function diffDays(from: Date, to: Date): number {
    return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** SHA-256 of a string, returned as lowercase hex */
async function sha256Hex(str: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/** Timing-safe comparison of two strings (same length required for true safety) */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

/** Build CORS response headers if origin is allowed */
function corsHeaders(originAllowed: boolean, origin: string | null): HeadersInit {
    if (!origin || !originAllowed) return {};
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-PUBLIC-TOKEN, Authorization',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
    };
}

/** Handle OPTIONS preflight */
function handleOptionsPreflight(originAllowed: boolean, origin: string | null): Response {
    if (!origin) {
        return new Response(null, { status: 204 });
    }
    if (!originAllowed) {
        return new Response(null, { status: 403 });
    }
    return new Response(null, {
        status: 204,
        headers: corsHeaders(true, origin),
    });
}

/** JSON response helper */
function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...extraHeaders,
        },
    });
}

/**
 * Sliding-window rate limiter: 60 req/min per tokenHash.
 * Key: rl:<tokenHash>:<YYYYMMDDHHmm>
 * Returns true if request is allowed, false if rate-limited.
 */
async function rateLimitCheck(kv: KVNamespace, tokenHash: string): Promise<boolean> {
    const now = new Date();
    const minute = now.toISOString().slice(0, 16).replace(/[-T:]/g, ''); // YYYYMMDDHHmm
    const key = `rl:${tokenHash}:${minute}`;

    const raw = await kv.get(key);
    const count = raw ? parseInt(raw, 10) : 0;

    if (count >= 60) return false;

    // Increment with 120s TTL (covers current + next minute)
    await kv.put(key, String(count + 1), { expirationTtl: 120 });
    return true;
}

/** Normalize an origin string: trim + remove trailing slash */
function normalizeOrigin(o: string): string {
    return o.trim().replace(/\/$/, '');
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleGetAvailability(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // 1) Validate query params
    const propertyId = url.searchParams.get('propertyId');
    const fromStr = url.searchParams.get('from');
    const toStr = url.searchParams.get('to');

    if (!propertyId || !fromStr || !toStr) {
        return json({ error: 'Missing required query params: propertyId, from, to' }, 400);
    }

    // 2) Parse dates
    const fromDate = parseISODate(fromStr);
    const toDate = parseISODate(toStr);

    if (!fromDate || !toDate) {
        return json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, 400);
    }
    if (toDate <= fromDate) {
        return json({ error: '"to" must be strictly after "from".' }, 400);
    }

    // 3) Load config from KV
    const cfgRaw = await env.PUBLIC_AVAIL_KV.get(`cfg:${propertyId}`);
    if (!cfgRaw) {
        return json({ error: 'Property not found or not published.' }, 404);
    }

    let cfg: PropertyConfig;
    try {
        cfg = JSON.parse(cfgRaw) as PropertyConfig;
    } catch {
        return json({ error: 'Corrupted config.' }, 500);
    }

    // Validate range against maxRangeDays
    const rangeDays = diffDays(fromDate, toDate);
    if (rangeDays > cfg.maxRangeDays) {
        return json({ error: `Range exceeds maxRangeDays (${cfg.maxRangeDays}).` }, 400);
    }

    // 4) CORS
    const normalizedOrigin = origin ? normalizeOrigin(origin) : null;
    const originAllowed = normalizedOrigin
        ? cfg.allowedOrigins.map(normalizeOrigin).includes(normalizedOrigin)
        : true; // server-side requests (no Origin) are allowed

    if (origin && !originAllowed) {
        return json({ error: 'Origin not allowed.' }, 403);
    }

    const cors = corsHeaders(originAllowed, origin);

    // 5) Validate token
    const publicToken = request.headers.get('X-PUBLIC-TOKEN') ?? '';
    if (!publicToken) {
        return json({ error: 'Missing X-PUBLIC-TOKEN header.' }, 401, cors);
    }

    const incomingHash = await sha256Hex(publicToken);
    if (!timingSafeEqual(incomingHash, cfg.tokenHash)) {
        return json({ error: 'Invalid token.' }, 401, cors);
    }

    // 6) Rate limit
    const allowed = await rateLimitCheck(env.PUBLIC_AVAIL_KV, incomingHash);
    if (!allowed) {
        return json(
            { error: 'Rate limit exceeded. Max 60 requests/minute.' },
            429,
            { ...cors, 'Retry-After': '60' }
        );
    }

    // 7) Load snapshot from R2
    const r2Object = await env.PUBLIC_AVAIL_R2.get(`snap/${propertyId}.json`);
    if (!r2Object) {
        return json({ error: 'No snapshot available for this property. Publish first.' }, 404, cors);
    }

    let snapshot: AvailabilityPayload;
    try {
        snapshot = await r2Object.json<AvailabilityPayload>();
    } catch {
        return json({ error: 'Corrupted snapshot.' }, 500, cors);
    }

    // 8) Filter snapshot to requested range and strip prices if needed
    const filtered: AvailabilityPayload = {
        propertyId: snapshot.propertyId,
        from: fromStr,
        to: toStr,
        generatedAt: snapshot.generatedAt,
        apartments: snapshot.apartments.map(apt => ({
            apartmentId: apt.apartmentId,
            apartmentSlug: apt.apartmentSlug,
            publicBasePrice: apt.publicBasePrice,
            currency: apt.currency,
            days: apt.days
                .filter(day => day.date >= fromStr && day.date < toStr)
                .map(day => {
                    const d: AvailabilityDay = {
                        date: day.date,
                        isAvailable: day.isAvailable,
                    };
                    if (day.minNights !== undefined) d.minNights = day.minNights;
                    if (cfg.showPrices && day.price !== undefined) d.price = day.price;
                    return d;
                }),
        })),
    };

    return json(filtered, 200, {
        ...cors,
        'Cache-Control': 'public, max-age=300, s-maxage=900', // 5-min browser, 15-min CDN
    });
}

async function handlePublish(request: Request, env: Env): Promise<Response> {
    // 1) Auth
    const authHeader = request.headers.get('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token || !timingSafeEqual(token, env.ADMIN_API_KEY)) {
        return json({ error: 'Unauthorized.' }, 401);
    }

    // 2) Parse body
    let body: {
        propertyId?: unknown;
        propertyPublicToken?: unknown;
        allowedOrigins?: unknown;
        showPrices?: unknown;
        maxRangeDays?: unknown;
        payload?: unknown;
    };
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON body.' }, 400);
    }

    const { propertyId, propertyPublicToken, allowedOrigins, showPrices, maxRangeDays, payload } = body;

    if (typeof propertyId !== 'string' || !propertyId) {
        return json({ error: 'Missing or invalid field: propertyId (string).' }, 400);
    }
    if (typeof propertyPublicToken !== 'string' || !propertyPublicToken) {
        return json({ error: 'Missing or invalid field: propertyPublicToken (string).' }, 400);
    }
    if (!Array.isArray(allowedOrigins) || allowedOrigins.some(o => typeof o !== 'string')) {
        return json({ error: 'Missing or invalid field: allowedOrigins (string[]).' }, 400);
    }
    if (typeof showPrices !== 'boolean') {
        return json({ error: 'Missing or invalid field: showPrices (boolean).' }, 400);
    }
    if (typeof maxRangeDays !== 'number' || maxRangeDays < 1 || maxRangeDays > 730) {
        return json({ error: 'Missing or invalid field: maxRangeDays (number 1-730).' }, 400);
    }
    if (!payload || typeof payload !== 'object') {
        return json({ error: 'Missing or invalid field: payload (object).' }, 400);
    }

    // 3) Build and store config in KV
    const tokenHash = await sha256Hex(propertyPublicToken as string);
    const normalizedOrigins = [...new Set(
        (allowedOrigins as string[]).map(normalizeOrigin).filter(Boolean)
    )];

    const cfg: PropertyConfig = {
        tokenHash,
        allowedOrigins: normalizedOrigins,
        showPrices: showPrices as boolean,
        maxRangeDays: maxRangeDays as number,
        updatedAt: new Date().toISOString(),
    };

    await env.PUBLIC_AVAIL_KV.put(`cfg:${propertyId}`, JSON.stringify(cfg));

    // 4) Store payload snapshot in R2
    await env.PUBLIC_AVAIL_R2.put(
        `snap/${propertyId}.json`,
        JSON.stringify(payload),
        { httpMetadata: { contentType: 'application/json; charset=utf-8' } }
    );

    return json({ ok: true });
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export default {
    async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        const method = request.method.toUpperCase();
        const path = url.pathname;

        // OPTIONS preflight (any path)
        if (method === 'OPTIONS') {
            const origin = request.headers.get('Origin');
            const propertyId = url.searchParams.get('propertyId');

            // For preflight, we need to check config to know allowed origins
            // If no propertyId, allow (POST /public/publish doesn't need CORS)
            if (!propertyId) {
                return handleOptionsPreflight(true, origin);
            }

            const cfgRaw = await env.PUBLIC_AVAIL_KV.get(`cfg:${propertyId}`);
            if (!cfgRaw) {
                return handleOptionsPreflight(false, origin);
            }
            try {
                const cfg = JSON.parse(cfgRaw) as PropertyConfig;
                const normalizedOrigin = origin ? normalizeOrigin(origin) : null;
                const originAllowed = normalizedOrigin
                    ? cfg.allowedOrigins.map(normalizeOrigin).includes(normalizedOrigin)
                    : false;
                return handleOptionsPreflight(originAllowed, origin);
            } catch {
                return handleOptionsPreflight(false, origin);
            }
        }

        if (method === 'GET' && path === '/public/availability') {
            return handleGetAvailability(request, env);
        }

        if (method === 'POST' && path === '/public/publish') {
            return handlePublish(request, env);
        }

        return json({ error: 'Not found.' }, 404);
    },
} satisfies ExportedHandler<Env>;
