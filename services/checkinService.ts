
import { projectManager } from './projectManager';
import { Booking, CheckInDeliveryChannel, CheckInRequest } from '../types';

const PUBLIC_CHECKIN_BASE = window.location.origin + '/#/checkin';

export class CheckInService {
    private async getRequestById(requestId: string): Promise<CheckInRequest | null> {
        const store = projectManager.getStore();
        const requests = await store.getCheckInRequests();
        return requests.find(r => r.id === requestId) || null;
    }

    /**
     * Generates a locator RP-YYMM-XXXXXX
     */
    generateLocator(checkInDate: string): string {
        const date = new Date(checkInDate);
        const yy = String(date.getFullYear()).slice(-2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `RP-${yy}${mm}-${random}`;
    }

    /**
     * Generates a secure random token
     */
    generateToken(): string {
        return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    }

    /**
     * Syncs check-in requests from confirmed bookings for the next 7 days
     */
    async regenerateRequests(): Promise<CheckInRequest[]> {
        const store = projectManager.getStore();
        const settings = await store.getSettings();
        const timezone = settings.default_timezone || 'Europe/Madrid';

        // 1. Fetch bookings from both sources (Merge logic from Bookings page)
        const [bookings, accounting] = await Promise.all([
            store.getBookings(),
            store.getBookingsFromAccounting()
        ]);

        // Logic similar to getUpcomingArrivals but broader merge
        const merged = [...accounting];
        const accIds = new Set(accounting.map(b => b.id));
        bookings.forEach(b => {
            if (!accIds.has(b.id)) merged.push(b);
        });

        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const endStr = futureDate.toLocaleDateString('en-CA');

        // 2. Filter confirmed bookings in the next 7 days
        const pendingArrivals = merged.filter(b =>
            b.status === 'confirmed' &&
            b.check_in >= todayStr &&
            b.check_in <= endStr
        );

        // 3. Ensure check-in requests exist
        const existingRequestsArr = await store.getCheckInRequests();
        const existingRequests = new Map(existingRequestsArr.map(r => [r.booking_id, r]));

        const results: CheckInRequest[] = [];

        for (const b of pendingArrivals) {
            let req = existingRequests.get(b.id);

            if (!req) {
                // Check if there is a locator already or generate it
                let locator = b.external_ref?.substring(0, 12) || ''; // Try OTA ref first
                if (locator.length < 4) {
                    const savedLocator = await store.getBookingLocator(b.id);
                    if (savedLocator) locator = savedLocator;
                    else {
                        locator = this.generateLocator(b.check_in);
                        await store.saveBookingLocator(b.id, locator);
                    }
                }

                // Token
                let token = await store.getCheckInToken(b.id);
                if (!token) {
                    token = this.generateToken();
                    await store.saveCheckInToken(b.id, token);
                }

                req = {
                    id: b.id, // using booking_id as PK for simplicity in mapping
                    booking_id: b.id,
                    status: 'PENDING',
                    locator,
                    token,
                    created_at: Date.now(),
                    project_id: projectManager.getCurrentProjectId() || undefined
                };
                await store.saveCheckInRequest(req);
            } else {
                // Update potentially missing data
                if (!req.locator) {
                    req.locator = await store.getBookingLocator(b.id) || this.generateLocator(b.check_in);
                    await store.saveCheckInRequest(req);
                }
                if (!req.token) {
                    req.token = await store.getCheckInToken(b.id) || this.generateToken();
                    await store.saveCheckInRequest(req);
                }
            }
            results.push(req);
        }

        return results;
    }

    getPublicLink(token: string): string {
        return `${PUBLIC_CHECKIN_BASE}/${token}`;
    }

    async prepareDelivery(requestId: string, channel: CheckInDeliveryChannel, recipient?: string, notes?: string): Promise<void> {
        const store = projectManager.getStore();
        const req = await this.getRequestById(requestId);
        if (req) {
            req.last_prepared_at = Date.now();
            req.delivery_recipient = recipient || req.delivery_recipient;
            req.delivery_notes = notes || req.delivery_notes;
            req.sent_via = channel;
            await store.saveCheckInRequest(req);
        }
    }

    async markAsSent(requestId: string, channel?: CheckInDeliveryChannel, recipient?: string, notes?: string): Promise<void> {
        const store = projectManager.getStore();
        const req = await this.getRequestById(requestId);
        if (req) {
            req.status = 'SENT';
            req.sent_at = Date.now();
            req.sent_via = channel || req.sent_via;
            req.delivery_recipient = recipient || req.delivery_recipient;
            req.delivery_notes = notes || req.delivery_notes;
            await store.saveCheckInRequest(req);
        }
    }

    async markAsCompleted(requestId: string, guestFormJson?: string): Promise<void> {
        const store = projectManager.getStore();
        const req = await this.getRequestById(requestId);
        if (req) {
            req.status = 'COMPLETED';
            req.completed_at = Date.now();
            if (guestFormJson) req.guest_form_json = guestFormJson;
            await store.saveCheckInRequest(req);
        }
    }
}

export const checkinService = new CheckInService();
