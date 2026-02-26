#!/usr/bin/env bash
# ============================================================
# RentikPro — Icon Export Pipeline
# Genera PNGs, .icns (macOS), .ico (Windows), favicons y PWA icons
# ============================================================
set -euo pipefail

SVG="public/brand/icon-symbol.svg"
OUT_BRAND="public/brand"
OUT_PUBLIC="public/icons"
TAURI_ICONS="src-tauri/icons"
ICONSET="icon.iconset"

echo ""
echo "🔷 RentikPro Icon Export Pipeline"
echo "=================================="

# Verificar SVG base
if [[ ! -f "$SVG" ]]; then
  echo "❌ ERROR: No se encontró $SVG"
  exit 1
fi
echo "✅ SVG base: $SVG"

# Crear directorios necesarios
mkdir -p "$OUT_BRAND" "$OUT_PUBLIC" "$TAURI_ICONS" "$ICONSET"

# ============================================================
# PASO 1 — PNGs base en todos los tamaños necesarios
# ============================================================
echo ""
echo "📦 PASO 1 — Generando PNGs..."

for SIZE in 16 32 64 128 180 192 256 512 1024; do
  rsvg-convert -w "$SIZE" -h "$SIZE" "$SVG" -o "$OUT_BRAND/icon-${SIZE}.png"
  echo "   → icon-${SIZE}.png ✓"
done

# ============================================================
# PASO 2 — Favicons y PWA icons → public/icons/
# ============================================================
echo ""
echo "📦 PASO 2 — Favicons y PWA..."

cp "$OUT_BRAND/icon-16.png"  "$OUT_PUBLIC/favicon-16x16.png"
cp "$OUT_BRAND/icon-32.png"  "$OUT_PUBLIC/favicon-32x32.png"
cp "$OUT_BRAND/icon-180.png" "$OUT_PUBLIC/apple-touch-icon.png"
cp "$OUT_BRAND/icon-192.png" "$OUT_PUBLIC/android-chrome-192x192.png"
cp "$OUT_BRAND/icon-512.png" "$OUT_PUBLIC/android-chrome-512x512.png"
echo "   → favicon-16x16.png ✓"
echo "   → favicon-32x32.png ✓"
echo "   → apple-touch-icon.png (180×180) ✓"
echo "   → android-chrome-192x192.png ✓"
echo "   → android-chrome-512x512.png ✓"

# ============================================================
# PASO 3 — favicon.ico multi-size (16, 32, 48)
# ============================================================
echo ""
echo "📦 PASO 3 — favicon.ico multi-size..."

rsvg-convert -w 48 -h 48 "$SVG" -o "$OUT_BRAND/icon-48.png"

magick "$OUT_BRAND/icon-16.png" \
       "$OUT_BRAND/icon-32.png" \
       "$OUT_BRAND/icon-48.png" \
       "$OUT_PUBLIC/favicon.ico"
echo "   → favicon.ico (16+32+48px) ✓"

# También copiar a /public para que Vite lo sirva en raíz
cp "$OUT_PUBLIC/favicon.ico" "public/favicon.ico" 2>/dev/null || true

# ============================================================
# PASO 4 — icon.icns (macOS) via iconutil
# ============================================================
echo ""
echo "📦 PASO 4 — icon.icns para macOS..."

# iconutil necesita nombres exactos del iconset
cp "$OUT_BRAND/icon-16.png"   "$ICONSET/icon_16x16.png"
cp "$OUT_BRAND/icon-32.png"   "$ICONSET/icon_16x16@2x.png"
cp "$OUT_BRAND/icon-32.png"   "$ICONSET/icon_32x32.png"
cp "$OUT_BRAND/icon-64.png"   "$ICONSET/icon_32x32@2x.png"
cp "$OUT_BRAND/icon-128.png"  "$ICONSET/icon_128x128.png"
cp "$OUT_BRAND/icon-256.png"  "$ICONSET/icon_128x128@2x.png"
cp "$OUT_BRAND/icon-256.png"  "$ICONSET/icon_256x256.png"
cp "$OUT_BRAND/icon-512.png"  "$ICONSET/icon_256x256@2x.png"
cp "$OUT_BRAND/icon-512.png"  "$ICONSET/icon_512x512.png"
cp "$OUT_BRAND/icon-1024.png" "$ICONSET/icon_512x512@2x.png"

iconutil -c icns "$ICONSET" -o "$TAURI_ICONS/icon.icns"
echo "   → src-tauri/icons/icon.icns ✓"

# ============================================================
# PASO 5 — icon.ico (Windows) via ImageMagick
# ============================================================
echo ""
echo "📦 PASO 5 — icon.ico para Windows..."

magick "$OUT_BRAND/icon-16.png"  \
       "$OUT_BRAND/icon-32.png"  \
       "$OUT_BRAND/icon-48.png"  \
       "$OUT_BRAND/icon-64.png"  \
       "$OUT_BRAND/icon-128.png" \
       "$OUT_BRAND/icon-256.png" \
       "$TAURI_ICONS/icon.ico"
echo "   → src-tauri/icons/icon.ico ✓"

# ============================================================
# PASO 6 — Copias adicionales para Tauri (PNG 32x32 y 128x128)
# ============================================================
echo ""
echo "📦 PASO 6 — Copias PNG para Tauri..."

cp "$OUT_BRAND/icon-32.png"  "$TAURI_ICONS/32x32.png"
cp "$OUT_BRAND/icon-128.png" "$TAURI_ICONS/128x128.png"
cp "$OUT_BRAND/icon-256.png" "$TAURI_ICONS/128x128@2x.png"
echo "   → src-tauri/icons/32x32.png ✓"
echo "   → src-tauri/icons/128x128.png ✓"
echo "   → src-tauri/icons/128x128@2x.png ✓"

# ============================================================
# PASO 7 — Limpiar iconset temporal
# ============================================================
rm -rf "$ICONSET"
rm -f "$OUT_BRAND/icon-48.png"  # temporal
echo ""
echo "🧹 Limpieza de temporales ✓"

# ============================================================
# RESUMEN
# ============================================================
echo ""
echo "============================================"
echo "✅ Pipeline completado — Archivos generados:"
echo "============================================"
echo ""
echo "📁 public/brand/"
ls -lh "$OUT_BRAND"/icon-*.png | awk '{print "   " $NF " (" $5 ")"}'
echo ""
echo "📁 public/icons/"
ls -lh "$OUT_PUBLIC"/ | grep -v '^total' | awk '{print "   " $NF " (" $5 ")"}'
echo ""
echo "📁 src-tauri/icons/"
ls -lh "$TAURI_ICONS"/ | grep -v '^total' | awk '{print "   " $NF " (" $5 ")"}'
echo ""
echo "============================================"
echo "🚀 Listo para: npm run build:tauri"
echo "============================================"
