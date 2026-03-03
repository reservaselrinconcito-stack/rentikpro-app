import React from 'react';
import { HeroBlock } from './blocks/HeroBlock';
import { ApartmentsBlock } from './blocks/ApartmentsBlock';
import { SiteBlock, BlockType } from '../site-config/types';
import { RentikProSection } from './RentikProSection';

// Registry of block components
const Registry: Record<BlockType, React.FC<{ block: SiteBlock; config: any }>> = {
    'hero': HeroBlock,
    'apartments': ApartmentsBlock,
    'experiences': ({ config }) => <div className="p-20 text-center">Experiences Block (TBD)</div>,
    'blog': ({ config }) => <div className="p-20 text-center">Blog Block (TBD)</div>,
    'contact': ({ config }) => <div className="p-20 text-center">Contact Block (TBD)</div>,
    'gallery': ({ config }) => <div className="p-20 text-center">Gallery Block (TBD)</div>,
    'features': ({ config }) => <div className="p-20 text-center">Features Block (TBD)</div>,
    'map': ({ config }) => <div className="p-20 text-center">Map Block (TBD)</div>,
    'reviews': ({ config }) => <div className="p-20 text-center">Reviews Block (TBD)</div>,
    'faq': ({ config }) => <div className="p-20 text-center">FAQ Block (TBD)</div>,
    'cta': ({ config }) => <div className="p-20 text-center">CTA Block (TBD)</div>,
};

interface BlockRendererProps {
    blocks?: SiteBlock[];
    config: any;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ blocks, config }) => {
    // Si no hay bloques, generamos una estructura por defecto (backcompat)
    const effectiveBlocks = blocks && blocks.length > 0 ? blocks : [
        { id: 'hero-default', type: 'hero' as const },
        { id: 'apartments-default', type: 'apartments' as const },
    ];

    return (
        <div className="block-renderer">
            {effectiveBlocks.map((block) => {
                const Component = Registry[block.type];
                if (!Component) {
                    console.warn(`[BlockRenderer] No component found for block type: ${block.type}`);
                    return null;
                }
                return <Component key={block.id} block={block} config={config} />;
            })}

            {/* RentikPro Section usually goes fixed or as a block */}
            {!blocks && <RentikProSection />}
        </div>
    );
};
