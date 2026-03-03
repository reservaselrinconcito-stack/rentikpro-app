import React from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { Highlights } from '../components/Extra';
import { ApartmentGrid } from '../components/ApartmentGrid';
import { Availability } from '../components/Availability';
import { CTA, Footer } from '../components/Extra';

export const ExcellenceDefault: React.FC = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-brand-dark selection:bg-brand-accent selection:text-white">
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

export default ExcellenceDefault;
