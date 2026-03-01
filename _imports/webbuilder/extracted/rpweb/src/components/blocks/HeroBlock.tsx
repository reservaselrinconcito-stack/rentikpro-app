import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Calendar, Bot, Star, Euro, Moon } from 'lucide-react';
import { useThemeTokens } from '../../themes/useThemeTokens';
import { useChat } from '../../context/ChatContext';
import { LiveEnvironmentWidget } from '../LiveEnvironmentWidget';
import { SiteBlock } from '../../site-config/types';

interface HeroBlockProps {
    block: SiteBlock;
    config: any;
}

export const HeroBlock: React.FC<HeroBlockProps> = ({ block, config }) => {
    const { t } = useTranslation();
    const { openChat } = useChat();
    const tokens = useThemeTokens();

    const title = block.title || t('hero.title', 'Bienvenidos');
    const subtitle = block.description || t('hero.subtitle', 'Desconexión total.');
    const heroImage = block.photos?.[0] || config.seo.ogImage || '';

    return (
        <section className="relative min-h-[90vh] flex items-center overflow-hidden py-20">
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-stone-900/90 z-10"></div>
                <img
                    src={heroImage}
                    alt={title}
                    className="w-full h-full object-cover animate-image-drift"
                />
            </div>

            <div className="container mx-auto px-6 relative z-20">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="text-center lg:text-left pt-12 lg:pt-0">
                        <span className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                            Premium Experience
                        </span>
                        <h1 className="text-5xl md:text-7xl lg:text-7xl xl:text-8xl font-serif text-white mb-6 leading-[0.9] tracking-tight drop-shadow-xl">
                            {title}
                        </h1>
                        <p className="text-lg md:text-2xl text-stone-200 font-light max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed shadow-black drop-shadow-md">
                            {subtitle}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
                            <Link
                                to="/disponibilidad"
                                className="px-8 py-4 text-white font-bold transition-all hover:scale-105 shadow-xl w-full sm:w-auto flex items-center justify-center gap-2"
                                style={{
                                    backgroundColor: tokens.accentColor,
                                    borderRadius: tokens.radius,
                                    boxShadow: tokens.shadow
                                }}
                            >
                                <Calendar size={18} />
                                {t('cta.checkAvailability', 'Ver disponibilidad')}
                            </Link>
                            <Link
                                to="/apartamentos"
                                className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/30 text-white rounded-full font-bold hover:bg-white/20 transition-all hover:scale-105 w-full sm:w-auto"
                                style={{ borderRadius: tokens.radius }}
                            >
                                {t('cta.viewApartments', 'Nuestros apartamentos')}
                            </Link>
                        </div>

                        <div className="mt-8 lg:text-left">
                            <button
                                onClick={openChat}
                                className="inline-flex items-center gap-2 text-stone-300 hover:text-white transition-colors text-sm font-medium tracking-wide group"
                            >
                                <Bot size={16} className="text-orange-400 group-hover:scale-110 transition-transform" />
                                ¿Tienes dudas? <span className="underline decoration-stone-500 underline-offset-4 group-hover:decoration-white">Preguntar al asistente</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-center lg:justify-end mt-12 lg:mt-0">
                        <div className="w-full max-w-sm transform hover:scale-[1.02] transition-transform duration-500">
                            <LiveEnvironmentWidget lat={40.8069} lon={0.0639} locationName={config.brand.town || 'Matarraña'} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
