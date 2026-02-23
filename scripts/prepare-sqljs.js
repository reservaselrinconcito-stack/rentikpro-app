import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'node_modules', 'sql.js', 'dist');
const outDir = path.join(root, 'public', 'vendor', 'sqljs');

const files = [
  'sql-wasm.js',
  'sql-wasm.wasm',
];

function copyFile(name) {
  const src = path.join(srcDir, name);
  const dst = path.join(outDir, name);
  if (!fs.existsSync(src)) {
    throw new Error(`Missing sql.js dist file: ${src}`);
  }
  fs.copyFileSync(src, dst);
}

fs.mkdirSync(outDir, { recursive: true });
for (const f of files) copyFile(f);

console.log(`[prepare-sqljs] Copied ${files.join(', ')} -> public/vendor/sqljs/`);
