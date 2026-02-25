import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const INPUT_SVG = path.join(ROOT, 'src', 'assets', 'brand', 'logo-rentikpro-icon.svg');
const OUTPUT_PNG = path.join(ROOT, 'src', 'assets', 'brand', 'logo-1024.png');

function withExtraMargin(svgText) {
  const openTagMatch = svgText.match(/^<svg[^>]*>/i);
  const closeTagMatch = svgText.match(/<\/svg>\s*$/i);
  if (!openTagMatch || !closeTagMatch) {
    throw new Error('Input is not a valid <svg> document');
  }

  const openTag = openTagMatch[0];
  const inner = svgText
    .slice(openTag.length)
    .replace(/<\/svg>\s*$/i, '')
    .trim();

  // Add padding by scaling down to 85% and centering in the original 200x200 viewBox.
  // (1 - 0.85) / 2 * 200 = 15
  const paddedInner = `<g transform="translate(15 15) scale(0.85)">${inner}</g>`;

  // Keep root svg attributes but force width/height/viewBox to the known values.
  const root = '<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">';
  return `${root}\n  ${paddedInner}\n</svg>\n`;
}

function pngSizeFromBuffer(buf) {
  // Minimal PNG IHDR parse.
  // https://www.w3.org/TR/PNG/#5PNG-file-signature
  const sig = buf.subarray(0, 8);
  const expected = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!sig.equals(expected)) return null;
  // IHDR starts at byte 8+4(len)+4(type)=16. Width/Height at 16..23.
  const type = buf.subarray(12, 16).toString('ascii');
  if (type !== 'IHDR') return null;
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { w, h };
}

const { Resvg } = await import('@resvg/resvg-js');

const svg = await fs.readFile(INPUT_SVG, 'utf8');
const svgWithMargin = withExtraMargin(svg);

const resvg = new Resvg(svgWithMargin, {
  fitTo: { mode: 'width', value: 1024 },
});

const rendered = resvg.render();
const pngData = rendered.asPng();

await fs.mkdir(path.dirname(OUTPUT_PNG), { recursive: true });
await fs.writeFile(OUTPUT_PNG, pngData);

const size = pngSizeFromBuffer(Buffer.from(pngData));
if (!size) {
  console.log(`[logo] Wrote ${OUTPUT_PNG} (size unknown)`);
} else {
  console.log(`[logo] Wrote ${OUTPUT_PNG} (${size.w}x${size.h})`);
  if (size.w !== 1024 || size.h !== 1024) {
    throw new Error(`Expected 1024x1024 PNG, got ${size.w}x${size.h}`);
  }
}
