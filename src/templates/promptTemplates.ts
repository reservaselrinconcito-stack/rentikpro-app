
import { WebSite } from '../../types';

export type TemplateId =
    | 'BASIC'
    | 'STANDARD'
    | 'PRO'
    | 'PRO_TOP'
    | 'WEB_CREATE_FULL'
    | 'WEB_UPDATE_FROM_WEBSPEC'
    | 'PAYMENTS_ONLY'
    | 'GALLERY_ONLY'
    | 'SEO_ONLY'
    | 'LANDING_CAMPAIGN'
    | 'CONTENT_AROUND_AREA'
    | 'BUGFIX_ONLY';

export interface PromptInputs {
    concept?: string;
    audience?: string;
    tone?: string;
    style?: string;
    language?: string;
    location?: string;
    payment_methods?: string;
    campaign_goal?: string;
    campaign_dates?: string;
    campaign_offer?: string;
    area_pois?: string;
    error_details?: string;
    current_json?: string;
    full_context_site?: WebSite | null;
    preserve_structure?: boolean;
}

export interface PromptTemplate {
    id: TemplateId;
    name: string;
    description: string;
    icon: string;
    requiredFields: (keyof PromptInputs)[];
    inputFields: (keyof PromptInputs)[];
    buildPrompt: (inputs: PromptInputs, strictMode: boolean) => string;
}

export const CONTEXT_WHITELIST: Record<TemplateId, { rootKeys: string[], sectionTypes?: string[] } | null> = {
    BASIC: { rootKeys: ['name', 'subdomain'] },
    STANDARD: { rootKeys: ['name', 'subdomain', 'theme_config'] },
    PRO: { rootKeys: ['name', 'subdomain', 'theme_config', 'booking_config'] },
    PRO_TOP: null, // Full context
    WEB_CREATE_FULL: { rootKeys: ['name', 'subdomain'] },
    WEB_UPDATE_FROM_WEBSPEC: null,
    PAYMENTS_ONLY: { rootKeys: ['booking_config'], sectionTypes: ['contact', 'footer'] },
    GALLERY_ONLY: { rootKeys: ['theme_config'], sectionTypes: ['hero', 'gallery'] },
    SEO_ONLY: { rootKeys: ['seo_title', 'seo_description'], sectionTypes: ['hero', 'text'] },
    LANDING_CAMPAIGN: { rootKeys: ['theme_config'], sectionTypes: ['header', 'footer'] },
    CONTENT_AROUND_AREA: { rootKeys: ['name'], sectionTypes: ['location'] },
    BUGFIX_ONLY: null
};

// --- HELPERS ---
const buildSection = (title: string, content: string) => `\n=== ${title} ===\n${content}\n`;

const SHARED_CONTEXT = "RentikPro: Plataforma de gestión. Generamos un sitio web estático para alquiler vacacional.";
const SHARED_RULES = (strict: boolean) => `
1. SIN BACKEND: Todo debe funcionar en cliente (HTML/JS/CSS).
2. CONFIGURACIÓN: El sitio debe consumir un archivo 'webspec.json' mediante fetch() para renderizarse o generar dicho JSON.
3. NO INVENTAR ENDPOINTS: No existen rutas de API.
4. UI/UX: Mobile-first obligatoriamente.
${strict ? '5. MODO ESTRICTO: Solo JSON válido. Sin texto explicativo adicional. Textos finales reales.' : ''}`;

const smartTrimWebSpec = (site: WebSite, templateId: TemplateId): string => {
    // Simplificado para el ejemplo, podemos usar el mismo del archivo original
    const partial: any = { name: site.name, subdomain: site.subdomain };
    // ... lógica de filtrado ...
    return JSON.stringify(partial, null, 2);
};

