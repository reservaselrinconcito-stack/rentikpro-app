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
        const container = document.createElement('div');
        container.className = 'container';
        container.innerHTML = `
            <h1>Nuestros Alojamientos</h1>
            <p style="color:var(--text-muted)">Elige el espacio perfecto para tu estancia.</p>
            <div class="grid">
                ${config.properties.map(p => `
                    <a href="#/a/${p.id}" class="card">
                        <div style="height:200px; background:#e2e8f0; border-radius:1rem; margin-bottom:1rem; display:flex; align-items:center; justify-content:center; color:#94a3b8;">[ Imagen Apartamento ]</div>
                        <h3 style="margin:0 0 0.5rem 0">${p.name}</h3>
                        <p style="font-size:0.875rem; color:var(--text-muted); margin:0">${p.description}</p>
                    </a>
                `).join('')}
            </div>
        `;
        return container;
    };

    const renderApartment = (config, id) => {
        const prop = config.properties.find(p => p.id === id);
        if (!prop) return renderError('Extravío', 'El alojamiento solicitado no existe.');

        const container = document.createElement('div');
        container.className = 'container';
        container.innerHTML = `
            <a href="#/" style="font-size:0.875rem; color:var(--primary); font-weight:700; text-decoration:none;">← Volver</a>
            <h1 style="margin-top:1rem;">${prop.name}</h1>
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:2rem; margin-top:2rem;">
                <div>
                    <div style="height:400px; background:#e2e8f0; border-radius:1.5rem; display:flex; align-items:center; justify-content:center; color:#94a3b8;">[ Galería de Imágenes ]</div>
                    <p style="margin-top:2rem; line-height:1.7;">${prop.description}</p>
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
        currentConfig = await SiteConfigService.fetchConfig(slug);

        // Apply Theme
        if (currentConfig.theme) {
            document.documentElement.style.setProperty('--primary', currentConfig.theme.primaryColor || '#4f46e5');
            document.documentElement.style.setProperty('--accent', currentConfig.theme.accentColor || '#f43f5e');
        }
        document.title = currentConfig.title;

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
})();
