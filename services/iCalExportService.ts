import { projectManager } from './projectManager';
import { Apartment } from '../types';
import { iCalGenerator } from './iCalGenerator';

const WORKER_URL = 'https://rentikpro-ical.reservas-elrinconcito.workers.dev';
const ADMIN_KEY = 'rentikpro_ical_2024';

function generateToken(apartmentId: string): string {
    let hash = 0;
    const seed = apartmentId + '_rentikpro_v2';
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    const base = Math.abs(hash).toString(36);
    return `rp_${base}_${apartmentId.replace(/[^a-z0-9]/gi, '').substring(0, 8)}`;
}

export const iCalExportService = {

    async publishApartment(apartmentId: string): Promise<{ success: boolean; url?: string; error?: string }> {
        try {
            const store = projectManager.getStore();
            const allApts = await store.getAllApartments();
            const apartment = allApts.find(a => a.id === apartmentId);
            if (!apartment) throw new Error('Apartamento no encontrado');

            const token = apartment.ical_export_token || generateToken(apartmentId);
            const icsText = await iCalGenerator.generateForUnit(apartmentId);
            const eventCount = (icsText.match(/BEGIN:VEVENT/g) || []).length;

            const resp = await fetch(`${WORKER_URL}/publish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': ADMIN_KEY,
                },
                body: JSON.stringify({ token, icsText, unitName: apartment.name || apartmentId }),
            });

            if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(`Worker error ${resp.status}: ${txt.substring(0, 120)}`);
            }

            const { feedUrl } = await resp.json() as { feedUrl: string };

            const updated: Apartment = {
                ...apartment,
                ical_export_token: token,
                ical_out_url: feedUrl,
                ical_last_publish: Date.now(),
                ical_event_count: eventCount,
            };
            await store.saveApartment(updated);

            return { success: true, url: feedUrl };
        } catch (e: any) {
            console.error('[iCalExport] publishApartment failed:', e);
            return { success: false, error: e.message };
        }
    },

    async getFeedUrl(apartmentId: string): Promise<string | null> {
        const store = projectManager.getStore();
        const allApts = await store.getAllApartments();
        const apt = allApts.find(a => a.id === apartmentId);
        if (apt?.ical_out_url) return apt.ical_out_url;
        const res = await this.publishApartment(apartmentId);
        return res.url ?? null;
    },

    _debounceTimers: {} as Record<string, ReturnType<typeof setTimeout>>,

    async triggerAutoPublish(apartmentId: string) {
        const store = projectManager.getStore();
        const allApts = await store.getAllApartments();
        const apt = allApts.find(a => a.id === apartmentId);
        if (!apt?.ical_export_token) return;

        if (this._debounceTimers[apartmentId]) clearTimeout(this._debounceTimers[apartmentId]);
        this._debounceTimers[apartmentId] = setTimeout(async () => {
            await this.publishApartment(apartmentId);
            delete this._debounceTimers[apartmentId];
        }, 5_000);
    },
};

window.addEventListener('rentikpro:ical-auto-publish', (e: any) => {
    const aptId = e.detail?.apartmentId;
    if (aptId) iCalExportService.triggerAutoPublish(aptId);
});
