
# Rinconcito Premium Template

Esta es una plantilla "Ferrari" optimizada para el nuevo Editor Web.

## Estructura para Edición

### 1. Bloques de Contenido (Textos Dinámicos y Datos)
- `src/content/`: Contiene la lógica de datos maestros (apartamentos, experiencias, guías).
- `src/i18n/locales/`: Contiene todas las traducciones. Es el lugar principal para editar textos de la interfaz.

### 2. Zonas de Imagen
- `public/assets/`: Directorio de recursos visuales.
- Las imágenes se referencian en `src/content/*.ts`. Para cambiar una foto, basta con actualizar la ruta o el archivo en `public/assets/`.

### 3. Layout y Componentes
- `src/components/`: Bloques de construcción visual (Header, Footer, Widgets).
- `src/pages/`: Estructura de las páginas principales.

### 4. Configuración
- `package.json`: Definición de dependencias.
- `vite.config.ts`: Configuración del bundler.

## Optimización
- Se han incluido solo los assets esenciales.
- Las imágenes han sido redimensionadas y comprimidas para mantener el bundle ligero (< 10MB).
