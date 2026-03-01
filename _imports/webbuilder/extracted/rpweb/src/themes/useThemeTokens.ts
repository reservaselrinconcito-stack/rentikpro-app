import { useMemo } from 'react';
import { useSiteConfig } from '../context/SiteConfigContext';
import { getThemeById } from './index';
import { ThemeTokens } from './types';

/**
 * Hook to retrieve theme tokens based on the current SiteConfig.
 */
export const useThemeTokens = (): ThemeTokens => {
    const siteConfig = useSiteConfig();

    const tokens = useMemo(() => {
        const themeId = siteConfig.theme?.themeId || 'modern-warm';
        return getThemeById(themeId);
    }, [siteConfig.theme?.themeId]);

    return tokens;
};
