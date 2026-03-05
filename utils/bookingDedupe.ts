import { Booking } from '../types';
import { isConfirmedBooking, isProvisionalBlock } from './bookingClassification';

/**
 * UI-ONLY Deduplication logic.
 * Hides iCal events (OTA blocks/bookings) if they are already represented 
 * by a manual or confirmed booking in the same apartment and dates.
 */
export interface DedupeResult {
    deduplicated: Booking[];
    hiddenCount: number;
    totalBookings: number;
    totalOtaEvents: number;
}

export const dedupeBookingsForDisplay = (bookings: Booking[]): DedupeResult => {
    // 1. Separate "Masters" (Bookings with guest data)
    // Masters are any confirmed booking (guest/amount), regardless of origin.
    const masters = bookings.filter(b => b.status !== 'cancelled' && isConfirmedBooking(b));

    // Set of keys from masters to match against iCal candidates
    const masterUids = new Set<string>();
    const masterDateKeys = new Set<string>(); // apartment_id|check_in|check_out

    masters.forEach(m => {
        if (m.ical_uid) masterUids.add(m.ical_uid);
        if (m.external_ref) masterUids.add(m.external_ref);
        masterDateKeys.add(`${m.apartment_id}|${m.check_in}|${m.check_out}`);
    });

    let hiddenCount = 0;
    const deduplicated = bookings.filter(b => {
        // Keep everything except OTA/iCal blocks that are covered by a real booking.
        if (b.status === 'cancelled') return true;
        if (b.event_origin !== 'ical') return true; // manual blocks never hidden

        const isOtaBlock = isProvisionalBlock(b);
        if (!isOtaBlock) return true;

        // An iCal event is a duplicate if its UID or its (apt + dates) match a master
        const isDuplicateByUid = (b.ical_uid && masterUids.has(b.ical_uid)) ||
            (b.external_ref && masterUids.has(b.external_ref));

        const dateKey = `${b.apartment_id}|${b.check_in}|${b.check_out}`;
        const isDuplicateByDate = masterDateKeys.has(dateKey);

        if (isDuplicateByUid || isDuplicateByDate) {
            hiddenCount++;
            return false;
        }

        return true;
    });

    const totalOTABlocks = bookings.filter(b => b.event_origin === 'ical' && isProvisionalBlock(b)).length;
    const totalBookings = bookings.filter(b => !isProvisionalBlock(b) || b.event_origin !== 'ical').length;

    return {
        deduplicated,
        hiddenCount,
        totalBookings,
        totalOtaEvents: bookings.length - totalBookings
    };
};
