
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const URL = 'https://www.xn--elrinconcitomatarraa-m7b.com/es/room/8548/LOS-ALMENDROS';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_FILE = path.join(__dirname, 'debug.html');

const fetchHtml = async () => {
    try {
        const res = await fetch(URL);
        const html = await res.text();
        fs.writeFileSync(OUT_FILE, html);
        console.log('HTML saved to', OUT_FILE);
    } catch (e) {
        console.error(e);
    }
};

fetchHtml();
