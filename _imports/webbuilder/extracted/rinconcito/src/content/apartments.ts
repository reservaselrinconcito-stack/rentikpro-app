// Datos verificados directamente de www.elrinconcitomatarraña.com
// Propietarios: Toni y Evelyn | Licencia turística: 2021-E-RC-453
// Fotos: Reales, tomadas en los propios apartamentos

export type Apartment = {
  id: string;
  slug: string;
  name: string;
  locationId: "rinconcito" | "mas-matarrana";
  status?: "active" | "coming_soon";
  priceFrom: number;
  sizeM2: number | null;
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  layout?: string | null;
  description: string;
  longDescription: string;
  highlights: string[];
  photos: string[];
  publicBasePrice?: number;
  currency?: string;
};

// Zonas comunes accesibles desde todos los apartamentos
const ZONA_COMUN = [
  '/assets/rooms/zona-comun/01-billar-dardos.jpg',
  '/assets/rooms/zona-comun/02-barra-medieval.jpg',
  '/assets/rooms/zona-comun/03-salon-chimenea.jpg',
  '/assets/rooms/zona-comun/04-mesa-comedor.jpg',
];

export const APARTMENTS: Apartment[] = [
  {
    id: "la-tirolina",
    slug: "la-tirolina",
    name: "LA TIROLINA",
    locationId: "rinconcito",
    status: "active",
    priceFrom: 150,
    sizeM2: 95,
    capacity: 6,
    bedrooms: 2,
    bathrooms: 2,
    description: "El más grande y espectacular. 95 m² con dos habitaciones dobles — una con cama de dosel de hierro forjado —, dos baños de lujo rústico y una cocina con vigas de madera y azulejos hidráulicos que enamora. Para 4 adultos y 2 pequeños.",
    longDescription: "La Tirolina es nuestro apartamento estrella. Con 95 m² repartidos en dos plantas, tiene una personalidad única: la habitación principal con su imponente cama de dosel de hierro forjado y paredes de piedra vista, y la habitación secundaria accesible por una escalera de piedra con vigas centenarias. Dos baños muy distintos y ambos cuidados al detalle: uno con azulejos azules y ducha, otro con bañera y mueble de lavabo de diseño. La cocina es puro carácter: azulejos hidráulicos, vigas de madera, mesa de campo y máquina de café espresso. Ideal para familias o un grupo de amigos que quiera espacio de verdad (4 adultos + 2 niños).",
    highlights: [
      "Habitación principal con cama de dosel de hierro forjado y paredes de piedra",
      "2ª habitación en planta superior con vigas centenarias y acceso por escalera de piedra",
      "2 baños: uno con azulejos azules y ducha, otro con bañera y mueble de diseño",
      "Cocina con azulejos hidráulicos, vigas y máquina de café espresso",
      "95 m² en dos plantas — el mayor apartamento de El Rinconcito",
      "Capacidad: 4 adultos + 2 niños adicionales",
      "Servicio de limpieza incluido",
      "Acceso a zonas comunes (billar, dardos, barra medieval, salón con estufa)",
      "Cargador de coche eléctrico gratuito en el pueblo"
    ],
    photos: [
      '/assets/rooms/la-tirolina/01-dormitorio-dosel.jpg',
      '/assets/rooms/la-tirolina/02-cocina.jpg',
      '/assets/rooms/la-tirolina/03-bano-banera.jpg',
      '/assets/rooms/la-tirolina/04-dormitorio-2.jpg',
      '/assets/rooms/la-tirolina/05-bano-2.jpg',
      ...ZONA_COMUN,
    ]
  },
  {
    id: "la-ermita",
    slug: "la-ermita",
    name: "LA ERMITA",
    locationId: "rinconcito",
    status: "active",
    priceFrom: 90,
    sizeM2: 50,
    capacity: 4,
    bedrooms: 1,
    bathrooms: 1,
    description: "El apartamento más especial para parejas o familias pequeñas. Salón-habitación abierto con cama de matrimonio, sofá de piel, TV grande y cocina moderna. Para 2 adultos y 2 pequeños.",
    longDescription: "La Ermita es el más acogedor y especial de nuestros apartamentos. Pensado para parejas que quieren una escapada con carácter o familias con niños, combina una decoración muy cuidada con mucho espacio: dormitorio abierto con cama doble y sofá de piel marrón, TV de gran formato y vigas de madera en el techo. La cocina es completamente equipada con lavavajillas y nevera retro gris. El salón-comedor es luminoso y espacioso, con un segundo acceso a la terraza. Capacidad para 2 adultos y 2 niños en el sofá cama.",
    highlights: [
      "Dormitorio con cama doble de matrimonio, sofá de piel y TV de gran formato",
      "Salón-comedor abierto muy espacioso con vigas centenarias",
      "Cocina equipada con lavavajillas y nevera retro",
      "Baño completo con ducha",
      "Sofá cama para 2 niños adicionales",
      "Ambiente romántico y tranquilo — muy valorado por las parejas",
      "Acceso a zonas comunes (billar, dardos, barra medieval, salón con estufa)",
      "Cargador de coche eléctrico gratuito en el pueblo",
      "Servicio de limpieza incluido"
    ],
    photos: [
      '/assets/rooms/la-ermita/01-dormitorio.jpg',
      '/assets/rooms/la-ermita/02-salon-comedor.jpg',
      '/assets/rooms/la-ermita/03-cocina.jpg',
      ...ZONA_COMUN,
    ]
  },
  {
    id: "los-almendros",
    slug: "los-almendros",
    name: "LOS ALMENDROS",
    locationId: "rinconcito",
    status: "active",
    priceFrom: 90,
    sizeM2: 50,
    capacity: 4,
    bedrooms: 1,
    bathrooms: 1,
    description: "Luminoso y con mucho carácter. Dormitorio nórdico con cama doble y sofá cama, cocina con nevera roja retro y baño con azulejos malva. Para 2 adultos y 2 pequeños.",
    longDescription: "Los Almendros tiene una personalidad propia muy marcada. El dormitorio es amplio y muy luminoso, con estética nórdica: cama doble blanca, parquet y vigas de madera. La cocina-comedor es la pieza más característica: nevera retro roja, arco de ladrillo que separa los espacios, mesa de bistró y una lámpara de cuerdas que da un toque muy especial. El baño tiene azulejos malva con mampara de bloques de vidrio — moderno y diferente. Ideal para parejas con niños (2 adultos + 2 pequeños).",
    highlights: [
      "Dormitorio nórdico: cama doble blanca, parquet y vigas de madera",
      "Cama supletoria / sofá cama para 2 niños",
      "Cocina con nevera retro roja y arco de piedra entre espacios",
      "Baño con azulejos malva y mampara de bloques de vidrio",
      "TV y equipo de música",
      "Cocina totalmente equipada (microondas, lavadora)",
      "Acceso a zonas comunes (billar, dardos, barra medieval, salón con estufa)",
      "Cargador de coche eléctrico gratuito en el pueblo",
      "Servicio de limpieza incluido"
    ],
    photos: [
      '/assets/rooms/los-almendros/01-dormitorio.jpg',
      '/assets/rooms/los-almendros/02-cocina.jpg',
      '/assets/rooms/los-almendros/03-bano.jpg',
      ...ZONA_COMUN,
    ]
  },
  {
    id: "mas-matarrana-el-olivo",
    slug: "mas-matarrana-el-olivo",
    name: "EL OLIVO",
    locationId: "mas-matarrana",
    status: "coming_soon",
    priceFrom: 110,
    sizeM2: 55,
    capacity: 4,
    bedrooms: null,
    bathrooms: 1,
    layout: "Loft abierto premium",
    description: "Un refugio rústico de lujo en Valjunquera. Loft abierto que combina paredes de piedra original, vigas de madera y diseño contemporáneo. Cocina de autor y vidrieras artesanales.",
    longDescription: "El Olivo es la joya de nuestro proyecto Mas Matarraña. Un espacio diáfano de 55 m² donde la piedra original y la madera centenaria conviven con el confort más moderno. La cocina, totalmente equipada, invita a disfrutar de los productos locales, mientras que la zona de estar destaca por su luminosidad y sus vistas al entorno de olivos. El dormitorio, integrado en el loft, cuenta con detalles únicos como sus ventanas de piedra con vidrieras artesanales. Un lugar diseñado para la desconexión total bajo los cielos más limpios de Teruel.",
    highlights: [
      "Paredes de piedra vista original y techos altos con vigas de madera",
      "Loft diáfano de 55 m² con diseño rústico-contemporáneo",
      "Dormitorio con detalles de vidrieras artesanales y mucha luz natural",
      "Cocina de autor blanca totalmente equipada con zona de comedor",
      "Zona de estar con mecedora y sofá cama para 2 personas adicionales",
      "Terreno propio con olivos centenarios — privacidad absoluta",
      "Cielo Starlight certificado para la observación de estrellas"
    ],
    photos: [
      '/assets/rooms/mas-matarrana/el-olivo/01-loft-general.jpg',
      '/assets/rooms/mas-matarrana/el-olivo/02-cocina.jpg',
      '/assets/rooms/mas-matarrana/el-olivo/03-dormitorio.jpg',
      '/assets/rooms/mas-matarrana/el-olivo/04-detalle-ventana.jpg',
      '/assets/rooms/mas-matarrana/el-olivo/05-detalle-cocina.jpg',
    ]
  },
  {
    id: "mas-matarrana-la-parra",
    slug: "mas-matarrana-la-parra",
    name: "LA PARRA",
    locationId: "mas-matarrana",
    status: "coming_soon",
    priceFrom: 110,
    sizeM2: 55,
    capacity: 4,
    bedrooms: null,
    bathrooms: 1,
    layout: "Loft abierto premium",
    description: "Loft hermano de El Olivo. Diseño diáfano, techos infinitos y vistas al jardín de olivos. Un espacio para reconectar con la naturaleza sin renunciar al estilo.",
    longDescription: "La Parra formará pareja con El Olivo en el proyecto Mas Matarraña — dos alojamientos gemelos pensados para grupos que quieren compartir el entorno pero mantener su privacidad.",
    highlights: [
      "Zona de barbacoa privada",
      "Terreno propio con olivos",
      "Cielo sin contaminación lumínica — ideal para estrellas",
      "A 30 min de El Rinconcito",
      "Cargador de coche eléctrico gratuito en el pueblo"
    ],
    photos: [
      '/assets/rooms/mas-matarrana/la-parra/01.jpg',
      '/assets/rooms/mas-matarrana/la-parra/02.jpg',
      '/assets/rooms/mas-matarrana/la-parra/03.jpg',
      '/assets/rooms/mas-matarrana/la-parra/04.jpg',
    ]
  }
];
