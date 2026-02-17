import { projectManager } from './projectManager';
import { Apartment } from '../types';
import { iCalGenerator } from './iCalGenerator';

const WORKER_URL = "https://rentikpro-cm-proxy.reservas-elrinconcito.workers.dev/ical";
const ADMIN_KEY = "rentikpro_admin_2024"; // Should match worker env (X-Admin-Key)

export const iCalExportService = {
    /**
     * Publishes confirmed bookings to the external worker.
     */
    async publishApartment(apartmentId: string): Promise<{ success: boolean; url?: string; error?: string }> {
        try {
            const store = projectManager.getStore();
            const allApts = await store.getAllApartments();
            const apartment = allApts.find(a => a.id === apartmentId);
            if (!apartment) throw new Error("Apartment not found");

            // 1. Generate local ICS content (MINI-BLOQUE F4)
            const icsText = await iCalGenerator.generateForUnit(apartmentId);
            const eventCount = (icsText.match(/BEGIN:VEVENT/g) || []).length;

            // 2. Send to worker with X-Admin-Key
            const response = await fetch(`${WORKER_URL}/publish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': ADMIN_KEY
                },
                body: JSON.stringify({
                    project_id: localStorage.getItem('active_project_id') || 'default',
                    unit_id: apartmentId,
                    token: apartment.ical_export_token || undefined,
                    icsText: icsText
                })
            });

            if (!response.ok) {
                const rawBody = await response.text();
                let errorData: any = { error: 'Error desconocido' };
                try {
                    errorData = JSON.parse(rawBody);
                } catch (e) { }
                throw new Error(errorData.error || `Error ${response.status}: ${rawBody.substring(0, 100)}`);
            }

            const rawBody = await response.text();
            const { token, publicUrl } = JSON.parse(rawBody);

            // 3. Update local metadata
            const updatedApt: Apartment = {
                ...apartment,
                ical_export_token: token,
                ical_out_url: publicUrl,
                ical_last_publish: Date.now(),
                ical_event_count: eventCount
            };
            await store.saveApartment(updatedApt);

            return {
                success: true,
                url: publicUrl
            };
        } catch (e: any) {
            console.error("[iCalExport] Publish failed:", e);
            return { success: false, error: e.message };
        }
    },

    // --- AUTO-PUBLISH LOGIC (MINI-BLOQUE B3) ---
    _debounceTimers: {} as Record<string, any>,

    /**
     * Triggers a debounced publish if the apartment has export enabled.
     */
    async triggerAutoPublish(apartmentId: string) {
        const store = projectManager.getStore();
        const allApts = await store.getAllApartments();
        const apartment = allApts.find(a => a.id === apartmentId);

        if (!apartment || !apartment.ical_export_token) return;

        // Clear existing timer for this apartment
        if (this._debounceTimers[apartmentId]) {
            clearTimeout(this._debounceTimers[apartmentId]);
        }

        // Set new timer (5 seconds debounce)
        this._debounceTimers[apartmentId] = setTimeout(async () => {
            console.log(`[iCalExport] Auto-publishing apartment ${apartmentId}...`);
            await this.publishApartment(apartmentId);
            delete this._debounceTimers[apartmentId];
        }, 5000);
    }
};

// Listen for auto-publish triggers (avoids circular dependency with sqliteStore)
window.addEventListener('rentikpro:ical-auto-publish', (e: any) => {
    const aptId = e.detail?.apartmentId;
    if (aptId) {
        iCalExportService.triggerAutoPublish(aptId);
    }
});
