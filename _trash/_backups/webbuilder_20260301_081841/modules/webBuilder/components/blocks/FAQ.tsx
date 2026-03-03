import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const FAQ: React.FC<{ data: any; styles?: any; theme?: any }> = ({ data }) => {
    const {
        title = 'Preguntas Frecuentes',
        items = [
            { question: '¿Cómo hago el check-in?', answer: 'Recibirás un email con los detalles de acceso 24h antes de tu llegada.' },
            { question: '¿Aceptáis mascotas?', answer: 'Sí, en la mayoría de nuestras propiedades. Consulta las normas de cada una.' },
            { question: '¿Hay suplemento de limpieza?', answer: 'El precio ya incluye la limpieza final, pero pedimos respeto por el inmueble.' }
        ]
    } = data;

    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="w-full py-20 px-6 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black mb-12 text-center">{title}</h2>
            <div className="space-y-4">
                {items.map((item: any, idx: number) => (
                    <div
                        key={idx}
                        className="bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden transition-all duration-300"
                    >
                        <button
                            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                            className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-slate-100/50 transition-colors"
                        >
                            <span className="font-bold text-slate-800">{item.question}</span>
                            {openIndex === idx ? <ChevronUp size={20} className="text-indigo-600" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </button>
                        {openIndex === idx && (
                            <div className="px-8 pb-6 text-slate-500 font-medium leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
                                {item.answer}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};
