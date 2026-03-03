import React from 'react';
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
import { AvailabilityCalendar } from './AvailabilityCalendar';

export const BlockRegistry: Record<string, React.FC<any>> = {
    Hero,
    Navigation,
    TrustBadges,
    ApartmentsGrid,
    Features,
    Gallery,
    Testimonials,
    Location,
    ContactFooter,
    CTA,
    FAQ,
    Pricing,
    ContactForm,
    AvailabilityCalendar,
};

export const getBlockComponent = (type: string): React.FC<any> | null =>
    BlockRegistry[type] ?? null;
