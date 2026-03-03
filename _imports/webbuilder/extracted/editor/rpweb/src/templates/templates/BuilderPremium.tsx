/**
 * BuilderPremium.tsx — Plantilla "Premium" del editor de RentikPro.
 *
 * Ultra-premium: fondo negro, tipografía Cormorant Garamond, dorado.
 * Inspirada en hoteles de 5 estrellas y casas de lujo.
 */
import React from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { Highlights, CTA, Footer } from '../components/Extra';
import { ApartmentGrid } from '../components/ApartmentGrid';
import { Availability } from '../components/Availability';

export const BuilderPremium: React.FC = () => {
    return (
        <div
            className="min-h-screen selection:bg-amber-900"
            style={{ backgroundColor: '#0f0f0f', color: '#f5f0e8', fontFamily: '"Cormorant Garamond", Georgia, serif' }}
        >
            <Header variant="luxe" />
            <main>
                <Hero variant="luxe" />
                <div style={{ backgroundColor: '#1a1a1a', padding: '4rem 0' }}>
                    <Highlights />
                </div>
                <div
                    className="rounded-[4rem] mx-4 mt-[-3rem] relative z-20"
                    style={{ backgroundColor: '#f5f0e8', color: '#0f0f0f', boxShadow: '0 -20px 80px rgba(0,0,0,0.4)' }}
                >
                    <ApartmentGrid variant="luxe" />
                    <Availability />
                    <CTA />
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default BuilderPremium;
