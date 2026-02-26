import fs from 'fs';
import path from 'path';

const copies = [
    // Favicons
    ['src-tauri/icons/icon.ico', 'public/favicon.ico'],
    ['src-tauri/icons/icon.ico', 'public/icons/favicon.ico'],
    ['src-tauri/icons/icon.ico', '../apps previas/ContikPro/landing-page/public/favicon.ico'],
    ['src-tauri/icons/32x32.png', 'public/icons/favicon-32x32.png'],
    ['src-tauri/icons/32x32.png', 'public/icons/favicon-16x16.png'], // Downscale cheating for web

    // SVG Favicons
    ['public/brand/icon-symbol.svg', 'public/favicon.svg'],
    ['public/brand/icon-symbol.svg', 'public/mask-icon.svg'],

    // Core Logos (large)
    ['src-tauri/icons/icon.png', 'public/logo.png'],
    ['src-tauri/icons/icon.png', 'public/logo-app.png'],
    ['src-tauri/icons/icon.png', '../apps previas/ContikPro/landing-page/public/logo.png'],

    // PWA & Android 512
    ['src-tauri/icons/icon.png', 'public/icons/icon-512.png'],
    ['src-tauri/icons/icon.png', 'public/icons/pwa-512.png'],
    ['src-tauri/icons/icon.png', 'public/icons/icon-512-maskable.png'],
    ['src-tauri/icons/icon.png', 'public/icons/android-chrome-512x512.png'],
    ['src-tauri/icons/icon.png', 'public/brand/icon-512.png'],
    ['src-tauri/icons/icon.png', 'public/brand/icon-1024.png'],

    // PWA & Android 192 (using Android mippmap-xxxhdpi which is 192x192)
    ['src-tauri/icons/android/mipmap-xxxhdpi/ic_launcher.png', 'public/icons/icon-192.png'],
    ['src-tauri/icons/android/mipmap-xxxhdpi/ic_launcher.png', 'public/icons/pwa-192.png'],
    ['src-tauri/icons/android/mipmap-xxxhdpi/ic_launcher.png', 'public/icons/android-chrome-192x192.png'],
    ['src-tauri/icons/android/mipmap-xxxhdpi/ic_launcher.png', 'public/brand/icon-192.png'],

    // Apple Touch Icon 180 (iOS 60@3x)
    ['src-tauri/icons/ios/AppIcon-60x60@3x.png', 'public/icons/apple-touch-icon.png'],
    ['src-tauri/icons/ios/AppIcon-60x60@3x.png', 'public/brand/icon-180.png'],

    // Brand sizing
    ['src-tauri/icons/128x128@2x.png', 'public/brand/icon-256.png'],
    ['src-tauri/icons/128x128.png', 'public/brand/icon-128.png'],
    ['src-tauri/icons/64x64.png', 'public/brand/icon-64.png'],
    ['src-tauri/icons/32x32.png', 'public/brand/icon-32.png'],
    ['src-tauri/icons/android/mipmap-mdpi/ic_launcher.png', 'public/brand/icon-48.png'] // 48
];

for (const [src, dest] of copies) {
    if (fs.existsSync(src)) {
        if (fs.existsSync(dest) || !dest.includes('..')) { // Only copy to external if we know it exists, but since we created most, we just copy. For landing, let's ensure dir
            const dir = path.dirname(dest);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.copyFileSync(src, dest);
            console.log(`Copied: ${src} -> ${dest}`);
        }
    } else {
        console.warn(`Source missing: ${src}`);
    }
}
