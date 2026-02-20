import { SiteConfig } from './types';
import { migrateConfig } from './adapters';
import { projectManager } from '../../services/projectManager'; // Assuming this exists based on previous file
import { WebSite } from '../../types';

// Allow for strict typing if WebSite interface is available, otherwise any
export const saveSiteConfig = async (website: any, config: SiteConfig): Promise<void> => {
    if (!website || !website.id) throw new Error("Sitio web inválido");

    // 1. Update the local object state
    const updatedSite = {
        ...website,
        // We persist the config into the existing JSON field
        // This is the bridge between the old "sections_json" and the new "SiteConfig"
        sections_json: JSON.stringify(config),
        updated_at: Date.now()
    };

    // 2. Persist to storage (IndexedDB / SQLite via projectManager)
    await projectManager.getStore().saveWebsite(updatedSite);

    // 3. (Optional) If we had a real backend API, we would POST here too.
    // await fetch('/api/publish', { method: 'POST', body: JSON.stringify(config) });
};

export const checkSlugCollision = async (slug: string): Promise<boolean> => {
    const apiBase = import.meta.env.VITE_PUBLIC_API_BASE || "https://rentikpro-public-api.reservas-elrinconcito.workers.dev";
    const url = `${apiBase}/admin/site-config?slug=${encodeURIComponent(slug)}`;
    const token = import.meta.env.VITE_ADMIN_TOKEN || "";

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });

        if (response.status === 200) return true; // Exists
        if (response.status === 404) return false; // Free
        return false; // Treat other errors as free or handle specifically
    } catch (e) {
        console.error("Collision check failed", e);
        return false;
    }
};

export const publishSiteConfig = async (slug: string, config: SiteConfig): Promise<any> => {
    const apiBase = import.meta.env.VITE_PUBLIC_API_BASE || "https://rentikpro-public-api.reservas-elrinconcito.workers.dev";
    const url = `${apiBase}/admin/site-config?slug=${encodeURIComponent(slug)}`;
    const token = import.meta.env.VITE_ADMIN_TOKEN || "";

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(config)
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Error publicando: ${response.status}`;
        try {
            const errJson = JSON.parse(errorText);
            errorMsg = errJson.error || errorMsg;
        } catch (e) {
            errorMsg = errorText || errorMsg;
        }

        if (response.status === 401) throw new Error(`No autorizado: Verifica VITE_ADMIN_TOKEN`);
        throw new Error(errorMsg);
    }

    return await response.json(); // {ok, slug, bytes, savedAt}
};
