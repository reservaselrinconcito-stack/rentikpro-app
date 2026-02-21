export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface StyleObject {
    padding?: string;
    margin?: string;
    backgroundColor?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    flexDirection?: 'row' | 'column';
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
    gap?: string;
    borderRadius?: string;
    maxWidth?: string;
    borderWidth?: string;
    borderColor?: string;
    borderStyle?: string;
    // Overlay (useful for Hero/Image blocks)
    overlayColor?: string;
    overlayOpacity?: number;
    // Visibility
    display?: 'block' | 'flex' | 'grid' | 'none';
}

export type ResponsiveStyles = {
    [key in Breakpoint]?: StyleObject;
};

export interface BlockInstance {
    id: string;          // Unique ID for this instance in the page
    type: string;        // 'Hero', 'Features', 'Text', 'Image', etc.
    variant?: string;    // 'A', 'B', 'C'
    data: Record<string, any>; // Component-specific content (text, image URLs, etc.)
    styles: ResponsiveStyles;  // User-overridden styles
    hidden?: boolean;    // Is this block conditionally hidden?
    locked?: boolean;    // Prevent edits/deletion?
}

export interface PageConfig {
    id: string;
    path: string;        // '/', '/about', '/contact'
    title: string;       // SEO Title
    description: string; // SEO Description
    blocks: BlockInstance[];
}

export interface DesignTokens {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        text: string;
        textMuted: string;
        border: string;
    };
    typography: {
        headingFont: string;
        bodyFont: string;
        baseSize: string; // e.g., '16px'
    };
    spacing: {
        scale: string; // e.g., '1.2'
    };
    radius: {
        global: string; // e.g., '8px'
    };
}

export interface ImageAsset {
    id: string;
    url: string;
    name: string;
    size?: number; // bytes
    type?: string; // e.g. 'image/jpeg'
    createdAt: number; // timestamp
}

export interface SiteConfigV1 {
    version: "1.0";
    slug: string;
    themeId: string;
    globalData: {
        brandName: string;
        logoUrl?: string;
        contactEmail?: string;
        contactPhone?: string;
        socialLinks?: Record<string, string>;
    };
    theme: DesignTokens;
    pages: Record<string, PageConfig>; // key is path, e.g., '/'
    assets: ImageAsset[]; // Project-level asset library
}

// Temporary export of the old interface so other files don't immediately break
// before we migrate them.
export { type SiteConfig as SiteConfigLegacy, type ApartmentSummary, type Experience, type ThemeId } from './types.legacy';
