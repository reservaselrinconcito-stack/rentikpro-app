import fs from 'node:fs/promises';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const workspaceRoot = process.cwd();

function abs(p) {
  return path.isAbsolute(p) ? p : path.join(workspaceRoot, p);
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function renderPng(svgText, sizePx, outPath) {
  const resvg = new Resvg(svgText, {
    fitTo: {
      mode: 'width',
      value: sizePx,
    },
  });
  const pngData = resvg.render().asPng();
  await ensureDir(outPath);
  await fs.writeFile(outPath, pngData);
}

async function main() {
  const input = process.argv[2] || 'design/logo-options/option-01.svg';
  const inputPath = abs(input);
  const svgText = await fs.readFile(inputPath, 'utf8');

  const outputs = [
    // Web/PWA icons
    { size: 192, out: 'public/icons/icon-192.png' },
    { size: 512, out: 'public/icons/icon-512.png' },
    { size: 512, out: 'public/icons/icon-512-maskable.png' },
    { size: 192, out: 'public/icons/pwa-192.png' },
    { size: 512, out: 'public/icons/pwa-512.png' },
    { size: 180, out: 'public/icons/apple-touch-icon.png' },

    // Source PNG for other tooling
    { size: 1024, out: 'design/logo-options/option-01-1024.png' },
  ];

  await Promise.all(outputs.map(o => renderPng(svgText, o.size, abs(o.out))));

  process.stdout.write(
    `Generated ${outputs.length} PNG(s) from ${path.relative(workspaceRoot, inputPath)}\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
