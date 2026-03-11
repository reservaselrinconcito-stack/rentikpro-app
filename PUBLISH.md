# 🚀 Guía de Publicación: RentikPro (Tauri v2)

Este documento detalla el pipeline para generar y publicar actualizaciones de RentikPro.

## 1. Reparación de Permisos (Si fallan npm/npx)

Si encuentras errores de `EPERM` o `Operation not permitted`:

```bash
# Corregir caché de npm
sudo chown -R $(id -u):$(id -g) ~/.npm

# Corregir dependencias del proyecto (si existen)
sudo chown -R $(id -u):$(id -g) ./node_modules

# Corregir caché de Cargo (opcional si falla Tauri build)
sudo chown -R $(id -u):$(id -g) ~/.cargo
```

## 2. Generar Claves del Updater (Solo una vez)

Si no tienes claves todavía, générelas (no las subas a git):

```bash
npx tauri signer generate -w ./updater-keys.key
```

- Guarda la `privkey` en un lugar seguro (y en tus ENV vars de CI/CD si usas una).
- Copia la `pubkey` en `src-tauri/tauri.conf.json`.

## 3. Preparar Compilación

La versión canónica vive en `package.json`. Usa siempre los scripts de npm para que `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml` se sincronicen solos antes del build.

```bash
npm ci
npm run build
```

## 4. Generar Artefactos de Release

Compila la versión de producción con el updater activo. La variable `TAURI_SIGNING_PRIVATE_KEY` es necesaria para firmar los artefactos.

```bash
# Define la clave privada antes de compilar
export TAURI_SIGNING_PRIVATE_KEY="tu_clave_privada_aqui"
# (O usa la contraseña si cifraste la clave)
# export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="tu_password"

npm run tauri:build
```

## 5. Publicar Actualización

Tras el build, Tauri generará:
- Instaladores (`.dmg`, `.msi`, `.deb`, etc.)
- Artefactos comprimidos (`.tar.gz`, `.zip`)
- Archivos de firma (`.sig`)

### Pasos finales:
1. Crea una GitHub Release con el tag `vX.Y.Z`.
2. Sube a esa release los instaladores reales (`.dmg`, `setup.exe`, etc.) y los artefactos del updater (`.app.tar.gz`, `.sig`, etc.).
3. El worker `worker-updater/` publica automaticamente:
   - `latest.json` para Tauri updater
   - `release.json` para el landing y la pagina `/download/`
4. El landing no debe apuntar nunca a nombres hardcodeados como `RentikPro-mac-arm64.dmg`; debe resolver siempre la release estable actual.

---
> [!IMPORTANT]
> Nunca compartas ni commites el archivo de clave privada (`.key`).
