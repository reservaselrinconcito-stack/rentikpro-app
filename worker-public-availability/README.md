# public-availability — Cloudflare Worker

Serves property availability data via a secure public API.

## Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `PUBLIC_AVAIL_KV` | KV Namespace | Config (`cfg:<propertyId>`) + rate-limit counters (`rl:...`) |
| `PUBLIC_AVAIL_R2` | R2 Bucket | Availability snapshots (`snap/<propertyId>.json`) |
| `ADMIN_API_KEY` | Secret | Authenticates `POST /public/publish` |

---

## Deploy

```bash
cd worker-public-availability
npm install

# 1. Create KV namespace
wrangler kv:namespace create PUBLIC_AVAIL_KV
# → Copy the printed id into wrangler.toml → kv_namespaces[0].id

# 2. Create R2 bucket
wrangler r2 bucket create public-avail-snapshots

# 3. Set the admin secret
wrangler secret put ADMIN_API_KEY
# → Enter your secret when prompted

# 4. Type-check
npm run typecheck

# 5. Deploy
npm run deploy
```

---

## Routes

### `POST /public/publish` — Upload snapshot (admin only)

```bash
curl -X POST https://public-availability.<account>.workers.dev/public/publish \
  -H "Authorization: Bearer <ADMIN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prop_abc123",
    "propertyPublicToken": "my-secret-token-48chars",
    "allowedOrigins": ["https://mi-hotel.com", "https://www.mi-hotel.com"],
    "showPrices": false,
    "maxRangeDays": 365,
    "payload": {
      "propertyId": "prop_abc123",
      "from": "2026-02-18",
      "to": "2027-02-18",
      "generatedAt": "2026-02-18T15:00:00.000Z",
      "apartments": [
        {
          "apartmentId": "apt_1",
          "apartmentSlug": "suite-principal",
          "days": [
            { "date": "2026-02-18", "isAvailable": true },
            { "date": "2026-02-19", "isAvailable": false }
          ]
        }
      ]
    }
  }'
# → {"ok":true}
```

### `GET /public/availability` — Query availability (public)

```bash
curl "https://public-availability.<account>.workers.dev/public/availability?propertyId=prop_abc123&from=2026-02-18&to=2026-02-25" \
  -H "X-PUBLIC-TOKEN: my-secret-token-48chars"
# → { "propertyId": "prop_abc123", "from": "2026-02-18", "to": "2026-02-25", ... }
```

### `OPTIONS` — CORS preflight

```bash
curl -X OPTIONS \
  "https://public-availability.<account>.workers.dev/public/availability?propertyId=prop_abc123" \
  -H "Origin: https://mi-hotel.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-PUBLIC-TOKEN" \
  -v
# → 204 with Access-Control-Allow-Origin: https://mi-hotel.com
```

---

## Security notes

- Public tokens are **never stored in plaintext** — only their SHA-256 hash is kept in KV.
- Token comparison uses a timing-safe XOR loop to prevent timing attacks.
- CORS is enforced per-property based on `allowedOrigins` stored in config.
- Rate limit: **60 req/min per token** (sliding window, 1-minute buckets, 120s KV TTL).
- `showPrices=false` strips `price` from every day in the response, even if the snapshot contains it.

---

## Local dev

```bash
npm run dev
# Worker runs at http://localhost:8787
```

For local dev with KV/R2, add a `[dev]` section or use `--local` flag with wrangler.
