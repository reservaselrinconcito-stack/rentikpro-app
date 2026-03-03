import React from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { ApartmentGrid } from '../components/ApartmentGrid';
import { Availability } from '../components/Availability';
import { Footer } from '../components/Extra';

export const ExcellenceMinimal: React.FC = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-brand-dark selection:bg-brand-accent selection:text-white">
            <Header variant="minimal" />
            <main className="max-w-5xl mx-auto">
                <Hero variant="minimal" />
                <ApartmentGrid variant="minimal" />
                <Availability />
                <div className="py-24 px-4 text-center space-y-4">
                    <h2 className="text-2xl font-bold font-serif">Reserva tu estancia</h2>
                    <p className="text-gray-500 max-w-sm mx-auto">Experiencias curadas para viajeros exigentes.</p>
                    <a href="#contacto" className="inline-block mt-4 border-b-2 border-brand-accent pb-1 font-bold text-brand-accent hover:text-brand-dark transition-colors">
                        Saber más →
                    </a>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ExcellenceMinimal;
