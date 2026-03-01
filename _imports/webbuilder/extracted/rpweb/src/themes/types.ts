export interface ThemeTokens {
    /** Border radius for cards and buttons (e.g. "0.5rem", "1.5rem", "9999px") */
    radius: string;
    /** Box shadow for cards and interactive elements */
    shadow: string;
    /** Scaling factor for font sizes (1.0 = default) */
    fontScale: number;
    /** Scaling factor for spacing/padding (1.0 = default) */
    spacingScale: number;
    /** Main brand color (hex or hsl) */
    primaryColor: string;
    /** Accent color for highlights and special elements */
    accentColor: string;
    /** Secondary background shade (e.g. for card backgrounds) */
    secondaryBg: string;
}

export type ThemeId = 'modern-warm' | 'rustic-premium' | 'bold-conversion' | 'minimal-lux';
