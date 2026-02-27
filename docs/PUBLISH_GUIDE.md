# Documentación de Publicación RPWeb (Website Builder v3)

Para qué el Editor Ferrari (v3) pueda publicar sitios web en la infraestructura de Cloudflare Workers/KV, se requieren las siguientes variables de entorno en el archivo `.env`.

### Variables de Entorno Requeridas

```bash
# URL del Worker que gestiona el almacenamiento KV (sin barra final)
VITE_PUBLIC_WORKER_URL=https://rentikpro-public-api.reservas-elrinconcito.workers.dev

# Clave de administración para autorizar la escritura en KV
# Se puede usar indistintamente cualquiera de estas dos variables:
VITE_PUBLIC_WORKER_ADMIN_KEY=tu_secreto_aqui
# O como fallback:
VITE_ADMIN_TOKEN=tu_secreto_aqui

# URL base donde se sirven los sitios web publicados
VITE_PUBLIC_WEB_BASE=https://rp-web-6h9.pages.dev
```

### Flujo de Publicación
1. **Datos de Disponibilidad:** El sistema exporta un snapshot de la propiedad y sus calendarios al Worker.
2. **Configuración del Sitio:** Se guarda el JSON `SiteConfigV1` que contiene el diseño (bloques, textos, imágenes).
3. **URL Final:** El sitio estará disponible en `${VITE_PUBLIC_WEB_BASE}/${slug}`.

### Resolución de Problemas
- **Fallo Silencioso:** Si el botón de publicar no hace nada, revisa la consola del navegador. El sistema mostrará un `toast` informativo si faltan variables.
- **Error 401 / No autorizado:** Verifica que el `VITE_ADMIN_TOKEN` coincida con el configurado en el Worker.
- **Error de Conexión:** Asegúrate de que `VITE_PUBLIC_WORKER_URL` sea accesible y no tenga errores de CORS.
