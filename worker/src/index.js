export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Robust CORS Definition
    const CORS_HEADERS = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key, X-Admin-Token, X-Public-Token, If-None-Match",
      "Access-Control-Expose-Headers": "ETag, Content-Length, X-Generated-At",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };

    function withCors(resp) {
      const h = new Headers(resp.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => h.set(k, v));
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: h
      });
    }

    // 2. Centralized OPTIONS handling
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 3. Main Request Wrapper to catch ALL errors and apply CORS
    try {
      const response = await handleRequest(request, env, ctx, url, path);
      return withCors(response);
    } catch (err) {
      console.error("Worker Error:", err);
      return withCors(new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }));
    }

    // --- INNER HANDLER ---
    async function handleRequest(request, env, ctx, url, path) {
      async function generateETag(content) {
        const msgUint8 = new TextEncoder().encode(content);
        const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return `W/"${hashArray.map(b => b.toString(16).padStart(2, "0")).join("")}"`;
      }

      // Health checks
      if ((path === "/" || path === "/health") && request.method === "GET") {
        return new Response("OK", { status: 200 });
      }

      // GET /public/site-config/snapshot?slug=...
      if (path === "/public/site-config/snapshot" && request.method === "GET") {
        const slug = url.searchParams.get("slug") || url.searchParams.get("subdomain");
        if (!slug || typeof slug !== "string" || slug.length > 100) {
          return new Response(JSON.stringify({ error: "Invalid slug" }), {
            status: 400, headers: { "Content-Type": "application/json" }
          });
        }

        const MIN_VALID_SNAPSHOT = {
          version: 1,
          slug: slug,
          site: { name: "RentikPro Property", description: "Cargando..." },
          apartments: [],
          availability: { enabled: false }
        };

        try {
          const cachedSnap = await env.SITE_CONFIGS.get(`snap:live:${slug}`);
          if (cachedSnap) {
            const etag = await generateETag(cachedSnap);
            if (request.headers.get("If-None-Match") === etag) {
              return new Response(null, { status: 304 });
            }
            return new Response(cachedSnap, {
              status: 200,
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "ETag": etag,
                "Cache-Control": "public, max-age=300"
              }
            });
          }

          const site = await env.DB
            .prepare("SELECT subdomain, property_id, is_published FROM web_sites WHERE subdomain = ?")
            .bind(slug)
            .first();

          if (!site || site.is_published === 0) {
            return new Response(JSON.stringify(MIN_VALID_SNAPSHOT), {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8" }
            });
          }

          const propertyId = site.property_id;
          const property = await env.DB
            .prepare("SELECT id, name, description, logo, phone, email, location, currency, web_calendar_enabled FROM properties WHERE id = ?")
            .bind(propertyId)
            .first();

          let aptResults = [];
          try {
            const apts = await env.DB.prepare(`
              SELECT a.id, a.name, a.public_base_price, a.currency,
                     d.base_price as studio_base_price
              FROM apartments a
              LEFT JOIN apartment_pricing_defaults d ON d.apartment_id = a.id
              WHERE a.property_id = ?
            `).bind(propertyId).all();
            aptResults = apts?.results || [];
          } catch {
            const apts = await env.DB.prepare("SELECT id, name, currency FROM apartments WHERE property_id = ?").bind(propertyId).all();
            aptResults = apts?.results || [];
          }

          const apartments = aptResults.map((a) => ({
            id: a.id,
            name: a.name,
            photos: [],
            capacity: null,
            publicBasePrice: (a.studio_base_price ?? a.public_base_price ?? null),
            currency: a.currency || property?.currency || 'EUR'
          }));

          const payload = JSON.stringify({
            version: 1, slug,
            site: {
              id: property?.id || propertyId,
              name: property?.name || slug,
              description: property?.description ?? null,
              logoUrl: property?.logo ?? null,
              contact: {
                phone: property?.phone ?? null,
                email: property?.email ?? null,
                location: property?.location ?? null
              }
            },
            apartments,
            availability: {
              enabled: property?.web_calendar_enabled === 1,
              propertyId: property?.id || propertyId,
              urlTemplate: `${url.origin}/public/availability?propertyId=${encodeURIComponent(property?.id || propertyId)}&from=YYYY-MM-DD&to=YYYY-MM-DD`
            }
          });

          const etag = await generateETag(payload);
          return new Response(payload, {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "ETag": etag,
              "Cache-Control": "public, max-age=300"
            }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message, fallback: MIN_VALID_SNAPSHOT }), {
            status: 500, headers: { "Content-Type": "application/json" }
          });
        }
      }

      // GET /public/site-config?slug=...
      if (path === "/public/site-config" && request.method === "GET") {
        const slug = url.searchParams.get("slug");
        if (!slug || typeof slug !== "string" || slug.length > 100) {
          return new Response(JSON.stringify({ error: "Invalid slug" }), {
            status: 400, headers: { "Content-Type": "application/json" }
          });
        }

        const configStr = await env.SITE_CONFIGS.get(slug);
        if (!configStr) {
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404, headers: { "Content-Type": "application/json" }
          });
        }

        const etag = await generateETag(configStr);
        if (request.headers.get("If-None-Match") === etag) {
          return new Response(null, { status: 304 });
        }

        return new Response(configStr, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "ETag": etag,
            "Cache-Control": "public, max-age=600"
          }
        });
      }

      function getAdminToken(req) {
        const auth = req.headers.get("Authorization") || "";
        if (auth.startsWith("Bearer ")) return auth.substring(7);
        return req.headers.get("X-Admin-Key") || req.headers.get("X-Admin-Token") || "";
      }

      // --- PUBLISHER BY SLUG ENDPOINTS ---
      if (path === "/public/staging/snapshot" && request.method === "PUT") {
        const token = getAdminToken(request);
        if (token !== env.ADMIN_TOKEN && token !== env.ADMIN_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const slug = url.searchParams.get("slug");
        if (!slug) return new Response(JSON.stringify({ error: "Missing slug" }), { status: 400 });

        const body = await request.text();
        const generatedAt = Date.now();
        await env.SITE_CONFIGS.put(`snap:staging:${slug}`, body, {
          metadata: { generatedAt, slug, type: 'snapshot' }
        });

        return new Response(JSON.stringify({ ok: true, slug, generatedAt }), {
          status: 200, headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/public/commit" && request.method === "POST") {
        const token = getAdminToken(request);
        if (token !== env.ADMIN_TOKEN && token !== env.ADMIN_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const slug = url.searchParams.get("slug");
        if (!slug) return new Response(JSON.stringify({ error: "Missing slug" }), { status: 400 });

        const { value, metadata } = await env.SITE_CONFIGS.getWithMetadata(`snap:staging:${slug}`);
        if (!value) return new Response(JSON.stringify({ error: "Nothing to commit for this slug" }), { status: 404 });

        await env.SITE_CONFIGS.put(`snap:live:${slug}`, value, {
          metadata: { ...metadata, committedAt: Date.now() }
        });

        return new Response(JSON.stringify({ ok: true, slug }), {
          status: 200, headers: { "Content-Type": "application/json" }
        });
      }

      // --- PUBLISHER ADMIN ENDPOINTS ---
      if (path === "/admin/site-config/commit" && request.method === "POST") {
        const token = getAdminToken(request);
        if (token !== env.ADMIN_TOKEN && token !== env.ADMIN_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const propertyId = url.searchParams.get("propertyId");
        if (!propertyId) return new Response(JSON.stringify({ error: "Missing propertyId" }), { status: 400 });

        async function commitType(type) {
          const stagingKey = `pub:${type}:${propertyId}:staging`;
          const finalKey = `pub:${type}:${propertyId}`;
          const { value, metadata } = await env.SITE_CONFIGS.getWithMetadata(stagingKey);
          if (value) {
            await env.SITE_CONFIGS.put(finalKey, value, {
              metadata: { ...metadata, isStaging: false, committedAt: Date.now() }
            });
            return true;
          }
          return false;
        }

        const [snapOk, availOk] = await Promise.all([commitType('snapshot'), commitType('availability')]);

        return new Response(JSON.stringify({ ok: true, snapshot: snapOk, availability: availOk }), {
          status: 200, headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/admin/site-config" && (request.method === "PUT" || request.method === "POST")) {
        const token = getAdminToken(request);
        if (token !== env.ADMIN_TOKEN && token !== env.ADMIN_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const body = await request.json();
        const slug = url.searchParams.get("slug") || body.slug;
        const config = body.config || body;

        if (!slug || !config) {
          return new Response(JSON.stringify({ error: "Missing slug or config" }), { status: 400 });
        }

        const configStr = JSON.stringify(config);
        await env.SITE_CONFIGS.put(slug, configStr);

        return new Response(JSON.stringify({ ok: true, slug, savedAt: new Date().toISOString() }), {
          status: 200, headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/admin/site-config" && request.method === "GET") {
        const token = getAdminToken(request);
        if (token !== env.ADMIN_TOKEN && token !== env.ADMIN_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const slug = url.searchParams.get("slug");
        if (!slug) return new Response(JSON.stringify({ error: "Missing slug" }), { status: 400 });

        const configStr = await env.SITE_CONFIGS.get(slug);
        if (!configStr) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

        return new Response(configStr, {
          status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" }
        });
      }

      // --- ICAL ENDPOINTS ---
      if (path === "/ical/publish" && request.method === "POST") {
        const adminKey = request.headers.get("X-Admin-Key");
        if (adminKey !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

        const { project_id, unit_id, icsText } = await request.json();
        let { token } = await request.json();

        if (!project_id || !unit_id || !icsText) return new Response(JSON.stringify({ error: "Missing data" }), { status: 400 });

        if (!token) {
          token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        }

        await env.RENTIKPRO_FEEDS.put(token, icsText, { metadata: { project_id, unit_id, updated: Date.now() } });
        return new Response(JSON.stringify({ token, publicUrl: `${url.origin}/ical/${token}.ics` }), { status: 200 });
      }

      const icalMatch = path.match(/^\/ical\/(.+)\.ics$/);
      if (icalMatch && request.method === "GET") {
        const ics = await env.RENTIKPRO_FEEDS.get(icalMatch[1]);
        if (!ics) return new Response("Feed not found", { status: 404 });
        return new Response(ics, { status: 200, headers: { "Content-Type": "text/calendar; charset=utf-8" } });
      }

      // --- ICAL PROXY ENDPOINT (F5 Fallback) ---
      if (path === "/ical-proxy" || path === "/cm-proxy") {
        const target = url.searchParams.get("url");
        if (!target) return new Response("Missing url", { status: 400 });

        let targetUrl;
        try { targetUrl = new URL(target); } catch { return new Response("Invalid url", { status: 400 }); }

        const host = targetUrl.hostname.toLowerCase();
        const allowed = ["airbnb.com", "booking.com", "vrbo.com", "escapadarural.com", "google.com", "ical.me"];
        if (!allowed.some(d => host === d || host.endsWith("." + d))) {
          return new Response(JSON.stringify({ error: "Domain not allowed (iCal Proxy)", host }), { status: 403 });
        }

        // Rate limit by client IP or token if present
        const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
        const limitRes = await enforceRateLimit(`proxy:${ip}`, env);
        if (limitRes) return limitRes;

        const cache = caches.default;
        let cached = await cache.match(request);
        if (cached) return cached;

        // Fetch with robust headers to bypass some basic bot detection
        const resp = await fetch(targetUrl.toString(), {
          headers: {
            "Accept": "text/calendar,text/plain,*/*",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 RentikPro/1.0",
            "Referer": "https://www.google.com/"
          }
        });

        const body = await resp.text();
        const contentType = resp.headers.get("Content-Type") || "";
        const isHtml = body.trim().toLowerCase().startsWith("<!doctype html") || contentType.includes("text/html");

        if (isHtml) {
          return new Response(JSON.stringify({
            error: "OTA_BLOCKED",
            message: "El proveedor bloqueó la petición con una página HTML/Captcha.",
            status: resp.status,
            contentType
          }), {
            status: 422, // Unprocessable Entity
            headers: { "Content-Type": "application/json" }
          });
        }

        const out = new Response(body, {
          status: resp.status,
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "X-Proxy-Origin": "RentikPro-CF-Worker"
          }
        });

        if (resp.status === 200) ctx.waitUntil(cache.put(request, out.clone()));
        return out;
      }

      // --- PUBLIC API HELPERS ---
      function requirePublicToken(request) {
        return request.headers.get("X-PUBLIC-TOKEN") || null;
      }

      async function enforceRateLimit(token, env) {
        const id = env.RATE_LIMITER.idFromName(token);
        const stub = env.RATE_LIMITER.get(id);
        const res = await stub.fetch("http://do/limit");
        return res.status === 429 ? new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 }) : null;
      }

      // --- PUBLIC ENDPOINTS ---
      if (path.startsWith("/public/")) {
        const token = requirePublicToken(request);

        // Token is optional for GET, required for POST/PUT (unless ADMIN_KEY is used)
        if (!token && request.method !== "GET" && path !== "/public/site-config") {
          // We'll check ADMIN_KEY later for POST /public/site-config
        }

        if (token) {
          const limitRes = await enforceRateLimit(token, env);
          if (limitRes) return limitRes;
        }

        if (path === "/public/site-config" && request.method === "GET") {
          const slug = url.searchParams.get("slug") || url.searchParams.get("subdomain");
          if (!slug) return new Response(JSON.stringify({ error: "Missing slug" }), { status: 400 });

          const cached = await env.RENTIKPRO_CONFIGS.get(slug);
          if (cached) return new Response(cached, { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } });

          const site = await env.DB.prepare("SELECT * FROM web_sites WHERE subdomain = ?").bind(slug).first();
          if (!site) return new Response(JSON.stringify({ error: "Site not found" }), { status: 404 });
          if (site.is_published === 0) return new Response(JSON.stringify({ error: "Site not published" }), { status: 403 });

          // public_token check only if provided and we want to enforce it, but user asked for public 200.
          // if (token && site.public_token !== token) return new Response(JSON.stringify({ error: "Invalid public token" }), { status: 401 });

          const config = site.sections_json ? JSON.parse(site.sections_json) : { slug: site.subdomain };
          ctx.waitUntil(env.RENTIKPRO_CONFIGS.put(slug, JSON.stringify(config)));
          return new Response(JSON.stringify(config), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        if (path === "/public/site-config" && request.method === "POST") {
          const adminKey = request.headers.get("X-Admin-Key");
          const config = await request.json();
          if (!config.slug) return new Response(JSON.stringify({ error: "Missing slug" }), { status: 400 });

          if (adminKey !== env.ADMIN_KEY) {
            if (!token) return new Response(JSON.stringify({ error: "Unauthorized: Missing public token" }), { status: 401 });
            const site = await env.DB.prepare("SELECT * FROM web_sites WHERE subdomain = ?").bind(config.slug).first();
            if (site && site.public_token !== token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
          }

          const configStr = JSON.stringify(config);
          await env.RENTIKPRO_CONFIGS.put(config.slug, configStr);
          if (config.aliases) {
            for (const alias of config.aliases) await env.RENTIKPRO_CONFIGS.put(alias, configStr);
          }
          return new Response(JSON.stringify({ success: true, slug: config.slug }), { status: 200 });
        }

        if (path === "/public/availability" && request.method === "GET") {
          const propertyId = url.searchParams.get("propertyId");
          if (!propertyId) return new Response(JSON.stringify({ error: "Missing propertyId" }), { status: 400 });

          const { value, metadata } = await env.SITE_CONFIGS.getWithMetadata(`pub:availability:${propertyId}`);

          if (!value) {
            // Return 200 with empty list instead of 404 to satisfy frontend
            return new Response(JSON.stringify({ propertyId, availability: [] }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=60"
              }
            });
          }

          return new Response(value, {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Generated-At": metadata?.generatedAt?.toString() || "",
              "Cache-Control": "public, max-age=60"
            }
          });
        }

        if (path === "/public/snapshot" && request.method === "GET") {
          const propertyId = url.searchParams.get("propertyId");
          if (!propertyId) return new Response(JSON.stringify({ error: "Missing propertyId" }), { status: 400 });

          const { value, metadata } = await env.SITE_CONFIGS.getWithMetadata(`pub:snapshot:${propertyId}`);
          if (!value) {
            return new Response(JSON.stringify({ propertyId, site: { name: propertyId }, apartments: [] }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=300"
              }
            });
          }
          return new Response(value, {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Generated-At": metadata?.generatedAt?.toString() || "",
              "Cache-Control": "public, max-age=300"
            }
          });
        }

        if (path === "/public/apartments" && request.method === "GET") {
          const propertyId = url.searchParams.get("propertyId");
          if (!propertyId) return new Response(JSON.stringify({ error: "Missing propertyId" }), { status: 400 });

          // Try to get from snapshot
          const { value } = await env.SITE_CONFIGS.getWithMetadata(`pub:snapshot:${propertyId}`);
          if (value) {
            try {
              const snap = JSON.parse(value);
              return new Response(JSON.stringify(snap.apartments || []), {
                status: 200,
                headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" }
              });
            } catch (e) { }
          }

          // Generic fallback or empty list
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" }
          });
        }
      }

      return new Response("Not Found", { status: 404 });
    }
  }
};

export { PublicRateLimiterDO } from "./RateLimiter";
