# Rinconcito Standalone → RentikPro Integration

Los ficheros de esta carpeta documentan cómo la web standalone de El Rinconcito
se integra con RentikPro. Son de referencia — NO se integran en RPWeb.

## Uso

Estos ficheros van en `src/integrations/rentikpro/` de la web standalone de Rinconcito.

## Variables de entorno requeridas (.env)

```env
VITE_RP_WORKER_URL=https://rentikpro-public-api.reservas-elrinconcito.workers.dev
VITE_RP_PROPERTY_ID=<tu-property-id>
VITE_RP_PUBLIC_TOKEN=<tu-public-token>
```

## Mapeo de slugs

Editar `rentikproMapping.ts` (SLUG_MAP) cuando aparezcan en consola:
`[RentikPro] Unknown apartment slug: <value>`

Slugs internos conocidos:
- `la-tirolina`
- `la-ermita`
- `los-almendros`
- `mas-matarrana-el-olivo`
- `mas-matarrana-la-parra`

## Modo demo

Si cualquier variable de entorno falta → modo demo automático con datos placeholder.
El badge `DemoModeBadge` se muestra visible para el propietario.
