
import { WebSite } from '../types';

export type TemplateId = 
  | 'WEB_CREATE_FULL' 
  | 'WEB_UPDATE_FROM_WEBSPEC' 
  | 'PAYMENTS_ONLY' 
  | 'GALLERY_ONLY' 
  | 'SEO_ONLY' 
  | 'LANDING_CAMPAIGN' 
  | 'CONTENT_AROUND_AREA' 
  | 'BUGFIX_ONLY';

// Define qué partes del objeto raíz WebSite se mantienen (además de sections)
export const CONTEXT_WHITELIST: Record<TemplateId, { rootKeys: string[], sectionTypes?: string[] } | null> = {
  WEB_CREATE_FULL: { rootKeys: ['name', 'subdomain'] },
  WEB_UPDATE_FROM_WEBSPEC: null, // Full context
  PAYMENTS_ONLY: { rootKeys: ['booking_config'], sectionTypes: ['contact', 'footer'] },
  GALLERY_ONLY: { rootKeys: ['theme_config', 'property_ids_json'], sectionTypes: ['hero', 'gallery', 'properties'] },
  SEO_ONLY: { rootKeys: ['seo_title', 'seo_description'], sectionTypes: ['hero', 'text', 'about'] },
  LANDING_CAMPAIGN: { rootKeys: ['theme_config', 'booking_config'], sectionTypes: ['header', 'footer'] },
  CONTENT_AROUND_AREA: { rootKeys: ['name', 'subdomain'], sectionTypes: ['contact', 'location', 'hero'] },
  BUGFIX_ONLY: null // Manual pasting usually
};

export interface PromptInputs {
  // Common
  concept?: string;
  audience?: string;
  tone?: string;
  style?: string;
  language?: string;
  
  // Specific
  location?: string;
  payment_methods?: string;
  campaign_goal?: string; // Landing
  campaign_dates?: string;
  campaign_offer?: string;
  area_pois?: string; // Content
  error_details?: string; // Bugfix
  
  // Meta
  current_json?: string; // Manual JSON paste
  full_context_site?: WebSite | null; // Auto-loaded context object
  preserve_structure?: boolean;
}

export interface PromptTemplate {
  id: TemplateId;
  name: string;
  description: string;
  icon: string; // Lucide icon name mapped in UI
  requiredFields: (keyof PromptInputs)[];
  inputFields: (keyof PromptInputs)[];
  buildPrompt: (inputs: PromptInputs, strictMode: boolean) => string;
}

// --- SMART TRIMMER ---
const smartTrimWebSpec = (site: WebSite, templateId: TemplateId): string => {
  const partial: any = {
    name: site.name,
    subdomain: site.subdomain
  };

  try {
    const sections = site.sections_json ? JSON.parse(site.sections_json) : [];

    switch (templateId) {
      case 'PAYMENTS_ONLY':
        partial.booking_config = site.booking_config;
        partial.sections = sections.filter((s: any) => s.type === 'contact' || s.type === 'footer');
        break;

      case 'GALLERY_ONLY':
        partial.theme_config = site.theme_config;
        partial.property_ids_json = site.property_ids_json;
        partial.sections = sections.filter((s: any) => ['hero', 'gallery', 'properties'].includes(s.type));
        break;

      case 'SEO_ONLY':
        partial.seo_title = site.seo_title;
        partial.seo_description = site.seo_description;
        partial.sections = sections.filter((s: any) => ['hero', 'text', 'about', 'services'].includes(s.type));
        break;

      case 'LANDING_CAMPAIGN':
        partial.theme_config = site.theme_config;
        partial.booking_config = site.booking_config;
        partial.sections = sections.filter((s: any) => s.type === 'header' || s.type === 'footer');
        break;

      case 'CONTENT_AROUND_AREA':
        partial.sections = sections.filter((s: any) => ['contact', 'location', 'hero'].includes(s.type));
        break;

      case 'BUGFIX_ONLY':
      case 'WEB_UPDATE_FROM_WEBSPEC':
        return JSON.stringify(site, null, 2);

      case 'WEB_CREATE_FULL':
      default:
        return JSON.stringify(partial, null, 2);
    }
  } catch (e) {
    return JSON.stringify({ error: "Invalid JSON in sections_json", raw: site.sections_json }, null, 2);
  }

  return JSON.stringify(partial, null, 2);
};

