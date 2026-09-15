## Why

El módulo de Seguridades concentra el alta y edición de Aplicaciones, Módulos y Programas en diálogos modales dentro de `SecurityComponent`. Esto limita el espacio disponible, dificulta el uso en pantallas pequeñas y rompe la consistencia con otros flujos (Perfiles, Permisos) que ya usan pantallas navegables con botón Volver.

## What Changes

- Crear pantalla navegable para alta de Aplicación con los mismos campos del diálogo actual (Código, Nombre, Descripción, Estado, Nodo de Segregación con búsqueda).
- Crear pantalla navegable para edición de Aplicación reutilizando la misma pantalla de alta con carga por id.
- Crear pantalla navegable para alta de Módulo con los mismos campos del diálogo actual (Código, Nombre, Aplicación con búsqueda, Descripción, Estado).
- Crear pantalla navegable para edición de Módulo reutilizando la misma pantalla con carga por id.
- Crear pantalla navegable para alta de Programa con los mismos campos del diálogo actual (Código, Nombre, Aplicación con búsqueda, Módulo con búsqueda dependiente, Tipo, Descripción, Estado, Controles con drag-drop y agregar/quitar).
- Crear pantalla navegable para edición de Programa reutilizando la misma pantalla con carga por id y controles existentes.
- Cada nueva pantalla tendrá botón Volver arriba a la derecha que regresa a `/seguridades` preservando el tab correspondiente (Aplicaciones, Módulos o Programas).
- Dentro de una card se colocarán los componentes que hoy tiene cada diálogo para la entidad correspondiente, manteniendo validaciones, mensajes, búsquedas auxiliares y comportamientos.
- Retirar los diálogos de alta/edición de Aplicación, Módulo y Programa de `SecurityComponent` y navegar desde los botones Nuevo y Editar hacia las nuevas rutas.
- Mantener sin cambios los diálogos auxiliares de búsqueda (nodo, aplicación, módulo), la carga masiva, eliminación con confirmación, tablas, filtros, paginación, exportación y reglas de sistema (APP-AUTHORIZER, MOD-SEG, etc.).

## Capabilities

### New Capabilities

- `seguridades-crud`: Alta y edición navegable de Aplicaciones, Módulos y Programas del módulo Seguridades, con preservación de validaciones y flujos actuales.

### Modified Capabilities

- Ninguna.

## Impact

- Frontend Angular: `app.routes.ts`, `SecurityComponent`, nuevos componentes standalone para Aplicación, Módulo y Programa, `LayoutComponent` (PAGE_META y resolución de títulos).
- Reutiliza `ApiService` (`seg-aplicaciones`, `seg-modulos`, `seg-programas`, `seg-controles`, niveles/nodos segregación), `ToastService`, `EventsService`, `ConfirmationService`.
- Sin cambios de backend, modelo de datos ni contratos API.
