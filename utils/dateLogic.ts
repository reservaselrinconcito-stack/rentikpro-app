
/**
 * Adds a number of days to a YYYY-MM-DD string.
 */
export const addDays = (dateStr: string, days: number): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);

    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
};

/**
 * Ensures a valid stay duration (at least 1 night if check-out equals check-in).
 * Corrects cases where check_out is before or equal to check_in.
 */
export const ensureValidStay = (checkIn: string, checkOut: string): { checkIn: string; checkOut: string; corrected: boolean } => {
    if (!checkIn) return { checkIn, checkOut, corrected: false };

    let validCheckOut = checkOut;
    let corrected = false;

    if (!checkOut || checkOut <= checkIn) {
        validCheckOut = addDays(checkIn, 1);
        corrected = true;
        console.warn(`[DateGuard] Invalid stay detected: ${checkIn} -> ${checkOut}. Auto-corrected to ${validCheckOut}.`);
    }

    return { checkIn, checkOut: validCheckOut, corrected };
};
