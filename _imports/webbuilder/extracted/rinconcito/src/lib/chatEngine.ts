import { EXPERIENCES } from '../content/experiences';
import { GUIDES } from '../content/guides';
import { APARTMENTS } from '../content/apartments';

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

    private static searchContent(query: string) {
        const tokens = this.tokenize(query);
        if (tokens.length === 0) return [];

        const results: { type: 'apartment' | 'guide' | 'experience', title: string, slug: string, score: number, snippet: string }[] = [];

        // 1. APARTMENTS
        APARTMENTS.forEach(apt => {
            let score = 0;
            if (this.getScore(tokens, apt.name.toLowerCase().split(' ')) > 0) score += 5;
            score += this.getScore(tokens, apt.description.toLowerCase().split(' ')) * 1;
            apt.highlights.forEach(h => {
                score += this.getScore(tokens, h.toLowerCase().split(' ')) * 0.5;
            });

            if (score > 0) {
                results.push({
                    type: 'apartment',
                    title: apt.name,
                    slug: apt.slug,
                    score,
                    snippet: `${apt.capacity} pers | ${apt.sizeM2}m² - ${apt.description.substring(0, 60)}...`
                });
            }
        });

        // 2. GUIDES
        GUIDES.forEach(guide => {
            let score = 0;
            if (this.getScore(tokens, guide.title.toLowerCase().split(' ')) > 0) score += 5;
            score += this.getScore(tokens, guide.intro.toLowerCase().split(' ')) * 1;
            guide.sections.forEach(s => {
                score += this.getScore(tokens, s.title.toLowerCase().split(' ')) * 2;
                score += this.getScore(tokens, s.paragraphs.join(' ').toLowerCase().split(' ')) * 0.5;
            });

            if (score > 0) {
                results.push({
                    type: 'guide',
                    title: guide.title,
                    slug: guide.slug,
                    score,
                    snippet: guide.seoDescription.substring(0, 80)
                });
            }
        });

        // 3. EXPERIENCES
        EXPERIENCES.forEach(exp => {
            let score = 0;
            if (this.getScore(tokens, exp.title.toLowerCase().split(' ')) > 0) score += 5;
            score += this.getScore(tokens, exp.shortSummary.toLowerCase().split(' ')) * 1;
            exp.tags.forEach(t => {
                if (tokens.includes(t.toLowerCase())) score += 3;
            });

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

    static analyze(input: string): ChatResponse {
        const lowerInput = input.toLowerCase();
        const tokens = this.tokenize(input);

        // --- INTENT DETECTION ---

        // 1. GREETING
        if (/hola|buenos|tardes|noches|hey|buenas/.test(lowerInput) && lowerInput.length < 20) {
            return {
                intent: 'GREETING',
                text: "¡Hola! 👋 Soy tu asistente del Rinconcito Matarraña. ¿En qué te puedo ayudar hoy?",
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

        // 3. EVENTS (Bike Park / Tirolina)
        if (/bike|park| dirt|salto|descenso|adrenalina|tirolina|polea|vole/.test(lowerInput)) {
            const bikePark = EXPERIENCES.find(e => e.slug === 'bike-park-fuentespalda');
            const tirolina = EXPERIENCES.find(e => e.slug === 'tirolina-fuentespalda-experiencia');

            let text = "Fuentespalda es el centro de la aventura:";
            const actions: ChatAction[] = [];

            if (/bike|park|dirt/.test(lowerInput)) {
                text = "¡El Matarraña Bike Park inaugura su Dirt Park el 28 de febrero de 2026! Acceso libre 365 días.";
                if (bikePark) actions.push({ label: "Ver Bike Park", type: "LINK", payload: `/experiencias/${bikePark.slug}` });
            } else if (/tirolina/.test(lowerInput)) {
                text = "La tirolina doble más larga de Europa está actualmente en mejoras. Reapertura prevista para VERANO 2026.";
                if (tirolina) actions.push({ label: "Ver info Tirolina", type: "LINK", payload: `/experiencias/${tirolina.slug}` });
            } else {
                if (bikePark) actions.push({ label: "Bike Park", type: "LINK", payload: `/experiencias/${bikePark.slug}` });
                if (tirolina) actions.push({ label: "Tirolina", type: "LINK", payload: `/experiencias/${tirolina.slug}` });
            }

            return { intent: 'EVENTS', text, actions };
        }

        // 4. APARTMENTS / CAPACITY
        if (/apartamento|casa|alojamiento|donde dormir|perro|mascota|capacidad|personas|niños/.test(lowerInput)) {
            if (/perro|mascota|animal/.test(lowerInput)) {
                return {
                    intent: 'APARTMENTS',
                    text: "En El Rinconcito amamos a los animales, pero para asegurar la mejor convivencia, por favor consúltanos antes de reservar si viajas con mascota.",
                    actions: [{ label: "Consultar sobre mascota", type: "ACTION", payload: "OPEN_CONTACT" }]
                };
            }
            return {
                intent: 'APARTMENTS',
                text: "Tenemos apartamentos desde 2 hasta 6 personas en Fuentespalda y próximamente nuevos lofts en Valjunquera.",
                actions: [{ label: "Ver todos los apartamentos", type: "LINK", payload: "/apartamentos" }]
            };
        }

        // 5. BATHING
        if (/baño|rio|río|poza|nadar|agua|pesquera|assut|piscina/.test(lowerInput)) {
            const guide = GUIDES.find(g => g.category === 'zonas_de_bano');
            return {
                intent: 'BATHING',
                text: "El Matarraña tiene pozas increíbles como La Pesquera o el Assut. ¡Importante! Prohibido el baño en el Parrizal.",
                actions: guide ? [
                    { label: "Guía de zonas de baño", type: "LINK", payload: `/guias/${guide.slug}` }
                ] : []
            };
        }

        // 6. STARS
        if (/estrella|cielo|noche|astro|starlight/.test(lowerInput)) {
            const guide = GUIDES.find(g => g.category === 'estrellas');
            return {
                intent: 'STARS',
                text: "Somos Reserva Starlight. El cielo de Fuentespalda y Valjunquera es de los más limpios de Europa.",
                actions: guide ? [
                    { label: "Ver Guía de Estrellas", type: "LINK", payload: `/guias/${guide.slug}` }
                ] : []
            };
        }

        // 7. PRICE
        if (/precio|cuanto cuesta|tarifas|barato|oferta/.test(lowerInput)) {
            return {
                intent: 'PRICE',
                text: "Nuestros precios son dinámicos según temporada y ocupación. La mejor forma de saber el precio exacto es consultar disponibilidad.",
                actions: [{ label: "Consultar Precios", type: "LINK", payload: "/disponibilidad" }]
            };
        }

        // 8. CONTACT / LOCATION
        if (/contacto|llamar|telefono|teléfono|donde|como llegar|ubicación|dirección/.test(lowerInput)) {
            return {
                intent: 'CONTACT',
                text: "Estamos en Fuentespalda (Teruel). Si necesitas indicaciones exactas o hablar con nosotros, aquí tienes el contacto.",
                actions: [
                    { label: "Escribir mensaje", type: "ACTION", payload: "OPEN_CONTACT" },
                    { label: "Ver ubicación", type: "LINK", payload: "/contacto" }
                ]
            };
        }

        // --- CONTENT SEARCH FALLBACK ---
        const searchResults = this.searchContent(input);
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
            text: "No estoy seguro de tener esa información ahora mismo, pero puedo preguntar a mi equipo humano por ti.",
            actions: [
                { label: "Consultar al equipo", type: "ACTION", payload: "OPEN_CONTACT" }
            ]
        };
    }
}
