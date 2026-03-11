import React from 'react';
import { X, Check } from 'lucide-react';
import { WEBPRO_THEMES, WebProTheme } from '../themes';
import { DesignTokens } from '../types';

interface ThemePickerProps {
    currentTheme: DesignTokens;
    onApply: (tokens: DesignTokens) => void;
    onClose: () => void;
}

export const ThemePicker: React.FC<ThemePickerProps> = ({ currentTheme, onApply, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-16">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-[101] bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Temas WebPro</h2>
                        <p className="text-slate-400 text-sm mt-1">Cambia el diseño completo de tu sitio con un clic</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 rounded-2xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Theme grid */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {WEBPRO_THEMES.map(theme => (
                            <ThemeCard
                                key={theme.id}
                                theme={theme}
                                isActive={currentTheme.colors.primary === theme.tokens.colors.primary}
                                onApply={() => { onApply(theme.tokens); onClose(); }}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <p className="text-[11px] text-slate-400 text-center">
                        Los temas cambian colores y tipografías en todo el sitio. El contenido se mantiene intacto.
                    </p>
                </div>
            </div>
        </div>
    );
};

// ─── Theme Card ────────────────────────────────────────────────────────────────

const ThemeCard: React.FC<{
    theme: WebProTheme;
    isActive: boolean;
    onApply: () => void;
}> = ({ theme, isActive, onApply }) => {
    const { colors } = theme.tokens;

    return (
        <button
            onClick={onApply}
            className={`group relative flex flex-col rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 hover:shadow-xl ${isActive
                    ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
        >
            {/* Color preview */}
            <div style={{ backgroundColor: colors.primary }} className="h-16 w-full relative">
                {/* Mini site preview */}
                <div className="absolute inset-x-0 bottom-0 h-8 flex items-end pb-1.5 px-2 gap-1">
                    <div style={{ backgroundColor: colors.surface }} className="h-1.5 rounded-full w-8 opacity-80" />
                    <div style={{ backgroundColor: colors.surface }} className="h-1.5 rounded-full w-5 opacity-60" />
                    <div style={{ backgroundColor: colors.accent }} className="h-2 rounded-full w-4 ml-auto" />
                </div>
            </div>

            {/* Surface preview */}
            <div style={{ backgroundColor: colors.surface }} className="h-10 px-2 pt-1.5 flex flex-col gap-1 justify-center">
                <div style={{ backgroundColor: colors.text, opacity: 0.8 }} className="h-1.5 rounded-full w-12" />
                <div style={{ backgroundColor: colors.textMuted, opacity: 0.4 }} className="h-1 rounded-full w-8" />
            </div>

            {/* Color dots */}
            <div style={{ backgroundColor: colors.background }} className="p-2 flex items-center gap-1">
                {[colors.primary, colors.accent, colors.text].map((c, i) => (
                    <div key={i} className="w-3 h-3 rounded-full border border-white/50" style={{ backgroundColor: c }} />
                ))}
                <div className="ml-auto">
                    {isActive && <Check size={12} className="text-indigo-600" />}
                </div>
            </div>

            {/* Label */}
            <div style={{ backgroundColor: colors.background }} className="px-2 pb-2">
                <p className="text-[10px] font-black text-center" style={{ color: colors.text }}>
                    {theme.emoji} {theme.name}
                </p>
            </div>

            {/* Active indicator */}
            {isActive && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
                    <Check size={10} className="text-white" />
                </div>
            )}
        </button>
    );
};
