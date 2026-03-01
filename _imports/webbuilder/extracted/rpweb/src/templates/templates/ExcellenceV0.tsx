import React from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { ApartmentGrid } from '../components/ApartmentGrid';
import { Availability } from '../components/Availability';
import { Footer } from '../components/Extra';

/**
 * ExcellenceV0 — Plantilla mínima para validación.
 * Enfoque: Ver que el contenido, disponibilidad y precios base carguen bien.
 * No incluye diseño complejo, solo lo esencial.
 */
export const ExcellenceV0: React.FC = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-brand-dark">
            <Header variant="minimal" />

            <main className="max-w-5xl mx-auto px-4">
                {/* Hero simplificado */}
                <Hero variant="minimal" />

                <section className="py-12 border-t border-gray-100">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold font-serif">Nuestros Alojamientos</h2>
                        <p className="text-gray-500">Validación de precio base y detalles.</p>
                    </div>
                    <ApartmentGrid variant="minimal" />
                </section>

                <section className="py-12 border-t border-gray-100">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold font-serif">Disponibilidad Real</h2>
                        <p className="text-gray-500">Validación de calendario de RentikPro.</p>
                    </div>
                    <Availability />
                </section>

                <div className="py-24 text-center space-y-4 border-t border-gray-100">
                    <h2 className="text-2xl font-bold font-serif">¿Todo correcto?</h2>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        Este template v0 sirve para confirmar que tu propiedad está bien configurada en RentikPro.
                    </p>
                    <a href="#contacto" className="inline-block mt-4 bg-brand-accent text-white px-8 py-3 rounded-full font-bold hover:bg-brand-dark transition-all">
                        Contactar Soporte
                    </a>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ExcellenceV0;
