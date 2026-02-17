
import { getProxyUrl, rotateProxy } from './syncEngine';
import { iCalLogger } from './iCalLogger';

export interface EnrichedResponse extends Response {
    _cachedBody?: string;
    _json?: any;
}

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

    const proxyBase = getProxyUrl();
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

    try {
        const response = await fetch(proxyTarget, {
            ...options,
            signal: controller.signal
        }) as EnrichedResponse;

        clearTimeout(timeoutId);

        // 3. READ BODY ONCE (CRITICAL FIX FOR F5)
        const rawBody = await response.text();
        response._cachedBody = rawBody;

        // Try to pre-parse JSON for convenience
        try {
            if (rawBody.trim().startsWith('{') || rawBody.trim().startsWith('[')) {
                response._json = JSON.parse(rawBody);
            }
        } catch (e) {
            // Not JSON, that's fine for iCal
        }

        // 4. Auto-rotation on certain status codes
        if (response.status === 403 || response.status === 429 || response.status >= 500) {
            rotateProxy();
            iCalLogger.logWarn('PROXY', `Proxy ${proxyBase} returned ${response.status}. Rotated.`);
        }

        return response;

    } catch (err: any) {
        clearTimeout(timeoutId);
        rotateProxy();
        throw err;
    }
}
