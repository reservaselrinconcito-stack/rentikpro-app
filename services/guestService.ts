
import { Traveler, Booking } from '../types';

export const guestService = {
    normalizeEmail(email: string | undefined): string {
        if (!email) return '';
        return email.toLowerCase().trim();
    },

    normalizePhone(phone: string | undefined): string {
        if (!phone) return '';
        // Remove all non-numeric characters
        return phone.replace(/\D/g, '');
    },

    getGuestSignature(traveler: Partial<Traveler>): string {
        if (traveler.id && traveler.id.length > 10) { // Assuming UUID or similar
            // If it's a real traveler record with ID
            // But wait, the user says use guest_id if exists, otherwise email/tel.
            // If we have an ID, we still might want to check if another traveler record shares the same email.
        }

        const email = this.normalizeEmail(traveler.email);
        if (email) return `email:${email}`;

        const phone = this.normalizePhone(traveler.telefono);
        if (phone) return `phone:${phone}`;

        if (traveler.id) return `id:${traveler.id}`;

        return 'unknown';
    },

    /**
     * Identifica si un huésped es recurrente (>= 2 reservas)
     * basado en su firma de identidad.
     */
    isRecurrent(traveler: Traveler, allBookings: Booking[], allTravelers: Traveler[] = []): boolean {
        const signature = this.getGuestSignature(traveler);
        if (signature === 'unknown') return false;

        // Count bookings matching this signature
        const matchingBookingsCount = allBookings.filter(b => {
            const bTraveler = allTravelers.find(t => t.id === b.traveler_id);
            if (!bTraveler) {
                return b.traveler_id === traveler.id;
            }
            return this.getGuestSignature(bTraveler) === signature;
        }).length;

        return matchingBookingsCount >= 2;
    },

    getCCAA(provincia: string | undefined): string {
        if (!provincia) return 'Desconocida';
        const p = provincia.toLowerCase().trim();

        const mapping: { [key: string]: string } = {
            'alava': 'País Vasco', 'araba': 'País Vasco', 'vizcaya': 'País Vasco', 'bizkaia': 'País Vasco', 'guipuzcoa': 'País Vasco', 'gipuzkoa': 'País Vasco',
            'albacete': 'Castilla-La Mancha', 'ciudad real': 'Castilla-La Mancha', 'cuenca': 'Castilla-La Mancha', 'guadalajara': 'Castilla-La Mancha', 'toledo': 'Castilla-La Mancha',
            'alicante': 'Comunidad Valenciana', 'alacant': 'Comunidad Valenciana', 'castellon': 'Comunidad Valenciana', 'castello': 'Comunidad Valenciana', 'valencia': 'Comunidad Valenciana',
            'almeria': 'Andalucía', 'cadiz': 'Andalucía', 'cordoba': 'Andalucía', 'granada': 'Andalucía', 'huelva': 'Andalucía', 'jaen': 'Andalucía', 'malaga': 'Andalucía', 'sevilla': 'Andalucía',
            'asturias': 'Principado de Asturias',
            'avila': 'Castilla y León', 'burgos': 'Castilla y León', 'leon': 'Castilla y León', 'palencia': 'Castilla y León', 'salamanca': 'Castilla y León', 'segovia': 'Castilla y León', 'soria': 'Castilla y León', 'valladolid': 'Castilla y León', 'zamora': 'Castilla y León',
            'badajoz': 'Extremadura', 'caceres': 'Extremadura',
            'baleares': 'Islas Baleares', 'illes balears': 'Islas Baleares', 'palma': 'Islas Baleares',
            'barcelona': 'Cataluña', 'girona': 'Cataluña', 'gerona': 'Cataluña', 'lleida': 'Cataluña', 'lerida': 'Cataluña', 'tarragona': 'Cataluña',
            'cantabria': 'Cantabria',
            'ceuta': 'Ceuta',
            'coruña': 'Galicia', 'a coruña': 'Galicia', 'lugo': 'Galicia', 'ourense': 'Galicia', 'orense': 'Galicia', 'pontevedra': 'Galicia',
            'la rioja': 'La Rioja',
            'madrid': 'Comunidad de Madrid',
            'melilla': 'Melilla',
            'murcia': 'Región de Murcia',
            'navarra': 'Comunidad Foral de Navarra',
            'palmas': 'Canarias', 'las palmas': 'Canarias', 'santa cruz de tenerife': 'Canarias', 'tenerife': 'Canarias',
            'teruel': 'Aragón', 'zaragoza': 'Aragón', 'huesca': 'Aragón'
        };

        // Búsqueda aproximada por si viene con tildes u otros
        const normalizedP = p.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (mapping[normalizedP]) return mapping[normalizedP];

        return 'Otra';
    },

    getAccountingBucketLabel(bucket: string | undefined): string {
        if (bucket === 'A') return 'Oficial';
        if (bucket === 'B') return 'Efectivo';
        return bucket || 'General';
    }
};
