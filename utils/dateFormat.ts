/**
 * Formats a YYYY-MM-DD string to dd/mm/aaaa (es-ES)
 */
export const formatDateES = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';

    // Safe split for YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;

    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
};

/**
 * Formats a date range start -> end in dd/mm/aaaa
 */
export const formatDateRangeES = (start: string | null | undefined, end: string | null | undefined): string => {
    if (!start && !end) return '';
    return `${formatDateES(start)} → ${formatDateES(end)}`;
};
