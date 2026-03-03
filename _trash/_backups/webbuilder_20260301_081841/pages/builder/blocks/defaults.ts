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
                    title: 'Tu refugio perfecto te espera',
                    subtitle: 'Experiencias inolvidables en alojamientos exclusivos diseñados para tu máximo confort.',
                    ctaLabel: 'Explorar Alojamientos',
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
                    title: 'Servicios Exclusivos',
                    features: [
                        { title: 'Ubicación Prime', description: 'En las mejores zonas, cerca de todo lo que importa.', icon: 'MapPin' },
                        { title: 'Check-in Autónomo', description: 'Entra a tu ritmo con cerraduras inteligentes.', icon: 'Key' },
                        { title: 'Limpieza Profesional', description: 'Estándares de higiene rigurosos en cada estancia.', icon: 'Check' }
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
                        { name: 'Elena García', text: 'Una estancia maravillosa. El apartamento es tal cual las fotos y la atención inmejorable.', rating: 5 },
                        { name: 'Mark Wilson', text: 'Perfect location and very clean. The host was very helpful throughout our stay.', rating: 5 }
                    ]
                },
                styles: commonStyles
            };
        case 'Location':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Cómo llegar',
                    address: 'Calle Mayor 1, 28013 Madrid, España',
                    phone: '+34 912 345 678'
                },
                styles: commonStyles
            };
        case 'CTA':
            return {
                id, type, variant: 'A',
                data: {
                    title: '¿Listo para tu próxima aventura?',
                    subtitle: 'Reserva directamente con nosotros para obtener el mejor precio garantizado.',
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
                    subtitle: 'Precios competitivos para estancias cortas y largas.',
                    plans: [
                        { name: 'Temporada Baja', price: '85', period: '/noche', features: ['Mínimo 2 noches', 'Cancelación gratuita', 'WiFi incluido'], cta: 'Reservar' },
                        { name: 'Temporada Alta', price: '125', period: '/noche', features: ['Vistas exclusivas', 'Pack de bienvenida', 'Late check-out'], cta: 'Ver disponibilidad', featured: true }
                    ]
                },
                styles: commonStyles
            };
        case 'FAQ':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Dudas Frecuentes',
                    items: [
                        { question: '¿A qué hora puedo entrar?', answer: 'El check-in es a partir de las 15:00h, pero intentamos tenerlo listo antes si es posible.' },
                        { question: '¿Hay cunas disponibles?', answer: 'Sí, disponemos de cunas y tronas bajo petición previa sin coste adicional.' }
                    ]
                },
                styles: commonStyles
            };
        case 'ContactForm':
            return {
                id, type, variant: 'A',
                data: {
                    title: '¿Tienes alguna duda?',
                    subtitle: 'Escríbenos y te responderemos en menos de 24 horas.',
                    submitLabel: 'Enviar Consulta'
                },
                styles: commonStyles
            };
        case 'AvailabilityCalendar':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Reserva tus fechas',
                    propertyId: '',
                    apartmentLabel: 'Consultar disponibilidad',
                },
                styles: commonStyles
            };
        case 'ApartmentsGrid':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Nuestras Unidades',
                    subtitle: 'Descubre el apartamento que mejor se adapta a tus necesidades.',
                    items: []
                },
                styles: commonStyles
            };
        case 'TrustBadges':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Tu reserva segura',
                    badges: ['Superhost', 'Verified', 'SafeStay', 'EcoFriendly']
                },
                styles: commonStyles
            };
        case 'Gallery':
            return {
                id, type, variant: 'A',
                data: {
                    title: 'Tu hogar lejos de casa',
                    subtitle: 'Echa un vistazo a los detalles que hacen nuestras propiedades especiales.'
                },
                styles: commonStyles
            };
        case 'ContactFooter':
            return {
                id, type, variant: 'A',
                data: {
                    brandName: 'RentikPro Properties',
                    email: 'hola@tudominio.com',
                },
                styles: commonStyles
            };
        case 'Navigation':
            return {
                id, type, variant: 'A',
                data: {
                    brandName: 'Mi Alojamiento',
                    links: [
                        { label: 'Inicio', href: '/' },
                        { label: 'Apartamentos', href: '#apartments' },
                        { label: 'Contacto', href: '#contact' }
                    ]
                },
                styles: {
                    desktop: { padding: '20px 40px', backgroundColor: '#ffffff', color: '#1e293b' }
                }
            };
        default:
            return {
                id, type, variant: 'A',
                data: { title: `Bloque ${type}` },
                styles: commonStyles
            };
    }
};
