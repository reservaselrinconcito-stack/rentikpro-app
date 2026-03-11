/**
 * publishAdapter.ts — Orquestador de publicación del editor.
 *
 * Responsabilidades:
 *  1. Publica disponibilidad pública en el worker correcto.
 *  2. Publica SiteConfigV1 (con themeId) via publishSiteConfig (api.ts).
 *  3. Garantiza que RPWeb recibe themeId en dos rutas seguras:
 *     - SiteConfigV1.themeId (root)
 *     - SiteConfigV1.theme.themeId (para normalizeProperty en RPWeb)
 *
 * Uso en WebsiteBuilder.tsx:
 *   const ok = await publishAdapter.fullPublish(propertyId, websiteId, config);
 */
import { projectManager } from './projectManager';
import { publishAvailability } from './publicWebSync';
import { publishSiteConfig, checkSlugCollision } from '../src/modules/webBuilder/api';
import { generateSlug } from '../src/modules/webBuilder/slug';
import type { SiteConfigV1 } from '../src/modules/webBuilder/types';
import { toast } from 'sonner';

export class PublishAdapter {

    /**
     * Publicación completa: snapshot + availability + SiteConfigV1.
     *
     * @param propertyId  ID de la propiedad en SQLite.
     * @param websiteName Nombre del sitio (para generar slug si no hay).
     * @param config      SiteConfigV1 con themeId incluido.
     * @returns           Slug publicado, o null si falló.
     */
    async fullPublish(
        propertyId: string,
        websiteName: string,
        config: SiteConfigV1
    ): Promise<string | null> {
        const workerUrl = (import.meta.env.VITE_PUBLIC_WORKER_URL || '').replace(/\/$/, '');
        const adminKey = import.meta.env.VITE_PUBLIC_WORKER_ADMIN_KEY || import.meta.env.VITE_ADMIN_TOKEN || '';
        if (!workerUrl) {
            toast.error('Worker público no configurado. Revisa VITE_PUBLIC_WORKER_URL.');
            return null;
        }
        if (!adminKey) {
            toast.error('Admin key no configurada. Ve a Configuración -> Editor Web para añadirla.');
            return null;
        }

        // ── 1. Determinar y validar slug ─────────────────────────────────────
        const slug = (config.slug || generateSlug(websiteName)).trim();
        if (!slug) {
            toast.error('El sitio necesita un slug para publicarse');
            return null;
        }

        // ── 2. Cargar propiedad y publicar disponibilidad ───────────────────
        const property = (await projectManager.getStore().getProperties()).find(p => p.id === propertyId);
        if (!property) {
            toast.error('No se encuentra la propiedad del sitio para publicarla');
            return null;
        }

        toast.loading('Publicando disponibilidad...');
        const availabilityResult = await publishAvailability(property, workerUrl, adminKey);
        if (!availabilityResult.ok) {
            toast.error('Error publicando disponibilidad: ' + (availabilityResult.error || 'Error desconocido'));
            return null;
        }

        // ── 3. Preparar SiteConfigV1 con themeId en ambas rutas ──────────────
        const finalConfig: SiteConfigV1 = {
            ...config,
            slug,
            themeId: config.themeId,
            // RPWeb normalizeProperty lee raw.theme.themeId
            theme: {
                ...config.theme,
                // Injectar themeId dentro de theme para compatibilidad con RPWeb normalizer
                ...(config.themeId ? { themeId: config.themeId } as any : {}),
            },
        };

        const collision = await checkSlugCollision(slug);
        if (collision) {
            console.info(`[WEBBUILDER] Overwriting existing public config for slug: ${slug}`);
        }

        // ── 4. Publicar SiteConfigV1 → Worker KV ─────────────────────────────
        toast.loading('Publicando configuración del sitio...');
        try {
            await publishSiteConfig(slug, finalConfig, adminKey);
        } catch (e: any) {
            toast.error('Error publicando configuración: ' + e.message);
            return null;
        }

        return slug;
    }
}

export const publishAdapter = new PublishAdapter();
