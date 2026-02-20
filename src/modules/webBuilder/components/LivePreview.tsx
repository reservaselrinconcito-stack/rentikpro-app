import React, { useEffect, useRef, useState } from 'react';
import { SiteConfig } from '../types';
import { Loader2, RefreshCw } from 'lucide-react';

interface LivePreviewProps {
    config: SiteConfig;
    device: 'mobile' | 'tablet' | 'desktop';
    refreshTrigger?: number; // Optional timestamp to force reload
}

export const LivePreview: React.FC<LivePreviewProps> = ({ config, device, refreshTrigger }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loading, setLoading] = useState(true);

    // Determine dimensions based on device
    const getContainerStyle = () => {
        switch (device) {
            case 'mobile': return { width: '375px', height: '100%', maxHeight: '812px' };
            case 'tablet': return { width: '768px', height: '100%' };
            case 'desktop': return { width: '100%', height: '100%' };
        }
    };

    const containerStyle = getContainerStyle();

    // Preview URL - In production this would be the actual site URL or a special preview route
    // For local dev, we might point to localhost:3000/preview or similar if it exists
    // Fallback to a data blob or srcDoc if we are generating static HTML
    // We point to the static rp-web/index.html. Logic in site.js will handle the postMessage.
    // We add ?preview=true to potentially trigger specific logic if needed, but postMessage is key.
    const previewUrl = '/rp-web/index.html?preview=true';

    useEffect(() => {
        if (iframeRef.current?.contentWindow) {
            // Send config updates to the iframe
            const message = {
                type: 'PREVIEW_UPDATE_CONFIG',
                payload: config
            };
            iframeRef.current.contentWindow.postMessage(message, '*');
        }
    }, [config]);

    const handleLoad = () => {
        setLoading(false);
        // Initial config push on load
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'PREVIEW_UPDATE_CONFIG',
                payload: config
            }, '*');
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-200/50 overflow-hidden">

            {/* Device Frame */}
            <div
                className={`transition-all duration-500 ease-in-out relative shadow-2xl ${device === 'mobile' ? 'rounded-[3rem] border-8 border-slate-800 bg-slate-800' : 'rounded-lg border border-slate-300 bg-white'}`}
                style={containerStyle}
            >
                {/* Mobile Notch/Camera (Visual/Cosmetic) */}
                {device === 'mobile' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20 pointer-events-none"></div>
                )}

                {/* Loading Overlay */}
                {loading && (
                    <div className="absolute inset-0 bg-white z-10 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 size={32} className="text-indigo-600 animate-spin" />
                            <span className="text-xs font-bold text-slate-400">Cargando vista previa...</span>
                        </div>
                    </div>
                )}

                <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    className={`w-full h-full bg-white ${device === 'mobile' ? 'rounded-[2.5rem]' : 'rounded-lg'}`}
                    onLoad={handleLoad}
                    title="Live Preview"
                />
            </div>

            {/* Device Label */}
            <div className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                {device === 'mobile' && 'iPhone 13 / Mobile View'}
                {device === 'tablet' && 'iPad / Tablet View'}
                {device === 'desktop' && 'Desktop / Full Width'}
                {loading && <Loader2 size={10} className="animate-spin" />}
            </div>
        </div>
    );
};
