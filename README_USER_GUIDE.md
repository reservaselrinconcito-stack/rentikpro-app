
# Manual de Usuario - RentikPro Channel Manager

## 1. Gestión de Canales (Sincronización)

El **Channel Manager** permite mantener actualizados los calendarios de tus apartamentos conectando plataformas externas como **Airbnb**, **Booking.com**, **Vrbo** o tu propia web.

### Cómo añadir una conexión iCal

1.  Navega a la sección **Channel Manager** en el menú lateral.
2.  En la barra lateral izquierda, selecciona la **Propiedad** y luego el **Apartamento** que deseas configurar.
3.  En el panel principal, haz clic en el botón **"+ Añadir Fuente"**.
4.  Rellena los datos:
    *   **Canal**: Selecciona la plataforma (ej. Airbnb).
    *   **Nombre/Alias**: Un nombre para identificar esta conexión (ej. "Airbnb - Propietario").
    *   **URL del Calendario (iCal)**: Pega aquí el enlace de exportación proporcionado por la OTA.
        *   *Airbnb*: Disponibilidad > Sincronización del calendario > Exportar calendario.
        *   *Booking*: Calendario y precios > Sincronizar calendarios > Añadir conexión de calendario.
    *   **Prioridad**: Define qué canal "manda" si hay conflicto.
        *   Booking (90) suele tener prioridad sobre Airbnb (80).
        *   Los bloqueos manuales tienen prioridad 100.

### Cómo forzar la sincronización

El sistema intenta sincronizar automáticamente si hay conexión a internet y la configuración "Auto-Sync" está activa. Para forzarlo:

1.  **Sincronización Global**: En la cabecera del Channel Manager, pulsa **"Sincronizar Todo"**. Esto actualizará todos los apartamentos secuencialmente.
2.  **Sincronización Individual**: Dentro de la vista de un apartamento, pulsa **"Sincronizar Ahora"**.

---

## 2. Gestión de Conflictos

Un conflicto ocurre cuando dos reservas coinciden en fechas para el mismo apartamento.

### Resolución Automática
El sistema aplica reglas de prioridad automáticamente:
1.  Si entra una reserva de **Booking (Prio 90)** y ya existe una de **Airbnb (Prio 50)** en las mismas fechas, la de Airbnb se cancela automáticamente.
2.  Si entra un **Bloqueo Manual**, este siempre prevalece.

### Resolución Manual
Si el sistema detecta un conflicto que no puede resolver (ej. dos fuentes con la misma prioridad):
1.  Verás una alerta amarilla en el Dashboard del Channel Manager: **"Conflictos Detectados"**.
2.  Se mostrará una tarjeta comparando la **Reserva A** y la **Reserva B**.
3.  Haz clic en la reserva que deseas **MANTENER**. La otra será cancelada automáticamente.

---

## 3. Pruebas (Modo Demo)

Si no tienes enlaces reales, puedes usar los siguientes archivos de prueba incluidos en la app:

*   **Airbnb Mock**: `http://localhost:5173/mock_airbnb.ics`
*   **Booking Mock**: `http://localhost:5173/mock_booking.ics`

(Asegúrate de que el servidor de desarrollo esté corriendo en el puerto 5173 o ajusta la URL).
