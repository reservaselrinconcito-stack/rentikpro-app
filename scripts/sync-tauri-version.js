import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJsonPretty(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function updateCargoTomlVersion(cargoTomlPath, version) {
  const txt = fs.readFileSync(cargoTomlPath, 'utf8');
  const re = /(\n\s*version\s*=\s*")([0-9]+\.[0-9]+\.[0-9]+)(")/;
  if (!re.test(txt)) {
    throw new Error(`Could not find version in ${cargoTomlPath}`);
  }

  const next = txt.replace(re, (_, a, _v, c) => `${a}${version}${c}`);
  if (next !== txt) {
    fs.writeFileSync(cargoTomlPath, next, 'utf8');
  }
}

const pkgPath = path.join(root, 'package.json');
const tauriConfPath = path.join(root, 'src-tauri', 'tauri.conf.json');
const cargoTomlPath = path.join(root, 'src-tauri', 'Cargo.toml');

const pkg = readJson(pkgPath);
const version = String(pkg.version || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Invalid package.json version: '${version}'`);
}

const tauriConf = readJson(tauriConfPath);
tauriConf.productName = 'RentikPro';
tauriConf.version = version;
writeJsonPretty(tauriConfPath, tauriConf);

updateCargoTomlVersion(cargoTomlPath, version);

console.log(`[sync-tauri-version] Set Tauri version to ${version}`);
