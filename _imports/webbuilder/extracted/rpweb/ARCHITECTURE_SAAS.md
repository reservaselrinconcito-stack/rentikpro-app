# Web Excelense · Arquitectura SaaS Clean

> Ferrari base: robusto, escalable, sin pantalla blanca, listo para leads y calendario real.

## Estructura de carpetas

```
src/
├── app/                    # Shell + bootstrap (estado central)
│   ├── AppShell.tsx        # Renderiza según status (NUNCA null)
│   ├── BootstrapContext.tsx # Contexto global de datos (property, apartments, availability)
│   └── useBootstrap.ts     # Máquina de estados principal
│
├── api/                    # Capa de acceso a red
│   ├── client.ts           # Fetch base con timeout, tipado de errores
│   └── rentikpro.ts        # Endpoints: getProperty, getApartments, getAvailability, createLead
│
├── domain/                 # Lógica de negocio pura
│   ├── types.ts            # Tipos de dominio (DomainProperty, DomainApartment…)
│   ├── normalizers.ts      # Conversión segura raw→domain (sin null)
│   └── safeData.ts         # safeLoadAll: carga con fallback a demo por recurso
│
├── demo/
│   └── demoData.ts         # Datos de demo (DEMO_PROPERTY, DEMO_APARTMENTS, DEMO_AVAILABILITY)
│
├── templates/
│   ├── registry.ts         # Registro de plantillas (themeId → component)
│   └── DefaultTemplate.tsx # Plantilla base: header + hero + apartments + availability + contact
│
├── ui/
│   ├── GlobalErrorBoundary.tsx  # Captura cualquier error React → ErrorScreen
│   └── screens/
│       └── index.tsx            # LoadingScreen, MissingSlugScreen, NotFoundScreen, ErrorScreen, DemoBanner
│
└── App.tsx                 # Entrada: GlobalErrorBoundary > Router > Routes > AppShell
```

---

## Flujo de bootstrap (state machine)

```
URL → AppShell → useBootstrap(slug?)
         │
         ├── status: loading        → LoadingScreen
         ├── status: missing_slug   → MissingSlugScreen (pantalla informativa)
         ├── status: notfound       → NotFoundScreen (404 elegante)
         ├── status: error          → ErrorScreen + CTA "Ir a demo"
         ├── status: demo           → Template + DemoBanner (datos demo)
         └── status: ready          → Template (datos reales de API)
```

### `useBootstrap(pathSlug?)` devuelve siempre:

```ts
{
  status: 'loading' | 'ready' | 'demo' | 'notfound' | 'missing_slug' | 'error';
  slug: string | null;
  lang: string;           // detectado de URL, navigator o defecto 'es'
  property: DomainProperty | null;
  apartments: DomainApartment[];
  availability: DomainAvailability | null;
  source: 'api' | 'demo' | 'mixed';
  error: Error | null;
}
```

---

## Safe Data Engine (`safeLoadAll`)

Cada recurso se carga de forma independiente. Si falla → demo automático:

```
safeLoadAll(slug)
  ├── getProperty(slug)
  │     └── falla? → DEMO_PROPERTY + notFound=true
  ├── getApartments(propertyId)
  │     ├── falla? → apartamentos del site-config (si existen)
  │     └── también vacíos? → DEMO_APARTMENTS
  └── getAvailability(propertyId)
        └── falla? → DEMO_AVAILABILITY (generada con slugs reales)

source = 'api'   → todo OK
source = 'mixed' → parcialmente API
source = 'demo'  → todo de demo
```

---

## Rutas soportadas

| URL | Comportamiento |
|-----|---------------|
| `/` | MissingSlugScreen |
| `/?slug=mi-slug` | Carga tenant `mi-slug` |
| `/mi-slug` | Carga tenant `mi-slug` |
| `/es/mi-slug` | Carga tenant `mi-slug` con lang=es |
| `/demo` | Modo demo explícito |
| `/pepito` | Modo demo explícito |
| `/slug-inexistente` | NotFoundScreen |

---

## Añadir una plantilla nueva

1. Crear `src/templates/MiPlantilla.tsx` que use `useBootstrapState()`
2. Añadir entrada en `src/templates/registry.ts`:
   ```ts
   'mi-theme-id': {
     id: 'mi-theme-id',
     label: 'Mi Plantilla',
     component: MiPlantilla,
   }
   ```
3. En el dashboard RentikPro, asignar `themeId: 'mi-theme-id'` al tenant.

---

## Variables de entorno (opcionales)

```env
VITE_RENTIKPRO_API_BASE=https://tu-api.workers.dev   # Por defecto: URL pública demo
VITE_RENTIKPRO_PUBLIC_TOKEN=tu-token                 # Opcional si el tenant lo provee
```

**Sin estas variables → modo demo automático. La app nunca se queda en blanco.**

---

## Anti-pantalla-blanca: resumen de blindajes

| Capa | Protección |
|------|-----------|
| `GlobalErrorBoundary` | Captura cualquier error React → ErrorScreen |
| `useBootstrap` | Status inicial = loading, nunca null |
| `safeLoadAll` | try/catch por recurso → demo si falla |
| `normalizers.ts` | Todos los campos tienen fallback, sin null |
| `AppShell` | Renderiza algo para CADA status posible |
| `DEMO_*` constants | Datos siempre disponibles sin red |
