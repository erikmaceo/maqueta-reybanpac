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

### Convenciones
- Las entradas más recientes van al **final** del archivo.
- Usar español.
- Mantener el formato de tabla para archivos modificados.
- Documentar dependencias añadidas o eliminadas.
- Si se corrige un bug, describir síntoma y causa raíz.
</parameter>
</invoke>