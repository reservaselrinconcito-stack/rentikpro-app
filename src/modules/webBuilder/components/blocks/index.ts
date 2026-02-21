import React from 'react';

// Import all block components
import { Hero } from './Hero';
import { Navigation } from './Navigation';
import { TrustBadges } from './TrustBadges';
import { ApartmentsGrid } from './ApartmentsGrid';
import { Features } from './Features';
import { Gallery } from './Gallery';
import { Testimonials } from './Testimonials';
import { Location } from './Location';
import { ContactFooter } from './ContactFooter';
import { CTA } from './CTA';
import { FAQ } from './FAQ';
import { Pricing } from './Pricing';
import { ContactForm } from './ContactForm';

// The canonical block registry
export const BlockRegistry: Record<string, React.FC<any>> = {
    'Hero': Hero,
    'Navigation': Navigation,
    'TrustBadges': TrustBadges,
    'ApartmentsGrid': ApartmentsGrid,
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

// Fallback registry to prevent crashes
export const getBlockComponent = (type: string): React.FC<any> => {
    return BlockRegistry[type] || null; // Handler in WebsiteRenderer will catch nulls
};
