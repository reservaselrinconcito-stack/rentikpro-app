import React from 'react';
import { SiteConfigV1 } from '../types';
import { WebsiteRenderer } from './WebsiteRenderer';

interface LivePreviewProps {
    config: SiteConfigV1;
    device: 'mobile' | 'tablet' | 'desktop';
}

export const LivePreview: React.FC<LivePreviewProps> = ({ config, device }) => {

    const getContainerStyle = () => {
        switch (device) {
            case 'mobile': return { width: '375px', height: '100%', maxHeight: '812px' };
            case 'tablet': return { width: '768px', height: '100%' };
            case 'desktop': return { width: '100%', height: '100%' };
        }
    };

    const containerStyle = getContainerStyle();

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-200/50 overflow-hidden">
            <div
                className={`transition-all duration-500 ease-in-out relative shadow-2xl flex flex-col ${device === 'mobile' ? 'rounded-[3rem] border-8 border-slate-800 bg-slate-800' : 'rounded-lg border border-slate-300 bg-white'}`}
                style={containerStyle}
            >
                {device === 'mobile' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20 pointer-events-none"></div>
                )}

                <div className={`w-full h-full bg-white overflow-y-auto relative ${device === 'mobile' ? 'rounded-[2.5rem]' : 'rounded-lg'}`}>
                    <WebsiteRenderer config={config} currentPath="/" />
                </div>
            </div>

            <div className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                {device === 'mobile' && 'iPhone 13 / Mobile View'}
                {device === 'tablet' && 'iPad / Tablet View'}
                {device === 'desktop' && 'Desktop / Full Width'}
            </div>
        </div>
    );
};
