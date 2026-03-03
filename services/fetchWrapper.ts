
import { getProxyUrl, rotateProxy } from './syncEngine';
import { iCalLogger } from './iCalLogger';

export interface EnrichedResponse extends Response {
    _cachedBody?: string;
    _json?: any;
}

const FALLBACK_ENABLED = true;

/**
 * MINI-BLOQUE F5: Unified Fetch Wrapper
 * Ensures body is read exactly once to prevent "body stream already read" error.
 * Automatically handles proxy rotation and basic error logging.
 */
export async function proxyFetch(targetUrl: string, options: RequestInit = {}, timeoutMs = 15000): Promise<EnrichedResponse> {
    const isMock = targetUrl.startsWith('mock://');
    if (isMock) {
        return new Response(JSON.stringify({ events: [] }), { status: 200 }) as EnrichedResponse;
    }

    // Attempt 1
    let proxyBase = getProxyUrl();
    let response: EnrichedResponse;

    try {
        response = await internalFetch(targetUrl, proxyBase, options, timeoutMs);

        const rawBody = response._cachedBody || "";
        const isHtml = rawBody.trim().toLowerCase().startsWith("<!doctype html") ||
            (response.headers.get('Content-Type') || '').includes('text/html');

        // Check if we need a fallback: 
        // 1. HTTP error 
        // 2. OTA Blocked (HTML response)
        // 3. Rate limited
        const needsFallback = !response.ok || isHtml || response.status === 429 || response.status >= 500;

        if (needsFallback && FALLBACK_ENABLED) {
            const fallbackProxy = "https://rentikpro-cm-proxy.reservas-elrinconcito.workers.dev/ical-proxy";

            // Only fallback if we are NOT already using the official proxy
            if (!proxyBase.includes("reservas-elrinconcito.workers.dev")) {
                iCalLogger.logWarn('FETCH_FALLBACK', `Error o bloqueo en ${proxyBase}. Reintentando via Proxy Oficial...`, {
                    status: response.status,
                    isHtml
                });

                // Rotation before fallback to avoid using the same failing proxy next time
                rotateProxy();

                const fallbackResponse = await internalFetch(targetUrl, fallbackProxy, options, timeoutMs);
                return fallbackResponse;
            }
        }

        return response;

    } catch (err: any) {
        // Hard failure (network error, timeout)
        iCalLogger.logError('FETCH_HARD_ERROR', err.message || 'Error de red', { url: targetUrl });

        if (FALLBACK_ENABLED) {
            const fallbackProxy = "https://rentikpro-cm-proxy.reservas-elrinconcito.workers.dev/ical-proxy";
            if (!proxyBase.includes("reservas-elrinconcito.workers.dev")) {
                iCalLogger.logInfo('FETCH_FALLBACK_RETRY', `Fallo de red. Reintentando via Proxy Oficial...`);
                rotateProxy();
                return await internalFetch(targetUrl, fallbackProxy, options, timeoutMs);
            }
        }
        throw err;
    }
}

/**
 * Internal logic for a single fetch attempt via a specific proxy
 */
async function internalFetch(targetUrl: string, proxyBase: string, options: RequestInit, timeoutMs: number): Promise<EnrichedResponse> {
    let proxyTarget = '';

    // 1. Construct Proxy URL
    if (proxyBase.includes('corsproxy.io')) {
        proxyTarget = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    } else if (proxyBase.includes('allorigins.win')) {
        proxyTarget = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    } else {
        const joiner = proxyBase.includes('?') ? '&' : '?';
        proxyTarget = `${proxyBase}${joiner}url=${encodeURIComponent(targetUrl)}`;
    }

    // 2. Add Cache Buster
    proxyTarget += `${proxyTarget.includes('?') ? '&' : '?'}t=${Date.now()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    iCalLogger.logInfo('FETCH_TRY', `Iniciando fetch via ${proxyBase}`);

    try {
        const response = await fetch(proxyTarget, {
            ...options,
            redirect: 'follow',
            headers: {
                ...options.headers,
                'Accept': 'text/calendar, text/plain, */*'
            },
            signal: controller.signal
        }) as EnrichedResponse;

        clearTimeout(timeoutId);

        // 3. READ BODY ONCE
        const rawBody = await response.text();
        response._cachedBody = rawBody;

        const contentType = response.headers.get('Content-Type') || 'unknown';
        const size = rawBody.length;
        const firstLine = rawBody.substring(0, 50).replace(/\n/g, ' ');

        iCalLogger.updateSummary({
            lastStatus: response.status,
            lastContentType: contentType,
            lastSize: size,
            lastUrl: targetUrl,
            lastError: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
            lastProxyUsed: proxyBase
        });

        // Detect OTA Blocks
        const isHtml = rawBody.trim().toLowerCase().startsWith("<!doctype html") || contentType.includes('text/html');

        if (isHtml) {
            iCalLogger.logError('OTA_BLOCK_DETECTED', `El proveedor devolvió HTML (posible CAPTCHA o bloqueo).`, { url: targetUrl });
        }

        iCalLogger.logInfo('FETCH_RESULT', `Status: ${response.status}, CT: ${contentType}, Size: ${size} bytes`, {
            url: targetUrl,
            firstLine,
            proxy: proxyBase,
            isHtml
        });

        // Pre-parse JSON for proxy error messages
        try {
            if (rawBody.trim().startsWith('{')) {
                response._json = JSON.parse(rawBody);
            }
        } catch (e) { }

        // Rotation on persistent errors (but not for 404/401 which are "legit" client errors)
        if (response.status === 429 || response.status >= 500) {
            rotateProxy();
        }

        return response;

    } catch (err: any) {
        clearTimeout(timeoutId);
        throw err;
    }
}
