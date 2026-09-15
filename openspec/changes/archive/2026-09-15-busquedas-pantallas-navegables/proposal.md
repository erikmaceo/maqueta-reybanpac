## Why

Los diálogos emergentes de búsqueda que se abren al pulsar los componentes `search` de las pantallas de captura de Aplicación, Módulo y Programa se ven muy cargados: ocupan ~800px, la tabla queda comprimida y las columnas (Código, Nombre, Descripción, Estado, acción) muestran la información de forma deficiente. Lo mismo ocurrió con otros diálogos de la aplicación y ya se resolvió navegando a pantallas a pantalla completa; esta vez aplicamos el mismo criterio a las búsquedas de selección de entidad padre.

## What Changes

- Sustituir los 4 diálogos de búsqueda por pantallas navegables a pantalla completa, manteniendo las mismas funcionalidades (filtros por Código/Nombre/Estado, tabla, paginación y selección):
  - Aplicación → búsqueda de **Nodo de Segregación**.
  - Módulo → búsqueda de **Aplicación**.
  - Programa → búsqueda de **Aplicación** y de **Módulo**.
- Nuevas rutas con guard de admin y lazy loading:
  - `/seguridades/seleccionar-aplicacion`
  - `/seguridades/seleccionar-modulo`
  - `/seguridades/seleccionar-nodo`
- Nuevos componentes standalone de selección (`AplicacionSelectComponent`, `ModuloSelectComponent`, `NodoPadreSelectComponent`) que replican los filtros, columnas, paginación (con selector de registros por página) y acción `Seleccionar` de los diálogos actuales, renderizados con el ancho completo de la tarjeta.
- El formulario origina la navegación y conserva su borrador (campos ingresados, tipo, estado y controles de un programa) mediante un servicio liviano de borrador; la entidad elegida vuelve al formulario como parámetro de la URL, aplicándose sobre el borrador restaurado.
- Eliminar los `p-dialog` de búsqueda y su estado/métodos asociados (abrir/cerrar, filtros aplicados, paginación del diálogo) de los tres formularios, así como el import `DialogModule` que quede sin uso.
- Mantener sin cambios: validaciones, guardado, `Volver` de cabecera, `clear` del campo (trasero de lod), y el comportamiento de que al cambiar de aplicación en Programa se limpie el módulo seleccionado.

## Capabilities

### New Capabilities

### Modified Capabilities
- `seguridades-crud`: La selección de entidades padre (Nodo de Segregación, Aplicación, Módulo) en los formularios de Aplicación/Módulo/Programa pasa de dialogos emergentes a pantallas navegables de selección, conservando el borrador del formulario a través de la navegación.

## Impact

- Frontend Angular:
  - Nuevos: `front-angular/src/app/pages/aplicacion-select/aplicacion-select.component.ts`, `modulo-select/modulo-select.component.ts`, `nodo-select` (nuevo componente de selección de nodo padre para seguridades, sin tocar el `nodo-select` existente de accesos), y el servicio `front-angular/src/app/core/services/seguridad-draft.service.ts`.
  - Modificados: `front-angular/src/app/app.routes.ts`, `aplicacion-form/aplicacion-form.component.ts`, `modulo-form/modulo-form.component.ts`, `programa-form/programa-form.component.ts`.
- Especificación: delta sobre `seguridades-crud`.
- API, backend y modelo de datos: sin cambios.