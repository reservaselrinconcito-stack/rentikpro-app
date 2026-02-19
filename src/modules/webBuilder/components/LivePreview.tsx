import React, { useEffect, useRef, useState } from 'react';
import { SiteConfig } from '../types';
import { RefreshCw, ExternalLink } from 'lucide-react';

interface LivePreviewProps {
    config: SiteConfig;
    className?: string;
    device?: 'mobile' | 'desktop';
}

const PREVIEW_BASE_URL = import.meta.env.VITE_PUBLIC_WEB_BASE || 'https://rp-web-6h9.pages.dev';

export const LivePreview: React.FC<LivePreviewProps> = ({ config, className = '', device = 'desktop' }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loading, setLoading] = useState(true);
    const [lastSentConfig, setLastSentConfig] = useState<string>('');

    // Debounced update
    useEffect(() => {
        const timer = setTimeout(() => {
            if (iframeRef.current && iframeRef.current.contentWindow) {
                // Only send if changed to avoid unnecessary re-renders in iframe if it listens carefully
                const json = JSON.stringify(config);
                if (json !== lastSentConfig) {
                    console.log("[Preview] Sending config update to iframe", config.slug);
                    iframeRef.current.contentWindow.postMessage({
                        type: 'PREVIEW_UPDATE',
                        config: config
                    }, '*');
                    setLastSentConfig(json);
                }
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [config, lastSentConfig]);

    // Construct URL
    // We use ?preview=1 to tell rp-web to listen to messages or look in localStorage
    // We use slug=... to match the route
    const previewUrl = `${PREVIEW_BASE_URL}/?slug=${encodeURIComponent(config.slug || 'demo')}&preview=1&t=${Date.now()}`;

    // Initial load handler
    const handleLoad = () => {
        setLoading(false);
        // Send immediate update after load just in case
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'PREVIEW_UPDATE',
                config: config
            }, '*');
        }
    };

    const refresh = () => {
        setLoading(true);
        if (iframeRef.current) {
            iframeRef.current.src = iframeRef.current.src;
        }
    };

    return (
        <div className={`relative flex flex-col bg-slate-100 overflow-hidden transition-all duration-500 border-x border-slate-200 ${className} ${device === 'mobile' ? 'items-center justify-center p-8' : 'w-full h-full'}`}>

            {/* Device Frame */}
            <div className={`relative bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ${device === 'mobile'
                    ? 'w-[375px] h-[667px] rounded-[3rem] border-[8px] border-slate-800'
                    : 'w-full h-full'
                }`}>

                {/* Desktop Address Bar */}
                {device === 'desktop' && (
                    <div className="bg-slate-50 border-b border-slate-200 p-2 flex items-center gap-2 px-4 shrink-0">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                        </div>
                        <div className="flex-1 bg-white border border-slate-200 rounded-md h-7 mx-4 flex items-center px-3 justify-between text-xs text-slate-500 font-mono">
                            <span>{PREVIEW_BASE_URL}/?slug={config.slug}</span>
                            <button onClick={refresh} className="hover:text-indigo-600"><RefreshCw size={12} /></button>
                        </div>
                    </div>
                )}

                {/* Iframe */}
                <div className="flex-1 relative bg-white">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    )}
                    <iframe
                        ref={iframeRef}
                        src={previewUrl}
                        className="w-full h-full border-0"
                        onLoad={handleLoad}
                        title="Live Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups" // Ensure security but allow execution
                    />

                    {/* Overlay if Slug is invalid/empty */}
                    {(!config.slug || config.slug.length < 3) && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center z-20">
                            <p className="font-bold text-lg mb-2">Vista Previa no disponible</p>
                            <p className="text-sm opacity-80">Define un "Slug" válido en la pestaña Publicar para ver tu web.</p>
                        </div>
                    )}
                </div>
            </div>

            {device === 'mobile' && (
                <div className="absolute bottom-4 text-slate-400 text-xs font-mono">iPhone SE View</div>
            )}
        </div>
    );
};
