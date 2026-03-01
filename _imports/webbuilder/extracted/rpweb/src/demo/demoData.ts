/**
 * demo/demoData.ts — Datos de demostración para modo sin API.
 *
 * Se usan cuando:
 *  - No hay slug en la URL
 *  - El slug "pepito" / "demo" es explícito
 *  - La API falla en producción
 *
 * Siempre devuelven datos completos, nunca null.
 */

import type { DomainProperty, DomainApartment, DomainAvailability } from '../domain/types';

export const DEMO_PROPERTY: DomainProperty = {
  slug: 'demo',
  propertyId: 'demo',
  name: 'Alojamiento Rural Demo',
  shortName: 'Demo Rural',
  slogan: 'Descansa en la naturaleza — Modo demostración',
  email: 'info@rentikpro.com',
  phone: '+34 900 000 000',
  phoneRaw: '34900000000',
  logoUrl: null,
  location: {
    town: 'Valle del Demo',
    province: 'Provincia Demo',
    country: 'ES',
    lat: 40.8069,
    lon: 0.0639,
  },
  social: {
    instagram: null,
    facebook: null,
    whatsapp: null,
    googleMaps: null,
  },
  theme: {
    themeId: 'rural-warm',
    primaryColor: 'orange',
  },
  locale: 'es',
  siteUrl: window.location.origin,
};

export const DEMO_APARTMENTS: DomainApartment[] = [
  {
    id: 'demo-apt-1',
    slug: 'apartamento-sierra',
    name: 'Apartamento Sierra',
    description: 'Acogedor apartamento con vistas a las montañas, perfecto para desconectar.',
    longDescription:
      'Un espacio luminoso y tranquilo rodeado de naturaleza. Cocina completamente equipada, salón con chimenea y terraza privada con vistas panorámicas a la sierra.',
    capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    sizeM2: 65,
    priceFrom: 90,
    photos: [],
    highlights: ['Terraza con vistas', 'Chimenea', 'Cocina equipada', 'Wi-Fi gratuito'],
    status: 'active',
  },
  {
    id: 'demo-apt-2',
    slug: 'suite-valle',
    name: 'Suite Valle',
    description: 'Suite de lujo con jacuzzi privado y jardín exclusivo.',
    longDescription:
      'La experiencia más exclusiva de nuestro alojamiento. Jacuzzi exterior privado, jardín vallado y acabados de primera calidad para una escapada romántica o familiar.',
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    sizeM2: 45,
    priceFrom: 130,
    photos: [],
    highlights: ['Jacuzzi privado', 'Jardín exclusivo', 'Desayuno incluido', 'Cama king size'],
    status: 'active',
  },
  {
    id: 'demo-apt-3',
    slug: 'casa-rio',
    name: 'Casa del Río',
    description: 'Amplia casa rural junto al río, ideal para grupos y familias numerosas.',
    longDescription:
      'Con acceso directo al río y capacidad para 8 personas, esta casa rural es perfecta para reuniones familiares. Amplio jardín, barbacoa y zona de juegos para niños.',
    capacity: 8,
    bedrooms: 4,
    bathrooms: 2,
    sizeM2: 120,
    priceFrom: 200,
    photos: [],
    highlights: ['Acceso al río', 'Barbacoa', 'Zona infantil', 'Aparcamiento privado'],
    status: 'active',
  },
];

// Genera disponibilidad demo para los próximos 90 días
function generateDemoAvailability(): DomainAvailability {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 90);

  const apartments = DEMO_APARTMENTS.map((apt) => {
    const days = [];
    const cursor = new Date(from);

    while (cursor <= to) {
      const dayOfWeek = cursor.getDay();
      const dateStr = cursor.toISOString().split('T')[0];

      // ~25% de días ocupados para que parezca real
      const isAvailable = Math.random() > 0.25;
      const minNights = dayOfWeek === 5 || dayOfWeek === 6 ? 2 : 1; // Fines de semana: 2 noches mínimo

      days.push({ date: dateStr, isAvailable, minNights, price: null });
      cursor.setDate(cursor.getDate() + 1);
    }

    return { apartmentSlug: apt.slug, days };
  });

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    apartments,
  };
}

export const DEMO_AVAILABILITY: DomainAvailability = generateDemoAvailability();
