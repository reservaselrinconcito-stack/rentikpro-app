import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const ICON_SVG = path.join(ROOT, 'src', 'assets', 'brand', 'logo-rentikpro-icon.svg');
const FAVICON_SVG = path.join(ROOT, 'public', 'favicon.svg');
const FAVICON_ICO = path.join(ROOT, 'public', 'favicon.ico');
const TAURI_ICO = path.join(ROOT, 'src-tauri', 'icons', 'icon.ico');
const ICONS_DIR = path.join(ROOT, 'public', 'icons');
const PWA_192 = path.join(ICONS_DIR, 'pwa-192.png');
const PWA_512 = path.join(ICONS_DIR, 'pwa-512.png');

function withExtraMargin(svgText) {
  const openTagMatch = svgText.match(/^<svg[^>]*>/i);
  if (!openTagMatch) throw new Error('Invalid SVG');
  const openTag = openTagMatch[0];
  const inner = svgText.slice(openTag.length).replace(/<\/svg>\s*$/i, '').trim();
  const paddedInner = `<g transform="translate(15 15) scale(0.85)">${inner}</g>`;
  const root = '<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">';
  return `${root}\n  ${paddedInner}\n</svg>\n`;
}

async function renderPng(svgText, outPath, size) {
  const { Resvg } = await import('@resvg/resvg-js');
  const resvg = new Resvg(svgText, { fitTo: { mode: 'width', value: size } });
  const png = resvg.render().asPng();
  await fs.writeFile(outPath, png);
}

await fs.mkdir(ICONS_DIR, { recursive: true });

const iconSvg = await fs.readFile(ICON_SVG, 'utf8');

// favicon.svg (icon-only)
await fs.writeFile(FAVICON_SVG, iconSvg.endsWith('\n') ? iconSvg : (iconSvg + '\n'));

// favicon.ico (best effort: reuse tauri-generated icon.ico if present)
try {
  const ico = await fs.readFile(TAURI_ICO);
  await fs.writeFile(FAVICON_ICO, ico);
} catch {
  // If not present, skip. (Still have favicon.svg.)
}

const paddedSvg = withExtraMargin(iconSvg);
await renderPng(paddedSvg, PWA_192, 192);
await renderPng(paddedSvg, PWA_512, 512);

console.log('[pwa-assets] wrote', {
  faviconSvg: path.relative(ROOT, FAVICON_SVG),
  faviconIco: path.relative(ROOT, FAVICON_ICO),
  pwa192: path.relative(ROOT, PWA_192),
  pwa512: path.relative(ROOT, PWA_512),
});
