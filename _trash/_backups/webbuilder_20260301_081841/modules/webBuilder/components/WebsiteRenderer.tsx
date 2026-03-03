import React from 'react';
import { SiteConfigV1, BlockInstance, PageConfig } from '../types';

import { getBlockComponent } from './blocks';

interface WebsiteRendererProps {
    config: SiteConfigV1;
    currentPath?: string;
    device?: 'desktop' | 'tablet' | 'mobile'; // Added for builder preview
}

/**
 * Universal Renderer that loops through blocks for a given page.
 */
export const WebsiteRenderer: React.FC<WebsiteRendererProps> = ({ config, currentPath = '/', device = 'desktop' }) => {

    // 1. Resolve Page
    const page: PageConfig | undefined = config.pages[currentPath];
    if (!page) {
        return (
            <div className="p-20 text-center text-slate-500 font-mono">
                <h2>404 - Page not found in SiteConfig</h2>
                <p>Path: {currentPath}</p>
            </div>
        );
    }

    // 2. Render Blocks
    const { blocks } = page;

    return (
        <div className="rentikpro-v1-renderer bg-white w-full min-h-screen">
            {blocks.map((block: BlockInstance) => {
                const Component = getBlockComponent(block.type);

                if (!Component) {
                    console.warn(`Block type "${block.type}" not found in registry.`);
                    return (
                        <div key={block.id} className="p-4 border border-red-200 bg-red-50 text-red-500 text-xs font-mono">
                            [Missing Block: {block.type}]
                        </div>
                    );
                }

                if (block.hidden) return null;

                // Resolve styles (Desktop -> Tablet -> Mobile inheritance or current device)
                const s = block.styles?.[device] || block.styles?.desktop || {};

                // Overlay logic
                const hasOverlay = (s.overlayOpacity || 0) > 0;

                const containerStyle: React.CSSProperties = {
                    padding: s.padding,
                    margin: s.margin,
                    backgroundColor: s.backgroundColor,
                    color: s.color,
                    textAlign: s.textAlign as any,
                    maxWidth: s.maxWidth,
                    width: '100%',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    display: s.display || 'block',
                    position: 'relative'
                };

                return (
                    <div key={block.id} style={containerStyle} className="transition-all duration-300 overflow-hidden">
                        {hasOverlay && (
                            <div
                                className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
                                style={{
                                    backgroundColor: s.overlayColor || '#000000',
                                    opacity: s.overlayOpacity
                                }}
                            />
                        )}
                        <div className="relative z-20">
                            <Component
                                data={block.data}
                                styles={block.styles || {}}
                                variant={block.variant}
                                theme={config.theme}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
