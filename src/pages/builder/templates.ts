import { SiteConfigV1 } from '../../modules/webBuilder/types';
import { DEFAULT_SITE_CONFIG_V1 } from '../../modules/webBuilder/defaults';

export interface BuilderTemplate {
    id: string;
    name: string;
    description: string;
    config: Partial<SiteConfigV1>;
}

export const BUILDER_TEMPLATES: BuilderTemplate[] = [
    {
        id: 'minimal',
        name: 'Minimal',
        description: 'Limpia, espaciosa y centrada en la tipografía.',
        config: {
            theme: {
                ...DEFAULT_SITE_CONFIG_V1.theme,
                colors: { ...DEFAULT_SITE_CONFIG_V1.theme.colors, primary: '#000000', background: '#ffffff' }
            }
        }
    },
    {
        id: 'luxury',
        name: 'Luxury',
        description: 'Elegancia con tonos dorados y serifas premium.',
        config: {
            theme: {
                ...DEFAULT_SITE_CONFIG_V1.theme,
                colors: { ...DEFAULT_SITE_CONFIG_V1.theme.colors, primary: '#b4975a', background: '#fafaf9', text: '#1c1917' }
            }
        }
    },
    {
        id: 'conversion',
        name: 'Conversion',
        description: 'Diseñada para maximizar las reservas con CTAs vibrantes.',
        config: {
            theme: {
                ...DEFAULT_SITE_CONFIG_V1.theme,
                colors: { ...DEFAULT_SITE_CONFIG_V1.theme.colors, primary: '#4f46e5', accent: '#f59e0b', background: '#f8fafc' }
            }
        }
    },
    {
        id: 'rustic',
        name: 'Rustic',
        description: 'Tonos tierra y calidez para entornos naturales.',
        config: {
            theme: {
                ...DEFAULT_SITE_CONFIG_V1.theme,
                colors: { ...DEFAULT_SITE_CONFIG_V1.theme.colors, primary: '#78350f', background: '#fefce8', text: '#451a03' }
            }
        }
    }
];
