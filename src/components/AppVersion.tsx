import React from 'react';

export const AppVersion: React.FC = () => {
    const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0';
    const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

    const formattedBuild = new Date(buildTime).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="text-[12px] font-medium text-slate-500 opacity-65 flex items-center gap-1.5 tabular-nums">
            <span>v{version}</span>
            <span className="opacity-40">•</span>
            <span>{formattedBuild}</span>
        </div>
    );
};
