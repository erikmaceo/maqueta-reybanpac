## Context

La pantalla de permisos se encuentra en `front-angular/src/app/pages/perfil-permissions/perfil-permissions.component.ts`. El layout global ya muestra el título y subtítulo de la ruta mediante `PAGE_META`, pero el componente también renderiza un `<h1>` y un `<p>` con la misma información. La tarjeta `.permission-card` tiene actualmente `padding: 5px` y contiene tanto la información editable como el grupo inferior de acciones.

La pantalla ya cuenta con paginación local de controles y con un botón `Volver` en la cabecera. Este cambio solo refina jerarquía visual y espaciado; no modifica las rutas, la paginación, el guardado ni el contrato del backend.

## Goals / Non-Goals

**Goals:**

- Eliminar el título y subtítulo duplicados del contenido del componente.
- Mantener el botón superior `Volver` como acción de navegación.
- Aumentar el padding de `.permission-card` a `10px`.
- Sacar el grupo inferior `Volver`/`Guardar` de la tarjeta.
- Separar el grupo de acciones de la tarjeta con `margin-top: 10px`.
- Mantener los botones inferiores alineados a la derecha y con `gap: 2px`.
- Conservar el comportamiento de paginación, edición, guardado, errores y navegación.

**Non-Goals:**

- No cambiar el título o subtítulo configurado en `LayoutComponent`.
- No eliminar el botón superior `Volver` ni cambiar su destino.
- No modificar la tabla, sus controles de paginación ni los tamaños de página.
- No cambiar endpoints, modelos, rutas ni lógica de permisos.
- No agregar una nueva tarjeta o componente reutilizable para acciones.

## Decisions

### 1. Conservar el contenedor de cabecera solo para navegación

Se eliminará el bloque interno que contiene `<h1>Permisos del Programa</h1>` y el texto descriptivo. Se conservará el wrapper de cabecera con el botón superior `Volver`, alineándolo al extremo derecho para que la pantalla siga ofreciendo una salida contextual sin duplicar el encabezado global.

El título de la ruta seguirá siendo el definido por `PAGE_META`, por lo que no se pierde información contextual.

### 2. Ajustar únicamente el padding de la tarjeta existente

`.permission-card` cambiará de `padding: 5px` a `padding: 10px`, manteniendo `width: 100%`, `max-width: none` y `box-sizing: border-box`. No se tocarán los gaps internos de las grillas ni los estilos de la tabla.

Se elige modificar la regla existente en lugar de agregar una envoltura porque la tarjeta ya representa correctamente el área de edición.

### 3. Convertir las acciones inferiores en un hermano de la tarjeta

El bloque `.form-actions` se moverá fuera del cierre de `.permission-card`, manteniéndose dentro del mismo flujo de la pantalla. Se conservarán los mismos botones, bindings y handlers.

La regla local de acciones tendrá:

- `margin-top: 10px` para separar el grupo de la tarjeta.
- `display: flex` y `justify-content: flex-end` para alinearlo a la derecha.
- `gap: 2px` para mantener la separación solicitada.

El botón superior de la cabecera no se mezcla con este grupo y conserva su ubicación de navegación.

### Alternativas consideradas

- **Eliminar toda la cabecera del componente**: descartada porque eliminaría también el botón superior `Volver`.
- **Mantener los botones dentro de la tarjeta y aumentar solo su margen**: descartada porque no cumple la separación estructural solicitada.
- **Usar el subtítulo del componente como ayuda contextual**: descartada porque el usuario indicó que esa información ya está en el header de la aplicación.
- **Crear un componente separado para acciones**: descartada porque el cambio es local y no aporta reutilización concreta.

## Risks / Trade-offs

- [Riesgo] Al eliminar el título interno, una vista fuera del layout podría perder contexto. → [Mitigación] La ruta siempre se renderiza dentro de `LayoutComponent`, cuyo `PAGE_META` ya define título y descripción.
- [Riesgo] Sacar las acciones de la tarjeta puede afectar el espaciado responsive. → [Mitigación] Mantener flexbox, alineación derecha y permitir wrapping mediante los estilos globales existentes.
- [Riesgo] El padding adicional reduce mínimamente el área útil de la tabla. → [Mitigación] El aumento es de solo `5px` y la tarjeta conserva el ancho completo.

## Migration Plan

1. Eliminar el título y subtítulo internos del template.
2. Cambiar el padding de `.permission-card` a `10px`.
3. Mover `.form-actions` fuera de la tarjeta y agregar `margin-top: 10px`.
4. Ejecutar `npm run build` en `front-angular`.
5. Verificar visualmente la pantalla y los flujos de `Volver` y `Guardar`.

No se requiere migración de datos ni cambios de despliegue coordinados con el backend. El rollback consiste en restaurar el markup y las reglas CSS anteriores del componente.

## Open Questions

No quedan preguntas funcionales bloqueantes.
