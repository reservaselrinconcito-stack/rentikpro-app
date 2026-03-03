import React from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { Highlights } from '../components/Extra';
import { ApartmentGrid } from '../components/ApartmentGrid';
import { Availability } from '../components/Availability';
import { CTA, Footer } from '../components/Extra';

export const ExcellenceModern: React.FC = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-brand-dark selection:bg-brand-accent selection:text-white">
            <Header variant="modern" />
            <main>
                <Hero variant="modern" />
                <div className="bg-brand-soft/20">
                    <Highlights />
                </div>
                <ApartmentGrid variant="modern" />
                <div className="py-12">
                    <Availability />
                </div>
                <CTA />
            </main>
            <Footer />
        </div>
    );
};

export default ExcellenceModern;
