import { SiteConfig, SiteApartment, SiteGuide, SiteExperience, SiteFAQ } from '../site-config/types';

export type ChatIntent =
    | 'AVAILABILITY'
    | 'APARTMENTS'
    | 'LOCATION'
    | 'BATHING'
    | 'STARS'
    | 'SPORT'
    | 'ACTIVITIES'
    | 'EVENTS'
    | 'PRICE'
    | 'CONTACT'
    | 'GREETING'
    | 'FAQ'
    | 'SEARCH_RESULTS'
    | 'FALLBACK';

export interface ChatAction {
    label: string;
    type: 'LINK' | 'ACTION';
    payload: string; // URL or Action Name
}

export interface ChatResponse {
    text: string;
    actions?: ChatAction[];
    intent?: ChatIntent;
}

const STOP_WORDS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'en', 'y', 'con', 'de', 'para', 'por', 'que', 'qué', 'como', 'cómo', 'donde', 'dónde', 'cuando', 'cuándo']);

export class ChatEngine {

    private static tokenize(input: string): string[] {
        return input.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(t => t.length > 2 && !STOP_WORDS.has(t));
    }

    private static getScore(tokens: string[], keywords: string[]): number {
        return tokens.reduce((count, token) => {
            if (keywords.some(k => k.includes(token) || token.includes(k))) {
                return count + 1;
            }
            return count;
        }, 0);
    }

    private static searchContent(query: string, config: SiteConfig) {
        const tokens = this.tokenize(query);
        if (tokens.length === 0) return [];

        const results: { type: 'apartment' | 'guide' | 'experience', title: string, slug: string, score: number, snippet: string }[] = [];

        // 1. APARTMENTS
        config.apartments.forEach(apt => {
            let score = 0;
            if (this.getScore(tokens, apt.name.toLowerCase().split(' ')) > 0) score += 5;
            score += this.getScore(tokens, (apt.description || '').toLowerCase().split(' ')) * 1;
            (apt.highlights || []).forEach(h => {
                score += this.getScore(tokens, h.toLowerCase().split(' ')) * 0.5;
            });

            if (score > 0) {
                results.push({
                    type: 'apartment',
                    title: apt.name,
                    slug: apt.slug,
                    score,
                    snippet: `${apt.capacity || '?'} pers | ${apt.sizeM2 || '?'}m² - ${(apt.description || '').substring(0, 60)}...`
                });
            }
        });

        // 2. GUIDES
        (config.content.guides || []).forEach(guide => {
            let score = 0;
            if (this.getScore(tokens, guide.title.toLowerCase().split(' ')) > 0) score += 5;
            // Guide content is now generic [key: string], so we check common fields if they exist
            // Assuming guide might have 'intro' or 'content' in the generic object for now, or just title
            const content = guide.content || '';
            score += this.getScore(tokens, content.toLowerCase().split(' ')) * 1;

            if (score > 0) {
                results.push({
                    type: 'guide',
                    title: guide.title,
                    slug: guide.slug,
                    score,
                    snippet: content.substring(0, 80)
                });
            }
        });

        // 3. EXPERIENCES
        config.content.experiences.forEach(exp => {
            let score = 0;
            if (this.getScore(tokens, exp.title.toLowerCase().split(' ')) > 0) score += 5;
            score += this.getScore(tokens, exp.shortSummary.toLowerCase().split(' ')) * 1;
            // Experiences are also generic, but we know they have title/shortSummary from type definition

            if (score > 0) {
                results.push({
                    type: 'experience',
                    title: exp.title,
                    slug: exp.slug,
                    score,
                    snippet: exp.shortSummary.substring(0, 80)
                });
            }
        });

        return results.sort((a, b) => b.score - a.score).slice(0, 3);
    }

    private static searchFAQs(query: string, faqs: SiteFAQ[]) {
        const tokens = this.tokenize(query);
        let bestMatch: SiteFAQ | null = null;
        let maxScore = 0;

        faqs.forEach(faq => {
            let score = 0;
            // Tags match
            if (faq.tags) {
                score += this.getScore(tokens, faq.tags.map(t => t.toLowerCase())) * 3;
            }
            // Question match
            score += this.getScore(tokens, faq.question.toLowerCase().split(' ')) * 2;

            if (score > maxScore) {
                maxScore = score;
                bestMatch = faq;
            }
        });

        return maxScore > 0 ? bestMatch : null;
    }

