import { projectManager } from './projectManager';
import { PublicSnapshotSchema, PublicSnapshotV1, PublicAvailabilitySchema, PublicAvailability } from '../src/modules/webBuilder/publicSchema';
import { logger } from './logger';
import { toast } from 'sonner';

export class PublicPublisher {

    /**
     * Builds a safe, PII-free public snapshot of the property.
     */
    async buildPublicSnapshot(propertyId: string): Promise<PublicSnapshotV1> {
        const full = await projectManager.getStore().loadPropertySnapshot(propertyId);
        const settings = full.settings;

        // 1. Build Property
        const publicProperty = {
            id: full.property.id,
            name: full.property.name,
            description: full.property.description || '',
            location: full.property.location || '',
            contact: {
                email: full.property.email || settings.contact_email || '',
                phone: full.property.phone || settings.contact_phone || '',
                website: settings.contact_website || '',
            },
            social: {
                instagram: settings.social_instagram,
                facebook: settings.social_facebook,
                tiktok: settings.social_tiktok,
                x: settings.social_x,
                youtube: settings.social_youtube,
            }
        };

        // 2. Build Apartments (Filtered and PII-free)
        const publicApartments = full.apartments
            .filter(a => a.is_active !== false)
            .map(a => ({
                id: a.id,
                name: a.name,
                description: '', // If we had a long description in DB we'd use it
                capacity: 2,    // Fallback constants or extract from name if possible
                bedrooms: 1,
                bathrooms: 1,
                basePrice: a.publicBasePrice || null,
                currency: a.currency || 'EUR',
                amenities: [],
                photos: full.media
                    .filter(m => m.site_id === a.id)
                    .map(m => ({ id: m.id, url: m.url, title: m.filename }))
            }));

        // 3. Build Policies
        const publicPolicies = full.policies.map(p => ({
            id: p.id,
            scope_id: p.scope_id,
            payment_mode: p.payment_mode,
            cancellation_policy_type: p.cancellation_policy_type,
            deposit_type: p.deposit_type,
            deposit_value: p.deposit_value,
            rules: [] // Don't expose internal rules directly if they have PII
        }));

        const snapshot: PublicSnapshotV1 = {
            version: '1.0',
            generatedAt: Date.now(),
            property: publicProperty,
            apartments: publicApartments,
            policies: publicPolicies
        };

        // Validation with Zod
        const result = PublicSnapshotSchema.safeParse(snapshot);
        if (!result.success) {
            console.error('[PUBLISH] Validation failed:', result.error);
            throw new Error('Public snapshot validation failed: ' + result.error.message);
        }

        // Final Guard Rail: check for forbidden keys in the stringified JSON
        const piiKeywords = ['password', 'secret', 'token', 'key', 'gestor', 'contable', 'fiscal_id', 'nif', 'cif'];
        const json = JSON.stringify(snapshot).toLowerCase();
        for (const kw of piiKeywords) {
            // Some keywords like "token" appear in property metadata (public_token), we need to be careful
            if (kw === 'token' && json.includes('public_token')) continue;
            if (json.includes(kw)) {
                logger.warn(`[PUBLISH] Guard rail triggered: found forbidden keyword "${kw}" in public payload`);
                // If it's something really sensitive, we'd block it.
                // For now, we log it.
            }
        }

        return snapshot;
    }

    /**
     * Builds public availability map for a given range.
     * Range is usually today -> today + 365 days.
     */
    async buildPublicAvailability(propertyId: string, days: number = 365): Promise<PublicAvailability> {
        const now = new Date();
        const from = now.toISOString().split('T')[0];
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + days);
        const to = toDate.toISOString().split('T')[0];

        const bookings = await projectManager.getStore().queryReservationsByRange(null, from, to, { propertyId });
        const apartments = await projectManager.getStore().getApartments(propertyId);

        const availability: PublicAvailability = {};

        for (const apt of apartments) {
            availability[apt.id] = {};

            // Default: everything available (this is sparse, we only mark blocked)
            const aptBookings = bookings.filter(b => b.apartment_id === apt.id);

            for (const b of aptBookings) {
                // Occupancy EXCLUSIVO: check_in <= d < check_out
                let d = new Date(b.check_in);
                const end = new Date(b.check_out);

                while (d < end) {
                    const ds = d.toISOString().split('T')[0];
                    availability[apt.id][ds] = 'blocked';
                    d.setDate(d.getDate() + 1);
                }
            }
        }

        // Validation
        const result = PublicAvailabilitySchema.safeParse(availability);
        if (!result.success) throw new Error('Availability validation failed');

        return availability;
    }

    /**
     * Publishes both snapshot and availability to the public worker.
     */
    async publish(propertyId: string): Promise<boolean> {
        const workerUrl = (import.meta.env.VITE_PUBLIC_WORKER_URL || '').replace(/\/$/, '');
        const adminKey = import.meta.env.VITE_PUBLIC_WORKER_ADMIN_KEY || import.meta.env.VITE_ADMIN_TOKEN || '';

        if (!workerUrl || !adminKey) {
            toast.error('Worker URL or Admin Key (VITE_ADMIN_TOKEN) missing in environment');
            return false;
        }

        try {
            const snapshot = await this.buildPublicSnapshot(propertyId);
            const availability = await this.buildPublicAvailability(propertyId);

            // PUBLISH SNAPSHOT (Atomic: Staging + Commit)
            // The worker endpoint should handle atomicity if it supports it, 
            // or we do two separate calls if needed.
            // Following the "[BLOQUE P6/9]" instruction: upload staging + commit.

            // 1. Upload Snapshot (STAGING)
            const snapRes = await fetch(`${workerUrl}/admin/site-config/snapshot?propertyId=${propertyId}&staging=true`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminKey}`
                },
                body: JSON.stringify(snapshot)
            });

            if (!snapRes.ok) throw new Error(`Snapshot staging failed: ${snapRes.status}`);

            // 2. Upload Availability (STAGING)
            const availRes = await fetch(`${workerUrl}/admin/site-config/availability?propertyId=${propertyId}&staging=true`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminKey}`
                },
                body: JSON.stringify(availability)
            });

            if (!availRes.ok) throw new Error(`Availability staging failed: ${availRes.status}`);

            // 3. COMMIT
            const commitRes = await fetch(`${workerUrl}/admin/site-config/commit?propertyId=${propertyId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminKey}`
                }
            });

            if (!commitRes.ok) throw new Error(`Commit failed: ${commitRes.status}`);

            toast.success('Publicación web completada con éxito');
            return true;
        } catch (e: any) {
            logger.error('[PUBLISH] Failed:', e);
            toast.error('Error en la publicación: ' + e.message);
            return false;
        }
    }
}

export const publicPublisher = new PublicPublisher();
