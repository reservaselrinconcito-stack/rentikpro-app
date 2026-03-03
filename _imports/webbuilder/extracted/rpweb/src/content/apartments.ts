// Datos verificados directamente de www.elrinconcitomatarraña.com
// Precios confirmados: Los Almendros y La Ermita desde 90€/noche, La Tirolina desde 150€/noche
// Propietarios: Toni y Evelyn | Licencia turística: 2021-E-RC-453

export type Apartment = {
  id: string;
  slug: string;
  name: string;
  locationId: "rinconcito" | "mas-matarrana";
  status?: "active" | "coming_soon";
  priceFrom: number; // €/noche
  sizeM2: number | null;
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  layout?: string | null;
  description: string;
  longDescription: string;
  highlights: string[];
  photos: string[];
};

export const APARTMENTS: Apartment[] = [
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
    description: "Acogedor y luminoso, perfecto para familias o grupos de hasta 4 personas (2 adultos más dos niños). Cocina equipada, salón amplio y preciosas vistas a la naturaleza del Matarraña.",
    longDescription: "Los Almendros es el hogar ideal para quienes buscan confort sin renunciar a la autenticidad rural. El salón amplio y luminoso, con TV y equipo de música, invita al relax después de un día de excursiones. La cocina está completamente equipada para que prepares lo que quieras. La habitación doble con cama de 160 cm garantiza un descanso perfecto, y el sofá cama permite alojar cómodamente a dos niños más. El resultado es un espacio con todo lo que necesitas y nada que sobre.",
    highlights: [
      "Salón amplio con TV y equipo de música",
      "Cocina totalmente equipada (menaje completo, microondas, lavadora)",
      "Habitación con cama doble matrimonial 160 cm",
      "Sofá cama para hasta 2 niños",
      "Servicio de limpieza incluido",
      "Zona de juegos infantil compartida",
      "Vistas a la naturaleza del Matarraña",
      "Ubicación en calle tranquila y silenciosa de Fuentespalda"
    ],
    photos: [
      "/assets/rooms/los-almendros/01.webp",
      "/assets/rooms/los-almendros/03.png",
      "/assets/rooms/los-almendros/04.png",
      "/assets/rooms/los-almendros/05.png",
      "/assets/rooms/los-almendros/06.png",
      "/assets/rooms/los-almendros/07.png",
      "/assets/rooms/los-almendros/08.png",
      "/assets/rooms/los-almendros/09.png",
      "/assets/rooms/los-almendros/02.gif",
      "/assets/rooms/los-almendros/10.gif"
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
    description: "Ideal para parejas que buscan tranquilidad. Cama de matrimonio, ambiente rústico con detalles modernos y todo lo necesario para una escapada romántica en el Matarraña.",
    longDescription: "La Ermita es nuestro apartamento más especial para parejas. Decorado con muy buen gusto y cuidado hasta el último detalle, mezcla lo rústico con lo moderno de forma elegante. La cama doble de 160 cm ocupa el protagonismo de la habitación, pero el sofá cama también permite traer a los peques. La cocina equipada te da independencia total para tus comidas. Un espacio donde desconectar de verdad.",
    highlights: [
      "Salón con TV y equipo de música",
      "Cocina totalmente equipada (menaje completo, microondas, lavadora)",
      "Habitación con cama doble matrimonial 160 cm",
      "Sofá cama para hasta 2 niños",
      "Servicio de limpieza incluido",
      "Decoración rústica de gran gusto con detalles modernos",
      "Ambiente romántico y tranquilo",
      "Ubicación en calle silenciosa en el corazón de Fuentespalda"
    ],
    photos: [
      "/assets/rooms/la-ermita/01.webp",
      "/assets/rooms/la-ermita/03.png",
      "/assets/rooms/la-ermita/04.png",
      "/assets/rooms/la-ermita/05.png",
      "/assets/rooms/la-ermita/06.png",
      "/assets/rooms/la-ermita/07.png",
      "/assets/rooms/la-ermita/08.png",
      "/assets/rooms/la-ermita/09.png",
      "/assets/rooms/la-ermita/02.gif",
      "/assets/rooms/la-ermita/10.gif"
    ]
  },
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
    description: "Espacioso y funcional, con capacidad para 6 personas (4 adultos y dos niños). 95 m² de estilo rural auténtico con dos habitaciones y dos baños. El apartamento más grande para grupos y familias.",
    longDescription: "La Tirolina es nuestro apartamento estrella para grupos y familias numerosas. Con 95 m² distribuidos en dos habitaciones (cada una con cama doble de 160 cm y baño propio) más sofá cama, ofrece la comodidad de un hogar sin perder el encanto rural. El salón es amplio, la cocina totalmente equipada y el ambiente hogareño perfecto para relajarse tras un día de aventuras. Con dos baños completos, las mañanas son un placer para todos.",
    highlights: [
      "2 habitaciones con cama doble matrimonial 160 cm cada una",
      "2 baños completos (uno por habitación)",
      "Salón amplio con TV y equipo de música",
      "Cocina totalmente equipada (menaje completo, microondas, lavadora)",
      "Sofá cama para hasta 2 niños",
      "Servicio de limpieza incluido",
      "95 m² de espacio — el apartamento más grande",
      "Ideal para dos familias o grupos de amigos"
    ],
    photos: [
      "/assets/rooms/la-tirolina/01.webp",
      "/assets/rooms/la-tirolina/03.png",
      "/assets/rooms/la-tirolina/04.png",
      "/assets/rooms/la-tirolina/05.png",
      "/assets/rooms/la-tirolina/06.png",
      "/assets/rooms/la-tirolina/07.png",
      "/assets/rooms/la-tirolina/08.png",
      "/assets/rooms/la-tirolina/09.png",
      "/assets/rooms/la-tirolina/02.gif",
      "/assets/rooms/la-tirolina/10.gif"
    ]
  },
  {
    id: "mas-matarrana-el-olivo",
    slug: "mas-matarrana-el-olivo",
    name: "El Olivo",
    locationId: "mas-matarrana",
    status: "coming_soon",
    priceFrom: 90,
    sizeM2: 50,
    capacity: 4,
    bedrooms: null,
    bathrooms: 1,
    layout: "Loft abierto",
    description: "Loft abierto con cocina-comedor y baño. Próximamente en Valjunquera.",
    longDescription: "El Olivo será parte del nuevo proyecto Mas Matarraña en Valjunquera — dos refugios gemelos diseñados para fundirse con el paisaje de olivos centenarios.",
    highlights: [
      "Zona de barbacoa privada",
      "Terreno propio con olivos",
      "Cielo sin contaminación lumínica — ideal para estrellas",
      "A 30 min de El Rinconcito"
    ],
    photos: ["/placeholders/coming-soon-1.svg"]
  },
  {
    id: "mas-matarrana-la-parra",
    slug: "mas-matarrana-la-parra",
    name: "La Parra",
    locationId: "mas-matarrana",
    status: "coming_soon",
    priceFrom: 90,
    sizeM2: 50,
    capacity: 4,
    bedrooms: null,
    bathrooms: 1,
    layout: "Loft abierto",
    description: "Loft abierto con cocina-comedor y baño. Próximamente en Valjunquera.",
    longDescription: "La Parra formará pareja con El Olivo en el proyecto Mas Matarraña — dos alojamientos gemelos pensados para grupos que quieren compartir el entorno pero mantener su privacidad.",
    highlights: [
      "Zona de barbacoa privada",
      "Terreno propio con olivos",
      "Cielo sin contaminación lumínica — ideal para estrellas",
      "A 30 min de El Rinconcito"
    ],
    photos: ["/placeholders/coming-soon-2.svg"]
  }
];
