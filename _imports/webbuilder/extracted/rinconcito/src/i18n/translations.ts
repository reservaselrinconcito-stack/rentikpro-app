/**
 * i18n Translations — El Rinconcito Matarraña
 * Multi-tenant: replace with per-tenant translations loaded from SiteConfig/CMS
 */

const es = {
  nav: {
    home: 'Inicio', apartments: 'Apartamentos', experiences: 'Experiencias',
    blog: 'Guías', contact: 'Contacto', comingSoon: 'Próximamente',
    book: 'Ver disponibilidad', availability: 'Disponibilidad',
  },
  hero: {
    title: 'Desconexión', subtitle: 'Rural Premium',
    desc: 'Tres apartamentos únicos en el corazón del Matarraña — la "Toscana española". Naturaleza, gastronomía, estrellas y aventura a tu medida.',
    cta_apartments: 'Ver alojamientos', cta_availability: 'Comprobar disponibilidad',
    badge_stars: 'Cielos Starlight', badge_price: 'Desde 90€/noche', badge_rating: '10/10 en Booking',
  },
  intro: {
    label: 'El Rinconcito',
    title: 'Tu hogar en el Matarraña',
    text: 'Tres apartamentos con personalidad propia, totalmente equipados, en Fuentespalda. A un paso del Parrizal, el Bike Park, la tirolina y los mejores cielos de Aragón.',
  },
  featured: {
    title: 'Alojamientos',
    subtitle: 'Cada apartamento es diferente. Todos comparten la misma obsesión por el detalle.',
    all: 'Ver todos', night: '/ noche', guests: 'pers.', rooms: 'hab.', from: 'Desde',
    approx_price: 'Precio por noche', check: 'Ver disponibilidad',
  },
  cta: {
    bookNow: 'Reservar ahora', checkAvailability: 'Ver disponibilidad',
    joinWaitlist: 'Avísame', viewDetails: 'Ver detalles',
    whatsapp: 'Chat en WhatsApp', contact: 'Contactar',
  },
  contact: {
    title: 'Contacto', header_title: 'Hablemos de tu próxima desconexión',
    header_desc: 'Toni y Evelyn te responden en menos de 24 horas.',
    subtitle: 'Nuestro equipo está aquí para que tu estancia sea perfecta.',
    form: {
      name: 'Tu nombre', email: 'Email o teléfono', message: '¿Cómo podemos ayudarte?',
      send: 'Enviar consulta', success: '¡Mensaje enviado! Te responderemos pronto.',
    },
    rentikNote: '¿Ayuda inmediata? Usa el chat — respuesta en segundos.',
  },
  footer: {
    desc: 'Apartamentos rurales con encanto en el corazón del Matarraña, Teruel.',
    explore: 'Explorar', legal: 'Legal', contact: 'Contacto',
    rights: 'Todos los derechos reservados.', poweredBy: 'Gestionado con',
  },
  tech: { poweredBy: 'Gestionado con RentikPro', realtime: 'Disponibilidad en tiempo real', badge: 'RentikPro' },
  widget: {
    loading: 'Cargando clima…', error: 'N/D', aqi: 'AQI',
    aqi_good: 'Aire puro', aqi_fair: 'Aceptable', aqi_moderate: 'Moderado', aqi_poor: 'Malo',
    wind: 'Viento', humidity: 'Humedad', kmh: 'km/h',
  },
  apartments: {
    page_title: 'Nuestros Apartamentos',
    page_subtitle: 'Cada espacio tiene su carácter. Todos comparten el amor por el detalle y el entorno único del Matarraña.',
    cta_chat: '¿Dudas? Habla con el asistente', doubts_title: '¿Tienes alguna duda?',
    doubts_desc: 'Nuestro equipo está para ayudarte a elegir el apartamento perfecto.',
    from_price: 'Desde',
  },
  price: {
    from: 'Desde',
    perNight: '/noche',
    ask: 'Consultar precio',
    note: 'Precio orientativo, puede variar según fechas',
  },
  calendar: {
    realtime_label: '⚡ Disponibilidad en tiempo real', powered_by: 'Sincronizado con RentikPro',
    select_dates: 'Selecciona tus fechas', nights: 'noche', nights_plural: 'noches',
    request_booking: 'Solicitar reserva', available: 'Disponible', selected: 'Seleccionado',
    occupied: 'Ocupado', loading: 'Actualizando…', ask_dates: '¿Dudas con las fechas? Preguntar al asistente',
  },
  experiences: {
    page_title: 'Experiencias en el Matarraña', page_subtitle: 'Descubre todo lo que la comarca tiene para ofrecerte.',
    category_all: 'Todas', category_aire: 'Naturaleza', category_bano: 'Baño',
    category_cultural: 'Cultural', category_gastro: 'Gastronomía',
    category_deportivo: 'Deporte', category_estrellas: 'Estrellas',
  },
  guides: {
    page_title: 'Guías del Matarraña',
    page_subtitle: 'Todo lo que necesitas saber para aprovechar al máximo tu visita.',
    safety_title: 'Información importante', faq_title: 'Preguntas frecuentes',
    sources_title: 'Fuentes', doubts: '¿Tienes dudas sobre tu viaje?',
    capacity_plazas: 'plazas', bedrooms_hab: 'hab.',
  },
  rentik: {
    hero_tag: 'Tecnología para alojamientos rurales',
    hero_title: 'La tecnología invisible de tu descanso',
    hero_desc: 'RentikPro gestiona El Rinconcito Matarraña desde el primer contacto hasta el check-out. Calendarios sincronizados, comunicación unificada y automatizaciones que trabajan mientras tú descansas.',
    benefits_title: 'Por qué RentikPro marca la diferencia',
    benefits_desc: 'Cada huésped que llega a El Rinconcito ha tenido una experiencia de reserva fluida. Eso no ocurre por casualidad.',
    features: {
      calendar_title: 'Calendario en tiempo real',
      calendar_desc: 'Sincronización instantánea con Booking, Airbnb y reservas directas. Cero overbookings.',
      inbox_title: 'Buzón unificado',
      inbox_desc: 'WhatsApp, email y mensajes de plataformas en un único hilo. Nunca pierdas una consulta.',
      bot_title: 'Asistente inteligente 24/7',
      bot_desc: 'Responde consultas, envía instrucciones de llegada y gestiona incidencias a cualquier hora.',
      checkin_title: 'Check-in 100% digital',
      checkin_desc: 'El huésped recibe sus accesos por WhatsApp antes de llegar. Sin llaves físicas, sin esperas.',
    },
    frictionless_title: 'Gestión sin fricción para propietarios',
    frictionless_desc: 'RentikPro se encarga de la logística para que tú te enfoques en crear experiencias.',
    feature_1: 'Sincronización automática de precios y disponibilidad',
    feature_2: 'Notificaciones y recordatorios automatizados al huésped',
    feature_3: 'Informes de ocupación y revenue en tiempo real',
    feature_4: 'Soporte técnico especializado en alojamientos rurales',
    inbox_title_short: 'Inbox unificado', inbox_note: 'Todos tus canales. Un solo lugar.',
    owner_title: '¿Tienes un alojamiento rural?',
    owner_desc: 'Descubre cómo RentikPro puede transformar la gestión de tu propiedad.',
    cta_visit: 'Visitar RentikPro', cta_ask: 'Hablar con el equipo',
    cta_all_tools: 'Ver todas las funcionalidades', cta_try_free: 'Probar gratis',
    cta_talk_expert: 'Hablar con un experto',
    demo_note: 'Esta web es un ejemplo real de lo que RentikPro Create Web puede construir para tu alojamiento.',
  },
  masMatarrana: {
    label: 'Próximamente', title: 'Mas Matarraña',
    desc: 'Dos nuevos lofts rurales entre olivos centenarios en Valjunquera. Privacidad total, cielos estrellados y la esencia más pura del Matarraña.',
    cta: 'Avisarme cuando abra',
    features: ['Terreno privado con olivos', 'Cielo sin contaminación lumínica', 'A 30 min de El Rinconcito'],
  },
};

