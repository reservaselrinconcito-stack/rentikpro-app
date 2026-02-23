/**
 * publicWebSync.ts
 * Service to calculate availability and publish it to the public Cloudflare Worker.
 * Logs prefixed with [WEB:PUBLISH] for debugging.
 */

import { projectManager } from './projectManager';
import { Booking, Apartment, Property } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvailabilityDay {
    date: string;       // YYYY-MM-DD
    isAvailable: boolean;
    minNights?: number;
    price?: number;
}

export interface ApartmentAvailability {
    apartmentId: string;
    apartmentSlug: string;
    publicBasePrice?: number | null;
    currency?: string;
    days: AvailabilityDay[];
}

export interface AvailabilityPayload {
    propertyId: string;
    from: string;
    to: string;
    generatedAt: string;
    apartments: ApartmentAvailability[];
}

export interface PublishResult {
    ok: boolean;
    error?: string;
    publishedAt?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for a given Date */
function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/** Adds N days to a date, returns new Date */
function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setUTCDate(r.getUTCDate() + n);
    return r;
}

/** Generates a slug from apartment name */
function slugify(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Calculates daily availability for all apartments in a property.
 * Uses [from, to) exclusive end date convention (check_out day is available).
 */
export async function calculateAvailability(
    propertyId: string,
    fromDate: Date,
    toDate: Date,
    showPrices: boolean
): Promise<ApartmentAvailability[]> {
    const store = projectManager.getStore();

    const [apartments, allBookings] = await Promise.all([
        store.getApartments(propertyId),
        store.getBookings(),
    ]);

    console.log(`[WEB:PUBLISH] Calculating availability for property ${propertyId}: ${apartments.length} apartments, ${allBookings.length} bookings total`);

    // Filter to this property and exclude cancelled
    const activeBookings = allBookings.filter(
        (b: Booking) => b.property_id === propertyId && b.status !== 'cancelled'
    );

    const results: ApartmentAvailability[] = [];

    for (const apt of apartments) {
        if (apt.is_active === false) continue;

        const aptBookings = activeBookings.filter(
            (b: Booking) => b.apartment_id === apt.id
        );

        const days: AvailabilityDay[] = [];
        let cursor = new Date(fromDate);

        while (cursor < toDate) {
            const dateStr = toISODate(cursor);

            // A day is UNAVAILABLE if any booking covers it:
            // booking covers [check_in, check_out) — check_out day is available
            const isBlocked = aptBookings.some((b: Booking) => {
                const ci = b.check_in;
                const co = b.check_out;
                return dateStr >= ci && dateStr < co;
            });

            const day: AvailabilityDay = {
                date: dateStr,
                isAvailable: !isBlocked,
            };

            // price: omit if showPrices=false or no price data
            // (price data would come from pricing engine; omit for now unless available)

            days.push(day);
            cursor = addDays(cursor, 1);
        }

        results.push({
            apartmentId: apt.id,
            apartmentSlug: slugify(apt.name),
            publicBasePrice: apt.publicBasePrice ?? null,
            currency: apt.currency || 'EUR',
            days,
        });

        console.log(`[WEB:PUBLISH] Apartment ${apt.name}: ${days.filter(d => d.isAvailable).length} available / ${days.length} total days`);
    }

    return results;
}

/**
 * Builds the full payload and publishes it to the Cloudflare Worker.
 */
export async function publishAvailability(
    property: Property,
    workerUrl: string,
    adminApiKey: string
): Promise<PublishResult> {
    const propertyId = property.id;
    const publicToken = property.public_token;
    const allowedOrigins: string[] = property.allowed_origins_json
        ? JSON.parse(property.allowed_origins_json)
        : [];
    const showPrices = property.show_prices ?? false;
    const maxRangeDays = property.max_range_days ?? 365;

    if (!publicToken) {
        return { ok: false, error: 'No hay token público configurado. Genera uno primero.' };
    }

    console.log(`[WEB:PUBLISH] Starting publish for property ${propertyId} (token: ${publicToken.slice(0, 8)}...)`);

    // Calculate range: today → today + maxRangeDays
    const now = new Date();
    const fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const toDate = addDays(fromDate, maxRangeDays);

    const from = toISODate(fromDate);
    const to = toISODate(toDate);

    let apartments: ApartmentAvailability[];
    try {
        apartments = await calculateAvailability(propertyId, fromDate, toDate, showPrices);
    } catch (err: any) {
        console.error('[WEB:PUBLISH] Error calculating availability:', err);
        return { ok: false, error: `Error calculando disponibilidad: ${err?.message ?? err}` };
    }

    const payload: AvailabilityPayload = {
        propertyId,
        from,
        to,
        generatedAt: new Date().toISOString(),
        apartments,
    };

    const body = {
        propertyId,
        propertyPublicToken: publicToken,
        allowedOrigins,
        showPrices,
        maxRangeDays,
        payload,
    };

    console.log(`[WEB:PUBLISH] Sending to ${workerUrl}/public/publish — ${apartments.length} apartments, range ${from} → ${to}`);

    try {
        const res = await fetch(`${workerUrl}/public/publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminApiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.error(`[WEB:PUBLISH] Worker responded ${res.status}: ${text}`);
            return { ok: false, error: `Worker error ${res.status}: ${text}` };
        }

        const publishedAt = Date.now();
        console.log(`[WEB:PUBLISH] ✅ Published successfully at ${new Date(publishedAt).toISOString()}`);
        return { ok: true, publishedAt };
    } catch (err: any) {
        console.error('[WEB:PUBLISH] Network error:', err);
        return { ok: false, error: `Error de red: ${err?.message ?? err}` };
    }
}

/** Generates a cryptographically random public token */
export function generatePublicToken(): string {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
