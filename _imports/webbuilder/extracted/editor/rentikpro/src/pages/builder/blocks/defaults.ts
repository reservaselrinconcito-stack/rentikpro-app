import type { BlockInstance } from '../../../modules/webBuilder/types';

export const createDefaultBlock = (type: string): BlockInstance => {
    const id = `${type.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
    const base = { desktop: { padding: '80px', backgroundColor: '#ffffff', color: '#1e293b', textAlign: 'center' as const } };

    switch (type) {
        case 'Hero': return { id, type, variant: 'A', data: { title: 'Tu estancia perfecta comienza aquí', subtitle: 'Experiencias inolvidables en alojamientos exclusivos.', ctaLabel: 'Ver Alojamientos', imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2000&auto=format&fit=crop' }, styles: base };
        case 'ApartmentsGrid': return { id, type, variant: 'A', data: { title: 'Nuestros Alojamientos', subtitle: 'Elige el espacio perfecto.', items: [] }, styles: base };
        case 'AvailabilityCalendar': return { id, type, variant: 'A', data: { title: 'Disponibilidad', subtitle: 'Consulta fechas disponibles en tiempo real.', ctaLabel: 'Consultar Precio', propertyId: '' }, styles: { desktop: { padding: '80px', backgroundColor: '#f8fafc', color: '#1e293b' } } };
        case 'ContactForm': return { id, type, variant: 'A', data: { title: 'Contacta con nosotros', subtitle: 'Estamos para ayudarte.', submitLabel: 'Enviar Consulta', propertyId: '' }, styles: base };
        case 'Features': return { id, type, variant: 'A', data: { title: '¿Por qué elegirnos?', features: [{ title: 'Localización Prime', description: 'En el corazón de la ciudad.', icon: 'MapPin' }, { title: 'Diseño Moderno', description: 'Interiores premium.', icon: 'Layout' }, { title: 'Soporte 24/7', description: 'Siempre disponibles.', icon: 'Clock' }] }, styles: base };
        case 'Gallery': return { id, type, variant: 'A', data: { title: 'Galería', images: [] }, styles: base };
        case 'Testimonials': return { id, type, variant: 'A', data: { title: 'Lo que dicen nuestros huéspedes', testimonials: [{ name: 'Andrea Pérez', text: 'Una experiencia increíble, volveré sin duda.', rating: 5 }, { name: 'Juan Marcos', text: 'Impecable y atención de 10.', rating: 5 }] }, styles: base };
        case 'FAQ': return { id, type, variant: 'A', data: { title: 'Preguntas Frecuentes', items: [{ question: '¿Cómo hago el check-in?', answer: 'Recibirás instrucciones 24h antes.' }, { question: '¿Aceptáis mascotas?', answer: 'Sí, en la mayoría de propiedades.' }] }, styles: base };
        case 'Location': return { id, type, variant: 'A', data: { title: 'Encuéntranos', address: '', phone: '' }, styles: base };
        case 'CTA': return { id, type, variant: 'A', data: { title: '¿Listo para reservar?', subtitle: 'Consulta disponibilidad y precios.', ctaLabel: 'Reservar Ahora', ctaHref: '#contacto' }, styles: base };
        case 'Pricing': return { id, type, variant: 'A', data: { title: 'Nuestras Tarifas', plans: [{ name: 'Estándar', price: '99', period: '/noche', features: ['WiFi Gratis', 'Cocina Equipada'], cta: 'Reservar' }, { name: 'Premium', price: '149', period: '/noche', features: ['Vistas', 'Parking'], cta: 'El más popular', featured: true }] }, styles: base };
        default: return { id, type, variant: 'A', data: { title: `Bloque ${type}` }, styles: base };
    }
};
