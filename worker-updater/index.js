
/**
 * Tauri v2 Updater Worker for RentikPro
 * Serves latest.json by querying GitHub Releases.
 * 
 * Format required by Tauri v2:
 * {
 *   "version": "v1.0.0",
 *   "notes": "Release notes",
 *   "pub_date": "2023-09-18T12:00:00Z",
 *   "platforms": {
 *     "darwin-aarch64": { "signature": "...", "url": "..." },
 *     "darwin-x86_64": { "signature": "...", "url": "..." },
 *     "windows-x86_64": { "signature": "...", "url": "..." }
 *   }
 * }
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Basic routing
        if (url.pathname === '/latest.json') {
            return handleUpdateCheck(request, env);
        }

        return new Response('RentikPro Update Server - Usage: GET /latest.json', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        });
    },
};

async function handleUpdateCheck(request, env) {
    const GITHUB_REPO = 'reservaselrinconcito-stack/rentikpro-app';
    const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

    try {
        const fetchHeaders = {
            'User-Agent': 'RentikPro-Tauri-v2-Updater',
            'Accept': 'application/vnd.github.v3+json'
        };

        if (env.GITHUB_TOKEN) {
            fetchHeaders['Authorization'] = `Bearer ${env.GITHUB_TOKEN.trim()}`;
        }

        const ghResponse = await fetch(GITHUB_API, {
            headers: fetchHeaders,
        });

        if (!ghResponse.ok) {
            const errorMsg = await ghResponse.text();

            // If token fails, try one last time WITHOUT token (if token was provided)
            if (ghResponse.status === 401 && env.GITHUB_TOKEN) {
                const retryResponse = await fetch(GITHUB_API, {
                    headers: {
                        'User-Agent': 'RentikPro-Tauri-v2-Updater',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                if (retryResponse.ok) {
                    return handleReleaseData(await retryResponse.json(), env);
                }
            }

            return new Response(JSON.stringify({
                error: 'GitHub API error',
                status: ghResponse.status,
                details: errorMsg,
                hint: ghResponse.status === 401 ? 'Check GITHUB_TOKEN secret in Cloudflare' : undefined
            }), {
                status: ghResponse.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        const release = await ghResponse.json();
        return handleReleaseData(release, env);
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

async function handleReleaseData(release, env) {
    try {
        // Tauri v2 expects a semver version without leading 'v'
        const version = release.tag_name.replace(/^v/, '');
        const notes = release.body || 'Correcciones y mejoras generales.';
        const pub_date = release.published_at;

        const platforms = {};

        /**
         * Helper to fetch signature string from a .sig file asset
         */
        const getSignatureForAsset = async (assetName, extraCandidates = []) => {
            const candidates = [`${assetName}.sig`, ...extraCandidates];
            const sigAsset = release.assets.find(a => candidates.includes(a.name));
            if (!sigAsset) return null;

            const sigRes = await fetch(sigAsset.browser_download_url, {
                headers: { 'User-Agent': 'RentikPro-Tauri-v2-Updater' }
            });
            if (sigRes.ok) {
                const text = await sigRes.text();
                return text.trim();
            }
            return null;
        };

        // --- PLATFORM DETECTION ---

        const findAssetByTokens = (tokens, suffix) => {
            const lowerTokens = tokens.map(t => t.toLowerCase());
            return release.assets.find(asset => {
                const name = asset.name.toLowerCase();
                return name.endsWith(suffix) && lowerTokens.some(t => name.includes(t));
            });
        };

        const addPlatform = async (platformKey, asset, signatureCandidates) => {
            if (!asset) return;
            const signature = await getSignatureForAsset(asset.name, signatureCandidates);
            if (!signature) return;
            platforms[platformKey] = {
                url: asset.browser_download_url,
                signature
            };
        };

        // 1. macOS ARM64 (darwin-aarch64) - Requires .app.tar.gz
        const macArmAsset = findAssetByTokens(
            ['aarch64', 'arm64', 'mac-arm64', 'macos-arm64'],
            '.app.tar.gz'
        );
        await addPlatform('darwin-aarch64', macArmAsset, [
            'RentikPro_aarch64.app.tar.gz.sig',
            'RentikPro_arm64.app.tar.gz.sig'
        ]);

        // 2. macOS X64 (darwin-x86_64) - Requires .app.tar.gz
        const macX64Asset = findAssetByTokens(
            ['x86_64', 'x64', 'amd64', 'mac-x64', 'macos-x64'],
            '.app.tar.gz'
        );
        await addPlatform('darwin-x86_64', macX64Asset, [
            'RentikPro_x64.app.tar.gz.sig',
            'RentikPro_x86_64.app.tar.gz.sig',
            'RentikPro_amd64.app.tar.gz.sig'
        ]);

        // 3. Windows X64 (windows-x86_64) - Preference: .msi.zip, then .exe
        let winAsset = release.assets.find(a => a.name.includes('x64') && a.name.endsWith('.msi.zip'));
        if (!winAsset) {
            winAsset = release.assets.find(a => a.name.includes('x64') && a.name.endsWith('.exe'));
        }

        if (winAsset) {
            const winSignature = await getSignatureForAsset(winAsset.name, [
                'RentikPro-win.exe.sig',
                'RentikPro-win.msi.sig',
                'RentikPro_x64-setup.exe.sig'
            ]);

            if (winSignature) {
                platforms['windows-x86_64'] = {
                    url: winAsset.browser_download_url,
                    signature: winSignature
                };
            }
        }

        const updateResponse = {
            version,
            notes,
            pub_date,
            platforms
        };

        return new Response(JSON.stringify(updateResponse), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300' // 5 min cache for CF
            },
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
