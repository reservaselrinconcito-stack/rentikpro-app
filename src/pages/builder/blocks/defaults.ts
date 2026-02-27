import { BlockInstance } from '../../../modules/webBuilder/types';

export const createDefaultBlock = (type: string): BlockInstance => {
    const id = `${type.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
    const commonStyles = {
        desktop: { padding: '80px', backgroundColor: '#ffffff', color: '#1e293b', textAlign: 'center' as const }
    };

    switch (type) {
        case 'Hero':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Tu estancia perfecta comienza aquí',
                    subtitle: 'Experiencias inolvidables en alojamientos exclusivos diseñados para tu confort.',
                    ctaLabel: 'Ver Alojamientos',
                    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2000&auto=format&fit=crop',
                    imageFocal: { x: 50, y: 50 },
                    imageFit: 'cover'
                },
                styles: commonStyles
            };
        case 'Features':
            return {
                id, type, variant: 'A',
                data: {
                    title: '¿Por qué elegirnos?',
                    features: [
                        { title: 'Localización Prime', description: 'En el corazón de la ciudad.', icon: 'MapPin' },
                        { title: 'Diseño Moderno', description: 'Interiores premium.', icon: 'Layout' },
                        { title: 'Soporte 24/7', description: 'Estamos para ayudarte.', icon: 'Clock' }
                    ]
                },
                styles: commonStyles
            };
        case 'Testimonials':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Lo que dicen nuestros huéspedes',
                    testimonials: [
                        { name: 'Andrea Pérez', text: 'Una experiencia increíble, volveré sin duda.', rating: 5 },
                        { name: 'Juan Marcos', text: 'El apartamento estaba impecable y la atención fue de 10.', rating: 5 }
                    ]
                },
                styles: commonStyles
            };
        case 'Location':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Encuéntranos',
                    address: 'Calle Mayor 1, Madrid, España',
                    phone: '+34 900 000 000'
                },
                styles: commonStyles
            };
        case 'CTA':
            return {
                id, type, variant: 'A',
                data: {
                    title: '¿Listo para reservar?',
                    subtitle: 'Haz click en el botón para consultar disponibilidad y precios.',
                    ctaLabel: 'Reservar Ahora',
                    ctaHref: '#contact'
                },
                styles: commonStyles
            };
        case 'Pricing':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Nuestras Tarifas',
                    subtitle: 'Elige el plan que mejor se adapte a tu estancia.',
                    plans: [
                        { name: 'Estándar', price: '99', period: '/noche', features: ['WiFi Gratis', 'Cocina Equipada', 'Limpieza básica'], cta: 'Reservar' },
                        { name: 'Premium', price: '149', period: '/noche', features: ['Vistas al mar', 'Parking incluido', 'Late check-out'], cta: 'El más popular', featured: true }
                    ]
                },
                styles: commonStyles
            };
        case 'FAQ':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Preguntas Frecuentes',
                    items: [
                        { question: '¿Cómo hago el check-in?', answer: 'Recibirás un email con los detalles de acceso 24h antes.' },
                        { question: '¿Aceptáis mascotas?', answer: 'Sí, en la mayoría de nuestras propiedades.' }
                    ]
                },
                styles: commonStyles
            };
        case 'ContactForm':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Contacta con nosotros',
                    subtitle: 'Estamos encantados de escucharte.',
                    submitLabel: 'Enviar Mensaje'
                },
                styles: commonStyles
            };
        case 'AvailabilityCalendar':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Disponibilidad',
                    propertyId: '',
                    apartmentLabel: 'Ver disponibilidad',
                },
                styles: commonStyles
            };
                default:
            return {
                id, type, variant: 'A',
                data: { title: `Bloque ${type}` },
                styles: commonStyles
            };
    }
};
