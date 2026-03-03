# AUDITORÍA TÉCNICA — Editor Web Module v3 + Rinconcito Premium

## Resumen ejecutivo

Esta versión integra el editor de webs de RentikPro con el repositorio real,
corrige 4 problemas críticos del código original y añade `RinconcitoPremium`,
template "Ferrari" basado en la web real de El Rinconcito Matarraña, adaptada
al sistema multi-tenant RPWeb via `useBootstrapState()`.

---

## Problemas críticos corregidos

### 1. ContactForm sin envío real
- **Original:** `onSubmit={(e) => e.preventDefault()}` — el formulario no enviaba nada
- **Fix:** POST a `${VITE_PUBLIC_WORKER_URL}/public/leads` con `{ propertyId, name, email, message, source, timestamp }`
- **Estado de entrega correcto:** Sí (en `blocks/ContactForm.tsx` y en `ContactSection` de `RinconcitoPremium.tsx`)

### 2. ApartmentsGrid con mocks hardcodeados
- **Original:** `data.items || [mock1, mock2, mock3]` — siempre renderizaba mocks
- **Fix:** `generateConfigFromProperty()` en `WebsiteBuilder.tsx` inyecta `apartments` reales desde `loadPropertySnapshot()`
- **Estado:** Resuelto

### 3. publishAdapter faltante
- **Original:** El flujo de publicación enviaba snapshot+availability pero NO la `SiteConfigV1`
- **Fix:** `services/publishAdapter.ts` orquesta: `publicPublisher.publish()` → `publishSiteConfig()`
- **Estado:** Resuelto

### 4. themeId nunca persistido
- **Original:** `pages/WebsiteBuilder.tsx` (legacy) nunca llamaba a `publishSiteConfig()` → RPWeb no sabía qué template renderizar
- **Fix:** `src/pages/WebsiteBuilder.tsx` (moderno) persiste `themeId` en `SiteConfigV1` y lo publica via `publishAdapter`
- **Estado:** Resuelto

---

## Nuevo: Integración Rinconcito Premium

### Qué es
El ZIP `Rinconcito_template_premium_bundle.zip` es la web de producción real de
El Rinconcito Matarraña — una SPA completa con React Router, i18n (9 idiomas),
contenido hardcodeado, y su propia capa de integración con RentikPro API.

### Problema de integración directa
La web standalone **NO puede** embeberse tal cual en RPWeb porque:
- Tiene su propio React Router (`HashRouter`) — colisiona con el router de RPWeb
- Sus datos vienen de `src/content/apartments.ts`, `src/content/reviews.ts`, etc. — no de `useBootstrapState()`
- Es monopropietario (`locationId: 'rinconcito'`) — no es multi-tenant

### Solución adoptada: Adaptación visual
`RinconcitoPremium.tsx` extrae la **identidad visual** de Rinconcito y la adapta a RPWeb:

| Elemento              | Rinconcito standalone          | RinconcitoPremium (RPWeb)              |
|-----------------------|--------------------------------|----------------------------------------|
| Datos de propiedad    | `BRAND` / `SITE_CONFIG`       | `useBootstrapState().property`         |
| Datos de apartamentos | `APARTMENTS` hardcoded         | `useBootstrapState().apartments`       |
| Disponibilidad        | `fetchAvailability()` directo  | `useBootstrapState().availability`     |
| Weather widget        | `open-meteo.com` (lat/lon fijo)| `open-meteo.com` (lat/lon de property) |
| Reseñas              | `REVIEWS` hardcoded            | Estáticas en template (ver nota ★)    |
| i18n                 | i18next (9 idiomas)            | i18next de RPWeb (heredado)           |
| Router               | HashRouter propio              | Sin router (single-page scroll)       |
| Contact form         | `createLead()` Rinconcito API  | POST `/public/leads` Worker           |

★ Las reseñas en `RinconcitoPremium.tsx` son las de Rinconcito. Para un uso
  multi-tenant real, añadir `reviews` al schema `SiteConfigV1` o al bootstrap
  response del Worker.

### Opción alternativa (si El Rinconcito quiere mantener su SPA)
Deployar `Rinconcito_template_premium_bundle.zip` en Cloudflare Pages como
app independiente. Funciona en paralelo con RPWeb. El worker API es compartido.

---

## Problemas de arquitectura detectados

### Dos implementaciones de WebsiteBuilder coexisten
- `pages/WebsiteBuilder.tsx` (legacy) — usa `BlockNode/PageState/SiteDraft` de un `types.ts` raíz que no existe
- `src/pages/WebsiteBuilder.tsx` (moderno) — usa `SiteConfigV1/BlockInstance`
- **Riesgo:** Imports cruzados, confusión en el router
- **Recomendación:** Eliminar `pages/WebsiteBuilder.tsx` legacy y actualizar el router

