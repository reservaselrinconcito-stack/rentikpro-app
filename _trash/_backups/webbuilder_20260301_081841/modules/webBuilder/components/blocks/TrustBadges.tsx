import React from 'react';
import { ShieldCheck, Star, Award, Clock } from 'lucide-react';

export const TrustBadges: React.FC<{ data: any; styles?: any; variant?: string; theme?: any }> = ({ data, styles }) => {
    const badges = data.badges || [
        { icon: 'ShieldCheck', title: 'Pago Seguro', desc: '100% Garantizado' },
        { icon: 'Star', title: 'Alta Calidad', desc: 'Reseñas verificadas' },
        { icon: 'Award', title: 'Superhost', desc: 'Atención 24/7' },
        { icon: 'Clock', title: 'Check-in Fácil', desc: 'Sin esperas' }
    ];

    const renderIcon = (name: string) => {
        switch (name) {
            case 'Star': return <Star className="text-indigo-600 mb-3 mx-auto" size={32} />;
            case 'Award': return <Award className="text-indigo-600 mb-3 mx-auto" size={32} />;
            case 'Clock': return <Clock className="text-indigo-600 mb-3 mx-auto" size={32} />;
            default: return <ShieldCheck className="text-indigo-600 mb-3 mx-auto" size={32} />;
        }
    };

    return (
        <section className="py-16 bg-white border-b border-slate-100">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center max-w-5xl mx-auto">
                    {badges.map((b: any, i: number) => (
                        <div key={i} className="flex flex-col items-center justify-center p-4 hover:-translate-y-1 transition-transform">
                            <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-indigo-600">
                                {renderIcon(b.icon)}
                            </div>
                            <h4 className="font-bold text-slate-800 text-lg mb-1">{b.title}</h4>
                            <p className="text-sm text-slate-500 font-medium">{b.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
