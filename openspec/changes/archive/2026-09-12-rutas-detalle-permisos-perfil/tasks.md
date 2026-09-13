## 1. Pantallas y carga por ruta

- [x] 1.1 Crear `PerfilDetailComponent` como pantalla standalone para `/perfiles/:perfilId`, cargando el perfil, programas y controles necesarios desde los servicios existentes.
- [x] 1.2 Migrar al detalle la cabecera del perfil, las pestañas `Programas por perfil` y `Controles por perfil`, los indicadores actuales y el botón `Volver a Perfiles`.
- [x] 1.3 Crear `PerfilPermissionsComponent` como pantalla standalone para `/perfiles/:perfilId/programas/:prgCodigo/permisos`, resolviendo el perfil, el programa y su asociación antes de renderizar el editor.
- [x] 1.4 Implementar en la pantalla de permisos el estado local de los cinco permisos del programa y de `Visualizar`/`Modificar` para cada control, incluyendo carga, estado vacío y error.

## 2. Rutas y navegación

- [x] 2.1 Registrar las rutas lazy-loaded de detalle y permisos en `app.routes.ts`, conservando `/perfiles`, `/perfiles/nuevo` y `/perfiles/:id/editar`.
- [x] 2.2 Actualizar el enlace de la columna `Nombre` para navegar al detalle del perfil y la acción de cada programa para navegar a su pantalla de permisos.
- [x] 2.3 Implementar `Volver a Perfiles`, `Volver` y el retorno posterior al guardado para llegar explícitamente al detalle del perfil en `Programas por perfil`.
- [x] 2.4 Actualizar `PAGE_META` y la resolución dinámica de metadatos en `LayoutComponent` para mostrar títulos correctos en detalle y permisos.

## 3. Persistencia y limpieza del flujo anterior

- [x] 3.1 Implementar el guardado de permisos construyendo una copia completa de `programas`, reemplazando solo la asociación seleccionada y conservando los demás programas y controles.
- [x] 3.2 Reutilizar `updatePerfil`, `EventsService` y `ToastService`; navegar al detalle solo después de un guardado exitoso y conservar el editor en caso de error.
- [x] 3.3 Eliminar de `PerfilesComponent` el estado, markup y métodos del detalle interno y del diálogo `Permisos del Programa`, manteniendo listado, búsqueda, exportación y carga masiva.
- [x] 3.4 Verificar que `Volver` descarte cambios no guardados y que perfiles, programas o asociaciones inexistentes muestren un estado de error recuperable.

## 4. Verificación

- [x] 4.1 Ejecutar `npm run build` en `front-angular` y corregir errores de compilación o rutas.
- [x] 4.2 Validar manualmente el flujo `/perfiles` → nombre → `Programas por perfil` → acción → permisos, incluyendo carga directa y recarga de ambas rutas.
- [x] 4.3 Validar edición de los cinco permisos, edición de controles, guardado, feedback de éxito, fallo de API, `Volver` sin guardar y retorno a la pestaña correcta.
- [x] 4.4 Regresar pruebas manuales de creación/edición completa de perfiles, eliminación, carga masiva y navegación existente para confirmar que no haya regresiones.