    static analyze(input: string, config: SiteConfig): ChatResponse {
        const lowerInput = input.toLowerCase();

        // --- 0. FAQ Search (First priority if configured) ---
        const faqs = config.content.faqs || [];
        const faqMatch = this.searchFAQs(input, faqs);
        if (faqMatch) {
            return {
                intent: 'FAQ',
                text: faqMatch.answer,
                actions: []
            };
        }

        // --- INTENT DETECTION ---

        // 1. GREETING
        if (/hola|buenos|tardes|noches|hey|buenas/.test(lowerInput) && lowerInput.length < 20) {
            return {
                intent: 'GREETING',
                text: `¡Hola! 👋 Soy tu asistente de ${config.brand.shortName || config.brand.name}. ¿En qué te puedo ayudar hoy?`,
                actions: [
                    { label: "Ver disponibilidad", type: "LINK", payload: "/disponibilidad" },
                    { label: "Ver apartamentos", type: "LINK", payload: "/apartamentos" }
                ]
            };
        }

        // 2. AVAILABILITY
        if (/disponib|libre|fecha|reserv|cuando|calendario/.test(lowerInput)) {
            return {
                intent: 'AVAILABILITY',
                text: "Puedes consultar el calendario en tiempo real aquí. Si buscas fechas concretas para grupos, dínoslo.",
                actions: [
                    { label: "Abrir Calendario", type: "LINK", payload: "/disponibilidad" },
                    { label: "Preguntar sobre fechas", type: "ACTION", payload: "OPEN_CONTACT" }
                ]
            };
        }

        // 3. APARTMENTS / CAPACITY
        if (/apartamento|casa|alojamiento|donde dormir|perro|mascota|capacidad|personas|niños/.test(lowerInput)) {
            if (/perro|mascota|animal/.test(lowerInput)) {
                // Check if there's a specific FAQ for pets, otherwise generic response
                // But since we check FAQs first, we fall here only if no specific FAQ matched well enough
                // We can provide a generic config based response if needed
                return {
                    intent: 'APARTMENTS',
                    text: "Por lo general admitimos mascotas con previo aviso. ¿Quieres que te confirme las condiciones para tu caso?",
                    actions: [{ label: "Consultar sobre mascota", type: "ACTION", payload: "OPEN_CONTACT" }]
                };
            }
            return {
                intent: 'APARTMENTS',
                text: `Tenemos varias opciones de alojamiento${config.locations?.[0]?.town ? ` en ${config.locations[0].town}` : ''}.`,
                actions: [{ label: "Ver todos los apartamentos", type: "LINK", payload: "/apartamentos" }]
            };
        }

        // 4. PRICE
        if (/precio|cuanto cuesta|tarifas|barato|oferta/.test(lowerInput)) {
            return {
                intent: 'PRICE',
                text: "Nuestros precios pueden variar según temporada. La mejor forma de saber el precio exacto es consultar disponibilidad.",
                actions: [{ label: "Consultar Precios", type: "LINK", payload: "/disponibilidad" }]
            };
        }

        // 5. CONTACT / LOCATION
        if (/contacto|llamar|telefono|teléfono|donde|como llegar|ubicación|dirección/.test(lowerInput)) {
            const loc = config.locations?.[0];
            const locText = loc ? `Estamos en ${loc.town} (${loc.province}).` : 'Estamos a tu disposición.';

            return {
                intent: 'CONTACT',
                text: `${locText} Si necesitas indicaciones exactas o hablar con nosotros, aquí tienes el contacto.`,
                actions: [
                    { label: "Escribir mensaje", type: "ACTION", payload: "OPEN_CONTACT" },
                    { label: "Ver ubicación", type: "LINK", payload: "/contacto" }
                ]
            };
        }

        // --- CONTENT SEARCH FALLBACK ---
        const searchResults = this.searchContent(input, config);
        if (searchResults.length > 0) {
            return {
                intent: 'SEARCH_RESULTS',
                text: "He encontrado estos contenidos que pueden resultarte interesantes:",
                actions: searchResults.map(r => ({
                    label: `Abrir: ${r.title}`,
                    type: "LINK",
                    payload: r.type === 'apartment' ? `/apartamentos/${r.slug}` :
                        r.type === 'guide' ? `/guias/${r.slug}` : `/experiencias/${r.slug}`
                }))
            };
        }

        // --- FINAL FALLBACK ---
        return {
            intent: 'FALLBACK',
            text: "No estoy seguro de tener esa información ahora mismo, pero puedo preguntar al equipo humano por ti.",
            actions: [
                { label: "Consultar al equipo", type: "ACTION", payload: "OPEN_CONTACT" }
            ]
        };
    }
}
