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
        default:
            return {
                id, type, variant: 'A',
                data: { title: `Bloque ${type}` },
                styles: commonStyles
            };
    }
};
