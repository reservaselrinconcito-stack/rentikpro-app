export type ExperienceCategory = 'gastronomia' | 'estrellas' | 'aire_y_agua' | 'zonas_de_bano' | 'cultural' | 'deportivo';

export interface Experience {
  slug: string;
  title: string;
  category: ExperienceCategory;
  town: string;
  area: string;
  shortSummary: string;
  highlights: string[];
  practicalInfo: string[];
  seasonality: string;
  tags: string[];
  sources: string[];
  photos: string[];
  featured?: boolean;
}

export const EXPERIENCES: Experience[] = [
  {
    slug: 'bike-park-fuentespalda',
    title: 'Matarraña Bike Park & Dirt Park',
    category: 'deportivo',
    town: 'Fuentespalda',
    area: 'Fuentespalda',
    shortSummary: 'El nuevo centro BTT de referencia del Matarraña con 5 líneas de descenso y un dirt park para saltos de todos los niveles, inaugurado en 2026.',
    highlights: [
      '5 líneas de descenso de 2.2 a 2.6 km con 290 m de desnivel negativo',
      'Dirt Park con 4 líneas de saltos: tabletops, ramps y gaps para todos los niveles',
      'Elementos técnicos: peraltes, drops, wallrides y pasarelas de madera',
      'Acceso libre 365 días al año sin necesidad de reserva',
      'A 10 min caminando desde El Rinconcito — podemos prestarte un mapa'
    ],
    practicalInfo: [
      'Inauguración oficial: 28 de febrero de 2026 a las 11:00h',
      'Ubicación: Explanada del Camping de Fuentespalda (señalizado)',
      'Acceso libre y gratuito todo el año',
      'Casco y protecciones obligatorias en las líneas técnicas',
      'Desde El Rinconcito: 5 minutos en coche, 15 minutos a pie'
    ],
    seasonality: 'Abierto todo el año',
    tags: ['MTB', 'Descenso', 'Adrenalina', 'Gratis', 'Fuentespalda'],
    sources: [
      'https://www.comarcamatarranya.es',
      'https://www.matarranyaturismo.es',
      'https://www.lacomarca.net'
    ],
    photos: [
      '/assets/experiences/bike-park-fuentespalda/principal/foto.jpg',
      '/assets/experiences/bike-park-fuentespalda/galeria/1.jpg',
      '/assets/experiences/bike-park-fuentespalda/galeria/2.jpg',
      '/assets/experiences/bike-park-fuentespalda/galeria/3.jpg',
      '/assets/experiences/bike-park-fuentespalda/galeria/4.jpg',
      '/assets/experiences/bike-park-fuentespalda/galeria/5.jpg',
    ],
    featured: true
  },
  {
    slug: 'tirolina-fuentespalda-experiencia',
    title: 'Tirolina de Fuentespalda',
    category: 'deportivo',
    town: 'Fuentespalda',
    area: 'Fuentespalda',
    shortSummary: 'La tirolina doble más larga de Europa con casi 2 kilómetros de vuelo sobre los paisajes del Matarraña. Reapertura prevista para verano 2026.',
    highlights: [
      'Casi 2 km de longitud total — la tirolina doble más larga de Europa',
      'Doble cable para volar en pareja simultáneamente',
      'Vistas panorámicas únicas del valle del Matarraña',
      'Salida desde lo alto de la montaña hacia el fondo del valle',
      'A 5 minutos de El Rinconcito — una experiencia de 10 que recordarás siempre'
    ],
    practicalInfo: [
      'Estado: Cerrada temporalmente por mejoras en el entorno',
      'Reapertura prevista: Verano 2026 (julio/agosto)',
      'Precio estimado: Consultar al abrir (en torno a 30-40€ por persona)',
      'Edad/peso mínimos: Se publicarán en la reapertura',
      'Reserva previa: Necesaria tras la reapertura'
    ],
    seasonality: 'Estacional (Reapertura Verano 2026)',
    tags: ['Aventura', 'Vistas', 'Adrenalina', 'Fuentespalda'],
    sources: [
      'https://www.heraldo.es',
      'https://www.diariodeteruel.es',
      'https://www.matarranyaturismo.es'
    ],
    photos: [
      '/assets/experiences/tirolina-fuentespalda-experiencia/principal/foto.jpg',
      '/assets/experiences/tirolina-fuentespalda-experiencia/galeria/1.jpg',
    ],
    featured: true
  },
  {
    slug: 'parrizal-beceite-ruta',
    title: 'Ruta del Parrizal de Beceite',
    category: 'aire_y_agua',
    town: 'Beceite',
    area: 'Puertos de Beceite',
    shortSummary: 'La ruta más icónica del Matarraña. Caminas sobre pasarelas de madera ancladas en la roca, suspendido sobre aguas turquesas, hasta llegar a un cañón de 60 m de altura y apenas 1,5 m de ancho.',
    highlights: [
      'Pasarelas de madera ancladas a la roca sobre las cristalinas aguas del río Matarraña',
      'Los Estrets del Parrissal: cañón de 200 m de largo, 60 m de alto y solo 1,5 m de ancho',
      'Pinturas rupestres de La Fenellassa (Patrimonio de la Humanidad)',
      'Tuéneles excavados en la roca del antiguo camino minero',
      '8 km (ida y vuelta) de dificultad baja-media, apta para niños desde 6 años'
    ],
    practicalInfo: [
      'Ticket obligatorio por persona: 5€/adulto, gratis menores 14 años. Compra online en beceite.es',
      'Parking gratuito (P3) incluido al comprar el ticket — indica tu matrícula',
      'Horario temporada alta (29 marzo–13 sept.): turno mañana 9-14h o tarde 15-20h',
      'Horario resto del año: 9-18h (entrada hasta las 14/15h)',
      'Prohibido el baño (reserva de agua potable) y el acceso con perros',
      'Calzado de trekking imprescindible — las pasarelas pueden estar resbaladizas'
    ],
    seasonality: 'Todo el año (Mejor primavera y otoño; verano puede bajar el caudal)',
    tags: ['Senderismo', 'Naturaleza', 'Imprescindible', 'Familia', 'Beceite'],
    sources: [
      'https://www.beceite.es',
      'https://www.matarranyaturismo.es',
      'https://www.guiarepsol.com/es/viajar/vamos-de-excursion/ruta-parrizal-beceite-teruel/'
    ],
    photos: [
      '/assets/experiences/parrizal-beceite-ruta/principal/foto.jpg',
      '/assets/experiences/parrizal-beceite-ruta/galeria/1.jpg',
      '/assets/experiences/parrizal-beceite-ruta/galeria/2.jpg',
      '/assets/experiences/parrizal-beceite-ruta/galeria/3.jpg',
      '/assets/experiences/parrizal-beceite-ruta/galeria/4.jpg',
      '/assets/experiences/parrizal-beceite-ruta/galeria/5.jpg',
    ],
    featured: true
  },
  {
    slug: 'pesquera-beceite-bano',
    title: 'La Pesquera de Beceite — 15 Pozas Naturales',
    category: 'zonas_de_bano',
    town: 'Beceite',
    area: 'Puertos de Beceite',
    shortSummary: 'El paraíso acuático del Matarraña: 15 pozas naturales ("tolls") de agua turquesa talladas por el río Ulldemó en la roca calcárea. La zona de baño más espectacular de Teruel.',
    highlights: [
      '15 pozas naturales numeradas con aguas turquesas y fondos de roca',
      '5 km de recorrido junto al río Ulldemó entre helechos, arces y pinos',
      'Pozas de diferentes tamaños: desde remansos familiares hasta tolls profundos para saltar',
      'Entorno protegido como ZEC de los Puertos de Beceite',
      'También practicable en bici o a pie desde Beceite (3 km)'
    ],
    practicalInfo: [
      'Temporada regulada 2025: 21 junio – 31 agosto. Ticket de coche ~10€ en turismo.beceite.es',
      'Dos turnos de visita en verano: mañana (9-14h) o tarde (15-20h)',
      'Fuera de temporada: acceso libre y gratuito sin horario limitado',
      'Prohibido el acceso con perros durante la temporada regulada (junio-agosto)',
      'Imprescindible escarpines — las rocas son resbaladizas',
      'Desde El Rinconcito: 25 minutos en coche'
    ],
    seasonality: 'Todo el año (mejor mayo-septiembre para el baño)',
    tags: ['Baño', 'Pozas', 'Familia', 'Naturaleza', 'Beceite'],
    sources: [
      'https://www.beceite.es/turismo/rutas-por-beceite/parrizal-pesquera-pantano-de-pena/2-pesquera/',
      'https://campingelroble.com/zonas-de-bano/las-pesqueras/'
    ],
    photos: [
      '/assets/experiences/pesquera-beceite-bano/principal/foto.jpg',
      '/assets/experiences/pesquera-beceite-bano/galeria/1.jpg',
      '/assets/experiences/pesquera-beceite-bano/galeria/2.jpg',
      '/assets/experiences/pesquera-beceite-bano/galeria/3.jpg',
      '/assets/experiences/pesquera-beceite-bano/galeria/4.jpg',
      '/assets/experiences/pesquera-beceite-bano/galeria/5.jpg',
    ],
    featured: true
  },
  {
    slug: 'observatorio-buitres-mas-de-bunyol',
    title: 'Observatorio de Buitres — Mas de Bunyol',
    category: 'aire_y_agua',
    town: 'Valderrobres',
    area: 'Valderrobres',
    shortSummary: 'Una experiencia única: ver cientos de buitres leonados aterrizar a pocos metros de ti. Uno de los mejores avistamientos de fauna silvestre de España.',
    highlights: [
      'Cientos de buitres leonados que llegan a comer a escasos metros de los visitantes',
      'Posibilidad de ver alimoches y águilas reales según temporada',
      'Explicación apasionada sobre la biología y comportamiento de estas aves',
      'Escondite fotográfico (hide) habilitado para fotógrafos de naturaleza',
      'Actividad perfecta para niños — emocionante y completamente segura'
    ],
    practicalInfo: [
      'Reserva previa imprescindible: contacta con Mas de Bunyol directamente',
      'Duración aproximada: 2-3 horas',
      'Respetar silencio absoluto durante la alimentación',
      'Ropa de colores neutros (marrones, verdes, grises)',
      'Desde El Rinconcito: 20 minutos en coche'
    ],
    seasonality: 'Todo el año (mayor actividad en invierno y primavera)',
    tags: ['Naturaleza', 'Fauna', 'Fotografía', 'Niños', 'Aves'],
    sources: [
      'https://www.masdebunyol.com',
      'https://www.matarranyaturismo.es'
    ],
    photos: [
      '/assets/experiences/observatorio-buitres-mas-de-bunyol/principal/foto.jpg',
      '/assets/experiences/observatorio-buitres-mas-de-bunyol/galeria/1.jpg',
      '/assets/experiences/observatorio-buitres-mas-de-bunyol/galeria/2.jpg',
      '/assets/experiences/observatorio-buitres-mas-de-bunyol/galeria/3.jpg',
      '/assets/experiences/observatorio-buitres-mas-de-bunyol/galeria/4.jpg',
      '/assets/experiences/observatorio-buitres-mas-de-bunyol/galeria/5.jpg',
    ],
    featured: true
  },
  {
    slug: 'valderrobres-castillo-medieval',
    title: 'Valderrobres — El Castillo de Cuento de Hadas',
    category: 'cultural',
    town: 'Valderrobres',
    area: 'Valderrobres',
    shortSummary: 'El pueblo más bonito del Matarraña. Cruza el puente medieval sobre el río y sube hasta el castillo-palacio del siglo XIV unido a la iglesia gótica de Santa María — una estampa que parece sacada de un libro.',
    highlights: [
      'Puente de piedra medieval sobre el río Matarraña — la foto más icónica de la comarca',
      'Castillo-Palacio del s. XIV con mazmorras, salones nobiliarios y vistas panorámicas desde las almenas',
      'Iglesia gótica de Santa María la Mayor — uno de los mejores góticos levantinos de Aragón',
      'Conjunto histórico Bien de Interés Cultural y miembro de Los Pueblos más Bonitos de España',
      'Plaza de España con el Ayuntamiento renacentista rodeado de casas palaciegas'
    ],
    practicalInfo: [
      'Visita guiada al Castillo + Iglesia + Museo: 8€/adulto, 6€ jubilados. Visita teatralizada: +2€',
      'Tel. Fundación Valderrobres Patrimonial: 649 686 311 / 630 887 559',
      'Dirección: Calle La Paz, 7, Valderrobres',
      'Imprescindible calzado cómodo — las calles son empedradas y con pendiente',
      'Desde El Rinconcito: 15 minutos en coche'
    ],
    seasonality: 'Todo el año',
    tags: ['Historia', 'Castillo', 'Pueblos Bonitos', 'Familia', 'Fotografía'],
    sources: [
      'https://castillovalderrobres.com',
      'https://www.valderrobres.es',
      'https://www.turismodearagon.com/ficha/valderrobres/'
    ],
    photos: [
      '/assets/experiences/valderrobres-castillo-medieval/principal/foto.jpg',
      '/assets/experiences/valderrobres-castillo-medieval/galeria/1.jpg',
      '/assets/experiences/valderrobres-castillo-medieval/galeria/2.jpg',
      '/assets/experiences/valderrobres-castillo-medieval/galeria/3.jpg',
      '/assets/experiences/valderrobres-castillo-medieval/galeria/4.jpg',
      '/assets/experiences/valderrobres-castillo-medieval/galeria/5.jpg',
    ],
    featured: false
  },
  {
    slug: 'calaceite-iberos-cultura',
    title: 'Calaceite — Capital Cultural del Matarraña',
    category: 'cultural',
    town: 'Calaceite',
    area: 'Calaceite',
    shortSummary: 'Un pueblo de piedra dorada donde se alojaron García Márquez y Vargas Llosa. Callejea por su casco histórico de Bien de Interés Cultural, visita los poblados íberos y termina en la terraza de la plaza.',
    highlights: [
      'Casco histórico BIC con casas señoriales de piedra y Plaza de España porticada',
      'Poblado ibérico de San Antonio (a 2 km) — imprescindible para los amantes de la historia',
      'Museo Joan Cabré de arqueología ibérica — entrada gratuita',
      'Antigua cárcel del siglo XVI con grafitis originales de los presos',
      'Fue refugio del Boom Latinoamericano: García Márquez, Vargas Llosa y Fuentes pasearon aquí'
    ],
    practicalInfo: [
      'Museo Joan Cabré: gratuito, horario del Gobierno de Aragón (consultar en turismo local)',
      'Oficina de Turismo de Calaceite para visitas guiadas a la cárcel',
      'El casco antiguo es completamente peatonal — aparca en las zonas habilitadas',
      'Recomendamos combinar con vermut en la Plaza de España',
      'Desde El Rinconcito: 25 minutos en coche'
    ],
    seasonality: 'Todo el año',
    tags: ['Historia', 'Íberos', 'Arqueología', 'Cultura', 'Pueblos Bonitos'],
    sources: [
      'https://www.calaceite.es',
      'https://www.escapadarural.com/blog/5-pueblos-imprescindibles-de-matarrana/'
    ],
    photos: [
      '/assets/experiences/calaceite-iberos-cultura/principal/foto.jpg',
      '/assets/experiences/calaceite-iberos-cultura/galeria/1.jpg',
      '/assets/experiences/calaceite-iberos-cultura/galeria/2.jpg',
      '/assets/experiences/calaceite-iberos-cultura/galeria/3.jpg',
      '/assets/experiences/calaceite-iberos-cultura/galeria/4.jpg',
      '/assets/experiences/calaceite-iberos-cultura/galeria/5.jpg',
    ],
    featured: false
  },
  {
    slug: 'salt-de-la-portellada',
    title: 'El Salt de La Portellada',
    category: 'zonas_de_bano',
    town: 'La Portellada',
    area: 'La Portellada',
    shortSummary: 'Una cascada de 20 metros que cae entre una gran cueva y rocas blancas casi lunares. En primavera y otoño, el espectáculo es hipnótico.',
    highlights: [
      'Cascada de 20 metros del río Tastavins rodeada de formaciones rocosas blancas casi lunares',
      'Gran cueva lateral que enmarca el salto de agua desde arriba y desde abajo',
      'Poza inferior con baño posible en época de buenos caudales',
      'Entorno de gran serenidad con escasa afluencia de visitantes',
      'Paisaje estilo "Grand Canyon en miniatura" — espectacular para fotografía'
    ],
    practicalInfo: [
      'Acceso por pista forestal desde La Portellada — apta para turismos (ir despacio)',
      'Parking en zona habilitada junto a la pista',
      'Caudal muy variable: en verano puede ir escaso. Mejor visita en primavera y otoño',
      'No hay servicios — llevar agua y calzado de trekking',
      'Desde El Rinconcito: 30 minutos en coche'
    ],
    seasonality: 'Primavera y otoño (mejor caudal)',
    tags: ['Cascada', 'Naturaleza', 'Fotografía', 'Tranquilidad'],
    sources: [
      'https://www.matarranyaturismo.es',
      'https://www.aragondigital.es/articulo/teruel/lsa-mejores-pozas-piscinas-naturales-teruel/20240704090000878781.html'
    ],
    photos: [
      '/assets/experiences/salt-de-la-portellada/principal/foto.jpg',
      '/assets/experiences/salt-de-la-portellada/galeria/1.jpg',
      '/assets/experiences/salt-de-la-portellada/galeria/2.jpg',
      '/assets/experiences/salt-de-la-portellada/galeria/3.jpg',
      '/assets/experiences/salt-de-la-portellada/galeria/4.jpg',
      '/assets/experiences/salt-de-la-portellada/galeria/5.jpg',
    ],
    featured: false
  },
  {
    slug: 'pantano-pena-kayak',
    title: 'Pantano de la Pena — El Mar del Matarraña',
    category: 'zonas_de_bano',
    town: 'Beceite',
    area: 'Puertos de Beceite',
    shortSummary: 'Un embalse centenario de aguas azules apodado "el mar del Matarraña". Playas fluviales, kayak, pesca y paseos entre la vegetación mediterránea a los pies de los Puertos.',
    highlights: [
      'Aguas azules cristalinas para bañarse en "playas" de piedra y arena',
      'Kayak y paddle surf en alquiler en temporada',
      'Pesca deportiva de truchas y black bass (con licencia)',
      'Rutas de senderismo y BTT que rodean el embalse con vistas espectaculares',
      'Atardeceres de escándalo con el reflejo de los Puertos en el agua'
    ],
    practicalInfo: [
      'Acceso libre y gratuito todo el año',
      'Alquiler de kayak disponible en verano (consultar operadores locales en Beceite)',
      'Desde El Rinconcito: 30 minutos en coche',
      'Zona menos masificada que la Pesquera — perfecta para un día tranquilo'
    ],
    seasonality: 'Todo el año (baño en verano)',
    tags: ['Baño', 'Kayak', 'Pesca', 'Relax', 'Beceite'],
    sources: [
      'https://campingelroble.com/zonas-de-bano/',
      'https://www.aragondigital.es/articulo/teruel/lsa-mejores-pozas-piscinas-naturales-teruel/20240704090000878781.html'
    ],
    photos: [
      '/assets/experiences/pantano-pena-kayak/principal/foto.jpg',
      '/assets/experiences/pantano-pena-kayak/galeria/1.jpg',
      '/assets/experiences/pantano-pena-kayak/galeria/2.jpg',
      '/assets/experiences/pantano-pena-kayak/galeria/3.jpg',
      '/assets/experiences/pantano-pena-kayak/galeria/4.jpg',
      '/assets/experiences/pantano-pena-kayak/galeria/5.jpg',
    ],
    featured: false
  },
  {
    slug: 'cielos-nocturnos-matarrana',
    title: 'Astroturismo — Vía Láctea sin contaminación lumínica',
    category: 'estrellas',
    town: 'Fuentespalda',
    area: 'Matarraña',
    shortSummary: 'La escasa contaminación lumínica del Matarraña regala cielos nocturnos de primer nivel. Desde El Rinconcito, la Vía Láctea se ve a simple vista en noches despejadas.',
    highlights: [
      'Vía Láctea visible a simple vista en noches de Luna Nueva desde Fuentespalda',
      'La comarca alberga el Hotel Starlight Torre del Visco — primer Relais Chateaux certificado Starlight',
      'Mirador de Punta Molinera (Fuentespalda) — uno de los mejores puntos de observación',
      'Constelaciones, planetas y lluvia de estrellas en noches especialmente limpias',
      'Temperatura ideal para observar: fresquito incluso en verano (llevar chaqueta)'
    ],
    practicalInfo: [
      'Mejor época: Noches de Luna Nueva (consulta el calendario lunar antes de venir)',
      'Mejor hora: A partir de las 23h en verano, 21h en invierno',
      'Herramienta recomendada: App "Stellarium" (gratuita) para identificar constelaciones',
      'Llevar linterna de luz roja (mantiene la adaptación de la vista a la oscuridad)',
      'Desde El Rinconcito basta con salir al campo — a 5 min hay cielo oscuro total'
    ],
    seasonality: 'Todo el año (mejor en noches de Luna Nueva)',
    tags: ['Estrellas', 'Astroturismo', 'Naturaleza', 'Romántico', 'Fotografia'],
    sources: [
      'https://turismodeestrellas.com/noticias/destinos/3955-alojamientos-starlight-en-la-provincia-de-teruel.html',
      'https://www.turismodearagon.com'
    ],
    photos: [
      '/assets/experiences/cielos-nocturnos-matarrana/principal/foto.jpg',
      '/assets/experiences/cielos-nocturnos-matarrana/galeria/1.jpg',
      '/assets/experiences/cielos-nocturnos-matarrana/galeria/2.jpg',
      '/assets/experiences/cielos-nocturnos-matarrana/galeria/3.jpg',
      '/assets/experiences/cielos-nocturnos-matarrana/galeria/4.jpg',
      '/assets/experiences/cielos-nocturnos-matarrana/galeria/5.jpg',
    ],
    featured: true
  },
  {
    slug: 'cata-aceite-oleoturismo',
    title: 'Oleoturismo — Cata de Aceite D.O. Bajo Aragón',
    category: 'gastronomia',
    town: 'Valderrobres',
    area: 'Matarraña',
    shortSummary: 'El oro líquido del Matarraña: el aceite Empeltre del Bajo Aragón es uno de los mejores del mundo. Visita una almazara, aprende a catar y llévate el mejor souvenir posible.',
    highlights: [
      'Cata de aceite virgen extra D.O. Bajo Aragón — variedad Empeltre autóctona',
      'Visitas a almazaras y cooperativas en Valderrobres, Calaceite y La Fresneda',
      'Aprende a diferenciar un virgen extra de calidad por aroma, color y sabor',
      'El mejor souvenir: una garrafa de aceite nuevo (cosecha octubre-enero)',
      'Trufa negra en temporada (nov-marzo): la joya del río Tastavins'
    ],
    practicalInfo: [
      'Mejor temporada para visitar almazaras: octubre-enero (época de cosecha y molienda)',
      'Cooperativa Agrícola de Valderrobres: consultar citas y horarios en temporada',
      'Puedes comprar aceite D.O. en cualquier tienda del pueblo durante todo el año',
      'Experiencia de cata guiada: solicitar a través de Turismo Matarraña'
    ],
    seasonality: 'Todo el año (catas y compras). Cosecha: octubre-enero',
    tags: ['Gastronomía', 'Aceite', 'Cultura', 'Souvenir', 'Enoturismo'],
    sources: [
      'https://www.hotelquerol.com/gastronomia-matarrana-aceite-bajo-aragon-ruta-gourmet/',
      'https://hotelelconvent.com/blog-el-convent-1613/entry/gastronomia-matarrana.html'
    ],
    photos: [
      '/assets/experiences/cata-aceite-oleoturismo/principal/foto.jpg',
      '/assets/experiences/cata-aceite-oleoturismo/galeria/1.jpg',
      '/assets/experiences/cata-aceite-oleoturismo/galeria/2.jpg',
      '/assets/experiences/cata-aceite-oleoturismo/galeria/3.jpg',
      '/assets/experiences/cata-aceite-oleoturismo/galeria/4.jpg',
      '/assets/experiences/cata-aceite-oleoturismo/galeria/5.jpg',
    ],
    featured: false
  },
  {
    slug: 'senderismo-puertos-beceite',
    title: 'Senderismo en los Puertos de Beceite',
    category: 'aire_y_agua',
    town: 'Beceite',
    area: 'Puertos de Beceite',
    shortSummary: 'El macizo montañoso que domina el horizonte del Matarraña. Rutas para todos los niveles entre barrancos, cimas y bosques donde habitan cabras hispánicas, buitres y ciervos.',
    highlights: [
      'Cabra hispánica: las verás casi seguro saltando entre rocas en el Barranc de la Fou',
      'Peñagalera (1.236 m) — la cima más alta y las mejores vistas de la comarca',
      'GR-8 que conecta Beceite con Fuentespalda en 17,6 km de travesía espectacular',
      'Bosques mediterráneos de pino negral, quejigo y encina en perfecto estado',
      'Rutas fáciles para familias y rutas exigentes para senderistas con experiencia'
    ],
    practicalInfo: [
      'Centro de Visitantes La Presoneta (Beceite): mapas, información y guías',
      'Rutas GPS disponibles en Wikiloc y AllTrails buscando "Puertos de Beceite"',
      'Agua potable escasa en ruta — llevar suficiente',
      'Calzado de montaña obligatorio en las rutas técnicas',
      'Desde El Rinconcito: 30 minutos hasta el inicio de la mayoría de rutas'
    ],
    seasonality: 'Todo el año (mejor primavera y otoño; verano con madrugón)',
    tags: ['Senderismo', 'Montaña', 'Fauna', 'Naturaleza', 'BTT'],
    sources: [
      'https://www.beceite.es',
      'https://matarranyaturismo.es/senderismo/'
    ],
    photos: [
      '/assets/experiences/senderismo-puertos-beceite/principal/foto.jpg',
      '/assets/experiences/senderismo-puertos-beceite/galeria/1.jpg',
      '/assets/experiences/senderismo-puertos-beceite/galeria/2.jpg',
      '/assets/experiences/senderismo-puertos-beceite/galeria/3.jpg',
      '/assets/experiences/senderismo-puertos-beceite/galeria/4.jpg',
      '/assets/experiences/senderismo-puertos-beceite/galeria/5.jpg',
    ],
    featured: false
  }
];
