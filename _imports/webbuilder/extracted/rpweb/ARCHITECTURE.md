# El Rinconcito Matarraña — Architecture Notes

## Multi-Tenant Readiness (Create Web)

### Current State: Single Tenant (El Rinconcito)
The codebase is structured to make the jump to multi-tenant **minimal effort**.

### Data Layer: Single Source of Truth

```
src/config/site.config.ts   ← ALL tenant config lives here (name, contact, social, SEO, features)
src/content/brand.ts         ← Thin re-export from site.config.ts (backward compat only)
src/content/apartments.ts    ← Property-specific data
src/context/SiteConfigContext.tsx ← Ready for dynamic config loading
```

### To add a new tenant:

1. **Duplicate** `site.config.ts` → `site.config.tenant2.ts`
2. **Fill in** all fields (name, contact, social, rentikpro credentials)
3. **Load dynamically**: `fetch('/api/sites/${SITE_ID}/config')` in `SiteConfigProvider`
4. **Swap context**: `<SiteConfigProvider config={tenantConfig}>`
5. **Done** — all UI components pick up the new config via `useSiteConfig()`

### UI / Data Separation

| Layer | Files | Purpose |
|-------|-------|---------|
| Templates | `src/pages/*.tsx`, `src/components/*.tsx` | Visual structure (NEVER touched per tenant) |
| Config | `src/config/site.config.ts` | Brand, contact, SEO, features |
| Content | `src/content/apartments.ts`, `experiences.ts`, etc. | Property-specific content |
| Integration | `src/integrations/rentikpro/` | API connection (config via env vars) |

### Feature Flags

Each tenant can toggle features in `site.config.ts`:
```ts
features: {
  liveEnvironmentWidget: true,  // Weather widget
  chatbot: true,                 // AI chatbot
  comingSoonSection: true,       // "Mas Matarraña" section
  rentikproSection: true,        // RentikPro showcase section
}
```

### TODO for SaaS Productization

- [ ] Move `SITE_CONFIG` to API: `GET /api/v1/sites/:id/config`
- [ ] Replace `useSEO` hardcoded SITE_CONFIG with `useSiteConfig()`
- [ ] Replace `BRAND` imports with `useSiteConfig()` in all components
- [ ] Add theme CSS variables system (already stubbed in ThemeConfig)
- [ ] Implement Cloudflare Workers sitemap generation per tenant
- [ ] Add tenant ID to RentikPro API requests (already using `PROPERTY_ID` env var)

## RentikPro Integration Architecture

```
Calendar → fetchAvailability() → RentikProClient → API / Mock
                ↓
         Per-month cache (Map<string, AvailabilityDay[]>)
                ↓
         Visual calendar (available/booked/selected)
                ↓
         Post-selection CTA → WhatsApp / Booking / RentikPro Direct
```

### When RentikPro Direct Booking is ready:
1. Set `SITE_CONFIG.rentikpro.bookingUrl = 'https://rentikpro.com/book/el-rinconcito'`
2. All CTAs automatically use this URL via `BOOKING_URL` constant
3. No other code changes needed

## SEO Architecture

- `index.html` — Base JSON-LD (LodgingBusiness), OG tags, Twitter cards
- `src/hooks/useSEO.ts` — Dynamic meta injection + page-specific JSON-LD
- `public/sitemap.xml` — Static stub (should be generated dynamically per tenant)
- `src/hooks/useSEO.ts` exports: `buildLodgingBusinessSchema()`, `buildApartmentSchema()`, `buildTouristAttractionSchema()`, `buildBreadcrumbSchema()`