// --- PROMPT BUILDER HELPERS ---
const buildSection = (title: string, content: string) => `\n=== ${title} ===\n${content}\n`;

const SHARED_CONTEXT = "RentikPro: Plataforma de gestión. Generamos un sitio web estático para alquiler vacacional.";

const SHARED_RULES = (strict: boolean) => `
1. SIN BACKEND: Todo debe funcionar en cliente (HTML/JS/CSS).
2. CONFIGURACIÓN: El sitio debe consumir un archivo 'webspec.json' mediante fetch() para renderizarse (si se pide código) o generar dicho JSON (si se pide configuración).
3. NO INVENTAR ENDPOINTS: No existen rutas de API (/api/...).
4. UI/UX: Mobile-first obligatoriamente. Accesible (WAI-ARIA).
${strict ? '5. MODO ESTRICTO: Prohibido incluir librerías externas no solicitadas. Prohibido usar placeholders tipo "lorem ipsum" (generar texto real).' : ''}`;

export const PROMPT_TEMPLATES: Record<TemplateId, PromptTemplate> = {
  WEB_CREATE_FULL: {
    id: 'WEB_CREATE_FULL',
    name: 'Sitio Web Completo',
    description: 'Genera estructura completa: Inicio, Alojamiento, Entorno, Reservas, Contacto.',
    icon: 'LayoutTemplate',
    requiredFields: ['concept', 'language'],
    inputFields: ['concept', 'audience', 'tone', 'style', 'language', 'location', 'payment_methods'],
    buildPrompt: (inputs, strictMode) => {
      return [
        buildSection('A) CONTEXTO', SHARED_CONTEXT),
        buildSection('B) REGLAS NO NEGOCIABLES', SHARED_RULES(strictMode)),
        buildSection('C) OBJETIVO', `Generar el archivo 'webspec.json' completo que define el sitio web.`),
        buildSection('D) INPUTS', `
- Concepto: ${inputs.concept}
- Audiencia: ${inputs.audience}
- Tono: ${inputs.tone}
- Estilo: ${inputs.style}
- Idioma: ${inputs.language}
- Ubicación: ${inputs.location}
- Pagos: ${inputs.payment_methods}
`),
        buildSection('E) ENTREGABLE', `Un único objeto JSON válido con las keys: 'theme_config', 'booking_config', 'seo_title', 'seo_description', 'sections_json' (array stringified).`),
        buildSection('F) CHECKLIST', strictMode 
          ? '- JSON Válido (sin trailing commas).\n- NO Markdown fuera del bloque de código.\n- Textos finales reales (no placeholders).' 
          : '- JSON Válido.\n- Estructura lógica de secciones.')
      ].join('');
    }
  },
  
  WEB_UPDATE_FROM_WEBSPEC: {
    id: 'WEB_UPDATE_FROM_WEBSPEC',
    name: 'Actualizar Web',
    description: 'Reescribe textos o ajusta estilo basándose en la estructura actual.',
    icon: 'RefreshCw',
    requiredFields: ['current_json'],
    inputFields: ['current_json', 'concept', 'tone', 'style', 'language', 'preserve_structure'],
    buildPrompt: (inputs, strictMode) => {
      const context = inputs.full_context_site ? smartTrimWebSpec(inputs.full_context_site, 'WEB_UPDATE_FROM_WEBSPEC') : inputs.current_json;
      return [
        buildSection('A) CONTEXTO', SHARED_CONTEXT),
        buildSection('B) REGLAS NO NEGOCIABLES', `${SHARED_RULES(strictMode)}\n${inputs.preserve_structure ? '6. ESTRUCTURA CONGELADA: No añadir/borrar secciones, solo editar contenido.' : ''}`),
        buildSection('C) OBJETIVO', `Actualizar el 'webspec.json' existente según las nuevas instrucciones.`),
        buildSection('D) INPUTS', `
- WebSpec Actual:
${context}

- Cambios Solicitados: ${inputs.concept}
- Nuevo Tono: ${inputs.tone}
- Nuevo Estilo: ${inputs.style}
`),
        buildSection('E) ENTREGABLE', `El objeto JSON actualizado completo.`),
        buildSection('F) CHECKLIST', strictMode ? '- Validar sintaxis JSON rigurosamente.\n- No romper referencias de IDs.' : '- JSON Válido.')
      ].join('');
    }
  },

  PAYMENTS_ONLY: {
    id: 'PAYMENTS_ONLY',
    name: 'Configuración Pagos',
    description: 'Ajusta booking_config y textos de confianza/políticas.',
    icon: 'CreditCard',
    requiredFields: ['payment_methods'],
    inputFields: ['payment_methods', 'language', 'current_json'],
    buildPrompt: (inputs, strictMode) => {
      const context = inputs.full_context_site ? smartTrimWebSpec(inputs.full_context_site, 'PAYMENTS_ONLY') : inputs.current_json;
      return [
        buildSection('A) CONTEXTO', SHARED_CONTEXT),
        buildSection('B) REGLAS NO NEGOCIABLES', `${SHARED_RULES(strictMode)}\n${strictMode ? '6. STRICT: PROHIBIDO tocar SEO, Galería o Hero.' : ''}`),
        buildSection('C) OBJETIVO', `Configurar 'booking_config' y actualizar textos legales/pagos en footer/contacto.`),
        buildSection('D) INPUTS', `
- WebSpec Parcial (Solo Pagos):
${context}

- Métodos de Pago a integrar: ${inputs.payment_methods}
`),
        buildSection('E) ENTREGABLE', `JSON parcial o completo actualizado.`),
        buildSection('F) CHECKLIST', '- Verificar consistencia en política de cancelaciones.')
      ].join('');
    }
  },

  GALLERY_ONLY: {
    id: 'GALLERY_ONLY',
    name: 'Galería y Media',
    description: 'Actualiza imágenes y estilos visuales.',
    icon: 'Image',
    requiredFields: [],
    inputFields: ['style', 'concept', 'current_json'],
    buildPrompt: (inputs, strictMode) => {
      const context = inputs.full_context_site ? smartTrimWebSpec(inputs.full_context_site, 'GALLERY_ONLY') : inputs.current_json;
      return [
        buildSection('A) CONTEXTO', SHARED_CONTEXT),
        buildSection('B) REGLAS NO NEGOCIABLES', `${SHARED_RULES(strictMode)}\n6. Usar Placeholders si no hay URLs reales (ej. unsplash).`),
        buildSection('C) OBJETIVO', `Refrescar 'theme_config' y secciones visuales (Hero, Gallery).`),
        buildSection('D) INPUTS', `
- WebSpec Parcial:
${context}

- Nuevo Vibe Visual: ${inputs.style}
- Instrucción: ${inputs.concept}
`),
        buildSection('E) ENTREGABLE', `JSON actualizado con nuevas URLs de imagen y paleta de colores.`),
        buildSection('F) CHECKLIST', '- Imágenes responsive.\n- Paleta de colores accesible (contraste).')
      ].join('');
    }
  },

  SEO_ONLY: {
    id: 'SEO_ONLY',
    name: 'SEO & Metadatos',
    description: 'Optimiza títulos, descripciones y keywords.',
    icon: 'Search',
    requiredFields: ['location'],
    inputFields: ['location', 'audience', 'language', 'current_json'],
    buildPrompt: (inputs, strictMode) => {
      const context = inputs.full_context_site ? smartTrimWebSpec(inputs.full_context_site, 'SEO_ONLY') : inputs.current_json;
      return [
        buildSection('A) CONTEXTO', SHARED_CONTEXT),
        buildSection('B) REGLAS NO NEGOCIABLES', `${SHARED_RULES(strictMode)}\n6. No tocar estructura visual ni pagos.`),
        buildSection('C) OBJETIVO', `Optimizar 'seo_title', 'seo_description' y textos (H1, H2) para motores de búsqueda.`),
        buildSection('D) INPUTS', `
- WebSpec Parcial:
${context}

- Keywords: ${inputs.location}, ${inputs.audience}
- Idioma: ${inputs.language}
`),
        buildSection('E) ENTREGABLE', `JSON actualizado optimizado para SEO.`),
        buildSection('F) CHECKLIST', '- Meta description < 160 caracteres.\n- Title único y relevante.\n- Uso natural de keywords.')
      ].join('');
    }
  },

  LANDING_CAMPAIGN: {
    id: 'LANDING_CAMPAIGN',
    name: 'Landing Campaña',
    description: 'Crea una landing page agresiva para una oferta.',
    icon: 'Megaphone',
    requiredFields: ['campaign_goal', 'campaign_offer'],
    inputFields: ['campaign_goal', 'campaign_offer', 'campaign_dates', 'audience', 'current_json'],
    buildPrompt: (inputs, strictMode) => {
      const context = inputs.full_context_site ? smartTrimWebSpec(inputs.full_context_site, 'LANDING_CAMPAIGN') : inputs.current_json;
      return [
        buildSection('A) CONTEXTO', SHARED_CONTEXT),
        buildSection('B) REGLAS NO NEGOCIABLES', SHARED_RULES(strictMode)),
        buildSection('C) OBJETIVO', `Crear estructura WebSpec para una Landing Page de alta conversión (Campaña Temporal).`),
        buildSection('D) INPUTS', `
- Config Base:
${context}

- Objetivo Campaña: ${inputs.campaign_goal}
- Oferta: ${inputs.campaign_offer}
- Fechas: ${inputs.campaign_dates}
- Audiencia: ${inputs.audience}
`),
        buildSection('E) ENTREGABLE', `JSON WebSpec con secciones simplificadas: Hero (Oferta), Beneficios, CTA agresivo, Footer.`),
        buildSection('F) CHECKLIST', strictMode ? '- Copywriting persuasivo.\n- CTA claro y repetido.\n- Sin fugas de navegación.' : '- Estructura de landing estándar.')
      ].join('');
    }
  },

  CONTENT_AROUND_AREA: {
    id: 'CONTENT_AROUND_AREA',
    name: 'Guía de la Zona',
    description: 'Genera contenido sobre el entorno y actividades.',
    icon: 'MapPin',
    requiredFields: ['location', 'area_pois'],
    inputFields: ['location', 'area_pois', 'tone', 'current_json'],
    buildPrompt: (inputs, strictMode) => {
      const context = inputs.full_context_site ? smartTrimWebSpec(inputs.full_context_site, 'CONTENT_AROUND_AREA') : inputs.current_json;
      return [
        buildSection('A) CONTEXTO', SHARED_CONTEXT),
        buildSection('B) REGLAS NO NEGOCIABLES', SHARED_RULES(strictMode)),
        buildSection('C) OBJETIVO', `Generar sección de contenido 'Entorno' o 'Guía Local' rica en valor.`),
        buildSection('D) INPUTS', `
- WebSpec Parcial:
${context}

- Ubicación: ${inputs.location}
- Puntos de Interés: ${inputs.area_pois}
`),
        buildSection('E) ENTREGABLE', `JSON actualizado con nuevas secciones de contenido (Grid de actividades o Lista).`),
        buildSection('F) CHECKLIST', strictMode ? '- No inventar distancias o datos falsos.\n- Tono consistente con la marca.' : '- Contenido atractivo.')
      ].join('');
    }
  },

  BUGFIX_ONLY: {
    id: 'BUGFIX_ONLY',
    name: 'Reparar JSON',
    description: 'Corrige errores de sintaxis sin cambiar contenido.',
    icon: 'Wrench',
    requiredFields: ['error_details'],
    inputFields: ['current_json', 'error_details'],
    buildPrompt: (inputs, strictMode) => {
      return [
        buildSection('A) CONTEXTO', `Reparación técnica de archivo de configuración JSON.`),
        buildSection('B) REGLAS NO NEGOCIABLES', `1. NO CAMBIAR VALORES LÓGICOS.\n2. Solo corregir sintaxis (comillas, llaves, comas).`),
        buildSection('C) OBJETIVO', `Devolver un JSON válido corregido.`),
        buildSection('D) INPUTS', `
- JSON Corrupto:
${inputs.current_json}

- Error Reportado: ${inputs.error_details}
`),
        buildSection('E) ENTREGABLE', `JSON Válido.`),
        buildSection('F) CHECKLIST', '- Parseable por JSON.parse().')
      ].join('');
    }
  }
};
