import { SiteConfigV1 } from './types';
import { projectManager } from '@/services/projectManager';

// Allow for strict typing if WebSite interface is available, otherwise any
export const saveSiteConfig = async (website: any, config: SiteConfigV1): Promise<void> => {
    if (!website || !website.id) throw new Error("Sitio web inválido");

    const updatedSite = {
        ...website,
        sections_json: JSON.stringify(config),
        updated_at: Date.now()
    };

    await projectManager.getStore().saveWebsite(updatedSite);
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

        if (response.status === 200) return true;
        if (response.status === 404) return false;
        return false;
    } catch (e) {
        console.error("Collision check failed", e);
        return false;
    }
};

export const publishSiteConfig = async (slug: string, config: SiteConfigV1, overrideToken?: string): Promise<any> => {
    const apiBase = import.meta.env.VITE_PUBLIC_API_BASE || "https://rentikpro-public-api.reservas-elrinconcito.workers.dev";
    const url = `${apiBase}/admin/site-config?slug=${encodeURIComponent(slug)}`;
    const token = overrideToken || import.meta.env.VITE_ADMIN_TOKEN || "";

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

    return await response.json();
};

// Canonical export for the new builder
export const siteConfigApi = {
    saveConfig: saveSiteConfig,
    publishConfig: publishSiteConfig,
    checkCollision: checkSlugCollision
};
