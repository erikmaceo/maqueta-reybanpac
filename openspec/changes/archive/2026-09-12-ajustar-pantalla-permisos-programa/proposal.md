## Why

La nueva pantalla de permisos del programa funciona, pero su contenido aprovecha poco el ancho disponible y la tabla de controles no ofrece el mismo comportamiento de consulta que el apartado de Auditoría. Ajustar la distribución y reutilizar el patrón de tabla paginada hará la pantalla más legible, consistente y cómoda para perfiles con muchos controles.

## What Changes

- Hacer que la caja contenedora de permisos ocupe todo el ancho disponible y tenga `5px` de padding interno.
- Mostrar en una sola línea los cuatro datos de contexto: código/nombre del perfil y código/nombre del programa.
- Mostrar en una sola línea los cinco checks de permisos del programa.
- Adaptar la tabla de controles para usar la misma estructura y estilos de tabla de Auditoría.
- Agregar a la tabla de controles paginación, botones `Anterior` y `Siguiente`, indicador de página y selector de registros por página con las opciones existentes `5`, `10`, `15` y `20`.
- Mantener la edición de controles en memoria y asegurar que guardar persista los cambios de todas las páginas, no solo la página visible.
- Alinear los botones de la pantalla a la derecha con una separación de `2px`.
- Mantener sin cambios la navegación, el guardado, el botón `Volver`, el contrato del backend y los permisos editables.

## Capabilities

### New Capabilities

<!-- No se introduce una capacidad funcional nueva. -->

### Modified Capabilities

- `profile-permission-routes`: Ajustar la presentación y el comportamiento de la pantalla de permisos por programa, incluyendo distribución responsive y paginación local de controles.

## Impact

- Frontend Angular: `front-angular/src/app/pages/perfil-permissions/perfil-permissions.component.ts`.
- Especificación existente: delta sobre `openspec/specs/profile-permission-routes/spec.md`.
- Estilos globales existentes de tablas y paginación de Auditoría; no se prevén dependencias nuevas.
- API y backend: sin cambios; se seguirá usando el arreglo completo de controles en el guardado existente.
