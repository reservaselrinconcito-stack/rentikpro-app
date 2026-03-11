import { copyFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const paths = {
  source: path.join(root, 'public', 'index.html'),
  distIndex: path.join(root, 'dist', 'index.html'),
  distDemo: path.join(root, 'dist', 'demo', 'index.html'),
  distDownload: path.join(root, 'dist', 'download', 'index.html'),
  distDmg: path.join(root, 'dist', 'downloads', 'rentikpro', 'mac', 'RentikPro.dmg'),
};

const requiredBeforeCopy = [
  { key: 'public/index.html', path: paths.source },
  { key: 'dist/demo/index.html', path: paths.distDemo },
  { key: 'dist/download/index.html', path: paths.distDownload },
  { key: 'dist/downloads/rentikpro/mac/RentikPro.dmg', path: paths.distDmg },
];

const requiredAfterCopy = [
  { key: 'dist/index.html', path: paths.distIndex },
  { key: 'dist/demo/index.html', path: paths.distDemo },
  { key: 'dist/download/index.html', path: paths.distDownload },
];

async function ensureExists(label, filePath) {
  try {
    await stat(filePath);
  } catch (error) {
    const reason = error && typeof error === 'object' && 'code' in error ? ` (${error.code})` : '';
    throw new Error(`[postbuild] Missing required file: ${label}${reason}`);
  }
}

async function ensureAll(entries) {
  for (const entry of entries) {
    await ensureExists(entry.key, entry.path);
  }
}

async function run() {
  await ensureAll(requiredBeforeCopy);
  await copyFile(paths.source, paths.distIndex);
  console.log(`[postbuild] Landing copied to ${paths.distIndex}`);
  await ensureAll(requiredAfterCopy);
}

run().catch((error) => {
  console.error('[postbuild] Failed to copy landing:', error);
  process.exit(1);
});
