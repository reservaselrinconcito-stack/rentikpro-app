import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Calendar, User, Share2, ArrowLeft, Clock } from 'lucide-react';
import { useSiteConfig } from '../site-config/useSiteConfig';
import { useThemeTokens } from '../themes/useThemeTokens';

const BlogDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();
    const tokens = useThemeTokens();

    const blogPosts = siteConfig.content.blog || [];
    const post = blogPosts.find(p => p.slug === slug);

    if (!post) {
        return <Navigate to="/blog" replace />;
    }

    return (
        <div className="min-h-screen bg-white pb-20" style={{ fontSize: `${tokens.fontScale}rem` }}>
            {/* Dynamic Header */}
            <header className="pt-32 pb-16 bg-stone-50 border-b border-stone-100">
                <div className="container mx-auto px-6 max-w-4xl text-center">
                    <div className="mb-8">
                        <Link to="/blog" className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-900 transition-colors text-[10px] font-black uppercase tracking-widest">
                            <ArrowLeft size={16} /> Volver al Blog
                        </Link>
                    </div>
                    <span className="text-white text-[10px] font-black uppercase px-4 py-1.5 mb-8 inline-block shadow-sm" style={{ backgroundColor: tokens.accentColor, borderRadius: tokens.radius }}>
                        {post.category || 'Actualidad'}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-serif text-stone-900 mb-10 leading-[1.15]">
                        {post.title}
                    </h1>
                    <div className="flex items-center justify-center gap-8 text-stone-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        <span className="flex items-center gap-2"><Calendar size={14} className="text-orange-500" /> {post.date}</span>
                        <span className="flex items-center gap-2"><User size={14} className="text-orange-500" /> {post.author}</span>
                        <span className="flex items-center gap-2 md:flex hidden"><Clock size={14} className="text-orange-500" /> 5 min lectura</span>
                    </div>
                </div>
            </header>

            {/* Featured Image */}
            {post.imageUrl && (
                <div className="container mx-auto px-6 max-w-6xl -mt-8 relative z-10">
                    <div className="aspect-[21/9] overflow-hidden shadow-2xl border-8 border-white" style={{ borderRadius: tokens.radius }}>
                        <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="container mx-auto px-6 max-w-3xl mt-16">
                <article className="prose prose-stone prose-lg max-w-none">
                    <div className="text-stone-600 font-light leading-relaxed whitespace-pre-wrap text-lg">
                        {post.content}
                    </div>
                </article>

                <div className="mt-20 pt-12 border-t border-stone-100 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-stone-900 flex items-center justify-center text-white font-serif text-xl">
                            {post.author?.[0] || 'T'}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Escrito por</p>
                            <p className="text-stone-900 font-serif text-lg">{post.author}</p>
                        </div>
                    </div>
                    <button
                        className="flex items-center gap-3 bg-stone-50 px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-stone-100 transition-colors border border-stone-200 shadow-sm"
                        style={{ color: tokens.primaryColor, borderRadius: tokens.radius }}
                    >
                        <Share2 size={16} /> Compartir este artículo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BlogDetail;
