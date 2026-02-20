import React from 'react';
import { SiteConfigV1, BlockInstance, PageConfig } from '../types';

import { getBlockComponent } from './blocks';

interface WebsiteRendererProps {
    config: SiteConfigV1;
    currentPath?: string;
}

/**
 * Universal Renderer that loops through blocks for a given page.
 */
export const WebsiteRenderer: React.FC<WebsiteRendererProps> = ({ config, currentPath = '/' }) => {

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

                return (
                    <Component
                        key={block.id}
                        data={block.data}
                        styles={block.styles || {}}
                        variant={block.variant}
                        theme={config.theme}
                    />
                );
            })}
        </div>
    );
};
