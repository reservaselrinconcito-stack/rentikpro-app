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
        const slug = url.searchParams.get("slug") || url.searchParams.get("subdomain");

        if (!slug) {
          return addCors(new Response(JSON.stringify({ error: "Missing slug or subdomain" }), { status: 400 }), origin);
        }

        // 1.1. Try KV First (Fast Path)
        const cachedConfig = await env.RENTIKPRO_CONFIGS.get(slug);
        if (cachedConfig) {
          return new Response(cachedConfig, {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": origin || "*",
              "Vary": "Origin"
            }
          });
        }

        // 1.2. Fallback to DB
        const { site, response } = await resolveAndValidateSite(slug, env, origin);
        if (response) return response;

        // Token Verification
        if (site.public_token !== token) {
          return addCors(new Response(JSON.stringify({ error: "Invalid public token" }), { status: 401 }), origin);
        }

        const corsError = enforceCors(request, site);
        if (corsError) return corsError;

        try {
          // If we are here, we might want to return the full JSON from sections_json if available
          if (site.sections_json) {
            const fullConfig = JSON.parse(site.sections_json);
            // Ensure it has the slug
            fullConfig.slug = site.subdomain;

            // Populate KV for next time
            ctx.waitUntil(env.RENTIKPRO_CONFIGS.put(slug, JSON.stringify(fullConfig)));

            return new Response(JSON.stringify(fullConfig), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": origin || "*",
                "Vary": "Origin"
              }
            });
          }

          // Legacy Legacy Fallback
          const property = await env.DB.prepare(
            "SELECT name, location, logo, phone, email FROM properties WHERE id = ?"
          ).bind(site.property_id).first();

          const features = site.features_json ? JSON.parse(site.features_json) : {};

          const config = {
            slug: site.subdomain,
            property: property || { name: site.subdomain },
            template: site.template_slug,
            plan: site.plan_type,
            features: {
              blogEnabled: !!features.blogEnabled,
              experiencesEnabled: !!features.experiencesEnabled,
              showPrices: !!features.showPrices
            }
          };

          return new Response(JSON.stringify(config), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": origin || "*",
              "Vary": "Origin"
            }
          });

        } catch (err) {
          return addCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }), origin);
        }
      }

      // 1.1 POST /public/site-config (Public publish endpoint)
      if (path === "/public/site-config" && request.method === "POST") {
        const adminKey = request.headers.get("X-Admin-Key");
        const publicToken = request.headers.get("X-PUBLIC-TOKEN");

        try {
          const config = await request.json();
          if (!config.slug) {
            return addCors(new Response(JSON.stringify({ error: "Config must have a slug" }), { status: 400 }), origin);
          }

          // Security: Admin Key OR matching Public Token
          let siteInDb = null; // Declare siteInDb here for broader scope
          if (adminKey !== env.ADMIN_KEY) {
            siteInDb = await env.DB.prepare("SELECT * FROM web_sites WHERE subdomain = ?").bind(config.slug).first();
            if (siteInDb && siteInDb.public_token !== publicToken) {
              return addCors(new Response(JSON.stringify({ error: "Unauthorized update" }), { status: 403 }), origin);
            }
            if (!siteInDb && !publicToken) {
              return addCors(new Response(JSON.stringify({ error: "Admin Key or Public Token required for new slugs" }), { status: 401 }), origin);
            }
          }

          // Save to KV (Primary Slug)
          const configStr = JSON.stringify(config);
          await env.RENTIKPRO_CONFIGS.put(config.slug, configStr);

          // Handle Aliases (e.g. el-rinconcito-matarrana, el-rinconcito-matarraña)
          let aliases = config.aliases || [];
          if (config.slug === "el-rinconcito") {
            // Forced consistency for the requested slugs
            if (!aliases.includes("el-rinconcito-matarrana")) aliases.push("el-rinconcito-matarrana");
            if (!aliases.includes("el-rinconcito-matarraña")) aliases.push("el-rinconcito-matarraña");
          }

          if (Array.isArray(aliases)) {
            for (const alias of aliases) {
              if (alias && typeof alias === 'string') {
                // Normalizar alias si es necesario o guardar tal cual
                await env.RENTIKPRO_CONFIGS.put(alias, configStr);
              }
            }
          }

          // Update DB if exists
          // Re-fetch siteInDb if it wasn't fetched in the auth block (i.e., if adminKey was used)
          if (!siteInDb) {
            siteInDb = await env.DB.prepare("SELECT * FROM web_sites WHERE subdomain = ?").bind(config.slug).first();
          }
          if (siteInDb) {
            await env.DB.prepare("UPDATE web_sites SET is_published = 1, sections_json = ? WHERE subdomain = ?")
              .bind(configStr, config.slug)
              .run();
          }

          return new Response(JSON.stringify({ success: true, slug: config.slug, aliases }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": origin || "*",
              "Vary": "Origin"
            }
          });

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
