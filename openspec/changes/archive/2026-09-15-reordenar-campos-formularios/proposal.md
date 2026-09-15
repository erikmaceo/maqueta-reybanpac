## Why

En las pantallas de captura de Seguridades (Aplicación, Módulo y Programa) varios campos de entrada (selects y búsquedas) se dibujan ocupando todo el ancho de la tarjeta, en lugar de aprovechar el espacio en filas de a dos como el par Código/Nombre. Esto hace los formularios más largos y desaprovecha el ancho disponible.

## What Changes

- Reordenar los campos de las tres pantallas de captura para agruparlos en filas de dos elementos del mismo nivel y dejar el campo `Descripción` al final ocupando el ancho completo.
- **Aplicación**: `Estado` y `Nodo de Segregación` comparten fila (al mismo nivel, lado a lado); `Descripción` se mueve al final de todos los campos.
- **Módulo**: la búsqueda de `Aplicación` y `Estado` comparten fila; `Descripción` se mueve al final.
- **Programa**: `Aplicación` y `Módulo` (búsquedas) comparten fila; `Tipo de Programa` y `Estado` comparten fila; `Descripción` se mueve al final (los controles del programa quedan después de la descripción cuando apliquen).
- No cambia el orden interno de los campos existentes ni la lógica de validación/guardado.

## Capabilities

### New Capabilities

### Modified Capabilities
- `seguridades-crud`: Los formularios de Aplicación, Módulo y Programa ordenan sus campos en filas de dos elementos del mismo nivel y reciben `Descripción` como último campo de ancho completo.

## Impact

- Archivos: `front-angular/src/app/pages/aplicacion-form/aplicacion-form.component.ts`, `front-angular/src/app/pages/modulo-form/modulo-form.component.ts`, `front-angular/src/app/pages/programa-form/programa-form.component.ts` (solo templates/estilos de las tarjetas).
- Sin cambios de API, datos, rutas, validaciones ni lógica de negocio.