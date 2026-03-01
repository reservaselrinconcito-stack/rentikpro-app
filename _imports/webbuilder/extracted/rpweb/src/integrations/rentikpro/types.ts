// ─── Internal types (used by our components) ─────────────────────────────────

export interface AvailabilityDay {
    date: string;        // YYYY-MM-DD
    isAvailable: boolean;
    minNights?: number | null;
    price?: number | null;
}

export interface ApartmentAvailability {
    apartmentSlug: string; // our internal slug
    days: AvailabilityDay[];
}

export interface AvailabilityResponse {
    locationId?: string;
    apartments: ApartmentAvailability[];
}

// ─── Real API response shape (from RentikPro Worker) ─────────────────────────

export interface RentikProApiApartment {
    apartmentSlug: string; // may differ from our internal slug
    days: AvailabilityDay[];
}

export interface RentikProApiResponse {
    propertyId: string;
    from: string;
    to: string;
    generatedAt: string;
    apartments: RentikProApiApartment[];
}

// ─── Typed error ──────────────────────────────────────────────────────────────

export interface RentikProConnectionConfig {
    apiBase: string;
    propertyId: string;
    publicToken: string;
}

export type RentikProErrorCode =
    | 'UNAUTHORIZED'  // 401 / 403 — bad token or origin
    | 'CORS'          // fetch() threw TypeError (CORS / network unreachable)
    | 'DATE_RANGE'    // 400 — range too large
    | 'UNKNOWN';      // anything else

export class RentikProError extends Error {
    code: RentikProErrorCode;
    constructor(code: RentikProErrorCode, message?: string) {
        super(message ?? code);
        this.code = code;
        this.name = 'RentikProError';
    }
}
