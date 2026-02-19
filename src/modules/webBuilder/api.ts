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

export const publishSiteConfig = async (config: SiteConfig): Promise<void> => {
    // In a real scenario, this would push to Cloudflare KV or similar
    // For now, improved persistence is enough as rp-web reads from the same source? 
    // Wait, rp-web reads from public API or similar. 
    // The user requirement says: "Publicar: hacer POST/PUT al public-api/worker"

    const apiBase = import.meta.env.VITE_PUBLIC_API_BASE || "https://rentikpro-public-api.reservas-elrinconcito.workers.dev";
    const url = `${apiBase}/public/site-config`; // Endpoint to create/update

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });

    if (!response.ok) {
        throw new Error(`Error publicando: ${response.statusText}`);
    }
};
