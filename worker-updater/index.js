/**
 * Tauri v2 Updater Worker — RentikPro
 *
 * GET /latest.json  → Tauri v2 update manifest
 *
 * Strategy:
 *  1. Fetch GitHub release JSON (1 req)
 *  2. Resolve asset + sig asset for each platform using asset list (0 extra reqs)
 *  3. Fetch ALL sig file contents in PARALLEL with Promise.all (max 3 concurrent)
 *  4. Build and return the manifest; missing platforms are omitted gracefully
 *
 * Tauri v2 manifest format:
 * {
 *   "version": "2.1.x",
 *   "notes": "...",
 *   "pub_date": "...",
 *   "platforms": {
 *     "darwin-aarch64": { "url": "...", "signature": "base64sig" },
 *     "darwin-x86_64":  { "url": "...", "signature": "base64sig" },
 *     "windows-x86_64": { "url": "...", "signature": "base64sig" }
 *   }
 * }
 */

const CACHE_TTL = 60; // 60s — short enough to pick up new releases quickly

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== '/latest.json') {
      return new Response(
        'RentikPro Update Server\nUsage: GET /latest.json',
        { status: 200, headers: { 'Content-Type': 'text/plain' } }
      );
    }
    return handleUpdateCheck(request, env, ctx);
  },
};

async function handleUpdateCheck(request, env, ctx) {
  const REPO = env.GITHUB_REPO || 'reservaselrinconcito-stack/rentikpro-app';
  const API = `https://api.github.com/repos/${REPO}/releases/latest`;

  const cache = caches.default;
  const cacheKey = new Request(request.url, request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const ghHeaders = {
      'User-Agent': 'RentikPro-Updater-Worker/2',
      'Accept': 'application/vnd.github.v3+json',
    };
    if (env.GITHUB_TOKEN) {
      ghHeaders['Authorization'] = `Bearer ${env.GITHUB_TOKEN.trim()}`;
    }

    const ghRes = await fetch(API, { headers: ghHeaders });
    if (!ghRes.ok) {
      return errorResponse(ghRes.status, `GitHub API ${ghRes.status}: ${await ghRes.text()}`);
    }

    const release = await ghRes.json();
    const manifest = await buildManifest(release, ghHeaders);

    const body = JSON.stringify(manifest);
    const response = new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
      },
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;

  } catch (err) {
    return errorResponse(500, `Worker error: ${err.message}`);
  }
}

async function buildManifest(release, ghHeaders) {
  const version = release.tag_name.replace(/^v/, '');
  const notes = (release.body || '').split('\n')[0].trim() || 'Correcciones y mejoras generales.';
  const pub_date = release.published_at;
  const assets = release.assets || [];

  const platformCandidates = [
    {
      key: 'darwin-aarch64',
      assetTokens: ['aarch64', 'arm64'],
      assetSuffix: '.app.tar.gz',
      sigSuffix: '.app.tar.gz.sig',
    },
    {
      key: 'darwin-x86_64',
      assetTokens: ['x64', 'x86_64'],
      assetSuffix: '.app.tar.gz',
      sigSuffix: '.app.tar.gz.sig',
    },
    {
      key: 'windows-x86_64',
      assetTokens: ['x64', 'x86_64'],
      assetSuffix: '.exe',
      sigSuffix: '.exe.sig',
    },
  ];

  function findAsset(tokens, suffix) {
    const lt = tokens.map(t => t.toLowerCase());
    return assets.find(a => {
      const n = a.name.toLowerCase();
      return n.endsWith(suffix) && lt.some(t => n.includes(t));
    });
  }

  const resolved = platformCandidates.map(p => {
    const asset = findAsset(p.assetTokens, p.assetSuffix);
    if (!asset) return { key: p.key, asset: null, sigAsset: null };
    // Primary: exact <assetName>.sig; fallback: token+suffix search
    const sigAsset =
      assets.find(a => a.name === `${asset.name}.sig`) ||
      findAsset(p.assetTokens, p.sigSuffix);
    return { key: p.key, asset, sigAsset };
  });

  // Fetch all sigs IN PARALLEL
  const sigFetches = resolved.map(async ({ key, asset, sigAsset }) => {
    if (!asset || !sigAsset) return { key, url: null, signature: null };
    try {
      const res = await fetch(sigAsset.browser_download_url, {
        headers: ghHeaders,
        redirect: 'follow',
      });
      if (!res.ok) return { key, url: null, signature: null };
      const signature = (await res.text()).trim();
      return signature ? { key, url: asset.browser_download_url, signature } : { key, url: null, signature: null };
    } catch {
      return { key, url: null, signature: null };
    }
  });

  const results = await Promise.all(sigFetches);

  const platforms = {};
  for (const { key, url, signature } of results) {
    if (url && signature) platforms[key] = { url, signature };
  }

  return { version, notes, pub_date, platforms };
}

function errorResponse(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
