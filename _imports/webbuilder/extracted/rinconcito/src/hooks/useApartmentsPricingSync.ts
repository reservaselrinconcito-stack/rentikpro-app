import { useState, useEffect } from 'react';
import { APARTMENTS, Apartment } from '../content/apartments';
import { getPublicApartments } from '../integrations/rentikpro/api';
import { SLUG_MAP } from '../config/rentikproMapping';

const CACHE_KEY_PREFIX = 'rp_apts_';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function useApartmentsPricingSync() {
    const [apartments, setApartments] = useState<Apartment[]>(APARTMENTS);
    const propertyId = import.meta.env.VITE_RP_PROPERTY_ID;

    useEffect(() => {
        // Fetch fresh data
        async function sync() {
            const cacheKey = `${CACHE_KEY_PREFIX}${propertyId ?? 'default'}`;
            const cached = readCache(cacheKey);

            // Use cached data immediately (even if stale)
            if (cached) {
                setApartments(mergeData(APARTMENTS, cached.data));
            }

            // If cache is still valid, skip network
            if (cached && Date.now() - cached.ts < CACHE_TTL) return;

            try {
                const result = await getPublicApartments();
                if (result.data) {
                    const merged = mergeData(APARTMENTS, result.data);
                    setApartments(merged);
                    writeCache(cacheKey, result.data);
                }
            } catch {
                console.warn('[RentikPro] pricing sync failed');
            }
        }

        sync();
    }, [propertyId]);

    return apartments;
}

function readCache(key: string): { ts: number; data: any[] } | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { ts?: unknown; data?: unknown };
        if (typeof parsed.ts !== 'number' || !Array.isArray(parsed.data)) return null;
        return { ts: parsed.ts, data: parsed.data };
    } catch {
        return null;
    }
}

function writeCache(key: string, data: any[]) {
    try {
        localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch {
        // ignore write errors
    }
}

function mergeData(local: Apartment[], apiData: any[]): Apartment[] {
    const apiMap = new Map(apiData.map(item => [item.slug, item]));

    return local.map(apt => {
        // Try direct slug match or through SLUG_MAP
        let apiApt = apiMap.get(apt.slug);

        // Inverse search in SLUG_MAP if direct fails
        if (!apiApt) {
            const apiSlug = Object.keys(SLUG_MAP).find(key => SLUG_MAP[key] === apt.slug);
            if (apiSlug) {
                apiApt = apiMap.get(apiSlug);
            }
        }

        if (!apiApt) return { ...apt, publicBasePrice: null };

        // Robust price rule: must be number and > 0
        const price = typeof apiApt.publicBasePrice === 'number' && apiApt.publicBasePrice > 0
            ? apiApt.publicBasePrice
            : typeof apiApt.priceFrom === 'number' && apiApt.priceFrom > 0
                ? apiApt.priceFrom
                : null;

        return {
            ...apt,
            publicBasePrice: price,
            currency: apiApt.currency || apt.currency || 'EUR'
        };
    });
}
