import { Booking } from '../types';

import { isConfirmedBooking, isProvisionalBlock, hasRealGuest, hasAmountPositive } from './bookingClassification';

/**
 * Normalizes a string for comparison (trim + lowercase)
 */
export const normalizeString = (s: string | null | undefined): string => {
    return (s || '').trim().toLowerCase();
};

/**
 * Checks if a booking has a valid guest name (not empty and not a placeholder)
 */
export const hasGuest = (booking: Partial<Booking> | null | undefined): boolean => {
    return hasRealGuest(booking);
};

/**
 * Checks if a booking has a valid amount (> 0)
 */
export const hasAmount = (booking: Partial<Booking> | null | undefined): boolean => {
    return hasAmountPositive(booking);
};

/**
 * A booking is classified as a BLOCK if it lacks BOTH guest AND amount.
 * (Refined Rule: MINI-BLOQUE 4)
 */
export const isBlockBooking = (booking: Partial<Booking> | null | undefined): boolean => {
    return isProvisionalBlock(booking);
};

/**
 * A booking is classified as REAL if it has guest OR amount.
 * (Refined Rule: MINI-BLOQUE 4)
 */
export const isRealBooking = (booking: Partial<Booking> | null | undefined): boolean => {
    return isConfirmedBooking(booking);
};
