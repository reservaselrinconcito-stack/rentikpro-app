# INTEGRATION PATCH — Editor Web Module + Rinconcito Premium

## Ficheros a copiar

### RentikPro (repositorio principal)

| Origen (este ZIP)                                              | Destino (repo real)                                          | Acción  |
|----------------------------------------------------------------|--------------------------------------------------------------|---------|
| rentikpro/src/modules/webBuilder/types.ts                      | src/modules/webBuilder/types.ts                              | REPLACE |
| rentikpro/src/modules/webBuilder/templates.ts                  | src/modules/webBuilder/templates.ts                          | REPLACE |
| rentikpro/src/modules/webBuilder/defaults.ts                   | src/modules/webBuilder/defaults.ts                           | REPLACE |
| rentikpro/src/modules/webBuilder/api.ts                        | src/modules/webBuilder/api.ts                                | REPLACE |
| rentikpro/src/modules/webBuilder/adapters.ts                   | src/modules/webBuilder/adapters.ts                           | REPLACE |
| rentikpro/src/modules/webBuilder/publicSchema.ts               | src/modules/webBuilder/publicSchema.ts                       | REPLACE |
| rentikpro/src/modules/webBuilder/slug.ts                       | src/modules/webBuilder/slug.ts                               | NEW     |
| rentikpro/src/modules/webBuilder/v0Generator.ts                | src/modules/webBuilder/v0Generator.ts                        | REPLACE |
| rentikpro/src/modules/webBuilder/hooks/useHistory.ts           | src/modules/webBuilder/hooks/useHistory.ts                   | NEW     |
| rentikpro/src/modules/webBuilder/components/blocks/*.tsx       | src/modules/webBuilder/components/blocks/                    | REPLACE |
| rentikpro/src/modules/webBuilder/components/blocks/index.ts   | src/modules/webBuilder/components/blocks/index.ts            | REPLACE |
| rentikpro/src/modules/webBuilder/components/LivePreview.tsx    | src/modules/webBuilder/components/LivePreview.tsx            | REPLACE |
| rentikpro/src/modules/webBuilder/components/WebsiteRenderer.tsx| src/modules/webBuilder/components/WebsiteRenderer.tsx        | REPLACE |
| rentikpro/src/pages/WebsiteBuilder.tsx                         | src/pages/WebsiteBuilder.tsx                                 | REPLACE |
| rentikpro/src/pages/builder/components/Canvas.tsx              | src/pages/builder/components/Canvas.tsx                      | REPLACE |
| rentikpro/src/pages/builder/components/SidebarLeft.tsx         | src/pages/builder/components/SidebarLeft.tsx                 | REPLACE |
| rentikpro/src/pages/builder/components/SidebarRight.tsx        | src/pages/builder/components/SidebarRight.tsx                | REPLACE |
| rentikpro/src/pages/builder/components/BuilderHeader.tsx       | src/pages/builder/components/BuilderHeader.tsx               | REPLACE |
| rentikpro/src/pages/builder/store.ts                           | src/pages/builder/store.ts                                   | REPLACE |
| rentikpro/src/pages/builder/types.ts                           | src/pages/builder/types.ts                                   | REPLACE |
| rentikpro/src/pages/builder/blocks/defaults.ts                 | src/pages/builder/blocks/defaults.ts                         | REPLACE |
| rentikpro/src/pages/builder/hooks/useBuilder.ts                | src/pages/builder/hooks/useBuilder.ts                        | NEW     |
| rentikpro/services/publishAdapter.ts                           | services/publishAdapter.ts                                   | NEW     |

### RPWeb (repositorio de publicación)

| Origen (este ZIP)                                                      | Destino (repo RPWeb)                                            | Acción  |
|------------------------------------------------------------------------|-----------------------------------------------------------------|---------|
| rpweb/src/templates/registry.ts                                        | src/templates/registry.ts                                       | REPLACE |
| rpweb/src/templates/templates/BuilderBasic.tsx                         | src/templates/templates/BuilderBasic.tsx                        | NEW     |
| rpweb/src/templates/templates/BuilderStandard.tsx                      | src/templates/templates/BuilderStandard.tsx                     | NEW     |
| rpweb/src/templates/templates/BuilderAdvanced.tsx                      | src/templates/templates/BuilderAdvanced.tsx                     | NEW     |
| rpweb/src/templates/templates/RinconcitoPremium.tsx                    | src/templates/templates/RinconcitoPremium.tsx                   | NEW ★   |

★ **RinconcitoPremium.tsx** = template "Ferrari" real basado en El Rinconcito Matarraña.
  Usa `useBootstrapState()` para datos multi-tenant.
  Activo con `themeId: 'builder-premium'` o `'rinconcito-premium'`.

---

## Variables de entorno requeridas

### RentikPro (.env)

```env
VITE_PUBLIC_WORKER_URL=https://rentikpro-public-api.reservas-elrinconcito.workers.dev
VITE_PUBLIC_WORKER_ADMIN_KEY=<tu-admin-key>
VITE_PUBLIC_WEB_BASE=https://rp-web-6h9.pages.dev
VITE_ADMIN_TOKEN=<tu-admin-token>
```

### Rinconcito Template — integración directa (opcional)

Si El Rinconcito usa el template conectado a su propia API:

```env
# RPWeb o standalone Rinconcito app
VITE_RP_WORKER_URL=https://rentikpro-public-api.reservas-elrinconcito.workers.dev
VITE_RP_PROPERTY_ID=<property-id-de-rinconcito>
VITE_RP_PUBLIC_TOKEN=<public-token-de-rinconcito>
```

---

## Flujo de publicación

```
RentikPro editor
  → Seleccionar template "Premium" (themeId: 'builder-premium')
  → Editar bloques
  → Click "Publicar"
       ↓
publishAdapter.publish(propertyId, siteConfig)
  ├── publicPublisher.publish(propertyId)    → Worker KV: snapshot + availability
  └── publishSiteConfig(slug, siteConfig)   → Worker KV: SiteConfigV1 con themeId
       ↓
RPWeb (rp-web-6h9.pages.dev/:slug)
  → resolveTemplate('builder-premium')      → RinconcitoPremium
  → useBootstrapState()                     → datos reales del KV
  → Renderiza template premium
```

---

## Templates disponibles después de la integración

| themeId              | Plantilla                  | Descripción                                    |
|----------------------|----------------------------|------------------------------------------------|
| `builder-basic`      | BuilderBasic               | Azul, Inter, limpio                            |
| `builder-standard`   | BuilderStandard            | Índigo, Plus Jakarta Sans, conversión          |
| `builder-advanced`   | BuilderAdvanced            | Dorado sobre crema, Playfair Display, boutique |
| `builder-premium`    | **RinconcitoPremium** ★    | Stone-900, serif, ámbar, ticker, reviews       |
| `rinconcito-premium` | **RinconcitoPremium** ★    | Alias directo para El Rinconcito               |
| `excellence-*`       | Series Excellence          | Templates originales — no modificar            |

---

## Verificación post-integración

```bash
# RentikPro
cd rentikpro && npx tsc --noEmit

# RPWeb
cd rpweb && npx tsc --noEmit

# Test end-to-end
# 1. Abrir editor → seleccionar propiedad → elegir "Premium"
# 2. Editar hero text → Publicar
# 3. Verificar: https://rp-web-6h9.pages.dev/<slug>
#    → Debe renderizar RinconcitoPremium con datos reales
```

---

## Rinconcito Standalone → RPWeb Migration

El ZIP `Rinconcito_template_premium_bundle.zip` contiene la web standalone completa
de El Rinconcito Matarraña (React Router, i18n, content hardcoded).

**Esta web standalone NO se usa dentro de RPWeb.**
En su lugar, `RinconcitoPremium.tsx` extrae su identidad visual y la adapta
al sistema multi-tenant con `useBootstrapState()`.

Para mantener la web standalone activa en paralelo (opción válida):
- Deployar en Cloudflare Pages como app independiente
- RPWeb y standalone coexisten, apuntan al mismo Worker API

