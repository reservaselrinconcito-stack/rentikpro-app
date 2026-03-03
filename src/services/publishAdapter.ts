/**
 * src/services/publishAdapter.ts
 *
 * Orquesta el flujo completo de publicación:
 *   1. Snapshot + Availability → publicPublisher.publish() → Worker KV
 *   2. SiteConfigV1 (con themeId) → publishSiteConfig() → Worker KV
 *
 * REGLAS:
 * - No inventa endpoints.
 * - Usa publicPublisher y publishSiteConfig del repo real.
 * - Fallos amigables con toast (nunca pantalla en blanco).
 * - Si faltan env vars → toast instructivo, no crash.
 */

import { toast } from 'sonner';
import { publicPublisher } from '@/services/publicPublisher';
import { publishSiteConfig, checkSlugCollision } from '../modules/webBuilder/api';
import { SiteConfigV1 } from '../modules/webBuilder/types';

export interface PublishResult {
    success: boolean;
    liveUrl?: string;
    error?: string;
}

class PublishAdapter {
    /**
     * Publishes everything needed to make the public site live.
     *
     * @param propertyId - RentikPro property ID
     * @param siteConfig - SiteConfigV1 with themeId set
     * @param publicWebBase - Base URL of the published web (e.g. https://rp-web-6h9.pages.dev)
     */
    async publish(
        propertyId: string,
        siteConfig: SiteConfigV1,
        publicWebBase?: string
    ): Promise<PublishResult> {
        const workerUrl = (import.meta.env.VITE_PUBLIC_WORKER_URL ?? '').trim();
        const adminKey = (import.meta.env.VITE_PUBLIC_WORKER_ADMIN_KEY ?? '').trim();
        const adminToken = (import.meta.env.VITE_ADMIN_TOKEN ?? adminKey).trim();
        const webBase = publicWebBase ?? (import.meta.env.VITE_PUBLIC_WEB_BASE ?? 'https://rp-web-6h9.pages.dev');

        // ── Guard: env vars ──────────────────────────────────────────────────
        if (!workerUrl) {
            toast.error('Falta VITE_PUBLIC_WORKER_URL en .env');
            return { success: false, error: 'VITE_PUBLIC_WORKER_URL missing' };
        }
        if (!adminKey && !adminToken) {
            toast.error('Falta VITE_PUBLIC_WORKER_ADMIN_KEY (o VITE_ADMIN_TOKEN) en .env');
            return { success: false, error: 'Admin key missing' };
        }

        const slug = (siteConfig.slug || propertyId).replace(/^\/+/, '');

        try {
            // ── Step 1: Snapshot + Availability (via publicPublisher) ────────
            const snapOk = await publicPublisher.publish(propertyId);
            if (!snapOk) {
                // publicPublisher already shows its own toast on failure
                return { success: false, error: 'Snapshot/availability publish failed' };
            }

            // ── Step 2: Slug collision check ─────────────────────────────────
            const collision = await checkSlugCollision(slug);
            // We allow overwrite of own site — just log it
            if (collision) {
                console.info(`[PublishAdapter] Overwriting existing config for slug: ${slug}`);
            }

            // ── Step 3: SiteConfigV1 with themeId ────────────────────────────
            const configToPublish: SiteConfigV1 = {
                ...siteConfig,
                slug,
                themeId: siteConfig.themeId || 'builder-standard',
            };

            await publishSiteConfig(slug, configToPublish, adminToken);

            const liveUrl = `${webBase}/${slug}`;
            toast.success(`¡Publicado! → ${liveUrl}`);
            return { success: true, liveUrl };

        } catch (e: any) {
            const msg = e?.message ?? String(e);
            console.error('[PublishAdapter] publish failed:', msg);

            if (msg.includes('No autorizado') || msg.includes('401')) {
                toast.error('Error de autorización: Verifica VITE_ADMIN_TOKEN en .env');
            } else {
                toast.error(`Error al publicar: ${msg}`);
            }

            return { success: false, error: msg };
        }
    }
}

export const publishAdapter = new PublishAdapter();
