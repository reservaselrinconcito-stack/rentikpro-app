
/**
 * Clasifica una reserva según las fechas de estancia comparadas con hoy.
 * Reglas:
 * - Por venir (upcoming): checkIn > hoy
 * - Hospedadas (staying): checkIn <= hoy AND hoy < checkOut
 * - Pasadas (past): checkOut <= hoy
 */
export function getStayStatus(checkIn: string, checkOut: string, nowOverride?: Date): 'upcoming' | 'staying' | 'past' {
    const now = nowOverride || new Date();

    // Obtener fecha hoy en Europe/Madrid (YYYY-MM-DD)
    // Usamos Intl.DateTimeFormat para asegurar el timezone solicitado
    const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const todayStr = formatter.format(now); // "YYYY-MM-DD"

    if (todayStr <= checkIn) {
        return 'upcoming';
    } else if (todayStr >= checkOut) {
        return 'past';
    } else {
        return 'staying';
    }
}
