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

Asegúrate de que la versión en `src-tauri/tauri.conf.json` es la correcta.

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

npx tauri build
```

## 5. Publicar Actualización

Tras el build, Tauri generará:
- Instaladores (`.dmg`, `.msi`, `.deb`, etc.)
- Artefactos comprimidos (`.tar.gz`, `.zip`)
- Archivos de firma (`.sig`)

### Pasos finales:
1. Sube los artefactos (`.tar.gz`, `.msi.zip`, etc.) a tu servidor/CDN.
2. Abre `tauri-updater-template.json`.
3. Para cada plataforma:
   - Copia el contenido del archivo `.sig` correspondiente en el campo `"signature"`.
   - Pon la URL pública del artefacto en el campo `"url"`.
4. Sube este JSON como `latest.json` a la URL configurada en `tauri.conf.json` (`https://TU_DOMINIO/latest.json`).

---
> [!IMPORTANT]
> Nunca compartas ni commites el archivo de clave privada (`.key`).
