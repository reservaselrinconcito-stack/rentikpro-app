import { PropertySnapshot } from '../../../types';
import { SiteConfigV1, BlockInstance } from './types';
import { generateSlug } from './slug';

/**
 * Generates a standard v0 (basic) site configuration based on existing data.
 * This is used for quick testing and as a starting point for the professional editor.
 */
export const generateV0Config = (snapshot: PropertySnapshot, overrideSlug?: string): SiteConfigV1 => {
    const { property, apartments } = snapshot;
    const slug = overrideSlug || generateSlug(property.name);

    // Filter active apartments 
    const activeApartments = apartments.filter(a => a.is_active !== false);

    // Map apartments to grid items
    const apartmentItems = activeApartments.map(apt => {
        // Price logic: publicBasePrice > 0 ? "X€" : "Consultar"
        const priceLabel = apt.publicBasePrice && apt.publicBasePrice > 0
            ? `${apt.publicBasePrice}€`
            : 'Consultar';

        return {
            id: apt.id,
            title: apt.name,
            location: property.location || 'Ubicación Premium',
            guests: 2, // Fallback if not in schema currently
            bedrooms: 1, // Fallback if not in schema currently
            price: priceLabel,
            image: snapshot.media.find(m => m.id === apt.id)?.url || 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&w=800&auto=format&fit=crop'
        };
    });

    const blocks: BlockInstance[] = [
        {
            id: 'nav-v0',
            type: 'Navigation',
            data: { brandName: property.name },
            styles: {
                desktop: { padding: '1.5rem 2rem' }
            }
        },
        {
            id: 'hero-v0',
            type: 'Hero',
            data: {
                title: `Bienvenidos a ${property.name}`,
                subtitle: property.description || 'Disfruta de una estancia inolvidable en nuestros exclusivos alojamientos con todas las comodidades.',
                ctaLabel: 'Ver Alojamientos',
                ctaHref: '#apartments',
                imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80'
            },
            styles: {
                desktop: { padding: '8rem 2rem', textAlign: 'center' }
            }
        },
        {
            id: 'grid-v0',
            type: 'ApartmentsGrid',
            data: {
                title: 'Nuestros Alojamientos',
                subtitle: 'Disponibilidad inmediata y el mejor precio garantizado.',
                items: apartmentItems
            },
            styles: {
                desktop: { padding: '6rem 2rem' }
            }
        },
        {
            id: 'footer-v0',
            type: 'ContactFooter',
            data: {
                email: property.email || 'info@rentik.pro',
                phone: property.phone || '',
                address: property.location || '',
                brandName: property.name
            },
            styles: {
                desktop: { padding: '4rem 2rem' }
            }
        }
    ];

    return {
        version: "1.0",
        slug,
        themeId: 'modern',
        globalData: {
            brandName: property.name,
            contactEmail: property.email,
            contactPhone: property.phone,
        },
        theme: {
            colors: {
                primary: '#4f46e5', // indigo-600
                secondary: '#1e293b', // slate-800
                accent: '#10b981', // emerald-500
                background: '#f8fafc', // slate-50
                surface: '#ffffff', // white
                text: '#1e293b', // slate-800
                textMuted: '#64748b', // slate-500
                border: '#e2e8f0', // slate-200
            },
            typography: {
                headingFont: 'Inter, sans-serif',
                bodyFont: 'Inter, sans-serif',
                baseSize: '16px',
            },
            spacing: {
                scale: '1rem',
            },
            radius: {
                global: '1rem',
            }
        },
        pages: {
            '/': {
                id: 'page-home',
                path: '/',
                title: property.name,
                description: property.description || `Bienvenido a ${property.name}`,
                blocks: blocks
            }
        },
        assets: []
    };
};
