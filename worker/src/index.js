
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Endpoint único
    if (path !== "/cm-proxy") {
      return new Response("Not Found", { status: 404 });
    }

    // CORS: permite llamadas desde tu PWA
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
      "Access-Control-Expose-Headers": "ETag, Content-Length",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Permitir GET y HEAD
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const target = url.searchParams.get("url");
    if (!target) {
      return new Response("Missing url", { status: 400, headers: corsHeaders });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response("Invalid url", { status: 400, headers: corsHeaders });
    }

    // Seguridad básica: solo http/https
    if (!/^https?:$/.test(targetUrl.protocol)) {
      return new Response("Invalid protocol", { status: 400, headers: corsHeaders });
    }

    // Allowlist de dominios
    const host = targetUrl.hostname.toLowerCase();
    const allowed = [
      "airbnb.com",
      "booking.com",
      "ical.booking.com",
      "admin.booking.com",
      "calendar.google.com",
      "outlook.office.com",
      "vrbo.com",
      "homeaway.com"
    ];
    // Simple check: endsWith allows subdomains
    const isAllowed = allowed.some(d => host === d || host.endsWith("." + d));
    
    // Si quieres cerrar el proxy solo a estos dominios, descomenta:
    // if (!isAllowed) return new Response("Host not allowed: " + host, { status: 403, headers: corsHeaders });

    // Cache edge (5 min) para evitar machacar al origen
    const cacheKey = new Request("https://cm-proxy.local/cache?url=" + encodeURIComponent(targetUrl.toString()), {
      method: "GET"
    });
    const cache = caches.default;

    let cached = await cache.match(cacheKey);
    if (cached) {
      const h = new Headers(cached.headers);
      for (const [k,v] of Object.entries(corsHeaders)) h.set(k, v);
      // Si es HEAD, devolvemos el cached response (el body se ignora en cliente pero headers ok)
      return new Response(request.method === "HEAD" ? null : cached.body, { status: cached.status, headers: h });
    }

    // Fetch upstream
    const upstreamReq = new Request(targetUrl.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RentikProCM/1.0)",
        "Accept": "text/calendar,text/plain,*/*"
      }
    });

    let resp;
    try {
      resp = await fetch(upstreamReq, { redirect: "follow" });
    } catch (e) {
      return new Response("Upstream fetch failed", { status: 502, headers: corsHeaders });
    }

    const ct = resp.headers.get("content-type") || "text/plain; charset=utf-8";
    const body = await resp.text();

    const outHeaders = new Headers({
      "Content-Type": ct.includes("text/calendar") ? ct : "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "ETag": resp.headers.get("ETag") || `W/"${body.length}"`,
      ...corsHeaders
    });

    const out = new Response(body, { status: resp.status, headers: outHeaders });

    // Guarda en cache si fue OK
    if (resp.status >= 200 && resp.status < 300 && body && body.length > 50) {
      ctx.waitUntil(cache.put(cacheKey, out.clone()));
    }

    if (request.method === "HEAD") {
      return new Response(null, { status: resp.status, headers: outHeaders });
    }

    return out;
  }
};
