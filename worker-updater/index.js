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

const ENDPOINT_CACHE_TTL = 60;
const GITHUB_CACHE_TTL = 300;
const CACHE_BASE_URL = 'https://rentikpro-updates.cache.internal';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/latest.json') {
      return handleUpdateCheck(request, env, ctx);
    }
    if (url.pathname === '/release.json') {
      return handleReleaseInfo(request, env, ctx);
    }
    if (url.pathname !== '/latest.json') {
      return new Response(
        'RentikPro Update Server\nUsage: GET /latest.json or /release.json',
        { status: 200, headers: { 'Content-Type': 'text/plain' } }
      );
    }
  },
};

async function getLatestRelease(env, ctx) {
  const REPO = env.GITHUB_REPO || 'reservaselrinconcito-stack/rentikpro-app';
  const API = `https://api.github.com/repos/${REPO}/releases/latest`;

  const ghHeaders = {
    'User-Agent': 'RentikPro-Updater-Worker/2',
    'Accept': 'application/vnd.github.v3+json',
  };
  const githubToken = resolveGitHubToken(env);
  if (githubToken) {
    ghHeaders['Authorization'] = `Bearer ${githubToken}`;
  }

  const cacheKey = new Request(`${CACHE_BASE_URL}/github/latest-release?repo=${encodeURIComponent(REPO)}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    return { release: await cached.json(), ghHeaders, repo: REPO };
  }

  const ghRes = await fetch(API, { headers: ghHeaders });
  if (!ghRes.ok) {
    throw await createGitHubError(ghRes, { repo: REPO, hasToken: Boolean(githubToken) });
  }

  const releaseBody = await ghRes.text();
  const release = JSON.parse(releaseBody);
  ctx.waitUntil(cache.put(cacheKey, new Response(releaseBody, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${GITHUB_CACHE_TTL}, s-maxage=${GITHUB_CACHE_TTL}`,
    },
  })));

  return { release, ghHeaders, repo: REPO };
}

async function handleCachedJson(request, ctx, builder) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const body = JSON.stringify(await builder());
  const response = new Response(body, {
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `public, max-age=${ENDPOINT_CACHE_TTL}, s-maxage=${ENDPOINT_CACHE_TTL}`,
      },
    });

  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function handleUpdateCheck(request, env, ctx) {
  try {
    return await handleCachedJson(request, ctx, async () => {
      const { release, ghHeaders } = await getLatestRelease(env, ctx);
      return buildManifest(release, ghHeaders);
    });
  } catch (err) {
    return errorResponse(err);
  }
}

async function handleReleaseInfo(request, env, ctx) {
  try {
    return await handleCachedJson(request, ctx, async () => {
      const { release, repo } = await getLatestRelease(env, ctx);
      return buildReleaseInfo(release, repo);
    });
  } catch (err) {
    return errorResponse(err);
  }
}

function findReleaseAsset(assets, { suffix, tokens, exclude = [] }) {
  const wanted = tokens.map((token) => token.toLowerCase());
  const forbidden = exclude.map((token) => token.toLowerCase());
  return assets.find((asset) => {
    const name = asset.name.toLowerCase();
    return name.endsWith(suffix)
      && wanted.every((token) => name.includes(token))
      && forbidden.every((token) => !name.includes(token));
  }) || null;
}

function buildReleaseInfo(release, repo) {
  const version = release.tag_name.replace(/^v/, '');
  const assets = release.assets || [];

  const macArm = findReleaseAsset(assets, { suffix: '.dmg', tokens: ['aarch64'], exclude: [] });
  const macX64 = findReleaseAsset(assets, { suffix: '.dmg', tokens: ['x64'], exclude: ['setup'] });
  const winX64 = findReleaseAsset(assets, { suffix: '.exe', tokens: ['x64', 'setup'], exclude: ['sig'] });

  const toDownload = (asset) => asset ? {
    name: asset.name,
    url: asset.browser_download_url,
    size: asset.size,
    contentType: asset.content_type,
  } : null;

  return {
    version,
    notes: (release.body || '').split('\n')[0].trim() || 'Correcciones y mejoras generales.',
    pub_date: release.published_at,
    release_url: release.html_url || `https://github.com/${repo}/releases/latest`,
    downloads: {
      macos_arm64: toDownload(macArm),
      macos_x64: toDownload(macX64),
      windows_x64: toDownload(winX64),
    },
  };
}

async function buildManifest(release, ghHeaders) {
  const version = release.tag_name.replace(/^v/, '');
  const notes = (release.body || '').split('\n')[0].trim() || 'Correcciones y mejoras generales.';
  const pub_date = release.published_at;
  const assets = release.assets || [];

  // Tauri v2 uses "-app" suffix for macOS targets (e.g. darwin-aarch64-app).
  // Include both forms so all Tauri v2 builds resolve correctly.
  const platformCandidates = [
    {
      key: 'darwin-aarch64-app',
      assetTokens: ['aarch64', 'arm64'],
      assetSuffix: '.app.tar.gz',
      sigSuffix: '.app.tar.gz.sig',
    },
    {
      key: 'darwin-aarch64',
      assetTokens: ['aarch64', 'arm64'],
      assetSuffix: '.app.tar.gz',
      sigSuffix: '.app.tar.gz.sig',
    },
    {
      key: 'darwin-x86_64-app',
      assetTokens: ['x64', 'x86_64'],
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

function resolveGitHubToken(env) {
  for (const key of ['GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_PAT']) {
    const value = env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

async function createGitHubError(response, { repo, hasToken }) {
  const details = trimErrorDetails(await response.text());
  const remaining = response.headers.get('x-ratelimit-remaining');
  const rateLimited = response.status === 403 && (
    remaining === '0'
    || /rate limit exceeded|secondary rate limit/i.test(details || '')
  );

  if (rateLimited) {
    return withErrorMeta(
      new Error(
        hasToken
          ? `GitHub API rate limit exceeded for ${repo}. Retry later or raise the token quota.`
          : `GitHub API rate limit exceeded for ${repo}. Configure the GITHUB_TOKEN worker secret.`
      ),
      {
        status: 503,
        code: 'github_rate_limited',
        upstreamStatus: response.status,
        details,
      }
    );
  }

  if (response.status === 401) {
    return withErrorMeta(new Error(`GitHub authentication failed for ${repo}. Check the configured token.`), {
      status: 502,
      code: 'github_auth_failed',
      upstreamStatus: response.status,
      details,
    });
  }

  return withErrorMeta(new Error(`GitHub release lookup failed for ${repo}.`), {
    status: 502,
    code: 'github_upstream_error',
    upstreamStatus: response.status,
    details,
  });
}

function withErrorMeta(error, meta) {
  return Object.assign(error, meta);
}

function trimErrorDetails(text) {
  return String(text || '').trim().slice(0, 400) || null;
}

function errorResponse(error) {
  const payload = {
    error: error?.message || 'Worker error',
    code: error?.code || 'worker_error',
  };

  if (error?.upstreamStatus) {
    payload.upstream_status = error.upstreamStatus;
  }
  if (error?.details) {
    payload.details = error.details;
  }

  return new Response(JSON.stringify(payload), {
    status: error?.status || 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
