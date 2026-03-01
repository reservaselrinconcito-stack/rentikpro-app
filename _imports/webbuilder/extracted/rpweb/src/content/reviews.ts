// Reseñas reales extraídas de www.elrinconcitomatarraña.com/es/opinions
// Propietarios: Toni y Evelyn

export interface Review {
  id: string;
  author: string;
  origin?: string;
  rating: number;
  date: string;
  apartment?: string;
  text: string;
  platform: 'google' | 'booking' | 'airbnb' | 'direct';
  highlighted?: boolean;
}

export const REVIEWS: Review[] = [
  {
    id: 'r1',
    author: 'M Carmen',
    rating: 10,
    date: '2025-06-19',
    text: 'Hemos estado 5 días todo un 10, limpieza, baño completo para el higiene, detalles, cocina bien equipada y las zonas comunes un 10. Toni y Evelyn super atentos encantadores. Lo recomendaría.',
    platform: 'direct',
    highlighted: true
  },
  {
    id: 'r2',
    author: 'Virginia Martínez',
    rating: 10,
    date: '2024-07-30',
    apartment: 'La Tirolina',
    text: 'Hemos estado una semana en el apartamento LA TIROLINA, todo un acierto, el apartamento precioso, limpio, una maravilla. Toni y Eve de 10!! Nos ayudaron en todo. Muchas gracias!!',
    platform: 'google',
    highlighted: true
  },
  {
    id: 'r3',
    author: 'Ruth',
    rating: 10,
    date: '2024-09-13',
    text: 'Casa perfectamente equipada con todo tipo de comodidades, muy limpia y acogedora, con buena ubicación en callecita tranquila y silenciosa. El anfitrión ha sido muy atento y agradable. Sin duda es un alojamiento para recomendar. Nos gustó todo.',
    platform: 'booking',
    highlighted: true
  },
  {
    id: 'r4',
    author: 'Marta Surroca',
    rating: 10,
    date: '2024-09-10',
    text: 'El apartamento super limpio y decorado con muy buen gusto, no le falta detalle.',
    platform: 'google',
    highlighted: false
  },
  {
    id: 'r5',
    author: 'Ángeles González',
    rating: 10,
    date: '2024-08-17',
    text: 'Hemos estado un par de noches. Estancia muy agradable como en casa. Apartamento muy amplio y muy limpio, no le falta detalle.',
    platform: 'google',
    highlighted: false
  },
  {
    id: 'r6',
    author: 'Fernando',
    rating: 10,
    date: '2024-09-01',
    text: 'Excepcional!',
    platform: 'booking',
    highlighted: false
  },
  {
    id: 'r7',
    author: 'Juan Carlos',
    rating: 10,
    date: '2024-08-29',
    text: 'Excepcional!',
    platform: 'booking',
    highlighted: false
  },
  {
    id: 'r8',
    author: 'Pérez',
    rating: 9,
    date: '2024-06-24',
    text: 'Muy acogedor y coqueto.',
    platform: 'booking',
    highlighted: false
  },
  {
    id: 'r9',
    author: 'Marta',
    rating: 10,
    date: '2024-09-08',
    text: 'Apartamento super limpio, no le falta detalle. Cumplió mis expectativas con creces.',
    platform: 'booking',
    highlighted: false
  },
  {
    id: 'r10',
    author: 'Irene',
    rating: 9,
    date: '2024-06-01',
    text: 'Limpieza y comodidad.',
    platform: 'booking',
    highlighted: false
  }
];
