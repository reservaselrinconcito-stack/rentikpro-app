export interface FetchAvailabilityParams {
    slug: string;
    from: string;
    to: string;
    publicToken: string;
    apiBase?: string;
}

/**
 * Fetches real-time availability for all apartments of a tenant.
 * Uses the dynamic configuration provided at runtime.
 */
export async function fetchAvailability({
    slug,
    from,
    to,
    publicToken,
    apiBase = ''
}: FetchAvailabilityParams): Promise<any> {

    const url = `${apiBase}/public/availability?slug=${encodeURIComponent(slug)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-PUBLIC-TOKEN': publicToken
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('SITE_NOT_FOUND');
            }
            if (response.status === 401 || response.status === 403) {
                throw new Error('UNAUTHORIZED');
            }
            throw new Error(`SERVER_ERROR_${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        if (error.message === 'SITE_NOT_FOUND' || error.message === 'UNAUTHORIZED') {
            throw error;
        }
        console.error('[RentikPro] Fetch availability error:', error);
        throw new Error('NETWORK_ERROR');
    }
}
