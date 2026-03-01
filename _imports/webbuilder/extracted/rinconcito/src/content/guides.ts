import { ExperienceCategory } from './experiences';

export interface GuideSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface FAQ {
  q: string;
  a: string;
}

export interface Guide {
  slug: string;
  title: string;
  category: ExperienceCategory;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  sections: GuideSection[];
  faqs: FAQ[];
  safetyNotes: string[];
  sources: string[];
  photos: string[];
}

export const GUIDES: Guide[] = [
  {
    slug: 'zonas-de-bano-matarrana',
    title: 'Las mejores zonas de baño del Matarraña: guía completa',
    category: 'zonas_de_bano',
    seoTitle: 'Las Mejores Piscinas Naturales en Matarraña 2025 | Guía Completa',
    seoDescription: 'Descubre las 15 pozas de La Pesquera, el Assut de Lledó, el Salt de La Portellada y el Pantano de la Pena. Todo lo que necesitas saber para disfrutar del agua en el Matarraña.',
    intro: 'El Matarraña es mucho más que un paisaje de olivos y pueblos medievales: sus ríos, alimentados por los acuíferos de los Puertos de Beceite, mantienen un caudal constante y una calidad de agua excepcional todo el año. Te contamos todo lo que necesitas saber para elegir tu zona de baño favorita.',
    sections: [
      {
        title: 'La Pesquera de Beceite — 15 Pozas Turquesas',
        paragraphs: [
          'La estrella indiscutible. El río Ulldemó ha esculpido durante milenios una sucesión de 15 pozas o "tolls" en la roca calcárea, creando piscinas naturales de aguas turquesas y fondos de piedra transparente. Los tonos varían del esmeralda al azul profundo según la luz del día.',
          'El acceso en coche está regulado en verano (junio-agosto) mediante un ticket de ~10€ por vehículo con dos turnos: mañana (9-14h) o tarde (15-20h). La alternativa gratuita es llegar en bicicleta o caminando desde Beceite (3 km de pista asfaltada). Fuera de temporada, el acceso es completamente libre y gratuito.'
        ],
        bullets: [
          'Aguas turquesas cristalinas excavadas por el río Ulldemó en roca calcárea',
          '15 pozas numeradas con aparcamientos habilitados junto a cada una',
          'Desde 3 km a pie desde Beceite o en coche con ticket de ~10€/vehículo (verano)',
          'Prohibición de animales de compañía durante la temporada regulada',
          'Escarpines imprescindibles — las rocas son resbaladizas'
        ]
      },
      {
        title: "L'Assut de Lledó — La Piscina Grande",
        paragraphs: [
          'Una antigua presa (assut) sobre el río Matarraña crea una amplia lámina de agua de gran profundidad, perfecta para nadar y muy popular entre las familias. El entorno es más abierto que La Pesquera, con menos sombra pero más espacio y menos masificación.',
          'Está ubicada entre Beceite y Arens de Lledó y tiene acceso regulado en temporada alta similar al de La Pesquera. Río arriba encontrarás pequeñas pozas adicionales más íntimas para quienes buscan tranquilidad.'
        ]
      },
      {
        title: 'El Salt de La Portellada — Cascada Lunar',
        paragraphs: [
          'Uno de los rincones más fotogénicos del Matarraña. El río Tastavins se lanza desde 20 metros sobre un paisaje de rocas blancas que parece sacado de otro planeta. La gran cueva que enmarca el salto lo hace único. El caudal varía mucho: en primavera y otoño es espectacular; en verano puede reducirse a un hilo.',
          'Junto a la base de la cascada hay una poza con baño posible en épocas de buen caudal. Acceso por pista forestal desde La Portellada, apta para turismos con precaución.'
        ]
      },
      {
        title: 'Pantano de la Pena — El Mar del Matarraña',
        paragraphs: [
          'Este embalse centenario a los pies de los Puertos de Beceite tiene aguas azules y cristalinas perfectas para bañarse, hacer kayak o pescar. Es considerado "el mar del Matarraña" por la serenidad de sus aguas. Ideal si buscas un baño tranquilo lejos de las masificaciones estivales.',
          'En verano se alquilan kayaks y paddle surf. También es un punto de partida para rutas de senderismo y BTT que rodean el embalse. Acceso libre y gratuito todo el año.'
        ]
      },
      {
        title: 'Font de les Raboses — El Baño junto al Pueblo',
        paragraphs: [
          'A menos de 1 km del centro de Beceite, esta fuente y zona de baño junto al río es perfecta para un chapuzón rápido sin desplazamientos. Un entorno de cuento con vegetación densa y sonido constante del agua. Acceso libre y gratuito todo el año sin regulación.'
        ]
      }
    ],
    faqs: [
      {
        q: '¿Hay que reservar para bañarse en La Pesquera?',
        a: 'En verano (21 junio–31 agosto) es necesario adquirir un ticket para acceder en coche (~10€/vehículo) en beceite.es o en la Oficina de Turismo de Beceite. Fuera de temporada, el acceso es completamente libre y gratuito.'
      },
      {
        q: '¿Se puede ir con perros?',
        a: 'No durante la temporada regulada (junio-agosto). Fuera de esa época, los perros tienen permitido el acceso aunque no el baño en el agua.'
      },
      {
        q: '¿Cuándo tiene más agua El Salt de La Portellada?',
        a: 'La primavera (marzo-mayo) y el otoño lluvioso (octubre-noviembre) son las épocas de mayor caudal. En verano puede quedar reducido a un hilo de agua, aunque el paisaje sigue siendo muy bonito.'
      },
      {
        q: '¿Está fría el agua?',
        a: 'Las aguas de los ríos del Matarraña provienen de los acuíferos de los Puertos de Beceite y son bastante frías (14-18°C). En La Pesquera la temperatura sube un poco en los tolls más pequeños y soleados.'
      },
      {
        q: '¿Dónde está prohibido el baño?',
        a: 'En toda la zona del Parrizal de Beceite el baño está completamente prohibido por ser Reserva Natural Fluvial y zona de captación de agua potable para el municipio.'
      }
    ],
    safetyNotes: [
      'PROHIBIDO el baño en todo el recorrido del Parrizal de Beceite (reserva de agua potable y zona natural protegida).',
      'Escarpines imprescindibles — las rocas mojadas son muy resbaladizas y hay riesgo de cortes.',
      'No apliques crema solar antes de entrar al agua — contamina el frágil ecosistema fluvial.',
      'Vigila el nivel del agua tras lluvias — los ríos pueden crecer rápido. En días de tormenta evita las pozas.',
      'Lleva suficiente agua potable — los puntos de fuente son escasos en las rutas.'
    ],
    sources: [
      'https://www.beceite.es/turismo/rutas-por-beceite/parrizal-pesquera-pantano-de-pena/2-pesquera/',
      'https://www.matarranyaturismo.es',
      'https://www.aragondigital.es'
    ],
    photos: [
      '/assets/guides/zonas-de-bano-matarrana/principal/foto.jpg',
      '/assets/guides/zonas-de-bano-matarrana/galeria/1.jpg',
      '/assets/guides/zonas-de-bano-matarrana/galeria/2.jpg',
      '/assets/guides/zonas-de-bano-matarrana/galeria/3.jpg',
      '/assets/guides/zonas-de-bano-matarrana/galeria/4.jpg',
      '/assets/guides/zonas-de-bano-matarrana/galeria/5.jpg',
    ]
  },
  {
    slug: 'astroturismo-matarrana',
    title: 'Astroturismo en el Matarraña: ver la Vía Láctea desde Fuentespalda',
    category: 'estrellas',
    seoTitle: 'Astroturismo Matarraña 2025 | Guía para Ver las Estrellas en Teruel',
    seoDescription: 'El Matarraña tiene cielos de altísima calidad con escasa contaminación lumínica. Te contamos los mejores puntos de observación, la mejor época y consejos para no perderte nada.',
    intro: 'Pocos lugares en España ofrecen lo que el Matarraña de noche: un cielo oscuro, limpio y silencioso donde la Vía Láctea se despliega sobre el horizonte como una pintura. Desde El Rinconcito en Fuentespalda, bastará con alejarte unos cientos de metros del pueblo para vivir una experiencia que muchos urbanos ya han olvidado que existe.',
    sections: [
      {
        title: '¿Por qué el Matarraña tiene tan buenos cielos?',
        paragraphs: [
          'La comarca del Matarraña tiene una de las densidades de población más bajas de España (menos de 4 hab/km²). Sin grandes industrias ni núcleos urbanos iluminados en kilómetros a la redonda, la contaminación lumínica es mínima. Suma a eso la altitud media de los pueblos (600-900 m), el aire limpio y seco, y las frecuentes noches despejadas que da el clima mediterráneo continental.',
          'El hotel La Torre del Visco, en la misma comarca, fue el primer Relais & Chateaux de España en obtener la certificación Starlight gracias a la calidad de sus cielos. Esto da una idea del nivel astronómico del Matarraña.'
        ]
      },
      {
        title: 'Los mejores puntos de observación',
        paragraphs: [
          'Desde Fuentespalda, el Mirador de Punta Molinera es el punto de referencia local para la observación astronómica: amplio, accesible en coche y con vistas de 360° sin obstáculos. Perfecto para tender una manta y perderse mirando al cielo.',
          'Los alrededores del Embalse de la Pena, Peñarroya de Tastavins por su mayor altitud, y cualquier pista forestal alejada de los núcleos son también puntos excelentes. Si te alejas 2-3 km de cualquier pueblo en la comarca, ya tienes cielo oscuro de verdad.'
        ],
        bullets: [
          'Mirador de Punta Molinera (Fuentespalda) — el mejor punto desde El Rinconcito',
          'Alrededores del Embalse de la Pena (Beceite)',
          'Peñarroya de Tastavins — mayor altitud = cielo más oscuro',
          'Monroyo (Mirador de la Mola) — vistas panorámicas hacia el este',
          'Cualquier pista forestal a 2+ km de núcleo urbano'
        ]
      },
      {
        title: 'Cuándo y cómo observar',
        paragraphs: [
          'La regla de oro: busca una noche de Luna Nueva (o cuando la luna ya se haya puesto). El brillo lunar puede arruinar la visión de objetos tenues como la Vía Láctea o las nebulosas. Consulta el calendario lunar antes de planificar tu observación.',
          'El verano (julio-agosto) es la mejor temporada para ver el núcleo galáctico de la Vía Láctea: se eleva alto sobre el horizonte sur a partir de las 23h. En invierno el cielo está igualmente despejado y puedes ver Orión, las Pléyades y cúmulos estelares espectaculares.'
        ]
      },
      {
        title: 'Qué llevar para una sesión de astroturismo',
        paragraphs: [
          'La preparación marca la diferencia entre una experiencia mediocre y una noche increíble. Lo esencial: una manta o silla tumbona, ropa de abrigo (incluso en agosto la temperatura baja mucho de noche), y paciencia para dejar que los ojos se adapten a la oscuridad (unos 20 minutos).'
        ],
        bullets: [
          'Linterna de luz roja — mantiene la adaptación ocular a la oscuridad',
          'App Stellarium o SkySafari (gratuitas) para identificar constelaciones y planetas',
          'Ropa de abrigo: incluso en julio hace frío de noche en altura',
          'Manta o silla tumbona para observar tumbado cómodamente',
          'Binoculares 10x50: revelan miles de estrellas invisibles a simple vista',
          'Termo con bebida caliente para el relax'
        ]
      }
    ],
    faqs: [
      {
        q: '¿Se ve la Vía Láctea desde Fuentespalda?',
        a: 'Sí, claramente visible en noches de Luna Nueva entre mayo y septiembre. El núcleo galáctico aparece sobre el horizonte sur como una banda difusa de luz a partir de la medianoche. Nuestros huéspedes lo confirman con fotos sorprendentes.'
      },
      {
        q: '¿Cuándo es la mejor época?',
        a: 'Julio y agosto son los mejores meses para ver el núcleo de la Vía Láctea. Las Perseidas (lluvia de estrellas) caen cada año entre el 11 y el 13 de agosto — una experiencia impresionante desde el Matarraña. En invierno los cielos son igualmente espectaculares aunque más fríos.'
      },
      {
        q: '¿Necesito telescopio?',
        a: 'No. A simple vista ya es una experiencia increíble. Unos binoculares de 10x50 multiplican el espectáculo mostrando cúmulos y nebulosas. El telescopio solo tiene sentido si ya tienes experiencia previa usándolo.'
      },
      {
        q: '¿Puedo hacer astrofotografía?',
        a: 'Absolutamente. Con una cámara réflex o mirrorless, un trípode y ajustes de larga exposición (ISO 3200, f/2.8, 25 segundos) obtendrás fotografías impresionantes. La zona es muy popular entre astrofotógrafos de toda España.'
      }
    ],
    safetyNotes: [
      'Avisa a alguien de dónde vas si te adentras de noche por pistas forestales desconocidas.',
      'No abandones el coche si no conoces bien el terreno — el campo de noche puede desorientar.',
      'Lleva el móvil cargado con GPS activado (Maps.me offline es ideal para esta zona).',
      'En invierno el suelo puede estar helado — lleva calzado antideslizante.'
    ],
    sources: [
      'https://turismodeestrellas.com/noticias/destinos/3955-alojamientos-starlight-en-la-provincia-de-teruel.html',
      'https://www.turismomatarranya.es',
      'https://www.turismodearagon.com'
    ],
    photos: [
      '/assets/guides/astroturismo-matarrana/principal/foto.jpg',
      '/assets/guides/astroturismo-matarrana/galeria/1.jpg',
      '/assets/guides/astroturismo-matarrana/galeria/2.jpg',
      '/assets/guides/astroturismo-matarrana/galeria/3.jpg',
      '/assets/guides/astroturismo-matarrana/galeria/4.jpg',
      '/assets/guides/astroturismo-matarrana/galeria/5.jpg',
    ]
  },
  {
    slug: 'pueblos-con-encanto-matarrana',
    title: 'Los pueblos más bonitos del Matarraña: ruta completa',
    category: 'cultural',
    seoTitle: 'Los Pueblos más Bonitos del Matarraña 2025 | Guía con Mapa',
    seoDescription: 'Valderrobres, Calaceite, Beceite, La Fresneda, Ráfales y Cretas: la ruta completa por los pueblos medievales de la "Toscana española". Qué ver y cómo organizarte.',
    intro: 'La comarca del Matarraña tiene cinco conjuntos histórico-artísticos declarados BIC (Bien de Interés Cultural): Beceite, Calaceite, La Fresneda, Ráfales y Valderrobres. Una densidad de patrimonio medieval excepcional para tan pequeño territorio. Aquí te guiamos pueblo a pueblo.',
    sections: [
      {
        title: 'Valderrobres — El Más Bonito de Aragón',
        paragraphs: [
          'Capital de la comarca y posiblemente el pueblo más fotografiado de Teruel. La imagen del puente de piedra medieval sobre el río Matarraña con el castillo-palacio coronando la colina al fondo es una de las postales más icónicas de Aragón.',
          'Cruza el Portal de San Roque y sube por las calles empedradas hasta el conjunto formado por la Iglesia de Santa María la Mayor (magnífico gótico levantino del s. XV) y el Castillo-Palacio del s. XIV, reconvertido de fortaleza a residencia de los arzobispos de Zaragoza. Dentro encontrarás mazmorras, salones nobiliarios con chimeneas, la cocina medieval y unas vistas espectaculares desde las almenas. Visita guiada: 8€/persona.'
        ],
        bullets: [
          'Puente de piedra medieval — la foto más icónica del Matarraña',
          'Castillo-Palacio del s. XIV con mazmorras y salones nobiliarios (8€ guiada)',
          'Miembro de Los Pueblos más Bonitos de España',
          'Plaza de España con Ayuntamiento renacentista y casas palaciegas',
          'A 15 minutos de El Rinconcito'
        ]
      },
      {
        title: 'Calaceite — La Capital Cultural',
        paragraphs: [
          'Si Valderrobres es el rey visual, Calaceite es el rey intelectual. A finales de los años 60, José Donoso se instaló aquí y el pueblo se convirtió en destino de escritores del Boom Latinoamericano: García Márquez, Vargas Llosa y Carlos Fuentes pasearon por estas calles. El ambiente especial que generaron todavía se respira.',
          'Su casco histórico de piedra dorada está declarado BIC. No te pierdas el Museo Joan Cabré (gratuito, arqueología ibérica), el Poblado Ibérico de San Antonio a 2 km, la antigua cárcel del s. XVI con grafitis originales de los presos, y la animada Plaza de España para tomar el aperitivo.'
        ]
      },
      {
        title: 'La Fresneda — Plaza y Ermita Rupestre',
        paragraphs: [
          'Uno de los conjuntos medievales mejor conservados de la comarca. Su Plaza Mayor sorprende por la elegancia de sus casas palaciegas y la casa consistorial con gárgolas. Desde las ruinas del castillo, las vistas a los campos de olivos son espectaculares.',
          'El secreto mejor guardado: detrás de la Ermita de Santa Bárbara (subiendo a pie desde el pueblo), una espiral de piedra de land art en plena naturaleza. Y a 5 km, el Santuario de la Virgen de Gracia, excavado parcialmente en la roca viva de una montaña, es uno de los lugares más singulares de toda la comarca.'
        ]
      },
      {
        title: 'Beceite — Pueblo de Río y Aventura',
        paragraphs: [
          'El pueblo más activo de la comarca en términos turísticos. Su centro histórico declarado BIC, cruzado por el río Matarraña, combina calles medievales con una oferta de actividades al aire libre inigualable: el Parrizal, La Pesquera, los Puertos de Beceite y el GR-8 parten de aquí.',
          'Su Oficina de Turismo es la mejor equipada de la comarca — pasa a recoger mapas y actualizaciones sobre los accesos a las zonas naturales antes de salir.'
        ]
      },
      {
        title: 'Ráfales y Cretas — Las Joyas Escondidas',
        paragraphs: [
          'Ráfales conserva un encanto medieval casi intacto con su castillo, calles empinadas y escasa afluencia turística. Se puede recorrer entero en menos de una hora y cada rincón es un placer para la fotografía.',
          'Cretas destaca por su plaza mayor, su panadería tradicional de horno de leña y sus vistas a los campos de almendros. Pequeño pero inmensamente coqueto — uno de esos pueblos que te convencen de que hay que volver.'
        ]
      }
    ],
    faqs: [
      {
        q: '¿Cuántos días necesito para ver los pueblos?',
        a: 'Para una visita cómoda y sin prisas: 3 días te permiten ver los 6 pueblos principales. Con 2 días puedes hacer una buena selección (Valderrobres + Calaceite + Beceite es el trío imprescindible).'
      },
      {
        q: '¿Puedo hacer la ruta en un día?',
        a: 'Técnicamente sí, pero no lo recomendamos. Perderte el vermut en la plaza de Calaceite o el atardecer desde las almenas de Valderrobres no tiene sentido. Lo mejor del Matarraña se disfruta despacio.'
      },
      {
        q: '¿Están señalizados los centros históricos?',
        a: 'Sí. Todos los pueblos tienen señalética turística y la mayoría tienen aparcamiento gratuito en la periferia del casco histórico (peatonal o con calles muy estrechas).'
      }
    ],
    safetyNotes: [
      'Los cascos históricos son peatonales o tienen calles muy estrechas — aparca en las zonas habilitadas a la entrada del pueblo.',
      'El GPS puede darte rutas imposibles para llegar a algunos pueblos. Mejor seguir los carteles de carretera.',
      'En verano, algunos monumentos cierran a mediodía (13-17h). Organízate para visitar lo cerrado en horario de mañana.'
    ],
    sources: [
      'https://castillovalderrobres.com',
      'https://www.turismodearagon.com/ficha/valderrobres/',
      'https://www.escapadarural.com/blog/5-pueblos-imprescindibles-de-matarrana/',
      'https://unavidaimprovisada.es/turismo-rural-en-la-comarca-del-matarrana/'
    ],
    photos: [
      '/assets/guides/pueblos-con-encanto-matarrana/principal/foto.jpg',
      '/assets/guides/pueblos-con-encanto-matarrana/galeria/1.jpg',
      '/assets/guides/pueblos-con-encanto-matarrana/galeria/2.jpg',
      '/assets/guides/pueblos-con-encanto-matarrana/galeria/3.jpg',
      '/assets/guides/pueblos-con-encanto-matarrana/galeria/4.jpg',
      '/assets/guides/pueblos-con-encanto-matarrana/galeria/5.jpg',
    ]
  },
  {
    slug: 'gastronomia-matarrana',
    title: 'Qué comer en el Matarraña: guía gastronómica completa',
    category: 'gastronomia',
    seoTitle: 'Gastronomía del Matarraña | Qué Comer y Dónde en Teruel',
    seoDescription: 'Aceite D.O. Bajo Aragón, jamón de Teruel, trufa negra, ternasco y melocotón de Calanda. Guía completa de la gastronomía del Matarraña con los mejores restaurantes.',
    intro: 'El Matarraña es, ante todo, una despensa extraordinaria. La confluencia de tres territorios (Aragón, Cataluña y Valencia) le da una personalidad culinaria única, donde la tradición medieval convive con productos de denominación de origen de primer nivel mundial. Aquí no se come mal. Y comerse los restos tampoco está mal.',
    sections: [
      {
        title: 'El Aceite Empeltre — El Oro Líquido de la Comarca',
        paragraphs: [
          'Si tuviésemos que elegir un solo producto del Matarraña, elegiríamos el aceite. La variedad Empeltre, autóctona de Aragón, produce un aceite virgen extra de color oro viejo, dulce, suave, con recuerdos a almendra verde y manzana. No pica en garganta. No amarga. Es un aceite elegante que realza los sabores sin dominarlos.',
          'Está protegido por la Denominación de Origen Aceite del Bajo Aragón, una de las más antiguas de España. La cosecha se recoge entre octubre y enero, época en que las almazaras (molinos de aceite) trabajan día y noche y el aire de los pueblos huele a aceitunas recién prensadas. El aceite nuevo es especialmente aromático y vale la pena llevarte una garrafa como souvenir.'
        ],
        bullets: [
          'Variedad Empeltre — dulce, suave, con recuerdos a almendra y manzana',
          'D.O. Aceite del Bajo Aragón — una de las más antiguas denominaciones de España',
          'Cata en cooperativas de Valderrobres, Calaceite o La Fresneda',
          'Aceite nuevo (octubre-enero): más aromático y afrutado',
          'El mejor souvenir: garrafa de 5L o botella premium'
        ]
      },
      {
        title: 'Jamón de Teruel D.O.P. — El Primero de España',
        paragraphs: [
          'El Jamón de Teruel fue el primer jamón con Denominación de Origen Protegida de España. El aire frío y seco de la provincia crea condiciones ideales para una curación lenta y natural que otorga a la carne un sabor suave, delicado y con un punto de sal notablemente bajo.',
          'Pide una tabla de corte a cuchillo en cualquier bar de la plaza de Valderrobres y acompáñala con el pan de pueblo untado con tomate y aceite. Inicio de comida obligatorio en cualquier visita al Matarraña.'
        ]
      },
      {
        title: 'Trufa Negra — El Oro Negro del Tastavins',
        paragraphs: [
          'El valle del río Tastavins, con sus altitudes entre 700 y 1.400 metros, tiene condiciones ideales para la trufa negra (Tuber melanosporum). Entre noviembre y marzo, algunos de los mejores restaurantes de la comarca ofrecen menús de trufa con platos que van del huevo trufado al arroz, la pasta o incluso el postre.',
          'Si vas en temporada, no te pierdas buscar dónde la sirven. Es un lujo que en el Matarraña cuesta bastante menos que en Barcelona o Madrid.'
        ]
      },
      {
        title: 'Ternasco de Aragón I.G.P. y el Cerdo del Matarraña',
        paragraphs: [
          'El cordero joven (ternasco) asado en horno de leña con patatas a lo pobre y ajos es el plato más representativo de la gastronomía aragonesa. En el Matarraña se cocina con las razas autóctonas (ojinegra de Teruel, maellana) bajo la Indicación Geográfica Protegida Ternasco de Aragón. La textura es mantecosa y el sabor, inconfundible.',
          'La matanza del cerdo también tiene una tradición fortísima en la comarca. Longanizas, chorizos, lomos en aceite, morcilla dulce y conservas son productos que encontrarás en tiendas y mercados de toda la comarca.'
        ]
      },
      {
        title: 'Melocotón de Calanda y Otros Tesoros',
        paragraphs: [
          'El Melocotón de Calanda (D.O.P.) es el más caro y apreciado de España. Solo se comercializa de principios de septiembre a finales de octubre. Cada melocotón se embolsa individualmente en el árbol durante los últimos 2 meses de maduración para protegerlo de agentes externos. El resultado es una fruta de tamaño grande, piel amarilla suave y sabor dulce e intensísimo.',
          'La miel de romero y tomillo, las almendras Marcona, las olivas empeltre en aceite y los dulces tradicionales (ametlats, rosquilletes, panadetes) completan una despensa que justifica por sí sola el viaje.'
        ],
        bullets: [
          'Melocotón de Calanda D.O.P. (septiembre-octubre): el mejor melocotón del mundo',
          'Miel de romero y tomillo con toque de almendro — llévala siempre de regalo',
          'Almendras Marcona: base de la repostería tradicional de origen árabe',
          'Ametlats, rosquilletes y panadetes: dulces típicos que no encontrarás en otro sitio',
          'Vinos I.G.P. Bajo Aragón: garnachas potentes y blancos frescos de Macabeo'
        ]
      },
      {
        title: 'Los Mejores Restaurantes de la Comarca',
        paragraphs: [
          'Restaurante Matarraña (Plaza Nueva, 5, La Fresneda): cocina de mercado con productos locales, uno de los más valorados de la comarca. Reserva imprescindible en temporada alta.',
          'El Convent 1613 (Calle Convento, 1, La Fresneda): pionero del turismo rural en la comarca, con uno de los comedores más espectaculares de Aragón. Cerramientos de cristal de 360° con vistas a los campos de olivos.',
          'Fonda La Plaza (Plaza de España, Valderrobres): una de las fondas más antiguas de España en un palacete medieval. Cocina tradicional y buena selección de vinos locales. Imprescindible el cordero.'
        ]
      }
    ],
    faqs: [
      {
        q: '¿Dónde puedo comprar productos locales para llevar?',
        a: 'Las cooperativas agrícolas de Valderrobres y Calaceite son el mejor sitio para aceite a buen precio. Las tiendas de los cascos históricos tienen buena selección de conservas, mieles y dulces tradicionales. Los mercados comarcales (consulta calendario) son ideales para productos frescos.'
      },
      {
        q: '¿Los restaurantes abren en temporada baja?',
        a: 'Algunos cierran entre semana en invierno. Recomendamos llamar siempre antes si vas entre noviembre y marzo, especialmente de lunes a jueves.'
      },
      {
        q: '¿Se come bien sin gastar mucho?',
        a: 'Perfectamente. Los menús del día en los bares de pueblo (12-14€) son abundantes, de producto local y de muy buena calidad. La relación calidad-precio del Matarraña es imbatible.'
      }
    ],
    safetyNotes: [],
    sources: [
      'https://www.hotelquerol.com/gastronomia-matarrana-aceite-bajo-aragon-ruta-gourmet/',
      'https://hotelelconvent.com/blog-el-convent-1613/entry/gastronomia-matarrana.html',
      'https://saboresdeteruel.es/el-matarrana-la-toscana-espanola/',
      'https://www.hotelcresol.com/matarrana-un-paraiso-gastronomico-en-aragon/'
    ],
    photos: [
      '/assets/guides/gastronomia-matarrana/principal/foto.jpg',
      '/assets/guides/gastronomia-matarrana/galeria/1.jpg',
      '/assets/guides/gastronomia-matarrana/galeria/2.jpg',
      '/assets/guides/gastronomia-matarrana/galeria/3.jpg',
      '/assets/guides/gastronomia-matarrana/galeria/4.jpg',
      '/assets/guides/gastronomia-matarrana/galeria/5.jpg',
    ]
  },
  {
    slug: 'ruta-parrizal-beceite-guia',
    title: 'Guía completa de la Ruta del Parrizal de Beceite',
    category: 'aire_y_agua',
    seoTitle: 'Ruta Parrizal Beceite 2025 | Guía Completa con Precio y Reservas',
    seoDescription: 'Todo lo que necesitas saber para hacer la Ruta del Parrizal de Beceite: precio del ticket, horarios, cómo llegar, qué llevar y los mejores consejos para disfrutarla al máximo.',
    intro: 'La ruta del Parrizal de Beceite es la más icónica del Matarraña y una de las más espectaculares de toda España. Caminas sobre pasarelas de madera ancladas en la roca sobre las aguas turquesas del río Matarraña, hasta adentrarte en un cañón de 60 metros de altura y apenas 1,5 metros de anchura. Aquí tienes todo lo que necesitas saber.',
    sections: [
      {
        title: 'Qué vas a ver: el itinerario paso a paso',
        paragraphs: [
          'La ruta parte del Parking 3 (a 5 km de Beceite) y sigue durante 800 metros por un camino de tierra antiguo (el camino minero), donde encontrarás dos túneles excavados en la roca y la desviación hacia las pinturas rupestres de La Fenellassa (Patrimonio de la Humanidad) — no te las saltes.',
          'A partir de ahí empiezan las pasarelas de madera ancladas a la pared de roca, el tramo más icónico de la ruta. Caminas literalmente suspendido sobre las aguas turquesas, con paredes de piedra a ambos lados que se elevan decenas de metros. El sonido del agua bajo los pies es constante.',
          'El punto final son los Estrets del Parrissal: un cañón de 200 metros de largo, 60 metros de alto y en algunos puntos apenas 1,5 metros de ancho. Desde junio de 2022, este tramo también es transitable gracias a nuevas pasarelas. Una experiencia absolutamente única.'
        ],
        bullets: [
          '800 m de camino minero con 2 túneles y pinturas rupestres (Patrimonio de la Humanidad)',
          'Tramo de pasarelas sobre las aguas turquesas del río Matarraña',
          'Los Estrets del Parrissal: 200 m de largo, 60 m de alto y 1,5 m de ancho',
          '8 km en total (ida y vuelta) — 3 horas a paso tranquilo',
          'Dificultad: Baja-Media — apta para niños desde 6 años'
        ]
      },
      {
        title: 'Ticket, horarios y reservas',
        paragraphs: [
          'El acceso a la ruta de las pasarelas requiere un ticket por persona (5€/adulto, gratuito para menores de 14 años). El ticket incluye seguro individual. Se compra ONLINE en beceite.es — no hay venta física en el paraje. Indica la matrícula de tu vehículo para acceder al Parking 3 (gratuito con ticket).',
          'Horario resto del año (14 sept.–28 marzo): un único turno de 9h a 18h (salida no más tarde de las 14-15h para poder completar la ruta). Temporada alta (29 marzo–13 sept.): dos turnos, mañana 9-14h o tarde 15-20h.'
        ]
      },
      {
        title: 'Cómo llegar sin GPS (importante)',
        paragraphs: [
          'Las calles del casco histórico de Beceite son extremadamente estrechas y los GPS habitualmente dan rutas imposibles para turismos. El Ayuntamiento recomienda expresamente DESACTIVAR el GPS al llegar a Beceite y seguir los carteles de "Parrissal" que hay en todo el pueblo.',
          'El acceso de 5 km desde el pueblo al Parking 3 es por pista asfaltada estrecha y sin arcén. Circula despacio y cede el paso en los cruces.'
        ]
      },
      {
        title: 'Qué llevar',
        paragraphs: [
          'El calzado es lo más crítico. Las pasarelas de madera se mojan con el agua y la humedad del cañón y pueden ser muy resbaladizas. Usa zapatillas de trekking con buen agarre o botas de montaña impermeables. Las chanclas son una mala idea.',
          'Lleva agua suficiente (no hay fuentes en la ruta), snack, crema solar y ropa de abrigo si vas en invierno o primavera. Una mochila pequeña es suficiente.'
        ]
      },
      {
        title: 'Consejos de los que van muchas veces',
        paragraphs: [
          'Madruga. El turno de mañana (9h) tiene la mejor luz para fotografiar y el tramo de pasarelas está prácticamente solo la primera hora. A mediodía en verano puede haber mucha gente.',
          'Activa el modo silencio y para 5 minutos. Cerrar los ojos, escuchar el agua y respirar el aire húmedo del cañón es de las mejores cosas que puedes hacer en el Matarraña.',
          'No te saltes las pinturas rupestres — la desviación tiene pocos carteles y mucha gente se las pierde. Busca el cartel antes del segundo túnel.'
        ]
      }
    ],
    faqs: [
      {
        q: '¿Cuánto cuesta la entrada al Parrizal?',
        a: '5€ por adulto. Gratuito para menores de 14 años. El ticket incluye un seguro individual y da acceso al Parking 3 (gratuito). Compra obligatoria online en beceite.es antes de ir.'
      },
      {
        q: '¿Se puede hacer con niños pequeños?',
        a: 'A partir de 6 años es una buena edad. Los bebés en mochila también van bien. El tramo de pasarelas tiene sirgas de seguridad. El único riesgo real es la madera resbaladiza — lleva calzado con agarre a todos.'
      },
      {
        q: '¿En qué mes hay más agua?',
        a: 'El río Matarraña tiene caudal garantizado todo el año gracias a los acuíferos de los Puertos de Beceite. Las aguas son más abundantes en invierno y primavera, y algo más bajas en verano. La ruta es igual de espectacular en cualquier época.'
      },
      {
        q: '¿Hay restaurante o bar en el paraje?',
        a: 'No. El paraje no tiene servicios. Lleva tu propia comida y agua. En Beceite (a 5 km) hay varios bares y restaurantes donde comer antes o después de la ruta.'
      }
    ],
    safetyNotes: [
      'El baño en el río Matarraña dentro del Parrizal está COMPLETAMENTE PROHIBIDO — es reserva de agua potable y zona de captación para Beceite.',
      'El acceso con perros está prohibido en todo el Espacio Natural del Parrizal.',
      'Las pasarelas son seguras pero resbaladizas cuando están húmedas — calzado con agarre obligatorio.',
      'Atención especial con niños pequeños en el tramo de los Estrets, donde el pasillo es muy estrecho.',
      'No está permitido pernoctar en el Parking 3 (prohibido entre 22h y 7h).'
    ],
    sources: [
      'https://www.beceite.es/turismo/rutas-por-beceite/parrizal-pesquera-pantano-de-pena/parrizal/',
      'https://www.guiarepsol.com/es/viajar/vamos-de-excursion/ruta-parrizal-beceite-teruel/',
      'https://siguiendolasenda.es/ruta-del-parrizal-de-beceite-matarrana/'
    ],
    photos: [
      '/assets/guides/ruta-parrizal-beceite-guia/principal/foto.jpg',
      '/assets/guides/ruta-parrizal-beceite-guia/galeria/1.jpg',
      '/assets/guides/ruta-parrizal-beceite-guia/galeria/2.jpg',
      '/assets/guides/ruta-parrizal-beceite-guia/galeria/3.jpg',
      '/assets/guides/ruta-parrizal-beceite-guia/galeria/4.jpg',
      '/assets/guides/ruta-parrizal-beceite-guia/galeria/5.jpg',
    ]
  }
];
