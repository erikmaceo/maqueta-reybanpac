## Why

La entrada del sidebar que da acceso a la sección de Aplicaciones/Módulos/Programas muestra la etiqueta "Seguridades", que ya no refleja el nombre funcional de la sección. Se renombra la etiqueta visible a "Aplicaciones" para alinear la navegación con el contenido.

## What Changes

- Cambiar la etiqueta del item del sidebar con ruta `/seguridades` de "Seguridades" a "Aplicaciones" en `layout.component.ts` (`NAV_ITEMS`).
- Sin cambios de ruta, icono, visibilidad (`adminOnly`) ni grupo del item; sin cambios en `PAGE_META`, títulos de página ni en los textos internos de las pantallas.

## Capabilities

### New Capabilities
<!-- Ninguna -->

### Modified Capabilities
- `seguridades-crud`: se agrega un nuevo requisito que define la etiqueta "Aplicaciones" para la entrada del sidebar que apunta a `/seguridades`.

## Impact

- `front-angular/src/app/pages/layout/layout.component.ts`: un único cambio de literal en `NAV_ITEMS`.
- Sin impacto en rutas, servicios, APIs ni dependencias.