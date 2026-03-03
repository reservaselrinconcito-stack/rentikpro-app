import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Zap } from 'lucide-react';

interface RentikBadgeProps {
    className?: string;
    theme?: 'dark' | 'light' | 'transparent';
}

export const RentikBadge: React.FC<RentikBadgeProps> = ({ className = '', theme = 'light' }) => {
    const { t } = useTranslation();
    const themes = {
        dark: 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800',
        light: 'bg-white border-stone-100 text-stone-700 hover:border-orange-200 shadow-sm',
        transparent: 'bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20'
    };

    return (
        <a
            href="/#/rentikpro"
            className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-[10px] font-bold tracking-[0.1em] transition-all border uppercase group ${themes[theme]} ${className}`}
        >
            <div className="relative">
                <ShieldCheck size={14} className="text-emerald-500 relative z-10" />
                <span className="absolute inset-0 bg-emerald-500/20 blur-sm rounded-full scale-150 group-hover:scale-200 transition-transform"></span>
            </div>
            <span>{t('common.managed_by')} <strong className="text-stone-900 group-hover:text-orange-700 transition-colors">RentikPro</strong></span>
        </a>
    );
};
