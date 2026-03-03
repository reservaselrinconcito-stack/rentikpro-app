import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBootstrapState } from '../../app/BootstrapContext';

export const Availability: React.FC = () => {
    const { t } = useTranslation();
    const { availability, apartments } = useBootstrapState();
    const [selectedApt, setSelectedApt] = useState<string>(apartments[0]?.slug ?? '');

    if (!availability || apartments.length === 0) {
        return (
            <section id="disponibilidad" className="py-24 bg-brand-soft/50">
                <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
                    <h2 className="text-3xl font-bold font-serif">{t('nav.availability')}</h2>
                    <div className="p-10 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-brand-dark/5">
                        <p className="text-lg text-gray-500 mb-8">
                            {t('calendar.ask_dates')}
                        </p>
                        <a
                            href="#contacto"
                            className="inline-block px-10 py-4 bg-brand-dark text-white rounded-full font-bold hover:bg-brand-accent transition-all"
                        >
                            {t('price.ask')}
                        </a>
                    </div>
                </div>
            </section>
        );
    }

    const aptAvail = availability.apartments.find((a) => a.apartmentSlug === selectedApt);
    const visibleDays = (aptAvail?.days ?? []).slice(0, 31);
    const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    return (
        <section id="disponibilidad" className="py-24 bg-brand-soft/50">
            <div className="max-w-5xl mx-auto px-4">
                <div className="text-center mb-12 space-y-2">
                    <h2 className="text-3xl md:text-4xl font-bold font-serif">Disponibilidad</h2>
                    <p className="text-gray-500 uppercase tracking-[0.2em] text-xs font-bold">Estado en tiempo real</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-6 md:p-12 shadow-xl shadow-brand-dark/5 border border-white">
                    {apartments.length > 1 && (
                        <div className="flex flex-wrap gap-2 justify-center mb-10 pb-10 border-b border-gray-50">
                            {apartments.map((apt) => (
                                <button
                                    key={apt.slug}
                                    onClick={() => setSelectedApt(apt.slug)}
                                    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${selectedApt === apt.slug
                                        ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20'
                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                        }`}
                                >
                                    {apt.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-7 gap-2">
                        {weekdays.map((d) => (
                            <div key={d} className="text-center py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                {d}
                            </div>
                        ))}

                        {visibleDays.map((day) => {
                            const date = new Date(day.date + 'T00:00:00');
                            const isAvailable = day.isAvailable;
                            return (
                                <div
                                    key={day.date}
                                    className={`aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-bold transition-all ${isAvailable
                                        ? 'bg-green-50 text-green-700 border border-green-100 hover:bg-green-100'
                                        : 'bg-red-50 text-red-700/50 border border-red-50 opacity-60'
                                        }`}
                                >
                                    <span className="text-xs opacity-60 font-medium mb-0.5">{date.getDate()}</span>
                                    <span className="text-[10px]">{isAvailable ? '✓' : '×'}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 flex justify-center gap-6 text-[10px] uppercase tracking-widest font-black">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-200" />
                            <span className="text-gray-400">Disponible</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-200" />
                            <span className="text-gray-400">Ocupado</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
