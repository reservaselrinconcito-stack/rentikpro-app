import React from 'react';

// Block components
import { Hero } from './Hero';
import { Navigation } from './Navigation';
import { TrustBadges } from './TrustBadges';
import { ApartmentsGrid } from './ApartmentsGrid';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { Features } from './Features';
import { Gallery } from './Gallery';
import { Testimonials } from './Testimonials';
import { Location } from './Location';
import { ContactFooter } from './ContactFooter';
import { CTA } from './CTA';
import { FAQ } from './FAQ';
import { Pricing } from './Pricing';
import { ContactForm } from './ContactForm';

// Canonical registry
export const BlockRegistry: Record<string, React.FC<any>> = {
    'Hero': Hero,
    'Navigation': Navigation,
    'TrustBadges': TrustBadges,
    'ApartmentsGrid': ApartmentsGrid,
    'AvailabilityCalendar': AvailabilityCalendar,
    'Features': Features,
    'Gallery': Gallery,
    'Testimonials': Testimonials,
    'Location': Location,
    'ContactFooter': ContactFooter,
    'CTA': CTA,
    'FAQ': FAQ,
    'Pricing': Pricing,
    'ContactForm': ContactForm,
};

export const getBlockComponent = (type: string): React.FC<any> | null => {
    return BlockRegistry[type] ?? null;
};
