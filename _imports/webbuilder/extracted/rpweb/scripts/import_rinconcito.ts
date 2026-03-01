
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

// Constants
const BASE_URL = 'https://www.xn--elrinconcitomatarraa-m7b.com/es';
const ROOMS = [
    {
        id: 'los-almendros',
        url: 'https://www.xn--elrinconcitomatarraa-m7b.com/es/room/8548/LOS-ALMENDROS'
    },
    {
        id: 'la-ermita',
        url: 'https://www.xn--elrinconcitomatarraa-m7b.com/es/room/8550/-quot%3BLA-ERMITA-quot%3B'
    },
    {
        id: 'la-tirolina',
        url: 'https://www.xn--elrinconcitomatarraa-m7b.com/es/room/8549/LA-TIROLINA'
    }
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const CONTENT_FILE = path.join(PROJECT_ROOT, 'src/content/apartments.ts');

// Ensure directories exist
const ensureDir = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Download image
const downloadImage = async (url: string, destPath: string) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(destPath, buffer);
        console.log(`✅ Cleaned and downloaded: ${path.basename(destPath)}`);
        return true;
    } catch (error) {
        console.error(`❌ Error downloading ${url}:`, error);
        return false;
    }
};

// Main function
const importContent = async () => {
    console.log('🚀 Starting import from elrinconcitomatarraña.com...');

    const apartmentsData: any[] = [];

    for (const room of ROOMS) {
        console.log(`\nProcessing ${room.id}...`);
        try {
            const response = await fetch(room.url);
            const html = await response.text();
            const $ = cheerio.load(html);

            // Extract Data - Refined Selectors
            const name = $('.text-box h2').text().trim() || $('h1').text().trim() || room.id;

            // Description
            // Prefer meta description as the page text is sparse/structured
            let description = $('meta[name="description"]').attr('content')?.trim() || "";
            // Clean up HTML entities in description if necessary, or cheerio handles it? Cheerio .attr() returns decoded text usually.
            // Remove trailing newlines/spaces
            description = description.replace(/\s+/g, ' ').trim();

            // Attributes from .room-card__details
            // Format: "Personas: 4 — m<sup>2</sup>: 50 — Habitaciones: 1 — Baños: 1"
            const detailsText = $('.room-card__details').text();

            let capacity: number | null = null;
            let sizeM2: number | null = null;
            let bedrooms: number | null = null;
            let bathrooms: number | null = null;

            if (detailsText) {
                const capMatch = detailsText.match(/Personas:\s*(\d+)/i);
                if (capMatch) capacity = parseInt(capMatch[1]);

                const sizeMatch = detailsText.match(/m²:\s*(\d+)/i) || detailsText.match(/m2:\s*(\d+)/i);
                // Note: cheerio .text() converts <sup>2</sup> to just 2 usually, so "m2" might appear.
                if (sizeMatch) sizeM2 = parseInt(sizeMatch[1]);

                const bedMatch = detailsText.match(/Habitaciones:\s*(\d+)/i);
                if (bedMatch) bedrooms = parseInt(bedMatch[1]);

                const bathMatch = detailsText.match(/Baños:\s*(\d+)/i);
                if (bathMatch) bathrooms = parseInt(bathMatch[1]);
            } else {
                // Fallback to body regex if details block missing
                const fullText = $('body').text();
                const capMatch = fullText.match(/(\d+)\s*(?:personas|pax|huéspedes)/i);
                if (capMatch) capacity = parseInt(capMatch[1]);
                // ... strict regexes only
            }

            // Highlights
            const highlights: string[] = [];
            $('ul.bbcode li').each((_, el) => {
                const text = $(el).text().trim();
                if (text && text.length < 100) {
                    highlights.push(text);
                }
            });
            // Filter out boring ones if needed, but "Real Content" means include them.
            const selectedHighlights = highlights.length > 0 ? highlights : ["Pendiente de confirmar"];

            // Images
            // Look for data-src on images in carousel
            const imageUrls: string[] = [];
            $('img').each((_, el) => {
                const dataSrc = $(el).attr('data-src');
                const src = $(el).attr('src');

                // Prefer data-src as it's the high-res lazy loaded one in this template
                let url = dataSrc || src;

                if (url && url.includes('http') && !url.includes('logo') && !url.includes('icon') && !url.includes('empty')) {
                    imageUrls.push(url);
                }
            });
            // De-duplicate
            const uniqueImages = [...new Set(imageUrls)].slice(0, 10); // Limit to 10 max

            // Download Images
            const roomAssetsDir = path.join(PUBLIC_DIR, 'assets', 'rooms', room.id);
            ensureDir(roomAssetsDir);

            const localPhotos: string[] = [];
            for (let i = 0; i < uniqueImages.length; i++) {
                const ext = path.extname(uniqueImages[i]) || '.jpg';
                const filename = `${String(i + 1).padStart(2, '0')}${ext}`;
                const dest = path.join(roomAssetsDir, filename);

                // Check if already exists to avoid re-downloading (optional, but good for speed if re-running)
                // User said "Update content", so we overwrite.
                const success = await downloadImage(uniqueImages[i], dest);
                if (success) {
                    localPhotos.push(`/assets/rooms/${room.id}/${filename}`);
                }
            }



            apartmentsData.push({
                id: room.id,
                slug: room.id,
                name: name,
                locationId: 'rinconcito',
                status: 'active',
                sizeM2: sizeM2,
                capacity: capacity,
                bedrooms: bedrooms,
                bathrooms: bathrooms,
                description: description || "Pendiente de confirmar",
                highlights: selectedHighlights.length > 0 ? selectedHighlights : ["Pendiente de confirmar"],
                photos: localPhotos.length > 0 ? localPhotos : [`/placeholders/${room.id}-1.svg`]
            });

        } catch (error) {
            console.error(`❌ Failed to process ${room.id}`, error);
        }
    }

    // Update apartments.ts
    // We need to keep the "coming_soon" apartments which are NOT in the website yet (assumed).
    // Read existing file to preserve them? Or just hardcode them in the template?
    // The user prompt only gave URLs for the 3 active ones.
    // I will append the hardcoded coming_soon ones to the result.

    const comingSoon = [
        {
            id: "mas-matarrana-el-olivo",
            slug: "mas-matarrana-el-olivo",
            name: "El Olivo",
            locationId: "mas-matarrana",
            status: "coming_soon",
            sizeM2: 50,
            capacity: 4,
            bedrooms: null,
            bathrooms: 1,
            layout: "Loft abierto",
            description: "Loft abierto con cocina-comedor y baño. Próximamente.",
            highlights: ["Zona de barbacoa", "Terreno privado", "Cielo abierto ideal para estrellas", "Acceso fácil"],
            photos: ["/placeholders/coming-soon-1.svg"]
        },
        {
            id: "mas-matarrana-la-parra",
            slug: "mas-matarrana-la-parra",
            name: "La Parra",
            locationId: "mas-matarrana",
            status: "coming_soon",
            sizeM2: 50,
            capacity: 4,
            bedrooms: null,
            bathrooms: 1,
            layout: "Loft abierto",
            description: "Loft abierto con cocina-comedor y baño. Próximamente.",
            highlights: ["Zona de barbacoa", "Terreno privado", "Cielo abierto ideal para estrellas", "Acceso fácil"],
            photos: ["/placeholders/coming-soon-2.svg"]
        }
    ];

    // Merge
    // Make sure to match the Apartment type interface
    const finalData = [...apartmentsData, ...comingSoon];

    const fileContent = `// NOTA: si falta un dato exacto, usar null / "Pendiente de confirmar".
// NO inventar.

export type Apartment = {
  id: string;
  slug: string;
  name: string;
  locationId: "rinconcito" | "mas-matarrana";
  status?: "active" | "coming_soon";
  sizeM2: number | null;
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  layout?: string | null;
  description: string;
  highlights: string[];
  photos: string[]; // rutas locales
};

export const APARTMENTS: Apartment[] = ${JSON.stringify(finalData, null, 2)};
`;

    fs.writeFileSync(CONTENT_FILE, fileContent);
    console.log(`\n✨ Successfully updated ${CONTENT_FILE}`);
};

importContent();
