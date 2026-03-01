/**
 * BuilderBasic.tsx — Plantilla "Basic" del editor de RentikPro.
 *
 * Diseño limpio y funcional.
 * Paleta: azul, Inter, radios suaves.
 */
import React from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { ApartmentGrid } from '../components/ApartmentGrid';
import { Availability } from '../components/Availability';
import { CTA, Footer } from '../components/Extra';

export const BuilderBasic: React.FC = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
            <Header variant="default" />
            <main>
                <Hero variant="default" />
                <ApartmentGrid variant="default" />
                <Availability />
                <CTA />
            </main>
            <Footer />
        </div>
    );
};

export default BuilderBasic;
