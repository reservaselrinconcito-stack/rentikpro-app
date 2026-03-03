// ─── RentikPro API Response shapes ────────────────────────────────────────────

export interface RentikProProperty {
    id: string;
    name: string;
    slug?: string;
    description?: string;
}

export interface RentikProApiApartment {
    id: string;
    slug: string;
    name: string;
    description?: string;
    capacity?: number;
    bedrooms?: number;
    bathrooms?: number;
    priceFrom?: number;
    publicBasePrice?: number;
    currency?: string;
}

export interface AvailabilityDay {
    date: string;
    isAvailable: boolean;
    minNights?: number | null;
    price?: number | null;
}

export interface ApartmentAvailability {
    apartmentSlug: string;
    days: AvailabilityDay[];
}

export interface AvailabilityResponse {
    locationId?: string;
    apartments: ApartmentAvailability[];
}

export interface RentikProApiAvailabilityApartment {
    apartmentSlug: string;
    days: AvailabilityDay[];
}

export interface RentikProApiAvailabilityResponse {
    propertyId: string;
    from: string;
    to: string;
    generatedAt: string;
    apartments: RentikProApiAvailabilityApartment[];
}

// ─── Lead / Inbox ──────────────────────────────────────────────────────────────

export interface RentikProLead {
    name?: string;
    email?: string;
    phone?: string;
    message: string;
    apartment?: string;
    dates?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    language?: string;
    source?: string;
}

export interface RentikProLeadResponse {
    success: boolean;
    leadId?: string;
    message?: string;
}

// ─── Normalized result — NEVER throws ────────────────────────────────────────

export interface ApiResult<T> {
    data: T | null;
    error: string | null;
    isDemo: boolean;
}

// ─── Error class ──────────────────────────────────────────────────────────────

export type RentikProErrorCode = 'UNAUTHORIZED' | 'CORS' | 'DATE_RANGE' | 'TIMEOUT' | 'UNKNOWN';

export class RentikProError extends Error {
    code: RentikProErrorCode;
    constructor(code: RentikProErrorCode, message?: string) {
        super(message ?? code);
        this.code = code;
        this.name = 'RentikProError';
    }
}
