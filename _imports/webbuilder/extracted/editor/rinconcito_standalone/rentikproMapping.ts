/**
 * RentikPro Slug Mapping
 *
 * Maps the slug/ID returned by the RentikPro API → our internal slug.
 *
 * ► HOW TO FIND YOUR API SLUGS:
 *   Once connected, check the browser console for:
 *   "[RentikPro] Unknown apartment slug: <value>"
 *   Then add it here.
 *
 * ► INTERNAL SLUGS (must match apartments.ts):
 *   'la-tirolina'
 *   'la-ermita'
 *   'los-almendros'
 *   'mas-matarrana-el-olivo'    (coming soon)
 *   'mas-matarrana-la-parra'    (coming soon)
 *
 * ► EXAMPLES:
 *   'apt_123abc':   'la-tirolina',
 *   'tirolina':     'la-tirolina',
 *   'la_ermita_01': 'la-ermita',
 */
export const SLUG_MAP: Record<string, string> = {
    // Add your RentikPro API slugs here after connecting:
    // 'api-id-or-slug': 'our-internal-slug',
};

// ── Legacy alias (keeps old client.ts import working) ──────────────────────────
export const RENTIKPRO_SLUG_MAP = SLUG_MAP;
