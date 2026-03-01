import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight, Calendar, User, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { useSiteConfig } from '../site-config/useSiteConfig';
import { useThemeTokens } from '../themes/useThemeTokens';

const Blog: React.FC = () => {
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();
    const tokens = useThemeTokens();
    const blogPosts = siteConfig.content.blog || [];

    return (
        <div className="min-h-screen bg-stone-50 pt-24 pb-20" style={{ fontSize: `${tokens.fontScale}rem` }}>
            <div className="container mx-auto px-6">
                {/* Header */}
                <div className="max-w-3xl mb-16 text-center mx-auto">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 block" style={{ color: tokens.accentColor }}>
                        {siteConfig.brand.shortName} Blog
                    </span>
                    <h1 className="text-4xl md:text-6xl font-serif text-stone-900 mb-6 font-medium">
                        Historias del Matarraña
                    </h1>
                    <p className="text-stone-500 text-lg font-light leading-relaxed">
                        Noticias, eventos y reflexiones sobre la vida en el campo y la magia de nuestro territorio.
                    </p>
                </div>

                {blogPosts.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
                        {blogPosts.map((post) => (
                            <Link
                                to={`/blog/${post.slug}`}
                                key={post.slug}
                                className="group overflow-hidden transition-all duration-500 border border-stone-100 flex flex-col"
                                style={{
                                    backgroundColor: tokens.secondaryBg || 'white',
                                    borderRadius: tokens.radius,
                                    boxShadow: tokens.shadow
                                }}
                            >
                                <div className="aspect-[16/10] overflow-hidden relative">
                                    <img
                                        src={post.imageUrl}
                                        alt={post.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                    />
                                    <div className="absolute top-6 left-6">
                                        <span className="text-white text-[10px] font-black uppercase px-4 py-1 shadow-sm" style={{ backgroundColor: tokens.accentColor, borderRadius: tokens.radius }}>
                                            {post.category || 'Actualidad'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-10 flex flex-col grow">
                                    <div className="flex items-center gap-4 text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                                        <span className="flex items-center gap-1.5"><Calendar size={12} className="text-orange-500" /> {post.date}</span>
                                        <span className="flex items-center gap-1.5"><User size={12} className="text-orange-500" /> {post.author}</span>
                                    </div>
                                    <h3 className="text-2xl font-serif text-stone-900 mb-4 group-hover:text-orange-600 transition-colors leading-tight">
                                        {post.title}
                                    </h3>
                                    <p className="text-stone-500 text-sm font-light leading-relaxed mb-8 line-clamp-3">
                                        {post.excerpt}
                                    </p>
                                    <div className="mt-auto pt-6 border-t border-stone-50 flex items-center justify-between group-hover:border-orange-100 transition-colors">
                                        <span className="text-[10px] font-black text-stone-900 uppercase tracking-widest flex items-center gap-2">
                                            Leer más <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div
                        className="max-w-2xl mx-auto text-center py-20 px-8 border border-stone-100 shadow-sm relative overflow-hidden group"
                        style={{ backgroundColor: tokens.secondaryBg || 'white', borderRadius: tokens.radius }}
                    >
                        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: tokens.accentColor }}></div>
                        <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-full bg-stone-50 group-hover:scale-110 transition-transform duration-500" style={{ color: tokens.accentColor }}>
                            <Sparkles size={40} />
                        </div>
                        <h2 className="text-3xl font-serif text-stone-900 mb-4">Blog en preparación</h2>
                        <p className="text-stone-500 font-light leading-relaxed mb-8">
                            Estamos preparando los primeros artículos para compartir contigo la esencia de {siteConfig.brand.name} y las novedades de la temporada.
                        </p>
                        <div className="inline-flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
                            <span className="w-8 h-[1px] bg-stone-200"></span>
                            Llegando pronto
                            <span className="w-8 h-[1px] bg-stone-200"></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Blog;
