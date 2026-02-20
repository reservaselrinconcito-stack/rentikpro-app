/**
 * site.js - Universal Template Main Logic
 * Handle routing, rendering, and API interactions.
 */

(async function () {
    const app = document.getElementById('app');
    const loader = document.getElementById('loader');
    const content = document.getElementById('content');
    const errorScreen = document.getElementById('error-screen');
    const errorTitle = document.getElementById('error-title');
    const errorMessage = document.getElementById('error-message');
    const errorActions = document.getElementById('error-actions');

    let currentConfig = null;

    // --- Helpers ---
    const validateConfig = (config) => {
        if (!config) throw new Error("Configuración vacía");
        if (!config.slug) throw new Error("Configuración inválida: falta slug");
        // Fallbacks
        config.theme = config.theme || {};
        config.properties = Array.isArray(config.properties) ? config.properties : [];
        config.integrations = config.integrations || {};
        config.brand = config.brand || {};
        return config;
    };

    const updateSEO = (config, titleOverride = null) => {
        const title = titleOverride ? `${titleOverride} - ${config.title}` : config.title;
        document.title = title;

        // Meta Description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = "description";
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = config.seo_description || `Reserva en ${config.title}`;

        // Canonical
        let linkCanon = document.querySelector('link[rel="canonical"]');
        if (!linkCanon) {
            linkCanon = document.createElement('link');
            linkCanon.rel = "canonical";
            document.head.appendChild(linkCanon);
        }
        linkCanon.href = window.location.href.split('#')[0];

        // JSON-LD
        let scriptLD = document.getElementById('json-ld');
        if (!scriptLD) {
            scriptLD = document.createElement('script');
            scriptLD.id = "json-ld";
            scriptLD.type = "application/ld+json";
            document.head.appendChild(scriptLD);
        }
        const schema = {
            "@context": "https://schema.org",
            "@type": "LodgingBusiness",
            "name": config.title,
            "url": window.location.href,
            "telephone": config.brand?.phone,
            "email": config.brand?.email
        };
        scriptLD.textContent = JSON.stringify(schema);
    };

    const renderDebug = (config) => {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('debug')) return;

        const existing = document.getElementById('debug-overlay');
        if (existing) existing.remove();

        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug-overlay';
        debugDiv.innerHTML = `
            <strong>DEBUG MODE</strong><br>
            Slug: ${config.slug}<br>
            Source: ${config._meta?.source || 'unknown'}<br>
            Fetch: ${config._meta?.fetchDuration || 'n/a'}<br>
            Props: ${config.properties.length}
        `;
        document.body.appendChild(debugDiv);
    };

    const renderImage = (src, alt, height = '200px') => {
        if (!src) return `<div style="height:${height}; background:#e2e8f0; display:flex; align-items:center; justify-content:center; color:#94a3b8; border-radius:1rem;">${alt}</div>`;
        return `<img src="${src}" alt="${alt}" loading="lazy" class="fade-in" onload="this.classList.add('loaded')" style="width:100%; height:${height}; object-fit:cover; border-radius:1rem;">`;
    };

    const showScreen = (id) => {
        [loader, content, errorScreen].forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    };

    const showError = (title, msg, actions = null) => {
        errorTitle.innerText = title;
        errorMessage.innerText = msg;
        errorActions.innerHTML = '';
        if (actions) {
            actions.forEach(a => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary';
                btn.innerText = a.label;
                btn.onclick = a.onClick;
                errorActions.appendChild(btn);
            });
        }
        showScreen('error-screen');
    };

    // --- API Helpers ---

    window.fetchAvailability = async (slug, from, to) => {
        const response = await fetch(`/public/availability?slug=${slug}&from=${from}&to=${to}`);
        if (!response.ok) throw new Error('Failed to fetch availability');
        return await response.json();
    };

    const submitLead = async (formData) => {
        const token = currentConfig?.integrations?.rentikpro?.publicToken;
        if (!token) return { success: false, message: 'Falta token de integración' };

        try {
            const response = await fetch('/public/leads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-PUBLIC-TOKEN': token
                },
                body: JSON.stringify({
                    slug: currentConfig.slug,
                    createdAt: Date.now(),
                    ...formData
                })
            });

            if (response.status === 401 || response.status === 403) {
                return { success: false, message: 'Acceso denegado: Sitio no publicado o token inválido' };
            }

            if (!response.ok) throw new Error('Submission failed');
            return { success: true };
        } catch (e) {
            return { success: false, message: 'Error de red al enviar' };
        }
    };

    // --- Router & Rendering ---

    const renderNavbar = (config) => {
        const nav = document.createElement('div');
        nav.className = 'navbar';
        nav.innerHTML = `
            <div style="font-weight:900; font-size:1.5rem;">${config.title}</div>
            <div style="display:flex; gap:1.5rem; font-weight:600;">
                <a href="#/" style="text-decoration:none; color:inherit;">Inicio</a>
                <a href="#/contacto" style="text-decoration:none; color:inherit;">Contacto</a>
            </div>
        `;
        return nav;
    };

    const renderHome = (config) => {
        updateSEO(config); // Reset SEO to home
        const container = document.createElement('div');
        container.className = 'container';
        container.innerHTML = `
            <h1>Nuestros Alojamientos</h1>
            <p style="color:var(--text-muted)">Elige el espacio perfecto para tu estancia.</p>
            <div class="grid">
                ${config.properties.map(p => `
                    <a href="#/a/${p.id}" class="card">
                        <div style="margin-bottom:1rem;">
                           ${renderImage(p.photos?.[0], p.name)}
                        </div>
                        <h3 style="margin:0 0 0.5rem 0">${p.name}</h3>
                        <p style="font-size:0.875rem; color:var(--text-muted); margin:0">${p.description || ''}</p>
                    </a>
                `).join('')}
            </div>
        `;
        return container;
    };

    const renderApartment = (config, id) => {
        const prop = config.properties.find(p => p.id === id);
        if (!prop) return renderError('Extravío', 'El alojamiento solicitado no existe.');

        updateSEO(config, prop.name); // Specific SEO

        const container = document.createElement('div');
        container.className = 'container';
        container.innerHTML = `
            <a href="#/" style="font-size:0.875rem; color:var(--primary); font-weight:700; text-decoration:none;">← Volver</a>
            <h1 style="margin-top:1rem;">${prop.name}</h1>
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:2rem; margin-top:2rem;">
                <div>
                    <div>
                        ${renderImage(prop.photos?.[0], prop.name + ' Main', '400px')}
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap:0.5rem; margin-top:1rem;">
                        ${(prop.photos || []).slice(1, 5).map(photo => renderImage(photo, prop.name, '80px')).join('')}
                    </div>
                    <p style="margin-top:2rem; line-height:1.7;">${prop.description || 'Sin descripción disponible.'}</p>
                </div>
                <div>
                    <div class="card" style="background:#f8fafc; border-style:dashed;">
                        <h3 style="margin-top:0">Reservar Ahora</h3>
                        <p style="font-size:0.875rem;">Consulta disponibilidad y reserva al mejor precio garantizado.</p>
                        <button class="btn btn-primary" style="width:100%" onclick="location.hash='#/contacto'">Consultar disponibilidad</button>
                    </div>
                </div>
            </div>
        `;
        return container;
    };

    const renderContact = (config) => {
        const container = document.createElement('div');
        container.className = 'container';
        container.innerHTML = `
            <h1>Contacto / Solicitud de Reserva</h1>
            <p style="color:var(--text-muted)">Rellena el formulario y te responderemos lo antes posible.</p>
            <form id="lead-form" class="card" style="max-width:600px; margin-top:2rem;">
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" name="name" required placeholder="Tu nombre completo">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" required placeholder="ejemplo@correo.com">
                </div>
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="tel" name="phone" placeholder="+34 ...">
                </div>
                <div class="form-group">
                    <label>Mensaje / Fechas de Interés</label>
                    <textarea name="message" rows="4" placeholder="Indica fechas, número de personas o cualquier duda..."></textarea>
                </div>
                <div id="form-status" style="margin-bottom:1rem;"></div>
                <button type="submit" class="btn btn-primary" style="width:100%">Enviar Solicitud</button>
            </form>
        `;

        container.querySelector('form').onsubmit = async (e) => {
            e.preventDefault();
            const statusDiv = document.getElementById('form-status');
            const submitBtn = e.target.querySelector('button');

            statusDiv.innerHTML = '<p style="color:var(--primary)">Enviando...</p>';
            submitBtn.disabled = true;

            const formData = Object.fromEntries(new FormData(e.target));
            const result = await submitLead(formData);

            if (result.success) {
                statusDiv.innerHTML = '<p class="success-msg">✅ ¡Mensaje enviado con éxito!</p>';
                e.target.reset();
            } else {
                statusDiv.innerHTML = `<p class="error-msg">❌ ${result.message}</p>`;
                submitBtn.disabled = false;
            }
        };

        return container;
    };

    const handleRoute = () => {
        const hash = window.location.hash || '#/';
        content.innerHTML = '';
        content.appendChild(renderNavbar(currentConfig));

        if (hash === '#/') {
            content.appendChild(renderHome(currentConfig));
        } else if (hash.startsWith('#/a/')) {
            const id = hash.replace('#/a/', '');
            content.appendChild(renderApartment(currentConfig, id));
        } else if (hash === '#/contacto') {
            content.appendChild(renderContact(currentConfig));
        } else {
            showError('404', 'Página no encontrada');
        }
    };

    // --- Init ---

    const slug = SiteConfigService.getSlug();
    if (!slug) {
        showError('Falta slug', 'Para ver este sitio universal, necesitas suministrar un slug.', [
            { label: 'Ver Demo', onClick: () => window.location.search = '?slug=demo' }
        ]);
        return;
    }

    try {
        const rawConfig = await SiteConfigService.fetchConfig(slug);
        currentConfig = validateConfig(rawConfig);

        // Apply Theme
        if (currentConfig.theme) {
            document.documentElement.style.setProperty('--primary', currentConfig.theme.primaryColor || '#4f46e5');
            document.documentElement.style.setProperty('--accent', currentConfig.theme.accentColor || '#f43f5e');
        }

        // Initial SEO & Debug
        updateSEO(currentConfig);
        renderDebug(currentConfig);

        window.onhashchange = handleRoute;
        handleRoute();
        showScreen('content');
    } catch (err) {
        if (err.status === 404) {
            showError('No publicado', `El sitio con slug "${slug}" no existe o no ha sido publicado.`);
        } else {
            showError('Error', 'No se ha podido cargar la configuración del sitio.');
        }
        console.error(err);
    }
    // --- PostMessage Listener for Live Preview ---
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PREVIEW_UPDATE_CONFIG') {
            console.log('[Preview] Received config update', event.data.payload);
            currentConfig = validateConfig(event.data.payload);

            // Re-apply Theme
            if (currentConfig.theme) {
                document.documentElement.style.setProperty('--primary', currentConfig.theme.primaryColor || '#4f46e5');
                document.documentElement.style.setProperty('--accent', currentConfig.theme.accentColor || '#f43f5e');
            }

            updateSEO(currentConfig, 'Preview');
            // Force re-render
            handleRoute();
        }
    });

})();
