import React from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { Highlights, CTA, Footer } from '../components/Extra';
import { ApartmentGrid } from '../components/ApartmentGrid';
import { Availability } from '../components/Availability';

export const ExcellenceLuxe: React.FC = () => {
    return (
        <div className="min-h-screen bg-brand-dark font-serif text-white selection:bg-brand-accent selection:text-white">
            <Header variant="luxe" />
            <main>
                <Hero variant="luxe" />
                <div className="bg-brand-dark-light py-12">
                    <Highlights />
                </div>
                <div className="bg-brand-soft rounded-[4rem] text-brand-dark mt-[-4rem] relative z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
                    <ApartmentGrid variant="luxe" />
                    <Availability />
                    <CTA />
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ExcellenceLuxe;
