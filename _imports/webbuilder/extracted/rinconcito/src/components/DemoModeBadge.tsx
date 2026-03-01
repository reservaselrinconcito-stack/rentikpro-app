import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DemoModeBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { t } = useTranslation();
    return (
        <div className={`inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${className}`}>
            <FlaskConical size={12} className="shrink-0" />
            {t('demo.badge')}
        </div>
    );
};

export const DemoModeBanner: React.FC<{ message?: string }> = ({ message }) => {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-3 text-sm">
            <FlaskConical size={16} className="shrink-0 text-amber-500" />
            <span>
                <strong>{t('demo.badge').split('—')[0].trim()}</strong>
                {' — '}
                {message ?? t('demo.banner').split('—').slice(1).join('—').trim()}
            </span>
        </div>
    );
};
