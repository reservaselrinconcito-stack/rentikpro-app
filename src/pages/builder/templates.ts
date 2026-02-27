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
        id: 'apartamento',
        name: 'Estilo Urbano/Playa',
        description: 'Limpio y moderno, enfocado en apartamentos turísticos de ciudad o costa.',
        config: {
            theme: {
                ...DEFAULT_SITE_CONFIG_V1.theme,
                colors: {
                    ...DEFAULT_SITE_CONFIG_V1.theme.colors,
                    primary: '#4f46e5',
                    background: '#ffffff',
                    accent: '#10b981'
                }
            }
        }
    },
    {
        id: 'rural',
        name: 'Estilo Rústico',
        description: 'Tonos cálidos y naturales, ideal para casas rurales y entornos de montaña.',
        config: {
            theme: {
                ...DEFAULT_SITE_CONFIG_V1.theme,
                colors: {
                    ...DEFAULT_SITE_CONFIG_V1.theme.colors,
                    primary: '#059669',
                    background: '#fefce8',
                    text: '#451a03',
                    accent: '#d97706'
                }
            }
        }
    },
    {
        id: 'complejo',
        name: 'Estilo Premium/Complejo',
        description: 'Elegancia y sobriedad para edificios de apartamentos o servicios exclusivos.',
        config: {
            theme: {
                ...DEFAULT_SITE_CONFIG_V1.theme,
                colors: {
                    ...DEFAULT_SITE_CONFIG_V1.theme.colors,
                    primary: '#1e293b',
                    background: '#fafaf9',
                    text: '#1c1917',
                    accent: '#d4af37'
                }
            }
        }
    }
];
