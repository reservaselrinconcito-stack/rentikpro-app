
import JSZip from 'jszip';
import { WebSite } from '../types';

export const importWebFromBlob = async (file: File): Promise<Partial<WebSite>> => {
    let htmlContent = '';
    let name = file.name.replace(/\.(zip|html)$/i, '');

    // 1. Extract HTML
    if (file.name.endsWith('.zip')) {
        try {
            const zip = await JSZip.loadAsync(file);
            // Try to find index.html or the first .html file
            const htmlFile = zip.file(/index\.html/i)[0] || zip.file(/\.html$/i)[0];
            if (!htmlFile) throw new Error("No se encontró ningún archivo .html en el ZIP.");
            htmlContent = await htmlFile.async("string");
        } catch (e) {
            console.error("Error reading ZIP", e);
            throw new Error("No se pudo leer el archivo ZIP.");
        }
    } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        htmlContent = await file.text();
    } else {
        throw new Error("Formato no soportado. Usa .zip o .html");
    }

    // 2. Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 3. Extract Metadata
    const seo_title = doc.querySelector('title')?.textContent?.trim() || name;
    const seo_description = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';

    // 4. Extract Hero
    const h1 = doc.querySelector('h1')?.textContent?.trim() || name;
    // Try to find a subtitle (p after h1 or first p)
    let subtitle = '';
    const h1Node = doc.querySelector('h1');
    if (h1Node && h1Node.nextElementSibling && h1Node.nextElementSibling.tagName === 'P') {
        subtitle = h1Node.nextElementSibling.textContent?.trim() || '';
    } else {
        subtitle = doc.querySelector('p')?.textContent?.trim() || '';
    }

    // Try to find a hero image (first large image or header image)
    const firstImg = doc.querySelector('img')?.getAttribute('src') || '';
    // If it's a relative path in a ZIP without assets uploaded, it won't work. 
    // We'll keep it as text ref, user can fix in builder.

    // 5. Extract Sections
    const sections: any[] = [];

    // Hero Section
    sections.push({
        id: 'hero-' + Date.now(),
        type: 'hero',
        content: {
            title: h1,
            subtitle: subtitle,
            bg_image: firstImg,
            cta_text: 'Ver más'
        }
    });

    // Content Discovery via Headings (H2)
    const headings = Array.from(doc.querySelectorAll('h2'));

    // If no headings, try to grab some body text
    if (headings.length === 0) {
        const bodyText = doc.body.textContent?.slice(0, 500).trim();
        if (bodyText) {
            sections.push({
                id: 'text-intro',
                type: 'text_image',
                content: {
                    title: 'Sobre Nosotros',
                    body: bodyText
                }
            });
        }
    }

    headings.forEach((h2, idx) => {
        const title = h2.textContent?.trim() || '';
        const titleLower = title.toLowerCase();
        let type = 'text_image';
        let content: any = { title, body: '' };

        // Heuristics
        if (titleLower.includes('contac') || titleLower.includes('ubicaci') || titleLower.includes('donde')) {
            type = 'contact';
            content = {
                title,
                email: doc.body.textContent?.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/)?.[0] || '',
                phone: doc.body.textContent?.match(/(\+?34\s?)?[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/)?.[0] || '', // Simple ES phone regex
                address: ''
            };
        } else if (titleLower.includes('alojamiento') || titleLower.includes('habitaci') || titleLower.includes('casa') || titleLower.includes('property')) {
            type = 'properties';
            content = { title, filter_ids: [] };
        } else {
            // Generic Section - Try to grab content until next H2
            let sibling = h2.nextElementSibling;
            let bodyAcc = '';
            while (sibling && sibling.tagName !== 'H2' && bodyAcc.length < 500) {
                if (sibling.tagName === 'P' || sibling.tagName === 'DIV') {
                    bodyAcc += sibling.textContent?.trim() + '\n';
                }
                sibling = sibling.nextElementSibling;
            }
            content.body = bodyAcc;
        }

        sections.push({
            id: `imported-${idx}`,
            type,
            content
        });
    });

    // Forced Footer/Contact if missed
    if (!sections.find(s => s.type === 'contact')) {
        sections.push({
            id: 'contact-auto',
            type: 'contact',
            content: {
                title: 'Contacto',
                email: '',
                phone: ''
            }
        });
    }

    // 6. Build Result
    return {
        id: crypto.randomUUID(),
        name: `Import: ${name}`,
        subdomain: name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36).slice(-4),
        template_slug: 'import',
        plan_type: 'basic',
        public_token: crypto.randomUUID(),
        is_published: false,
        status: 'draft',
        theme_config: JSON.stringify({ primary_color: '#000000' }), // Default
        seo_title,
        seo_description,
        sections_json: JSON.stringify(sections, null, 2),
        booking_config: JSON.stringify({}),
        property_ids_json: '[]',
        allowed_origins_json: '[]',
        features_json: '{}',
        created_at: Date.now(),
        updated_at: Date.now()
    };
};
