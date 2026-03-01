import { ThemeId, ThemeTokens } from './types';
import { modernWarm } from './modernWarm';
import { rusticPremium } from './rusticPremium';
import { boldConversion } from './boldConversion';
import { minimalLux } from './minimalLux';

export const themes: Record<ThemeId, ThemeTokens> = {
    'modern-warm': modernWarm,
    'rustic-premium': rusticPremium,
    'bold-conversion': boldConversion,
    'minimal-lux': minimalLux,
};

export const getThemeById = (id: string): ThemeTokens => {
    return themes[id as ThemeId] || modernWarm;
};