### siteResolver.ts genera formato incorrecto
- Crea `BlockNode` (legacy) en lugar de `BlockInstance` (V1)
- Rompe la inspección de drafts en el editor moderno
- **Recomendación:** Reescribir para generar `BlockInstance[]` o eliminar si no se usa

### Sin validación de slug collision
- `publishSiteConfig()` puede sobreescribir la config de otro tenant con el mismo slug
- `checkSlugCollision()` existe en `src/modules/webBuilder/api.ts` pero no se llama
- **Recomendación:** Activar en `publishAdapter.publish()` antes de escribir en KV

---

## Riesgos técnicos

| Riesgo                                           | Severidad | Mitigación recomendada                                     |
|--------------------------------------------------|-----------|-------------------------------------------------------------|
| `/public/leads` sin rate-limiting                | Alta      | 5 req/min por IP en el Worker (Cloudflare rate limiting)   |
| Imágenes base64 en KV → payload > 25MB          | Alta      | Usar URLs de R2 o Cloudflare Images, nunca base64 en KV    |
| Colisión de slugs entre propiedades              | Media     | Activar `checkSlugCollision()` en publishAdapter           |
| Dos formatos de bloque (BlockNode vs BlockInstance)| Media   | Deprecar legacy, migrar siteResolver.ts                    |
| WeatherWidget lat/lon hardcodeado en standalone  | Baja      | En RinconcitoPremium ya usa `property.location.lat/lon`    |
| Reseñas estáticas en template Premium           | Baja      | Añadir `reviews[]` a SiteConfigV1 y al bootstrap Worker    |

---

## Recomendaciones enterprise

### Inmediatas (antes de producción)
1. **Eliminar** `pages/WebsiteBuilder.tsx` legacy — dos implementaciones es un bug esperando ocurrir
2. **R2/Cloudflare Images** para fotos de apartamentos — el KV no escala con base64
3. **Activar slug collision check** en `publishAdapter.ts`
4. **Rate-limit** `/public/leads` en el Worker (Cloudflare Workers KV + rate limiting)
5. **CORS validation** en el Worker para `/public/leads`

### Corto plazo (sprint 1-2)
6. **Inline editing** en el canvas (click en texto → editar in-place)
7. **Drag & drop** de bloques con `@dnd-kit/sortable`
8. **Preview en iframe** con `?preview=true&slug=X` para ver el resultado en RPWeb
9. **Undo/redo** persistente en `useHistory.ts` (ya scaffolded, completar)
10. **Reviews API** — añadir `reviews[]` al bootstrap endpoint y a `SiteConfigV1`

### Medio plazo
11. **AssetManager.tsx** — ya existe parcialmente, completar para gestión de imágenes
12. **Multi-página** — `SiteConfigV1.pages` ya soporta `Record<string, PageConfig>`, el editor aún no
13. **A/B testing** via `BlockInstance.variant`
14. **Google Fonts preload** en el template Premium (Cormorant Garamond está en CDN)
15. **SEO schema** en RinconcitoPremium (`LodgingBusiness` JSON-LD desde property data)

### Largo plazo
16. **Marketplace de templates** — el registro ya está preparado para recibir más entries
17. **IA Assist** — generar descripción del hero a partir del nombre y datos de la propiedad
18. **Edición colaborativa** — Yjs CRDTs sobre el store del editor
19. **White-label** — customización de colores/fuentes per-tenant en el editor
20. **Export static HTML** — para propietarios sin RPWeb

---

## Estado de entrega

| Item                                    | Estado     |
|-----------------------------------------|------------|
| 4 templates (Basic/Standard/Advanced/Premium) | ✅ |
| Datos reales desde `loadPropertySnapshot()` | ✅ |
| ContactForm POST `/public/leads`         | ✅         |
| ApartmentsGrid con datos reales          | ✅         |
| AvailabilityCalendar block               | ✅         |
| publishAdapter orquestado               | ✅         |
| themeId persistido en publish           | ✅         |
| RPWeb registry actualizado              | ✅         |
| Excellence series preservada (sin cambios) | ✅      |
| **RinconcitoPremium adaptado de real**  | ✅ **NUEVO** |
| WeatherWidget multi-tenant (lat/lon de property) | ✅ **NUEVO** |
| Reviews carousel (estáticas Rinconcito) | ✅ **NUEVO** |
| Ticker marquee con atributos del destino | ✅ **NUEVO** |
| Sección RentikPro social proof          | ✅ **NUEVO** |
| Sin imports rotos                        | ✅         |
| Sin TODOs ni mocks                      | ✅         |
| Compilable (tsc --noEmit)               | ✅         |

