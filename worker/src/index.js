export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get("Origin");

    // Helper para CORS
    function addCors(resp, originHeader) {
      const allowedOrigins = [
        "https://rentikpro2.pages.dev",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
      ];
      const h = new Headers(resp.headers);

      // Si el origin está en allowlist o es nulo (OTA/GET directo), permitimos
      if (!originHeader || allowedOrigins.includes(originHeader.replace(/\/$/, ""))) {
        h.set("Access-Control-Allow-Origin", originHeader || "*");
      }

      h.set("Vary", "Origin");
      h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS,HEAD");
      h.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key, If-None-Match");
      h.set("Access-Control-Expose-Headers", "ETag, Content-Length");
      h.set("Access-Control-Max-Age", "86400");

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: h
      });
    }

    // Preflight
    if (request.method === "OPTIONS") {
      return addCors(new Response(null, { status: 204 }), origin);
    }

    // --- ENPOINTS NUEVOS (ICAL OUTBOUND) ---

    // POST /ical/publish -> Guarda ICS en KV
    if (path === "/ical/publish" && request.method === "POST") {
      const adminKey = request.headers.get("X-Admin-Key");
      if (adminKey !== env.ADMIN_KEY) {
        return addCors(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }), origin);
      }

      try {
        const data = await request.json();
        const { project_id, unit_id, icsText } = data;
        let { token } = data;

        if (!project_id || !unit_id || !icsText) {
          return addCors(new Response(JSON.stringify({ error: "Missing data" }), { status: 400 }), origin);
        }

        // Generar token si no viene uno
        if (!token) {
          const rawToken = crypto.getRandomValues(new Uint8Array(24));
          token = btoa(String.fromCharCode(...rawToken))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
        }

        // Guardar en KV: RENTIKPRO_FEEDS
        await env.RENTIKPRO_FEEDS.put(token, icsText, {
          metadata: { project_id, unit_id, updated: Date.now() }
        });

        const publicUrl = `${url.origin}/ical/${token}.ics`;
        return addCors(new Response(JSON.stringify({ token, publicUrl }), { status: 200 }), origin);
      } catch (err) {
        return addCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }), origin);
      }
    }

    // GET /ical/:token.ics -> Devuelve ICS desde KV
    const icalMatch = path.match(/^\/ical\/(.+)\.ics$/);
    if (icalMatch && request.method === "GET") {
      const token = icalMatch[1];
      const ics = await env.RENTIKPRO_FEEDS.get(token);

      if (!ics) {
        return addCors(new Response("Feed not found", { status: 404 }), origin);
      }

      return addCors(new Response(ics, {
        status: 200,
        headers: { "Content-Type": "text/calendar; charset=utf-8" }
      }), origin);
    }


    // --- ENPOINT EXISTENTE (PROXY) ---

    if (path === "/cm-proxy") {
      const target = url.searchParams.get("url");
      if (!target) {
        return addCors(new Response("Missing url", { status: 400 }), origin);
      }

      let targetUrl;
      try {
        targetUrl = new URL(target);
      } catch {
        return addCors(new Response("Invalid url", { status: 400 }), origin);
      }

      if (!/^https?:$/.test(targetUrl.protocol)) {
        return addCors(new Response("Invalid protocol", { status: 400 }), origin);
      }

      const host = targetUrl.hostname.toLowerCase();
      const allowed = [
        "airbnb.com", "booking.com", "ical.booking.com", "admin.booking.com",
        "calendar.google.com", "outlook.office.com", "vrbo.com", "homeaway.com",
        "escapadarural.com", "static.escapadarural.com"
      ];
      const isAllowed = allowed.some(d => host === d || host.endsWith("." + d));

      if (!isAllowed) {
        return addCors(new Response(JSON.stringify({
          code: "DOMAIN_NOT_ALLOWED",
          message: "Host not allowed: " + host,
          host: host
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        }), origin);
      }

      const cacheKey = new Request("https://cm-proxy.local/cache?url=" + encodeURIComponent(targetUrl.toString()), { method: "GET" });
      const cache = caches.default;
      let cached = await cache.match(cacheKey);

      if (cached && request.method !== "HEAD") {
        return addCors(cached, origin);
      }

      try {
        const upstreamReq = new Request(targetUrl.toString(), {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; RentikProCM/1.0)",
            "Accept": "text/calendar,text/plain,*/*"
          }
        });
        const resp = await fetch(upstreamReq, { redirect: "follow" });

        const ct = resp.headers.get("content-type") || "text/plain; charset=utf-8";
        const body = await resp.text();

        const outHeaders = {
          "Content-Type": ct.includes("text/calendar") ? ct : "text/calendar; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "ETag": resp.headers.get("ETag") || `W/"${body.length}"`,
        };

        const out = new Response(body, { status: resp.status, headers: outHeaders });
        if (resp.status >= 200 && resp.status < 300 && body && body.length > 50) {
          ctx.waitUntil(cache.put(cacheKey, out.clone()));
        }

        return addCors(request.method === "HEAD" ? new Response(null, { status: resp.status, headers: outHeaders }) : out, origin);
      } catch (e) {
        return addCors(new Response("Upstream fetch failed", { status: 502 }), origin);
      }
    }

    // --- REUSABLE SECURITY HELPERS ---

    function requirePublicToken(request) {
      const token = request.headers.get("X-PUBLIC-TOKEN");
      if (!token) {
        return addCors(new Response(JSON.stringify({ error: "Missing public token" }), { status: 401 }), request.headers.get("Origin"));
      }
      return token;
    }

    async function enforceRateLimit(token, env) {
      // Calls Durable Object
      const id = env.RATE_LIMITER.idFromName(token);
      const stub = env.RATE_LIMITER.get(id);
      const doRes = await stub.fetch("http://do/limit");
      if (doRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 });
      }
      return null; // OK
    }

    // Resolves site and checks is_published
    // Returns { site, response } - if response is set, return it immediately (error)
    async function resolveAndValidateSite(subdomain, env, origin) {
      if (!subdomain) {
        return { response: addCors(new Response(JSON.stringify({ error: "Missing subdomain" }), { status: 400 }), origin) };
      }
      const site = await env.DB.prepare("SELECT * FROM web_sites WHERE subdomain = ?").bind(subdomain).first();
      if (!site) {
        return { response: addCors(new Response(JSON.stringify({ error: "Site not found" }), { status: 404 }), origin) };
      }
      if (site.is_published === 0) {
        return { response: addCors(new Response(JSON.stringify({ error: "Site not published" }), { status: 403 }), origin) };
      }
      return { site };
    }

    function enforceCors(request, site) {
      const origin = request.headers.get("Origin");
      if (!origin) return null; // Server-to-server / curl allowed if no Origin

      let allowedOrigins = [];
      try {
        allowedOrigins = JSON.parse(site.allowed_origins_json || "[]");
      } catch (e) { }

      if (!allowedOrigins.includes(origin)) {
        return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403 });
      }
      return null; // OK
    }

    // --- PUBLIC ENDPOINTS ---

    if (path.startsWith("/public/")) {
      const origin = request.headers.get("Origin");

      // A. Validate Token (401)
      const tokenOrResponse = requirePublicToken(request);
      if (tokenOrResponse instanceof Response) return tokenOrResponse;
      const token = tokenOrResponse;

      // B. Rate Limit (DO) (429)
      const limitResponse = await enforceRateLimit(token, env);
      if (limitResponse) return addCors(limitResponse, origin);

      // ROUTING

      // 1. GET /public/site-config
      if (path === "/public/site-config" && request.method === "GET") {
        const subdomain = url.searchParams.get("subdomain");

        // C. Load Site & Validate Published (404 / 403)
        const { site, response } = await resolveAndValidateSite(subdomain, env, origin);
        if (response) return response;

        // Token Verification (Match site's token)
        if (site.public_token !== token) {
          return addCors(new Response(JSON.stringify({ error: "Invalid public token" }), { status: 401 }), origin);
        }

        // D. Validate CORS (403)
        const corsError = enforceCors(request, site);
        if (corsError) return corsError; // Headers will be added by addCors if needed, but here we return strict error

        try {
          const property = await env.DB.prepare(
            "SELECT name, location, logo, phone, email FROM properties WHERE id = ?"
          ).bind(site.property_id).first();

          const features = site.features_json ? JSON.parse(site.features_json) : {};

          const config = {
            property: property || { name: site.subdomain },
            template: site.template_slug,
            plan: site.plan_type,
            features: {
              blogEnabled: !!features.blogEnabled,
              experiencesEnabled: !!features.experiencesEnabled,
              showPrices: !!features.showPrices
            }
          };

          // E. Respond with JSON + CORS Headers
          // enforceCors checks specific origin. addCors reflects it if allowed (we know it is allowed now).
          // However, addCors uses a hardcoded list in this file. We should extend addCors to support the site's allowedOrigins dynamically?
          // Or just use the helper to set headers here.
          // Given existing addCors logic, strict enforcement was done above.
          // We can manually set the allow-origin header to the request origin since we validated it.

          const resp = new Response(JSON.stringify(config), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });

          // Manually handling dynamic CORS here to override the static list in addCors if needed,
          // OR rely on addCors if we update it.
          // Let's use a custom response wrapper for authorized dynamic CORS.
          const h = new Headers(resp.headers);
          if (origin) {
            h.set("Access-Control-Allow-Origin", origin);
            h.set("Access-Control-Allow-Methods", "GET, OPTIONS");
            h.set("Access-Control-Allow-Headers", "Content-Type, X-PUBLIC-TOKEN");
          }
          return new Response(resp.body, { status: 200, headers: h });

        } catch (err) {
          return addCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }), origin);
        }
      }

      // 2. GET /public/availability
      if (path.startsWith("/public/availability") && request.method === "GET") {
        const subdomain = url.searchParams.get("subdomain");

        // C. Load Site & Validate
        const { site, response } = await resolveAndValidateSite(subdomain, env, origin);
        if (response) return response;

        if (site.public_token !== token) {
          return addCors(new Response(JSON.stringify({ error: "Invalid public token" }), { status: 401 }), origin);
        }

        // D. Validate CORS
        const corsError = enforceCors(request, site);
        if (corsError) return corsError;

        try {
          // Mock Availability Logic (Restoring structure)
          // In real impl, would query 'calendars' or 'bookings' table
          const availabilityConfig = {
            // Placeholder data
            property_id: site.property_id,
            available: true,
            // We would fetch real data here
          };

          const resp = new Response(JSON.stringify(availabilityConfig), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });

          const h = new Headers(resp.headers);
          if (origin) {
            h.set("Access-Control-Allow-Origin", origin);
            h.set("Access-Control-Allow-Methods", "GET, OPTIONS");
            h.set("Access-Control-Allow-Headers", "Content-Type, X-PUBLIC-TOKEN");
          }
          return new Response(resp.body, { status: 200, headers: h });

        } catch (err) {
          return addCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }), origin);
        }
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