const en: typeof es = {
  nav: {
    home: 'Home', apartments: 'Apartments', experiences: 'Experiences',
    blog: 'Guides', contact: 'Contact', comingSoon: 'Coming Soon',
    book: 'Check Availability', availability: 'Availability',
  },
  hero: {
    title: 'Rural', subtitle: 'Premium Retreat',
    desc: 'Three unique apartments in the heart of Matarraña — the "Spanish Tuscany". Nature, gastronomy, starry skies and adventure.',
    cta_apartments: 'View accommodations', cta_availability: 'Check availability',
    badge_stars: 'Starlight Skies', badge_price: 'From €90/night', badge_rating: '10/10 on Booking',
  },
  intro: {
    label: 'El Rinconcito', title: 'Your home in Matarraña',
    text: 'Three fully-equipped apartments in Fuentespalda. Steps from the Parrizal gorge, Bike Park, zipline and the clearest skies in Aragon.',
  },
  featured: {
    title: 'Accommodations', subtitle: 'Every apartment is different. All share the same obsession for detail.',
    all: 'See all', night: '/ night', guests: 'guests', rooms: 'bed.', from: 'From',
    approx_price: 'Price per night', check: 'Check availability',
  },
  cta: {
    bookNow: 'Book now', checkAvailability: 'Check availability', joinWaitlist: 'Notify me',
    viewDetails: 'View details', whatsapp: 'Chat on WhatsApp', contact: 'Contact us',
  },
  contact: {
    title: 'Contact', header_title: "Let's plan your next escape",
    header_desc: 'Toni & Evelyn respond within 24 hours.',
    subtitle: 'Our team is here to make your stay perfect.',
    form: { name: 'Your name', email: 'Email or phone', message: 'How can we help you?', send: 'Send enquiry', success: 'Message sent! We will get back to you soon.' },
    rentikNote: 'Need immediate help? Use the chat widget.',
  },
  footer: {
    desc: 'Charming rural apartments in the heart of Matarraña, Teruel.',
    explore: 'Explore', legal: 'Legal', contact: 'Contact', rights: 'All rights reserved.', poweredBy: 'Managed with',
  },
  tech: { poweredBy: 'Powered by RentikPro', realtime: 'Real-time availability', badge: 'RentikPro' },
  widget: {
    loading: 'Loading weather…', error: 'N/A', aqi: 'AQI',
    aqi_good: 'Fresh air', aqi_fair: 'Acceptable', aqi_moderate: 'Moderate', aqi_poor: 'Poor',
    wind: 'Wind', humidity: 'Humidity', kmh: 'km/h',
  },
  apartments: {
    page_title: 'Our Apartments',
    page_subtitle: 'Each space has its own character. All share the love for detail and the unique Matarraña environment.',
    cta_chat: 'Questions? Chat with the assistant', doubts_title: 'Have any questions?',
    doubts_desc: 'Our team is here to help you find the perfect apartment.',    from_price: 'From',
  },
  price: {
    from: 'From',
    perNight: '/night',
    ask: 'Ask for price',
    note: 'Approximate price, may vary by dates',
  },
  calendar: {
    realtime_label: '⚡ Real-time availability', powered_by: 'Synced with RentikPro',
    select_dates: 'Select your dates', nights: 'night', nights_plural: 'nights',
    request_booking: 'Request booking', available: 'Available', selected: 'Selected',
    occupied: 'Occupied', loading: 'Updating…', ask_dates: 'Unsure about dates? Ask the assistant',
  },
  experiences: {
    page_title: 'Experiences in Matarraña', page_subtitle: 'Discover everything the region has to offer.',
    category_all: 'All', category_aire: 'Nature', category_bano: 'Swimming',
    category_cultural: 'Cultural', category_gastro: 'Gastronomy',
    category_deportivo: 'Sport', category_estrellas: 'Stargazing',
  },
  guides: {
    page_title: 'Matarraña Travel Guides', page_subtitle: 'Everything you need to know to make the most of your visit.',
    safety_title: 'Important information', faq_title: 'Frequently asked questions',
    sources_title: 'Sources', doubts: 'Have questions about your trip?',
    capacity_plazas: 'guests', bedrooms_hab: 'bed.',
  },
  rentik: {
    hero_tag: 'Technology for rural accommodations',
    hero_title: 'The invisible technology behind your stay',
    hero_desc: 'RentikPro manages El Rinconcito Matarraña from first contact to checkout.',
    benefits_title: 'Why RentikPro makes the difference',
    benefits_desc: 'Every guest has had a seamless booking experience. That does not happen by chance.',
    features: {
      calendar_title: 'Real-time calendar', calendar_desc: 'Instant sync with Booking, Airbnb and direct reservations.',
      inbox_title: 'Unified inbox', inbox_desc: 'WhatsApp, email and platform messages in one thread.',
      bot_title: '24/7 smart assistant', bot_desc: 'Answers queries and handles incidents at any hour.',
      checkin_title: '100% digital check-in', checkin_desc: 'Guests receive access via WhatsApp. No physical keys.',
    },
    frictionless_title: 'Friction-free management for owners',
    frictionless_desc: 'Let technology handle the logistics so you focus on creating experiences.',
    feature_1: 'Automatic price and availability synchronization',
    feature_2: 'Automated notifications and reminders',
    feature_3: 'Real-time occupancy and revenue reports',
    feature_4: 'Specialized technical support for rural accommodations',
    inbox_title_short: 'Unified inbox', inbox_note: 'All your channels. One place.',
    owner_title: 'Do you own a rural accommodation?',
    owner_desc: 'Discover how RentikPro can transform your property management.',
    cta_visit: 'Visit RentikPro', cta_ask: 'Talk to the team', cta_all_tools: 'See all features',
    cta_try_free: 'Try for free', cta_talk_expert: 'Talk to an expert',
    demo_note: 'This website is a live example of what RentikPro Create Web can build for your accommodation.',
  },
  masMatarrana: {
    label: 'Coming Soon', title: 'Mas Matarraña',
    desc: 'Two new rural lofts among century-old olive trees in Valjunquera. Complete privacy and starry skies.',
    cta: 'Notify me when it opens',
    features: ['Private land with olive trees', 'Zero light pollution', '30 min from El Rinconcito'],
  },
};

export const translations = { es, en, ca: es, fr: es, de: es, nl: es };
export { es, en };
export default translations;
