import React, { useState } from 'react';

// Local gradient fallback — never depends on external images
const FALLBACK_GRADIENT = 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)';

function HeroImage({ src, alt, style, className }: { src?: string; alt: string; style?: React.CSSProperties; className?: string }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return <div className={className} style={{ ...style, background: FALLBACK_GRADIENT, width: '100%', height: '100%' }} />;
    }
    return (
        <img
            src={src}
            alt={alt}
            className={className}
            style={style}
            onError={() => setFailed(true)}
        />
    );
}

export const Hero: React.FC<{ data: any; styles?: any; variant?: string; theme?: any }> = ({ data, variant = 'A' }) => {
    const {
        imageUrl,
        title = 'Tu Descanso Perfecto',
        subtitle = 'Descubre alojamientos exclusivos diseñados para tu confort y relajación.',
        kicker = 'Experiencias Únicas',
        ctaLabel = 'Alojamientos',
        ctaHref = '#apartments',
        secondaryCtaLabel,
        secondaryCtaHref = '#contact',
        imageFocal = { x: 50, y: 50 },
        imageFit = 'cover'
    } = data;

    const imageStyle: React.CSSProperties = {
        objectPosition: `${imageFocal.x}% ${imageFocal.y}%`,
        objectFit: imageFit as any,
        width: '100%',
        height: '100%',
    };

    if (variant === 'B') {
        return (
            <section className="w-full flex flex-col lg:flex-row min-h-[600px] h-auto lg:h-[80vh] relative overflow-hidden">
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-20 order-2 lg:order-1 z-10">
                    <div className="max-w-xl">
                        <span className="uppercase tracking-[0.2em] text-xs font-bold mb-4 text-indigo-600 block">{kicker}</span>
                        <h1 className="text-5xl lg:text-7xl font-black mb-6 leading-tight text-slate-900">{title}</h1>
                        <p className="text-lg text-slate-600 font-medium mb-10 leading-relaxed">{subtitle}</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a href={ctaHref} className="bg-indigo-600 text-white hover:bg-slate-900 px-8 py-4 rounded-xl font-bold transition-colors shadow-lg text-center">{ctaLabel}</a>
                            {secondaryCtaLabel && <a href={secondaryCtaHref} className="bg-white text-slate-800 border border-slate-200 hover:bg-slate-100 px-8 py-4 rounded-xl font-bold text-center">{secondaryCtaLabel}</a>}
                        </div>
                    </div>
                </div>
                <div className="w-full lg:w-1/2 h-[400px] lg:h-full order-1 lg:order-2 overflow-hidden relative">
                    <HeroImage src={imageUrl} alt="Hero" className="absolute inset-0" style={imageStyle} />
                    <div className="absolute inset-0 bg-indigo-900/10 mix-blend-overlay" />
                </div>
            </section>
        );
    }

    if (variant === 'C') {
        return (
            <section className="w-full min-h-[500px] py-24 lg:py-32 flex flex-col items-center justify-center text-slate-900 px-6">
                <div className="max-w-4xl text-center mb-16">
                    <span className="bg-slate-100 text-slate-500 uppercase tracking-widest text-[10px] font-black px-4 py-2 rounded-full mb-8 inline-block">{kicker}</span>
                    <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tight">{title}</h1>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12">{subtitle}</p>
                    <a href={ctaHref} className="bg-slate-900 text-white hover:bg-indigo-600 px-10 py-5 rounded-full font-black tracking-wide transition-colors">{ctaLabel}</a>
                </div>
                <div className="w-full max-w-6xl h-[300px] md:h-[400px] rounded-[3rem] overflow-hidden shadow-2xl relative">
                    <HeroImage src={imageUrl} alt="Hero Minimal" className="absolute inset-0" style={imageStyle} />
                </div>
            </section>
        );
    }

    // Default Variant A: Image Background + Overlay
    return (
        <section className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
                <HeroImage src={imageUrl} alt="Hero Background" className="absolute inset-0" style={imageStyle} />
                <div className="absolute inset-0 bg-slate-900/50" />
            </div>
            <div className="relative z-10 container mx-auto px-6 text-center text-white flex flex-col items-center">
                <span className="uppercase tracking-[0.3em] text-sm font-bold mb-6 opacity-90">{kicker}</span>
                <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight drop-shadow-lg">{title}</h1>
                <p className="text-lg md:text-xl md:max-w-2xl font-medium mb-10 opacity-90 drop-shadow">{subtitle}</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <a href={ctaHref} className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 rounded-full font-bold transition-all shadow-xl text-center">{ctaLabel}</a>
                    {secondaryCtaLabel && <a href={secondaryCtaHref} className="bg-slate-900/30 backdrop-blur-md text-white border border-white/30 hover:bg-white/10 px-8 py-4 rounded-full font-bold transition-all text-center">{secondaryCtaLabel}</a>}
                </div>
            </div>
        </section>
    );
};
