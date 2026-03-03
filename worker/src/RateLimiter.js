/**
 * PublicRateLimiterDO - Durable Object for Rate Limiting
 * Implements a simple sliding window per token.
 */
export class PublicRateLimiterDO {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname !== "/limit") {
            return new Response("Not Found", { status: 404 });
        }

        // Rate Limiting Logic: 60 requests per minute per token
        // We use a simple count in a 60s bucket
        const now = Date.now();
        const windowStart = Math.floor(now / 60000) * 60000;
        const currentCount = (await this.state.storage.get(windowStart.toString())) || 0;

        if (currentCount >= 60) {
            return new Response("Rate limited", { status: 429 });
        }

        await this.state.storage.put(windowStart.toString(), currentCount + 1);

        // Cleanup old buckets in ctx.waitUntil if possible
        // (This is a simplified version)

        return new Response("OK", { status: 200 });
    }
}
