/**
 * RentikPro iCal Export Worker
 *
 * POST /publish   — App uploads ICS content (authenticated)
 * GET  /feed/:token — Public read, serves .ics to OTAs
 * GET  /ping      — Health check
 *
 * KV schema: "feed:<token>" → { icsText, unitName, updatedAt }
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // ── Health check ───────────────────────────────────────────────────
        if (path === '/ping') {
            return json({ ok: true, service: 'rentikpro-ical', ts: Date.now() });
        }

        // ── POST /publish ──────────────────────────────────────────────────
        if (request.method === 'POST' && path === '/publish') {
            const adminKey = request.headers.get('X-Admin-Key');
            if (!adminKey || adminKey !== env.ADMIN_KEY) {
                return json({ error: 'Unauthorized' }, 401);
            }

            let body;
            try {
                body = await request.json();
            } catch {
                return json({ error: 'Invalid JSON' }, 400);
            }

            const { token, icsText, unitName } = body;
            if (!token || !icsText) {
                return json({ error: 'Missing token or icsText' }, 400);
            }

            await env.ICAL_KV.put(`feed:${token}`, JSON.stringify({
                icsText,
                unitName: unitName || token,
                updatedAt: Date.now(),
            }), { expirationTtl: 60 * 60 * 24 * 400 }); // ~13 months TTL

            const feedUrl = `${url.origin}/feed/${token}`;
            return json({ ok: true, feedUrl });
        }

        // ── GET /feed/:token ───────────────────────────────────────────────
        const feedMatch = path.match(/^\/feed\/([A-Za-z0-9_-]+)$/);
        if (request.method === 'GET' && feedMatch) {
            const token = feedMatch[1];
            const raw = await env.ICAL_KV.get(`feed:${token}`);

            if (!raw) {
                return new Response('Calendar not found', {
                    status: 404,
                    headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS }
                });
            }

            const { icsText, unitName } = JSON.parse(raw);
            const safeName = (unitName || 'calendar').replace(/[^a-z0-9]/gi, '_').toLowerCase();

            return new Response(icsText, {
                status: 200,
                headers: {
                    'Content-Type': 'text/calendar; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${safeName}.ics"`,
                    'Cache-Control': 'no-cache, no-store',
                    ...CORS_HEADERS,
                },
            });
        }

        return json({ error: 'Not found' }, 404);
    },
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
}
