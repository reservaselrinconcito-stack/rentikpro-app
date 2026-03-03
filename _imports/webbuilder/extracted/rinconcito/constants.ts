import { Apartment, BlogPost, GuideContent } from './types';

// Environment Variable Placeholders (Simulated for this environment)
export const ENV = {
  RENTIKPRO_API_BASE: (import.meta as any).env?.VITE_RENTIKPRO_API_BASE || 'https://api.mock-rentikpro.com',
  RENTIKPRO_WEB_BASE: (import.meta as any).env?.VITE_RENTIKPRO_WEB_BASE || 'https://rentikpro.com',
  OPEN_METEO_LAT: (import.meta as any).env?.VITE_OPEN_METEO_LAT || '40.8064', // Fuentespalda
  OPEN_METEO_LON: (import.meta as any).env?.VITE_OPEN_METEO_LON || '0.0642',
};

export const APARTMENTS: Apartment[] = [
  {
    id: '1',
    slug: 'el-olivo-centenario',
    name: 'El Olivo Centenario',
    shortDescription: 'Suite de lujo con vistas al valle y jacuzzi privado.',
    description: 'Experimenta la tranquilidad absoluta en nuestra suite premium. Diseñada para parejas que buscan una desconexión total. Cuenta con techos de madera restaurada, chimenea inteligente gestionada por RentikPro y un jacuzzi con vistas a los olivares.',
    price: 120,
    capacity: 2,
    rooms: 1,
    imageUrl: 'https://picsum.photos/800/600?random=1',
    features: ['Jacuzzi', 'Chimenea Smart', 'Wifi 5G', 'Cocina completa', 'Terraza privada'],
    rentikStatus: 'available'
  },
  {
    id: '2',
    slug: 'la-lavanda-familiar',
    name: 'La Lavanda',
    shortDescription: 'Espacio amplio para familias, rodeado de naturaleza.',
    description: 'Perfecto para familias o grupos pequeños. La Lavanda ofrece dos habitaciones dobles, un salón espacioso y acceso directo al jardín aromático. Sistema de check-in autónomo vía RentikPro.',
    price: 180,
    capacity: 4,
    rooms: 2,
    imageUrl: 'https://picsum.photos/800/600?random=2',
    features: ['Jardín privado', 'Barbacoa', 'Smart TV', 'Lavandería', 'Pet friendly'],
    rentikStatus: 'available'
  }
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    slug: 'ruta-parrizal-beceite',
    title: 'La Magia del Parrizal de Beceite',
    excerpt: 'Una ruta imprescindible de aguas cristalinas y pasarelas de madera.',
    content: 'El Parrizal de Beceite es una ruta senderista que discurre paralela al río Matarraña. Es ideal para todas las edades...',
    date: '2023-10-15',
    author: 'Maria G.',
    imageUrl: 'https://picsum.photos/800/400?random=3',
    category: 'Naturaleza'
  },
  {
    id: '2',
    slug: 'gastronomia-matarrana',
    title: 'Sabores de la Toscana Aragonesa',
    excerpt: 'Descubre el jamón de Teruel, el aceite de oliva y la trufa negra.',
    content: 'La comarca del Matarraña no solo es paisaje, es sabor. En Fuentespalda podrás degustar...',
    date: '2023-11-02',
    author: 'Chef Juan',
    imageUrl: 'https://picsum.photos/800/400?random=4',
    category: 'Gastronomía'
  }
];

export const GUIDES: Record<string, GuideContent> = {
  'calidad-aire': {
    slug: 'calidad-aire',
    title: 'Aire Puro y Salud',
    subtitle: 'Respira la diferencia en Fuentespalda',
    content: 'Gracias a nuestra ubicación privilegiada lejos de núcleos industriales, el índice de calidad del aire (AQI) se mantiene consistentemente por debajo de 20. Esto favorece la recuperación respiratoria, reduce el estrés y mejora la calidad del sueño. Monitorizamos esto en tiempo real gracias a los sensores IoT de RentikPro instalados en cada alojamiento.',
    imageUrl: 'https://picsum.photos/800/500?random=10'
  },
  'calidad-agua': {
    slug: 'calidad-agua',
    title: 'Agua de Manantial',
    subtitle: 'Hidratación natural directa de la montaña',
    content: 'El agua que llega a El Rinconcito proviene de manantiales de la sierra. Es agua de mineralización débil, perfecta para el consumo diario y con un sabor puro que ya no se encuentra en las ciudades.',
    imageUrl: 'https://picsum.photos/800/500?random=11'
  },
  'astroturismo': {
    slug: 'astroturismo',
    title: 'Cielos Starlight',
    subtitle: 'Un observatorio natural sin contaminación lumínica',
    content: 'Fuentespalda es un destino Starlight. Al caer la noche, la ausencia de contaminación lumínica permite observar la Vía Láctea a simple vista. Ofrecemos telescopios bajo petición gestionada desde tu app de huésped.',
    imageUrl: 'https://picsum.photos/800/500?random=12'
  },
  'eclipses': {
    slug: 'eclipses',
    title: 'Cazadores de Eclipses',
    subtitle: 'El lugar perfecto para eventos astronómicos',
    content: 'Consulta nuestro calendario de eventos astronómicos. La ubicación elevada de nuestros apartamentos ofrece un horizonte despejado para fotografiar amaneceres, atardeceres y eclipses.',
    imageUrl: 'https://picsum.photos/800/500?random=13'
  },
  'gastronomia': {
    slug: 'gastronomia',
    title: 'Ruta Gastronómica',
    subtitle: 'Del campo a la mesa',
    content: 'Te guiamos por los mejores restaurantes locales que utilizan productos Km 0. No te pierdas el ternasco de Aragón y los dulces tradicionales de almendra.',
    imageUrl: 'https://picsum.photos/800/500?random=14'
  }
};