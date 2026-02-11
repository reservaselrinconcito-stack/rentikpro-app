
# Plan de Pruebas de Integración RentikPro

## Escenario 1: Estructura y Persistencia
1. Crear Propiedad "Edificio Mar".
2. Crear Apartamento "Ático A" dentro de ella.
3. Cerrar App y volver a abrir.
4. **Validación**: La estructura debe persistir exactamente igual.

## Escenario 2: Importación Inteligente (Matching)
1. Importar CSV de viajeros donde 'NOMBRE DE LA PROPIEDAD' sea "Edificio Mar".
2. Ir a Módulo **Viajeros -> Estancias**.
3. **Validación**: La estancia debe aparecer como "Auto-asignado ✓" porque el sistema encontró la propiedad por nombre.

## Escenario 3: Deduplicación (Anti-spam)
1. Importar CSV de contabilidad.
2. Volver a importar el MISMO archivo CSV.
3. Ir a Módulo **Contabilidad**.
4. **Validación**: No debe haber movimientos duplicados gracias a la restricción `UNIQUE` sobre el `import_hash`.

## Escenario 4: Integración Cross-Module
1. En Importadores, cargar un Gasto con 'Apartamento' = "Ático A".
2. Ir a **Contabilidad**.
3. Filtrar por Bucket (según corresponda).
4. **Validación**: El gasto debe figurar como asignado al apartamento correcto.
