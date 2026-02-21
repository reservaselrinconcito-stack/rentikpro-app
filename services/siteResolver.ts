
import { PropertySnapshot, SiteDraft, SiteOverrides, PageState, BlockNode } from '../types';

/**
 * Crea un borrador inicial de sitio (draft) mapeando datos de la propiedad a bloques.
 */
export function createSiteDraftFromSnapshot(snapshot: PropertySnapshot, templateLevel: SiteDraft['templateLevel']): SiteDraft {
    const { property, apartments } = snapshot;

    const blocks: BlockNode[] = [];
    const bindings: Record<string, string> = {};

    // 1. Header & Hero (Always)
    blocks.push({
        id: 'header-1',
        type: 'Header',
        props: {
            siteName: property.name,
            logoUrl: property.logo,
            links: [
                { label: 'Inicio', href: '#' },
                { label: 'Alojamientos', href: '#apartments' },
                { label: 'Ubicación', href: '#location' },
                { label: 'Contacto', href: '#contact' }
            ]
        },
        style: { background: 'bg-white', text: 'text-neutral-900', padding: 'py-4 px-6' }
    });

    blocks.push({
        id: 'hero-1',
        type: 'Hero',
        props: {
            title: property.name,
            subtitle: property.description || 'Disfruta de una estancia inolvidable.',
            ctaText: 'Reservar Ahora',
            ctaHref: '#apartments',
            backgroundImage: snapshot.media?.[0]?.data_base64 || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80'
        },
        style: { background: 'bg-neutral-900', text: 'text-white', padding: 'py-20 px-6', align: 'center' }
    });

    bindings['hero-1.props.title'] = 'property.name';
    bindings['hero-1.props.subtitle'] = 'property.description';

    // 2. Apartments Grid (Standard+)
    if (templateLevel !== 'BASIC') {
        blocks.push({
            id: 'apartments-1',
            type: 'ApartmentsGrid',
            props: {
                title: 'Nuestros Alojamientos',
                subtitle: 'Elige el que mejor se adapte a ti.',
                apartments: apartments.map(apt => ({
                    id: apt.id,
                    name: apt.name,
                    description: '', // Could bind to facts if exists
                    price: 'Desde 100€/noche',
                    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80'
                }))
            },
            style: { background: 'bg-white', text: 'text-neutral-900', padding: 'py-16 px-6' }
        });
        bindings['apartments-1.props.apartments'] = 'apartments';
    }

    // 3. Location & Contact (Standard+)
    if (templateLevel !== 'BASIC') {
        blocks.push({
            id: 'location-1',
            type: 'Location',
            props: {
                title: 'Donde Estamos',
                address: property.location || 'Calle Falsa 123, Madrid',
                mapUrl: ''
            },
            style: { background: 'bg-neutral-50', text: 'text-neutral-900', padding: 'py-16 px-6' }
        });
        bindings['location-1.props.address'] = 'property.location';

        blocks.push({
            id: 'contact-1',
            type: 'ContactForm',
            props: {
                title: 'Contacto',
                email: property.email || snapshot.settings.contact_email,
                phone: property.phone || snapshot.settings.contact_phone
            },
            style: { background: 'bg-white', text: 'text-neutral-900', padding: 'py-16 px-6' }
        });
        bindings['contact-1.props.email'] = 'property.email';
        bindings['contact-1.props.phone'] = 'property.phone';
    }

    return {
        propertyId: property.id,
        templateLevel,
        bindings,
        blocks,
        meta: {
            template: 'Minimal',
            name: `Sitio de ${property.name}`,
            updatedAt: Date.now()
        }
    };
}

/**
 * Resuelve el estado final de la página combinando el borrador, los overrides y el snapshot actual.
 */
export function resolveSiteConfig(draft: SiteDraft, overrides: SiteOverrides, snapshot: PropertySnapshot): PageState {
    const finalBlocks = draft.blocks.map(block => {
        const newBlock = JSON.parse(JSON.stringify(block));

        // Apply Bindings (if not touched)
        Object.entries(draft.bindings).forEach(([propPath, snapshotPath]) => {
            if (propPath.startsWith(block.id)) {
                const fieldPath = propPath.split('.').slice(1).join('.'); // e.g. props.title

                if (!overrides.touchedFields.includes(propPath)) {
                    const value = getValueFromPath(snapshot, snapshotPath);
                    if (value !== undefined) {
                        setValueAtPath(newBlock, fieldPath, value);
                    }
                }
            }
        });

        // Apply Overrides
        Object.entries(overrides.overridesByPath).forEach(([path, value]) => {
            if (path.startsWith(block.id)) {
                const fieldPath = path.split('.').slice(1).join('.');
                setValueAtPath(newBlock, fieldPath, value);
            }
        });

        return newBlock;
    });

    return {
        meta: draft.meta,
        blocks: finalBlocks
    };
}

function getValueFromPath(obj: any, path: string): any {
    if (path === 'apartments') return obj.apartments;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function setValueAtPath(obj: any, path: string, value: any) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}
