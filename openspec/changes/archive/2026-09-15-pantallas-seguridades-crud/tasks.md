## 1. Rutas y navegación base

- [x] 1.1 Registrar las seis rutas lazy-loaded de Aplicación/Módulo/Programa (nuevo/editar) en `app.routes.ts` con `adminGuard`.
- [x] 1.2 Soportar `?tab=` en `SecurityComponent` para inicializar y preservar el tab Aplicaciones/Módulos/Programas.
- [x] 1.3 Agregar entradas `PAGE_META` y resolución dinámica de títulos para las seis rutas en `LayoutComponent`.

## 2. Pantalla Aplicación

- [x] 2.1 Crear `AplicacionFormComponent` standalone con card, Volver arriba a la derecha y campos Código/Nombre/Descripción/Estado/Nodo.
- [x] 2.2 Migrar búsqueda de nodo padre (filtros, paginación, seleccionar/limpiar) y validaciones/mensajes de `saveApp`.
- [x] 2.3 Implementar carga por id, crear/actualizar con confirmación en edición, toasts, eventos y retorno a `/seguridades?tab=0`.

## 3. Pantalla Módulo

- [x] 3.1 Crear `ModuloFormComponent` standalone con card, Volver arriba a la derecha y campos Código/Nombre/Aplicación/Descripción/Estado.
- [x] 3.2 Migrar búsqueda de aplicación y validaciones/mensajes de `saveMod`.
- [x] 3.3 Implementar carga por id, crear/actualizar con confirmación en edición, toasts, eventos y retorno a `/seguridades?tab=1`.

## 4. Pantalla Programa

- [x] 4.1 Crear `ProgramaFormComponent` standalone con card, Volver arriba a la derecha y campos Código/Nombre/Aplicación/Módulo/Tipo/Descripción/Estado.
- [x] 4.2 Migrar búsquedas dependientes de aplicación/módulo y gestión de controles (agregar/quitar/drag-drop/estado/log).
- [x] 4.3 Implementar carga por id con controles ordenados, validaciones de programa/controles y crear/actualizar con confirmación, toasts, eventos y retorno a `/seguridades?tab=2`.

## 5. Limpieza de SecurityComponent

- [x] 5.1 Cambiar botones Nuevo/Editar de los tres tabs a navegación hacia las nuevas rutas.
- [x] 5.2 Eliminar diálogos CRUD, estado y métodos muertos de Aplicación/Módulo/Programa conservando tablas, deletes, bulk, filtros, paginación y exportación.

## 6. Verificación

- [x] 6.1 Ejecutar `npm.cmd run build` en `front-angular` y corregir errores de compilación o templates.
- [x] 6.2 Validar altas/ediciones/validaciones/Volver/tab preservado/recarga directa en las tres entidades y regresión de deletes, bulk y búsquedas.