export const PROMPT_TEMPLATES: Record<TemplateId, PromptTemplate> = {
    BASIC: {
        id: 'BASIC',
        name: 'Básica',
        description: 'Generación rápida basada en concepto principal.',
        icon: 'Zap',
        requiredFields: ['concept', 'language'],
        inputFields: ['concept', 'language'],
        buildPrompt: (inputs, strict) => [
            buildSection('CONTEXTO', SHARED_CONTEXT),
            buildSection('REGLAS', SHARED_RULES(strict)),
            buildSection('INPUTS', `- Concepto: ${inputs.concept}\n- Idioma: ${inputs.language}`),
            buildSection('OBJETIVO', "Generar un webspec.json básico.")
        ].join('')
    },
    STANDARD: {
        id: 'STANDARD',
        name: 'Estándar',
        description: 'Define audiencia, tono y estilo visual.',
        icon: 'LayoutTemplate',
        requiredFields: ['concept', 'language'],
        inputFields: ['concept', 'audience', 'tone', 'style', 'language'],
        buildPrompt: (inputs, strict) => [
            buildSection('CONTEXTO', SHARED_CONTEXT),
            buildSection('REGLAS', SHARED_RULES(strict)),
            buildSection('INPUTS', `- Concepto: ${inputs.concept}\n- Audiencia: ${inputs.audience}\n- Tono: ${inputs.tone}\n- Estilo: ${inputs.style}\n- Idioma: ${inputs.language}`),
            buildSection('OBJETIVO', "Generar un webspec.json con diseño y textos alineados al estilo.")
        ].join('')
    },
    PRO: {
        id: 'PRO',
        name: 'Profesional',
        description: 'Incluye ubicación y métodos de pago detallados.',
        icon: 'CreditCard',
        requiredFields: ['concept', 'language', 'location'],
        inputFields: ['concept', 'audience', 'tone', 'style', 'language', 'location', 'payment_methods'],
        buildPrompt: (inputs, strict) => [
            buildSection('CONTEXTO', SHARED_CONTEXT),
            buildSection('REGLAS', SHARED_RULES(strict)),
            buildSection('INPUTS', `- Concepto: ${inputs.concept}\n- Ubicación: ${inputs.location}\n- Pagos: ${inputs.payment_methods}\n- Audiencia: ${inputs.audience}\n- Tono: ${inputs.tone}\n- Estilo: ${inputs.style}\n- Idioma: ${inputs.language}`),
            buildSection('OBJETIVO', "Generar un webspec.json profesional con reservas y ubicación optimizada.")
        ].join('')
    },
    PRO_TOP: {
        id: 'PRO_TOP',
        name: 'Pro Top',
        description: 'Refinamiento total con contexto de sitio actual.',
        icon: 'Sparkles',
        requiredFields: ['current_json'],
        inputFields: ['concept', 'audience', 'tone', 'style', 'language', 'location', 'payment_methods', 'current_json'],
        buildPrompt: (inputs, strict) => [
            buildSection('CONTEXTO', SHARED_CONTEXT),
            buildSection('REGLAS', SHARED_RULES(strict)),
            buildSection('ESTADO ACTUAL (JSON)', inputs.current_json || "{}"),
            buildSection('NUEVAS INSTRUCCIONES', `- Cambios: ${inputs.concept}\n- Audiencia: ${inputs.audience}\n- Tono: ${inputs.tone}\n- Estilo: ${inputs.style}`),
            buildSection('OBJETIVO', "Actualizar el JSON existente manteniendo la coherencia estructural.")
        ].join('')
    },

    // Backward compatibility
    WEB_CREATE_FULL: {
        id: 'WEB_CREATE_FULL',
        name: 'Sitio Web Completo (Legacy)',
        description: 'Genera estructura completa.',
        icon: 'LayoutTemplate',
        requiredFields: ['concept', 'language'],
        inputFields: ['concept', 'audience', 'tone', 'style', 'language', 'location', 'payment_methods'],
        buildPrompt: (inputs, strict) => PROMPT_TEMPLATES.STANDARD.buildPrompt(inputs, strict)
    },
    WEB_UPDATE_FROM_WEBSPEC: {
        id: 'WEB_UPDATE_FROM_WEBSPEC',
        name: 'Actualizar Web (Legacy)',
        description: 'Ajusta basándose en la estructura actual.',
        icon: 'RefreshCw',
        requiredFields: ['current_json'],
        inputFields: ['current_json', 'concept', 'tone', 'style', 'language', 'preserve_structure'],
        buildPrompt: (inputs, strict) => PROMPT_TEMPLATES.PRO_TOP.buildPrompt(inputs, strict)
    },
    PAYMENTS_ONLY: { id: 'PAYMENTS_ONLY', name: 'Pagos (Legacy)', description: '', icon: 'CreditCard', requiredFields: [], inputFields: [], buildPrompt: () => '' },
    GALLERY_ONLY: { id: 'GALLERY_ONLY', name: 'Galería (Legacy)', description: '', icon: 'Image', requiredFields: [], inputFields: [], buildPrompt: () => '' },
    SEO_ONLY: { id: 'SEO_ONLY', name: 'SEO (Legacy)', description: '', icon: 'Search', requiredFields: [], inputFields: [], buildPrompt: () => '' },
    LANDING_CAMPAIGN: { id: 'LANDING_CAMPAIGN', name: 'Landing (Legacy)', description: '', icon: 'Megaphone', requiredFields: [], inputFields: [], buildPrompt: () => '' },
    CONTENT_AROUND_AREA: { id: 'CONTENT_AROUND_AREA', name: 'Guía (Legacy)', description: '', icon: 'MapPin', requiredFields: [], inputFields: [], buildPrompt: () => '' },
    BUGFIX_ONLY: { id: 'BUGFIX_ONLY', name: 'Bugfix (Legacy)', description: '', icon: 'Wrench', requiredFields: [], inputFields: [], buildPrompt: () => '' }
};
