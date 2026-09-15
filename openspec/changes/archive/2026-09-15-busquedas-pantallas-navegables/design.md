## Context

Los formularios de captura de Seguridades (Aplicación, Módulo, Programa) usan `p-dialog` para seleccionar la entidad padre (nodo de segregación, aplicación, módulo). Cada diálogo repite el mismo conjunto de filtros, tabla y paginación embebidos en ~800px, lo que comprime las columnas y dificulta leer la información. La aplicación ya resuelve casos equivalentes navegando a pantallas standalone de selección (`/nuevo-acceso/seleccionar-*` con `user-select`, `perfil-select`, `nodo-select`) que devuelven la selección al origen mediante parámetros de URL.

Convención existente (ver `access-create`, `nodo-select`, `perfil-select`):
- El formulario guarda su estado en `queryParams` antes de navegar a la pantalla de selección.
- La pantalla de selección muestra filtros + tabla + paginación a ancho completo y vuelve a la ruta origen reconstruyendo los `queryParams`.
- El formulario hidrata su estado en `ngOnInit` a partir de esos parámetros.

## Goals / Non-Goals

**Goals:**
- Reemplazar los 4 diálogos de búsqueda por pantallas navegables a pantalla completa, con los mismos filtros, columnas y paginación que hoy (mejorando la paginación con selector de registros por página).
- Preservar el borrador del formulario a través de la navegación (incluida la lista de controles de un programa y los campos de texto libres) para no perder lo escrito al seleccionar la entidad.
- Mantener el comportamiento de negocio actual (validaciones, guardado, limpieza al cambiar de aplicación/módulo).
- Limpiar los diálogos y su estado de los formularios.

**Non-Goals:**
- No cambiar el modelo de datos ni la API.
- No introducir paginación server-side ni cambios en los filtros existentes.
- No tocar las pantallas `seleccionar-*` existentes del flujo de accesos (`nuevo-acceso`).

## Decisions

1. **Pantallas de selección navegables reutilizando el patrón `seleccionar-*`**
   Se crean tres componentes standalone (`AplicacionSelectComponent`, `ModuloSelectComponent`, `NodoPadreSelectComponent`) en rutas nuevas `/seguridades/seleccionar-aplicacion`, `/seguridades/seleccionar-modulo`, `/seguridades/seleccionar-nodo`, con guard `adminGuard` y lazy loading, siguiendo el patrón visual de `perfil-select`/`nodo-select` (tarjeta de filtros, `card table-wrap`, `.pagination` con `.page-size-selector` 5/10/15/20).
   - *Por qué*: consistencia con el patrón ya validado de la app y ancho completo para las tablas.
   - *Alternativa descartada*: reutilizar los componentes `seleccionar-*` de accesos — tienen lógica de multi-selección y contexto de niveles incompatible con la selección simple de esta pantalla.

2. **Preservación del borrador con un servicio en memoria (`SeguridadDraftService`)**
   Antes de navegar a la pantalla de selección, el formulario guarda su borrador completo (campos de texto, estado, selectores y la lista `prgControles` con su orden) en un servicio `providedIn: 'root'`. Al re-inicializar (retorno de la selección), el formulario consume el borrador y lo aplica sobre los datos recargados.
   - *Por qué*: la lista de controles de un programa y los campos libres no se serializan de forma limpia en `queryParams`; un servicio simple conserva exactamente el borrador (incluido orden de drag & drop) con bajo acoplamiento.
   - *Alternativa descartada*: round-trip por `queryParams` (patrón de accesos) — funciona para selecciones pero degradaría/rompería la lista de controles y campos libres.
   - *Nota de paridad*: en refresco de página durante la selección el borrador se pierde, comportamiento equivalente al de los diálogos actuales (no sobreviven a un refresh).

3. **Retorno de la entidad seleccionada por parámetro de URL**
   El formulario navega a la pantalla de selección con `queryParams: { returnTo: <ruta actual del formulario> }`. La pantalla de selección vuelve a `returnTo` con `appCodigo` / `modCodigo` / `nodoId` según corresponda y el formulario aplica ese valor sobre el borrador restaurado, actualizando el texto del `search-field` desde sus mapas (`aplicacionMap`, `nodoMapSegregacion`).
   - *Por qué*: `returnTo` permite que `seleccionar-aplicacion` sirva tanto a Módulo como a Programa sin acoplar la pantalla a un destino fijo; el parámetro de selección sigue la convención de `selectedUserId` de accesos.
   - `Volver` de la pantalla de selección navega a `returnTo` **sin** parámetro de selección: el formulario rehidrata el borrador tal cual (equivalente a cerrar sin seleccionar).

4. **Paridad funcional de listados**
   - `seleccionar-aplicacion`: filtros Código/Nombre/Estado; columnas Código, Nombre, Descripción, Estado (badge), acción `Seleccionar`.
   - `seleccionar-modulo`: filtros Código/Nombre; columnas Código, Nombre, Aplicación (badge), acción `Seleccionar` (listado completo de módulos, como el diálogo actual).
   - `seleccionar-nodo`: solo nodos **activos con `padreId === null`**; filtros Código/Nombre; columnas Código, Nombre, Nivel, acción `Seleccionar` (se conserva el mapeo `nivelMapSegregacion` para mostrar el nivel).

5. **Limpieza de los diálogos en los formularios**
   En `AplicacionFormComponent`, `ModuloFormComponent` y `ProgramaFormComponent` se eliminan los `p-dialog` de búsqueda y TODO su estado/métodos (visibilidad, filtros `appSearchCodigo/...`, paginación del diálogo, `selectXFromDialog`, etc.), reemplazando `openXSearchDialog()` por navegación con `returnTo`. Se remueve el import `DialogModule` cuando quede sin uso. El `p-confirmDialog` y la lógica de negocio no cambian.

## Risks / Trade-offs

- [El `returnTo` depende de la ruta del formulario] → Se construye en el propio formulario desde `editId` (`/seguridades/<entidad>/nuevo` o `/<id>/editar`), por lo que siempre coincide con la instancia que rehidrata.
- [Borrador quedarse en el servicio si el usuario abandona] → Se consume (y borra) al aplicar; si el usuario navega a otra pantalla distinta del formulario, el borrador se descarta en el siguiente `consume`/`save` o se considera obsoleto (máximo un borrador pendiente).
- [Cambiar de aplicación en Programa debe limpiar el módulo] → Se conserva la secuencia `selectPrgApp`: al aplicar `appCodigo` también se vacía `modCodigo` y los textos de búsqueda, igual que hoy.
- [Columnas angostas en viewports reducidos] → La tabla usa el `table-wrap` existente y la paginación colapsa con los estilos globales; se validará visualmente en la verificación.
- [Refresco durante la selección pierde el borrador] → Aceptado: paridad con el comportamiento de los diálogos (también se pierde todo al refrescar).