// Basic Vanilla JS Renderer for WebSpec
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('webspec.json');
        if (!response.ok) throw new Error("No se pudo cargar webspec.json");
        const spec = await response.json();

        // 1. Configurar Meta & Theme
        document.title = spec.seo.title || spec.name;
        applyTheme(spec.theme_config);

        // 2. Renderizar Secciones
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = '';
        spec.sections.forEach(section => {
            app.appendChild(createSectionElement(section));
        });

    } catch (e) {
        console.error(e);
        document.body.innerHTML = `<div style="text-align:center; padding: 2rem;"><h1>Error cargando el sitio</h1><p>Asegúrate de que 'webspec.json' existe en esta carpeta.</p></div>`;
    }
});

function applyTheme(config) {
    const root = document.documentElement;
    if (config.primary_color) root.style.setProperty('--primary-color', config.primary_color);
    if (config.font_family) {
        root.style.setProperty('--font-family', `"${config.font_family}", sans-serif`);
        // Update Google Font link if simpler mapping needed, for now assuming Inter/Nunito/Playfair are popular
        // In a real generator we'd map this dynamically.
    }
}

function createSectionElement(section) {
    const div = document.createElement('div');
    div.className = `section ${section.type}-section`;
    div.id = section.id;

    const content = section.content || {};

    switch (section.type) {
        case 'hero':
            div.style.backgroundImage = content.bg_image ? `url(${content.bg_image})` : '';
            div.innerHTML = `
                <div class="hero-overlay"></div>
                <div class="hero-content container">
                    <h1 class="hero-title">${content.title}</h1>
                    <p class="hero-subtitle">${content.subtitle}</p>
                    ${content.cta_text ? `<a href="reservar.html" class="btn-primary" style="margin-top: 1rem;">${content.cta_text}</a>` : ''}
                </div>
            `;
            break;

        case 'properties':
            div.innerHTML = `
                <div class="container">
                    <h2>${content.title}</h2>
                    <div class="properties-grid" id="prop-grid-${section.id}">
                        <!-- Props injected by JS if we had apartment data in WebSpec. 
                             Currently WebSpec stores property_ids_json but maybe not full apartment data?
                             If exported fully, we should include 'apartments' in WebSpec metadata.
                             For now, placeholders. -->
                        <div class="property-card">
                            <div class="property-img"></div>
                            <div class="property-body">
                                <h3>Apartamento Ejemplo</h3>
                                <p>Desde 80€ / noche</p>
                                <a href="reservar.html" class="btn-primary">Ver</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'booking_cta':
            div.innerHTML = `
                <div class="container">
                    <h2>${content.title || 'Reserva al mejor precio'}</h2>
                    <p>${content.subtitle || 'Garantizado'}</p>
                    
                    <div class="booking-benefits">
                        <div class="benefit-item">🔒 Pago Seguro</div>
                        <div class="benefit-item">📅 Cancelación Flexible</div>
                        <div class="benefit-item">💬 Atención Directa</div>
                    </div>

                    <a href="reservar.html" class="btn-primary">Reservar Ahora</a>

                    ${content.img_url ? `<br><img src="${content.img_url}" style="max-width:100%; height:auto; border-radius:1rem; margin-top:2rem; max-height:300px; object-fit:cover;">` : ''}
                </div>
            `;
            break;

        case 'contact':
            div.innerHTML = `
                <div class="container">
                    <h2>${content.title || 'Contacto'}</h2>
                    <p>${content.email} • ${content.phone}</p>
                    <p>${content.address || ''}</p>
                </div>
            `;
            break;

        default:
            div.innerHTML = `
                <div class="container">
                    <h2>${content.title || ''}</h2>
                    <p>${content.body || ''}</p>
                </div>
            `;
    }

    return div;
}
