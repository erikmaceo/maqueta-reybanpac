## Context

La pantalla está implementada en `front-angular/src/app/pages/perfil-permissions/perfil-permissions.component.ts`. Actualmente usa una tarjeta con `max-width: 980px`, una grilla de contexto de dos columnas, una grilla de permisos de tres columnas y una tabla simple que renderiza todos los controles sin paginación.

El componente de Auditoría ya define el patrón visual esperado para consultas: `card table-wrap`, `table.data` y un bloque `.pagination` con `Anterior`, `Siguiente`, indicador de página y selector de registros por página. La pantalla de permisos ya carga todos los controles del programa mediante `GET /api/seg-controles`, por lo que la paginación puede ser local y no requiere cambios de API.

## Goals / Non-Goals

**Goals:**

- Aprovechar el ancho completo disponible en la pantalla de permisos.
- Aplicar exactamente `5px` de padding interno a la caja contenedora.
- Mostrar los cuatro datos de contexto y los cinco permisos en una fila en viewport de escritorio.
- Reutilizar la estructura y clases globales de tabla y paginación de Auditoría.
- Paginar localmente los controles con opciones 5, 10, 15 y 20.
- Mantener todos los controles editables en el arreglo completo para que guardar incluya cambios hechos en cualquier página.
- Alinear los botones de acción a la derecha con `gap: 2px`.
- Mantener una adaptación usable en pantallas estrechas.

**Non-Goals:**

- No modificar las rutas ni la navegación del editor.
- No cambiar los permisos disponibles ni el modelo `PerfilProgramaControl`.
- No crear endpoints de paginación ni modificar el backend.
- No cambiar la tabla de Auditoría ni sus estilos globales.
- No paginar los cinco permisos principales del programa.

## Decisions

### 1. Expandir la tarjeta sin alterar el contenedor global

`.permission-card` usará `width: 100%`, `max-width: none`, `box-sizing: border-box` y `padding: 5px`. El `max-width` existente de `980px` se eliminará. La pantalla seguirá dentro del layout global, por lo que no se modificará el ancho del shell ni de `.content`.

Se mantendrán `gap` internos en las grillas para evitar que el padding reducido haga que los campos se perciban pegados entre sí.

### 2. Usar grillas de cinco y cuatro columnas en escritorio

La grilla de información pasará a `grid-template-columns: repeat(4, minmax(0, 1fr))`, con una celda para cada dato: código del perfil, nombre del perfil, código del programa y nombre del programa.

La grilla de permisos pasará a `repeat(5, minmax(0, 1fr))`, conservando el orden actual de los checks. En viewport estrecho se permitirá que ambas grillas reduzcan sus columnas o se apilen mediante media queries, evitando overflow horizontal.

Se elige CSS Grid en lugar de flexbox porque mantiene cinco columnas de igual peso y permite una degradación controlada en breakpoints.

### 3. Reutilizar el markup global de Auditoría para la tabla

La tabla de controles conservará los datos y checkboxes actuales, pero se envolverá con la misma estructura que Auditoría:

- `div.card.table-wrap`
- `table.data`
- `div.pagination`
- `div.page-controls`
- `div.page-size-selector`

No se agregarán estilos locales de tabla. Esto hace que las reglas globales de `styles.css` produzcan el mismo aspecto, espaciado, hover y controles de paginación que Auditoría.

### 4. Paginar la vista, no el modelo editable

`permControles` seguirá siendo la fuente completa y editable. Se agregarán señales para la página actual y el tamaño de página, un computed para el total de páginas y otro computed para el slice visible.

El template iterará únicamente sobre la colección paginada, pero `savePermissions()` seguirá recorriendo `permControles` completo al generar `controles`. Cambiar de página o cambiar el tamaño reiniciará la página a 1 cuando corresponda, sin reconstruir ni perder los objetos editados.

Se elige paginación local porque todos los controles ya están disponibles en memoria. Crear paginación remota añadiría endpoints y estados de carga innecesarios para este caso.

### 5. Alinear las acciones sin cambiar su comportamiento

El grupo `.form-actions` tendrá `justify-content: flex-end` y `gap: 2px`. Se conservarán los botones `Volver` y `Guardar`, sus handlers, el estado `Guardando...`, los toasts y la navegación actual.

El botón superior `Volver` conservará la alineación de la cabecera mediante el layout existente; la separación exacta de `2px` se aplicará al grupo de acciones inferior que contiene ambos botones.

### Alternativas consideradas

- **Mantener `max-width: 980px` y aumentar solo el tamaño de la tabla**: descartada porque no cumple el aprovechamiento del ancho solicitado.
- **Crear estilos propios para duplicar Auditoría**: descartada porque podría divergir del patrón global; se reutilizarán las clases existentes.
- **Eliminar controles fuera de la página actual antes de guardar**: descartada porque perdería cambios realizados en páginas anteriores.
- **Paginación desde el backend**: descartada porque los controles ya se cargan completos y requeriría cambios de API no solicitados.

## Risks / Trade-offs

- [Riesgo] Cinco columnas pueden resultar estrechas para nombres largos. → [Mitigación] Usar `minmax(0, 1fr)`, permitir wrapping en viewport estrecho y mantener el texto dentro de sus celdas.
- [Riesgo] El padding de `5px` puede hacer que la tabla quede visualmente muy próxima al borde. → [Mitigación] El card tendrá `box-sizing` correcto y se conservarán separaciones internas de secciones y grillas.
- [Riesgo] Un cambio en la paginación podría ocultar ediciones no guardadas. → [Mitigación] Separar explícitamente `permControles` de `paginatedPermControles`; el guardado solo usará la colección completa.
- [Riesgo] Los estilos globales de Auditoría podrían cambiar en el futuro. → [Mitigación] Compartir las clases intencionalmente y mantener la verificación visual cruzada entre ambas pantallas.

## Migration Plan

1. Ajustar el template y estilos de `PerfilPermissionsComponent`.
2. Agregar las señales/computeds/métodos de paginación local sin modificar `ApiService`.
3. Cambiar el `@for` de controles para usar la colección visible y verificar que el guardado use la colección completa.
4. Ejecutar `npm run build` en `front-angular`.
5. Validar visualmente la pantalla en escritorio y móvil, paginar controles, editar en páginas distintas, guardar y volver a Auditoría para comprobar consistencia de estilos.

No se requiere migración de datos, cambio de rutas, cambio de backend ni estrategia de rollback de datos. El rollback consiste en restaurar el template, estilos y estado de paginación anteriores del componente.

## Open Questions

No quedan decisiones funcionales bloqueantes. La tabla debe usar las clases globales existentes de Auditoría y la paginación será local sobre los controles ya cargados.
