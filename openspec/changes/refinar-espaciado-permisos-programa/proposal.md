## Why

La pantalla de permisos ya muestra el contexto de la operación en el encabezado global de la aplicación, por lo que mantiene un título y subtítulo internos redundantes. Además, el padding reducido y los botones dentro de la tarjeta hacen que el contenido y las acciones se perciban demasiado ajustados.

## What Changes

- Eliminar de la pantalla el texto interno `Permisos del Programa` y `Configure los permisos del programa dentro del perfil seleccionado.`.
- Aumentar el padding interno de la tarjeta de permisos de `5px` a `10px`.
- Mover el grupo inferior de botones `Volver` y `Guardar` fuera de la tarjeta.
- Agregar `margin-top: 10px` al grupo de botones para separarlo visualmente de la tarjeta.
- Mantener el botón `Volver` de la cabecera, la navegación, el guardado, la paginación y los permisos sin cambios.

## Capabilities

### New Capabilities

<!-- No se introduce una capacidad funcional nueva. -->

### Modified Capabilities

- `profile-permission-routes`: Refinar la presentación de la pantalla de edición de permisos, su espaciado y la ubicación de sus acciones.

## Impact

- Frontend Angular: `front-angular/src/app/pages/perfil-permissions/perfil-permissions.component.ts`.
- Especificación existente: delta sobre `openspec/specs/profile-permission-routes/spec.md`.
- API, backend, rutas, modelo de datos y lógica de paginación: sin cambios.
