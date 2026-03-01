/**
 * BuilderAdvanced.tsx — Plantilla "Advanced" del editor de RentikPro.
 *
 * Diseño serif con tonos dorados.
 * Paleta: oro #c8a96e, Playfair Display, fondo crema.
 * Incluye calendario de disponibilidad destacado.
 */
import React from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { Highlights, CTA, Footer } from '../components/Extra';
import { ApartmentGrid } from '../components/ApartmentGrid';
import { Availability } from '../components/Availability';

export const BuilderAdvanced: React.FC = () => {
    return (
        <div className="min-h-screen font-serif" style={{ backgroundColor: '#fdfbf7', color: '#1c1917' }}>
            <Header variant="default" />
            <main>
                <Hero variant="default" />
                <div style={{ backgroundColor: '#fff8f0' }}>
                    <Highlights />
                </div>
                <ApartmentGrid variant="default" />
                <div
                    className="py-16 px-6 text-center"
                    style={{ backgroundColor: '#fdfbf7', borderTop: '1px solid #e7e5e4' }}
                >
                    <Availability />
                </div>
                <CTA />
            </main>
            <Footer />
        </div>
    );
};

export default BuilderAdvanced;
