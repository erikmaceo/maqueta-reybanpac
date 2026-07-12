# Registro de cambios — Central Access Manager (Reybanpac)

 Este archivo documenta todos los cambios realizados en el proyecto, ordenados por fecha. Cada entrada debe incluir: fecha, resumen, archivos modificados y notas técnicas.

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