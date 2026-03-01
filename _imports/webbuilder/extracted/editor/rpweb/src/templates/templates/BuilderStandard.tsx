/**
 * BuilderStandard.tsx — Plantilla "Standard" del editor de RentikPro.
 *
 * Diseño elegante y completo.
 * Paleta: índigo, Plus Jakarta Sans, radios generosos.
 */
import React from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { Highlights } from '../components/Extra';
import { ApartmentGrid } from '../components/ApartmentGrid';
import { Availability } from '../components/Availability';
import { CTA, Footer } from '../components/Extra';

export const BuilderStandard: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
            <Header variant="default" />
            <main>
                <Hero variant="default" />
                <Highlights />
                <ApartmentGrid variant="default" />
                <Availability />
                <CTA />
            </main>
            <Footer />
        </div>
    );
};

export default BuilderStandard;
