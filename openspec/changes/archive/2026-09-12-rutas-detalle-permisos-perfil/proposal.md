## Why

La sección de Perfiles mezcla actualmente la consulta del perfil con estado interno del componente y utiliza un diálogo modal para editar los permisos de cada programa. Esto limita la navegación, dificulta compartir o recuperar una vista específica y reduce el espacio disponible para editar los permisos y controles.

## What Changes

- Convertir el detalle de un perfil en una vista navegable mediante una ruta propia.
- Mantener el acceso desde la columna `Nombre` y abrir el detalle directamente en la pestaña `Programas por perfil`.
- Convertir la edición de permisos de un programa en una pantalla navegable, reemplazando el diálogo `Permisos del Programa`.
- Mantener en la nueva pantalla las mismas funciones actuales: información del perfil y programa, permisos `Nuevo`, `Modificar`, `Eliminar`, `Imprimir` y `Consultar`, y permisos de controles `Visualizar` y `Modificar`.
- Reemplazar el botón `Cancelar` de la edición por un botón `Volver` que regrese al detalle del perfil y a `Programas por perfil` sin guardar cambios.
- Mantener el guardado mediante la actualización del perfil completo y conservar los mensajes de éxito y error existentes.
- Mantener las rutas existentes de listado, creación y edición de perfiles funcionando.

## Capabilities

### New Capabilities

- `profile-permission-routes`: Navegación por rutas al detalle de un perfil y a la edición de permisos de un programa dentro del perfil.

### Modified Capabilities

<!-- No existe una especificación vigente para Perfiles que deba modificarse. -->

## Impact

- Frontend Angular: `PerfilesComponent`, rutas de Angular y metadatos del layout.
- Posible nuevo componente standalone para el detalle del perfil y/o la edición de permisos por programa, según el diseño final.
- Estado de navegación: el perfil y programa seleccionados deberán derivarse de parámetros de ruta para soportar navegación directa, recarga y regreso contextual.
- API: reutilización de `GET /api/seg-perfiles`, `GET /api/seg-programas`, `GET /api/seg-controles` y `PUT /api/seg-perfiles/:id`; no se prevé un endpoint nuevo.
- Backend y modelo de datos: sin cambios funcionales previstos.
