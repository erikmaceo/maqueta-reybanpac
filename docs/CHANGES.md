# Registro de cambios — Central Access Manager (Reybanpac)

 Este archivo documenta todos los cambios realizados en el proyecto, ordenados por fecha. Cada entrada debe incluir: fecha, resumen, archivos modificados y notas técnicas.

 ---

 ## 2026-07-13 — Atributos dinámicos por Nivel de Segregación

 ### Resumen

 Se implementó la gestión de atributos dinámicos asociados a cada nivel de segregación. Esto permite definir campos descriptivos personalizados (por ejemplo RUC, dirección, teléfono para Empresas) y registrar sus valores por cada nodo, visualizándolos en la tabla y en la exportación Excel.

 ### Cambios realizados

 #### 1. Modelo de datos dinámico
 - **Nuevas entidades backend**: `NivelAtributo` y `NodoAtributoValor` en `backend/src/types.ts`.
 - **Store en memoria**: arrays `nivelesAtributos` y `nodosAtributosValores` en `backend/src/store.ts`.
 - **Seed inicial**: atributos de ejemplo para Empresa (RUC, dirección, teléfono, nombre comercial), Sucursal (código interno, dirección) y Punto de Venta (código interno, tipo) en `backend/src/seed.ts`.
 - **Tipos frontend**: `NivelAtributo`, `NodoAtributoValor` y `TipoAtributo` en `front-angular/src/app/shared/models/types.ts`.
 - **Configuración de selects**: `NivelAtributo` incluye `config?: { fuente?: string }` para soportar atributos tipo `select` con opciones dinámicas.

 #### 2. Backend: endpoints
 - `GET /api/niveles-atributos` — lista todos los atributos, opcionalmente filtrados por `nivelId`.
 - `POST /api/niveles-atributos` — crea un atributo de nivel.
 - `PUT /api/niveles-atributos/:id` — edita metadatos del atributo.
 - `DELETE /api/niveles-atributos/:id` — elimina el atributo y sus valores asociados.
 - `GET /api/nodos-atributo-valor` — lista valores de atributos, opcionalmente filtrados por `nodoId`.
 - `POST /api/nodos-segregacion` y `PUT /api/nodos-segregacion/:id` — aceptan el array `atributos: [{ atributoId, valor }]` para crear/actualizar valores.
 - `DELETE /api/niveles-segregacion/:id` — elimina también los atributos definidos para ese nivel.
 - `DELETE /api/nodos-segregacion/:id` — elimina también los valores de atributos del nodo y descendientes.

 #### 3. Frontend: pestaña "Atributos"
 - Nueva pestaña en `Niveles de Segregación` para CRUD de atributos.
 - Diálogo de creación/edición con código, nombre, tipo (`texto`, `numero`, `telefono`, `email`, `select`), obligatorio, orden y estado.
 - Para atributos tipo `select` se puede configurar la fuente de opciones (`paises`, `provincias`, `ciudades`).
 - Búsqueda reactiva por código, nombre, tipo o nivel.

 #### 4. Frontend: nodos con campos dinámicos
 - El diálogo de crear/editar nodo muestra automáticamente los campos de atributos activos del nivel seleccionado.
 - Los atributos tipo `select` renderizan un dropdown con la lista de países, provincias o ciudades registradas según la fuente configurada.
 - Los valores se envían al backend como array de `{ atributoId, valor }`.
 - Al editar se precargan los valores existentes.

 #### 5. Frontend: tabla y exportación Excel
 - La tabla de nodos incluye columnas dinámicas con los atributos activos.
 - Si el mismo nombre de atributo existe en varios niveles, el encabezado se diferencia con el prefijo del nivel (por ejemplo: "Empresa - Dirección", "Sucursal - Dirección").
 - Para atributos tipo `select`, la tabla y el Excel muestran la descripción del país, provincia o ciudad; el valor subyacente guardado es el `id` correspondiente.
 - La búsqueda de nodos también busca dentro de los valores de atributos.
 - Botón "Exportar" genera `nodos-segregacion.xlsx` con columnas base (código, nombre, nivel, padre, estado) más una columna por atributo activo, usando los nombres diferenciados.

 ### Archivos principales modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `backend/src/types.ts` | Nuevos tipos `NivelAtributo`, `NodoAtributoValor`, `TipoAtributo` |
 | `backend/src/store.ts` | Arrays `nivelesAtributos`, `nodosAtributosValores` |
 | `backend/src/seed.ts` | Seed de atributos y valores para nodos existentes |
 | `backend/src/index.ts` | Endpoints CRUD de atributos y gestión de valores en nodos |
 | `front-angular/src/app/shared/models/types.ts` | Tipos frontend de atributos |
 | `front-angular/src/app/core/services/api.service.ts` | Métodos `listNivelesAtributos`, `createNivelAtributo`, `updateNivelAtributo`, `deleteNivelAtributo`, `listNodosAtributoValores` |
 | `front-angular/src/app/pages/segregation-levels/segregation-levels.component.ts` | Pestaña Atributos, campos dinámicos en nodos, columnas y exportación Excel |

 ### Validación
 - Build de backend Docker exitoso.
 - Build de frontend Angular exitoso.

 ---

 ## 2026-07-13 — Ajuste de permisos del Programa en Perfil

 ### Resumen

 Se ajustó el diálogo de permisos del Programa dentro de un perfil: se eliminó el permiso "Procesar" y el permiso "Anular" ahora se denomina "Eliminar", manteniendo coherencia con las operaciones CRUD del sistema.

 ### Cambios realizados

 #### Frontend (`security.component.ts`)
 - **Diálogo de permisos del Programa**: ahora muestra las opciones `Nuevo`, `Modificar`, `Eliminar`, `Imprimir`, `Consultar`.
 - Se eliminó la opción `Procesar` de los checkboxes de permisos.
 - Se renombró la etiqueta y encabezados de tabla/exportación de `Anular` a `Eliminar`.
 - Se actualizaron las columnas de la tabla de permisos asignados al perfil y la exportación Excel.
 - El campo de búsqueda de permisos también usa "Eliminar" en su placeholder/mensajes.

 ### Archivos principales modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `front-angular/src/app/pages/security/security.component.ts` | Ajuste de labels y opciones de permisos del programa en el diálogo, tabla y exportación |

 ### Validación
 - Build de frontend Angular exitoso.
 - Contenedor `cam-front-angular` reconstruido y corriendo en `http://localhost:5174`.

 ---

 ## 2026-07-13 — Iconos en columnas booleanas de permisos

 ### Resumen

 Se reemplazaron los textos `Sí`/`No` de las columnas booleanas en las pestañas de detalle de un perfil por iconos: un check verde para `true` y una cruz roja para `false`.

 ### Cambios realizados

 #### Frontend (`security.component.ts`)
 - **Pestaña "Programas por perfil"**: las columnas `Nuevo`, `Modificar`, `Eliminar`, `Imprimir` y `Consultar` ahora muestran iconos centrados.
 - **Pestaña "Controles por perfil"**: las columnas `Visualizar` y `Modificar` también usan los nuevos iconos.
 - Se importaron los componentes `IconCheckComponent` y `IconCloseComponent`.
 - Se agregaron las clases CSS `.perm-icon-yes` (verde) y `.perm-icon-no` (rojo) para estilizar los iconos.

 ### Archivos principales modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `front-angular/src/app/pages/security/security.component.ts` | Renderizado de iconos en columnas booleanas y estilos asociados |

 ### Validación
 - Build de frontend Angular exitoso.
 - Contenedor `cam-front-angular` reconstruido y corriendo en `http://localhost:5174`.

 ---

 ## 2026-07-14 — Selector jerárquico de nodos en Accesos por usuario

 ### Resumen

 Se reemplazó la lista plana de nodos en el diálogo *Nuevo acceso* / *Editar acceso* por un selector de árbol jerárquico. Ahora se puede expandir un nodo padre para ver y seleccionar únicamente a sus descendientes directos, facilitando identificar qué `Sucursal` pertenece a una `Empresa` o qué `Punto de Venta` pertenece a una `Sucursal`.

 ### Cambios realizados

 #### Frontend (`user-access.component.ts`)
 - Se agregó un árbol recursivo en la sección **Nodos de Segregación** del diálogo.
 - Cada nodo padre muestra una flecha para expandir/contraer y un checkbox independiente para seleccionarlo.
 - Los nodos raíz se listan primero; al expandir un nodo se cargan solo sus hijos directos.
 - Se permite marcar nodos de cualquier nivel (incluyendo intermedios).
 - Se agregaron las clases CSS `.tree-wrap`, `.tree-node`, `.tree-row`, `.tree-toggle`, `.tree-children` y `.tree-meta`.
 - Se agregaron los métodos `isExpanded`, `toggleExpand`, `tieneHijos`, `hijosDe`, `nodosRaices` y `getNivelNombre`.
 - La sección de **Perfiles** se mantuvo sin cambios.

 ### Archivos principales modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `front-angular/src/app/pages/user-access/user-access.component.ts` | Selector de nodos en árbol jerárquico y estilos asociados |

 ### Validación
 - Build de frontend Angular exitoso.
 - Contenedor `cam-front-angular` reconstruido y corriendo en `http://localhost:5174`.

 ---

 ## 2026-07-14 — Tabla jerárquica en pestaña Nodos con columnas por atributos de nivel

 ### Resumen

 Se reemplazó la tabla plana de la pestaña **Nodos** por una composición de tablas hijas jerárquicas. Cada tabla hija muestra los nodos de un nivel y sus columnas dinámicas según los atributos definidos para ese nivel. Al expandir un nodo se renderiza la tabla del siguiente nivel con sus propias columnas y valores.

 ### Cambios realizados

 #### Frontend (`segregation-levels.component.ts`)
 - **Tablas hijas recursivas**: Se implementó un `ng-template` recursivo (`nodoTable`) que renderiza una tabla por cada nivel de la jerarquía.
 - **Columnas dinámicas por nivel**: Cada tabla incluye columnas base (toggle, Código, Nombre, Estado, Acciones) + una columna por cada atributo activo del `NivelSegregacion` correspondiente a los hijos mostrados. Por ejemplo, la tabla de Empresas muestra RUC, Razón Social, Nombre Comercial, Dirección y Teléfono; la de Sucursales muestra Dirección y Teléfono; la de Puntos de Venta muestra Dirección.
 - **Valores de atributos**: Se muestran los valores formateados de cada atributo (incluyendo descripciones para selects de países, provincias o ciudades).
 - **Expansión por niveles**: Cada nodo con hijos tiene un botón expandir/contraer que muestra la tabla hija del siguiente nivel.
 - **Búsqueda jerárquica**: Al escribir en el buscador se filtran nodos por coincidencia y se expanden automáticamente los ancestros necesarios.
 - **Eliminación de exportación Excel**: Se quitó el botón **Exportar** y el método `exportNodos()` de esta pestaña.
 - Se eliminaron las importaciones de `XLSX` e `IconDownloadComponent`.
 - Se agregaron los métodos: `nodosRaices`, `hijosDe`, `tieneHijosNodo`, `isNodoExpanded`, `toggleNodoExpand`, `atributosDeNivel`, `primerNivelId`, `siguienteNivelId`, `tieneDescendienteEnSet`.
 - Se agregaron estilos `.tree-table`, `.tree-table-caption`, `.tree-th-toggle`, `.tree-toggle-btn`, `.tree-child-cell`.

 ### Nota técnica
 - Se corrigió la declaración de variables del `ng-template` para que `nivelHijosId` se vincule a la propiedad `nivelHijosId` del contexto y no al valor implícito (`$implicit`), que correspondía al ID del nodo padre.

 ### Archivos principales modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `front-angular/src/app/pages/segregation-levels/segregation-levels.component.ts` | Tabla jerárquica recursiva, columnas dinámicas por nivel, búsqueda adaptada, eliminación de export XLSX |

 ### Validación
 - Build de frontend Angular exitoso.
 - Contenedor `cam-front-angular` reconstruido y corriendo en `http://localhost:5174`.

 ### Resumen

 Se mejoró el selector de nodos del diálogo *Nuevo acceso* / *Editar acceso*: al **seleccionar un nodo padre** quedan marcados automáticamente él y **todos sus descendientes**, y al **deseleccionar un padre** se desmarcan también sus descendientes. Las hojas se pueden marcar/desmarcar individualmente sin afectar al padre.

 ### Cambios realizados

 #### Frontend (`user-access.component.ts`)
 - Se reescribió `toggleNodo(nodoId)`:
   - Si el nodo se está marcando: agrega el nodo y todos sus descendientes a `editForm.nodoIds` y expande los ancestros automáticamente para que el usuario vea los nodos recién seleccionados.
   - Si el nodo se está desmarcando: elimina el nodo y todos sus descendientes de `editForm.nodoIds`.
 - Se agregó `descendientesDe(nodoId)` que recorre recursivamente la jerarquía vía `padreId` y devuelve todos los ids descendientes.
 - Se agregó `expandirAncestros(nodoId)` que expande automáticamente todos los nodos ancestros para mostrar el subárbol afectado.

 ### Archivos principales modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `front-angular/src/app/pages/user-access/user-access.component.ts` | Lógica de selección/deselección en cascada y expansión de ancestros |

 ### Validación
 - Build de frontend Angular exitoso.
 - Contenedor `cam-front-angular` reconstruido y corriendo en `http://localhost:5174`.

 ---

 ## 2026-06-24 — Migración y mejora de la SPA Angular

 ### Resumen

 Se completó la migración de la SPA de React a Angular 21 (PrimeNG), incluyendo el módulo de Seguridades, Matriz de Acceso, navegación por Soluciones y el campo `tipo` en Programas.

 ### Cambios realizados

 #### 1. Módulo de Seguridades (`/seguridades`)
 - **Tabs con PrimeNG 21**: Se usaron `Tabs`, `TabList`, `Tab`, `TabPanels`, `TabPanel` en lugar del obsoleto `TabViewModule`.
 - **4 pestañas con CRUD completo**: Aplicaciones, Módulos, Programas y Perfiles.
 - **Búsqueda reactiva**: Filtro por texto en cada pestaña usando `computed` signals. Resetea la página al escribir.
 - **Paginación**: Selector de tamaño de página (5/10/15/20) y botones de navegación ‹ 1 2 3 › en las 4 tablas.
 - **Exportar XLSX**: Botón "Exportar" en cada pestaña que exporta los registros filtrados a Excel.
 - **Diálogos de creación/edición**: Usando `p-dialog` de PrimeNG con campos validados.

 #### 2. Campo `tipo` en Programa
 - **Tipo `TipoPrograma`**: 8 valores posibles: Menú, Submenú, Maestro, Transacción, Proceso, Consulta, Reporte, Objeto.
 - **Frontend**: Select en el diálogo de crear/editar, columna "Tipo" en la tabla de programas, columna en exportación XLSX.
 - **Backend**: Campo `tipo` en `Programa` (types.ts), en seed.ts (4 programas con tipos), en POST/PUT endpoints.
 - **Matriz de Acceso**: Columna `prg_tipo` en la plantilla Excel y en el backend de upload (upsert).
 - **Bug corregido**: El contenedor Docker del backend no reflejaba el campo `tipo` porque la imagen no había sido reconstruida. Solucionado con `docker compose build backend`.

 #### 3. Matriz de Acceso (`/matriz-acceso`)
 - **Upload Excel**: `POST /api/seg-matriz/upload` con `multer` + `xlsx`, upsert por código.
 - **Descarga de plantilla**: Botón que genera un `.xlsx` con headers y filas de ejemplo.
 - **Tabla de estructura**: Documentación visual de las 14 columnas (A-N) con descripción, obligatoriedad y ejemplos.
 - **Resumen de carga**: Muestra cantidad de aplicaciones, módulos, programas y perfiles creados.

 #### 4. Navegación por Soluciones (`/soluciones`, `/soluciones/:codigo`)
 - **Sidebar**: Grupo "Soluciones" colapsable con aplicaciones como sub-items dinámicos.
 - **Vista jerárquica expandible**: Módulo → Programas → Perfiles, filtrada por `appCodigo`.
 - **Navegación**: Click en una aplicación del sidebar navega a `/soluciones/:codigo`.

 #### 5. Estilos y CSS
 - **Tabs estilo pill**: CSS para `.p-tabs` imitando el estilo de React.
 - **Diálogos**: Header con `border-radius` en esquinas superiores.
 - **Toast personalizado**: HTML custom con `z-index: 3000` (supera overlays de PrimeNG).
 - **Paginación**: Clases `.pagination`, `.page-size-selector`, `.page-controls`.

 #### 6. Correcciones de bugs
 - **Backend no iniciaba**: Faltaba `app.listen` tras una edición.
 - **Error handling en CRUD**: `e.message` → `e?.error?.error || e?.message` en todos los catch de operaciones CRUD.
 - **Contadores X/Y**: Eliminados de las pestañas de Seguridades.
 - **Docker**: Reconstrucción de imagen del backend para incluir el campo `tipo`.

 ### Archivos principales modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `front-angular/src/app/pages/security/security.component.ts` | Tabs con filtros, paginación, export, tipoPrograma |
 | `front-angular/src/app/pages/soluciones/soluciones.component.ts` | Vista jerárquica por aplicación |
 | `front-angular/src/app/pages/matrix-access/matrix-access.component.ts` | Upload Excel y estructura de plantilla |
 | `front-angular/src/app/pages/layout/layout.component.ts` | Sidebar con Soluciones colapsable y sub-items |
 | `front-angular/src/app/core/services/api.service.ts` | `uploadMatriz()` con FormData |
 | `front-angular/src/app/shared/models/types.ts` | `TipoPrograma`, `Programa.tipo` |
 | `front-angular/src/app/app.routes.ts` | Rutas `/seguridades`, `/matriz-acceso`, `/soluciones/:codigo` |
 | `front-angular/src/styles.css` | `.toast-wrap`, `.pagination`, `.p-tabs`, dialog header rounded |
 | `backend/src/types.ts` | `TipoPrograma`, `Programa.tipo` |
 | `backend/src/seed.ts` | Seed con `tipo` en programas |
 | `backend/src/index.ts` | Endpoints Seguridades + `POST /api/seg-matriz/upload` |
 | `backend/package.json` | Dependencias `xlsx`, `multer` |
 | `front-angular/package.json` | Dependencia `xlsx` para exportación |
 | `docker-compose.yaml` | Sin cambios (build context ya configurado) |

 ### Dependencias añadidas
 - **Backend**: `xlsx`, `multer` + `@types/multer`
 - **Frontend (Angular)**: `xlsx`

 ---

 ## 2026-06-24 — Entidad Controles del Programa

 ### Resumen

 Se creó la entidad **Control** que se asocia a los Programas con tipo distinto de "Menú" y "Submenú". Los controles se gestionan visualmente dentro del diálogo de crear/editar Programa, permitiendo agregar múltiples filas dinámicamente.

 ### Cambios realizados

 #### Backend
 - **Tipo `Control`**: Nueva interfaz con campos `id`, `prgCodigo`, `tipoControl`, `descripcion`, `estado`, `createdAt`.
 - **Tipo `TipoControl`**: 7 valores: Caja de Texto, Botón, Check, Combo, Grid, Option, Otros.
 - **Seed**: 9 controles de ejemplo distribuidos entre 4 programas existentes.
 - **Store**: Array `controles` en `db`, exportado en `resetDb()`.
 - **Endpoints**:
   - `GET /api/seg-controles` — Listar todos los controles.
   - `DELETE /api/seg-controles/:id` — Eliminar un control.
   - `POST /api/seg-programas` — Acepta `controles` en el body; crea controles asociados al programa.
   - `PUT /api/seg-programas/:id` — Acepta `controles`; reemplaza los controles existentes del programa.
   - `DELETE /api/seg-programas/:id` — Elimina también los controles asociados.
 - **Import**: `Control` añadido al import de tipos en `index.ts`.

 #### Frontend
 - **Types**: `TipoControl` e `Control` en `front-angular/src/app/shared/models/types.ts`.
 - **ApiService**: Métodos `listControles()` y `deleteControl()`.
 - **SecurityComponent**:
   - `prgControles: ControlRow[]` — Array dinámico de filas de control en el diálogo.
   - `controlesMap: Map<string, Control[]>` — Mapa precargado de controles por `prgCodigo`.
   - `_loadPrg()` ahora también carga controles y construye el mapa.
   - `openPrgDialog()` precarga los controles existentes al editar.
   - `addControl()` / `removeControl()` — Agregar/quitar filas dinámicamente.
   - `savePrg()` envía `controles` en el body del POST/PUT.
   - Checkbox de estado con `(change)` handler (no usa `ngModel` para evitar conflicto boolean/string).
   - Sección de controles solo se muestra si `tipo !== 'Menú' && tipo !== 'Submenú'`.
 - **Diálogo**: Ancho incrementado a `640px` para acomodar las filas de controles.
 - **CSS**: Estilos `.controles-list`, `.control-row`, `.control-tipo`, `.control-desc`, `.control-check`.

 ### Archivos modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `backend/src/types.ts` | `TipoControl` e `Control` |
 | `backend/src/seed.ts` | 9 controles de ejemplo |
 | `backend/src/store.ts` | Array `controles` en db + resetDb |
 | `backend/src/index.ts` | Import Control, endpoints GET/DELETE controles, modif. POST/PUT/DELETE programas |
 | `front-angular/src/app/shared/models/types.ts` | `TipoControl` e `Control` |
 | `front-angular/src/app/core/services/api.service.ts` | `listControles()`, `deleteControl()` |
 | `front-angular/src/app/pages/security/security.component.ts` | Diálogo con controles dinámicos, lógica add/remove/save/load |
 | `front-angular/src/styles.css` | Estilos `.controles-list`, `.control-row`, etc. |

 ### Notas técnicas
 - Los controles se guardan como parte del POST/PUT del programa (replace strategy en PUT).
 - Solo se envían controles con descripción no vacía.
 - La sección de controles se occonde automáticamente si el tipo es Menú o Submenú.
 - El checkbox usa `(change)` en lugar de `[(ngModel)]` porque ngModel enlaza boolean y el estado es `ACTIVO`/`INACTIVO`.

 ---

 ## Cómo actualizar este archivo

 Al realizar un nuevo cambio, agregar una entrada bajo este formato:

 ```markdown
 ## YYYY-MM-DD — Título breve del cambio

 ### Resumen
 Una o dos líneas describiendo qué se hizo y por qué.

 ### Cambios realizados
 - Bullet point por cada cambio realizado.

 ### Archivos modificados
 | Archivo | Descripción |
 |---------|-------------|
 | ruta/al/archivo | qué cambió |

 ### Notas técnicas
 - Decisiones de diseño, bugs encontrados, trade-offs, etc.
 ```

  ---

  ## 2026-07-12 — Niveles de Segregación dinámicos

  ### Resumen

  Se reemplazó el modelo rígido de `Empresa`/`Sucursal`/`PuntoVenta` por un modelo dinámico de `NivelSegregacion` + `NodoSegregacion`, permitiendo configurar 0, 3 o N niveles de segregación sin cambiar código. Se agregó una página de administración en el sidebar y se actualizó la asignación de usuarios a nodos.

  ### Cambios realizados

  #### Backend
  - **Nuevos tipos**: `NivelSegregacion` (id, codigo, nombre, orden, estado) y `NodoSegregacion` (id, codigo, nombre, nivelId, padreId, estado).
  - **Usuario**: `empresaCodigo` se reemplazó por `nodoIds: string[]`.
  - **Store en memoria**: se eliminaron los arrays `empresas`, `sucursales`, `puntosVenta`; se agregaron `nivelesSegregacion` y `nodosSegregacion`.
  - **Seed**: los 3 niveles base (Empresa, Sucursal, Punto de Venta) y sus nodos se crean dinámicamente; los usuarios de ejemplo se asignan a los nodos empresa correspondientes.
  - **Endpoints nuevos**: CRUD para `/api/niveles-segregacion` y `/api/nodos-segregacion`, más `GET /api/nodos-segregacion/arbol`.
  - **Endpoints eliminados**: `/api/config-empresas`, `/api/config-sucursales`, `/api/config-puntos-venta`.
  - **Validaciones**: orden único por nivel, padre obligatorio del nivel anterior, detección de ciclos, eliminación en cascada de descendientes y limpieza de `nodoIds` en usuarios.
  - **Upload de matriz**: ya no procesa empresas/sucursales/puntos de venta; la plantilla Excel se redujo a usuarios + seguridades.
  - **Accesos por usuario**: el endpoint `/api/user-access/:id` ahora recibe `nodoIds`.

  #### Frontend Angular
  - **Tipos**: se eliminaron `Empresa`, `Sucursal`, `PuntoVenta`; se agregaron `NivelSegregacion`, `NodoSegregacion` y `User.nodoIds`.
  - **ApiService**: métodos CRUD para niveles/nodos; se eliminaron métodos de empresas/sucursales/PV; `updateUserAccess` usa `nodoIds`.
  - **Nueva página**: `SegregationLevelsComponent` en `/niveles-segregacion` con dos pestañas: Niveles y Nodos.
  - **Sidebar**: entrada "Niveles de Segregación" reemplazó a "Empresas y Sucursales"; `/configuracion` redirige a `/niveles-segregacion`.
  - **Accesos por usuario**: selector de nodos con checkboxes en lugar de select de empresa; columna y exportación actualizadas.
  - **Matriz de Acceso**: ejemplo y plantilla Excel sin columnas de empresa/sucursal/punto de venta.

  #### Documentación
  - `ARCHITECTURE.md`: modelo de segregación dinámica y endpoints nuevos.
  - `DEV-GUIDE.md`: rutas, endpoints y plantilla Excel actualizados.
  - `CHANGES.md`: esta entrada.

  ### Archivos principales modificados

  | Archivo | Descripción |
  |---------|-------------|
  | `backend/src/types.ts` | Nuevos tipos de segregación; `User.nodoIds`; eliminados `Empresa`/`Sucursal`/`PuntoVenta` |
  | `backend/src/store.ts` | Arrays `nivelesSegregacion` y `nodosSegregacion` |
  | `backend/src/seed.ts` | Seed dinámico de niveles/nodos; usuarios con `nodoIds` |
  | `backend/src/index.ts` | Endpoints de segregación; ajustes en user-access y upload matriz |
  | `front-angular/src/app/shared/models/types.ts` | Tipos frontend sincronizados |
  | `front-angular/src/app/core/services/api.service.ts` | Métodos de API para niveles/nodos |
  | `front-angular/src/app/pages/segregation-levels/segregation-levels.component.ts` | Nueva página de administración |
  | `front-angular/src/app/pages/user-access/user-access.component.ts` | Asignación de nodos a usuarios |
  | `front-angular/src/app/pages/matrix-access/matrix-access.component.ts` | Plantilla sin columnas legacy |
  | `front-angular/src/app/pages/layout/layout.component.ts` | Sidebar y metadatos de página |
  | `front-angular/src/app/app.routes.ts` | Ruta `/niveles-segregacion` y redirección `/configuracion` |
  | `front-angular/src/app/pages/configuration/configuration.component.ts` | Wrapper de compatibilidad |
  | `docs/ARCHITECTURE.md` | Arquitectura de segregación dinámica |
  | `docs/DEV-GUIDE.md` | Endpoints, rutas y plantilla Excel |
  | `docs/CHANGES.md` | Registro de cambios |

  ### Notas técnicas
  - El modelo utiliza Adjacency List (`padreId`) con validación de nivel anterior; es suficiente para las jerarquías planas esperadas y se puede migrar fácilmente a Closure Table si se requieren consultas de ancestros muy frecuentes.
  - La eliminación de un nodo elimina sus descendientes en cascada y limpia las referencias de usuarios.
  - Los perfiles/accesos por nodo quedan preparados a nivel de modelo (`User.nodoIds`) pero no se implementaron en esta entrega.

  ### Convenciones
- Las entradas más recientes van al **final** del archivo.
- Usar español.
- Mantener el formato de tabla para archivos modificados.
- Documentar dependencias añadidas o eliminadas.
- Si se corrige un bug, describir síntoma y causa raíz.
</parameter>
</invoke>