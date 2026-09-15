## Context

`SecurityComponent` (`front-angular/src/app/pages/security/security.component.ts`) concentra tres tabs (Aplicaciones, Módulos, Programas) y seis diálogos de alta/edición (`showAppDlg`, `showModDlg`, `showPrgDlg`) más cuatro diálogos auxiliares de búsqueda (nodo padre, aplicación para módulo, aplicación/módulo para programa). La lógica de formularios, validaciones, `ApiService`, toasts, eventos y confirmaciones vive en el mismo componente (~1950 líneas).

El patrón ya usado en Perfiles (`PerfilFormComponent`, `PerfilDetailComponent`, `PerfilPermissionsComponent`) demuestra pantallas standalone lazy-loaded con `ActivatedRoute`, `Router`, `PAGE_META` y botón Volver. Este cambio aplica el mismo patrón a Seguridades sin tocar backend.

## Goals / Non-Goals

**Goals:**
- Tres pantallas standalone (Aplicación, Módulo, Programa) que sirvan para alta y edición según presencia de id.
- Mismo contenido de cada diálogo dentro de una card, mismas validaciones y mensajes.
- Botón Volver arriba a la derecha que regresa a `/seguridades` preservando el tab.
- Rutas recargables y compartibles, títulos de layout correctos.
- Retirar los tres diálogos CRUD de `SecurityComponent` y navegar desde Nuevo/Editar.

**Non-Goals:**
- No cambiar backend, modelos ni endpoints.
- No cambiar eliminación, carga masiva, tablas, filtros, paginación ni exportación de `SecurityComponent`.
- No unificar los diálogos auxiliares de búsqueda en un componente genérico en este cambio.
- No cambiar reglas de sistema (APP-AUTHORIZER, MOD-SEG/MOD-PERF/MOD-NIVSEG/MOD-USR).
- No rediseñar estilos globales.

## Decisions

### 1. Tres componentes form, no seis
Un componente por entidad (`AplicacionFormComponent`, `ModuloFormComponent`, `ProgramaFormComponent`) con modo crear/editar según `id` de ruta. Reutiliza formularios `blankApp/blankMod/blankPrg`, `touched flags` y `save` con confirmación solo en edición. Alternativa de seis componentes duplicaría markup; alternativa de un solo componente gigante repetiría el problema actual.

### 2. Rutas anidadas bajo `/seguridades`
- `/seguridades/aplicaciones/nuevo`, `/seguridades/aplicaciones/:id/editar`
- `/seguridades/modulos/nuevo`, `/seguridades/modulos/:id/editar`
- `/seguridades/programas/nuevo`, `/seguridades/programas/:id/editar`
Lazy-loaded, `adminGuard`, declaradas antes de rutas genéricas si las hubiera. Volver navega a `/seguridades` con `queryParams { tab: 0|1|2 }`. `SecurityComponent` leerá `tab` de `ActivatedRoute.queryParamMap` para inicializar `p-tabs value` y mantenerlo al navegar internamente. Alternativa de rutas planas (`/aplicacion/...`) rompería agrupación mental del módulo.

### 3. Mover estado y métodos CRUD a cada pantalla
Cada form lleva su `form`, `touched`, `editId`, `load by id`, `save`, `cancel/volver`, y los search-texts/signals que necesita. `SecurityComponent` conserva solo listado, filtros, paginación, exportación, bulk y deletes. Los diálogos auxiliares de búsqueda se mueven con su entidad dueña (nodo→Aplicación, app-search→Módulo, prg-app/prg-mod→Programa) incluyendo sus signals, computeds de filtrado/paginación y métodos select/apply/clear. Esto evita acoplar las pantallas al componente lista. Alternativa de dejar búsquedas en `SecurityComponent` obligaría a comunicación entre rutas, más frágil.

### 4. Programa conserva drag-drop y dependencias
`ProgramaFormComponent` conserva `DragDropModule`, `moveItemInArray`, `prgControles: ControlRow[]`, `tiposPrograma/tiposControl`, lógica de filtrado por `tipo !== Menú/Submenú`, y cascada aplicación→módulo (al cambiar app se limpia mod). Carga controles por `controlesMap` ordenados por `orden`, igual que `openPrgDialog`.

### 5. Metadatos y títulos
Agregar seis entradas `PAGE_META` y extender `updateMetaFromPath()` para resolver prefijos `/seguridades/aplicaciones`, `/modulos`, `/programas` distinguiendo nuevo vs editar. Cabecera de cada pantalla usa `page-head` con título dinámico y botón Volver a la derecha, consistente con PerfilForm/Permisos.

## Risks / Trade-offs

- [Riesgo] Duplicación de lógica de búsqueda entre pantallas → Mitigación: mover código tal cual sin refactorizar; una futura extracción a componentes compartidos queda fuera de alcance.
- [Riesgo] `SecurityComponent` pierde `aplicacionMap/controlesMap` que usan también las tablas → Mitigación: conservar en lista solo los maps/computeds necesarios para render (badges, sistema, validación de deletes), mover el resto.
- [Riesgo] Query param `tab` puede quedar desincronizado si el usuario navega por tabs manualmente → Mitigación: tabs actualizan el query param o al menos Volver lo fija explícitamente; carga directa sin param usa default 0.
- [Riesgo] Formularios largos en móvil → Mitigación: reutilizar `form-grid`, `search-field` y estilos existentes; sin nuevos layouts.
- [Trade-off] Tres archivos nuevos grandes a cambio de reducir `SecurityComponent` y ganar navegación real.

## Migration Plan

1. Crear rutas y componentes vacíos con Volver y card.
2. Migrar Aplicación (form + búsqueda nodo), luego Módulo (form + búsqueda app), luego Programa (form + búsquedas + controles).
3. Cambiar botones Nuevo/Editar en `SecurityComponent` a `router.navigate`.
4. Eliminar diálogos CRUD y su estado/métodos muertos; conservar auxiliares no migrados solo si siguen usados.
5. Actualizar `PAGE_META` y `updateMetaFromPath`.
6. `npm.cmd run build` en `front-angular`; verificar alta/edición/validaciones/Volver/tab preservado/recarga directa.
7. Rollback: revertir rutas y restaurar diálogos desde git; sin migración de datos.

## Open Questions

- Ninguna bloqueante. Si el equipo prefiere `tab` como segmento (`/seguridades/programas`) en vez de query param, se puede ajustar en implementación manteniendo las seis rutas CRUD.
