/**
 * RentikPro Slug Mapping
 *
 * Maps the `apartmentSlug` (or `apartmentId`) returned by the RentikPro API
 * to our internal slug used in APARTMENTS.
 *
 * If the API already returns slugs that match our internal ones exactly,
 * leave this map empty — the client will use the API slug directly.
 *
 * Example:
 *   'rentikpro-internal-id': 'fuentespalda-rinconcito',
 */
export const RENTIKPRO_SLUG_MAP: Record<string, string> = {
    // Add entries here once you know the real API slugs/IDs:
    // 'api-slug-or-id': 'our-internal-slug',
};
