/**
 * RENTIKPRO iCal EXPORT WORKER
 * Handles POST /ical/publish to store events and GET /ical/export to serve ICS.
 */

export interface Env {
    ICAL_KV: KVNamespace;
    ADMIN_TOKEN: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // 1. POST /ical/publish
        if (request.method === 'POST' && url.pathname === '/ical/publish') {
            const auth = request.headers.get('Authorization');
            if (auth !== `Bearer ${env.ADMIN_TOKEN}`) {
                return new Response('Unauthorized', { status: 401 });
            }

            try {
                const body = await request.json() as {
                    project_id: string,
                    apartment_id: string,
                    token: string,
                    events: any[]
                };

                if (!body.project_id || !body.apartment_id || !body.token) {
                    return new Response('Missing parameters', { status: 400 });
                }

                // Store by token for easy lookup on GET
                // We also store mapping token -> {project, apartment} if needed, 
                // but for now token is the key.
                await env.ICAL_KV.put(`ical:${body.token}`, JSON.stringify({
                    project_id: body.project_id,
                    apartment_id: body.apartment_id,
                    events: body.events,
                    updated_at: Date.now()
                }));

                return new Response(JSON.stringify({ success: true }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (e: any) {
                return new Response(e.message, { status: 500 });
            }
        }

        // 2. GET /ical/export?token=...
        if (request.method === 'GET' && url.pathname === '/ical/export') {
            const token = url.searchParams.get('token');
            if (!token) return new Response('Token missing', { status: 400 });

            const dataStr = await env.ICAL_KV.get(`ical:${token}`);
            if (!dataStr) return new Response('Invalid token or no data', { status: 404 });

            const data = JSON.parse(dataStr);
            const ics = generateICS(data.events);

            return new Response(ics, {
                headers: {
                    'Content-Type': 'text/calendar; charset=utf-8',
                    'Content-Disposition': `attachment; filename="export_${data.apartment_id}.ics"`
                }
            });
        }

        return new Response('Not Found', { status: 404 });
    }
};

/**
 * Generates RFC 5545 compliant ICS string.
 */
function generateICS(events: any[]): string {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//RentikPro//NONSGML v1.0//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const { windowStart, windowEnd } = getExportWindow();

    for (const ev of events) {
        const startDate = parseDateOnly(ev.start_date);
        const endDate = parseDateOnly(ev.end_date);
        if (!(endDate > windowStart && startDate < windowEnd)) continue;

        const start = ev.start_date.replace(/-/g, '');
        const end = ev.end_date.replace(/-/g, '');

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${ev.id}@rentikpro.com`);
        lines.push(`DTSTAMP:${nowStr}`);
        lines.push(`DTSTART;VALUE=DATE:${start}`);
        lines.push(`DTEND;VALUE=DATE:${end}`);
        lines.push('SUMMARY:CLOSED - Not available');
        lines.push('DESCRIPTION:RentikPro blocked dates');
        lines.push('STATUS:CONFIRMED');
        lines.push('TRANSP:OPAQUE');
        lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

function getExportWindow(): { windowStart: Date; windowEnd: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - 30);

    const windowEnd = new Date(today);
    windowEnd.setMonth(windowEnd.getMonth() + 24);

    return { windowStart, windowEnd };
}

function parseDateOnly(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
}
