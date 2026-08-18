# Registro de cambios — Central Access Manager (Reybanpac)

 Este archivo documenta todos los cambios realizados en el proyecto, ordenados por fecha. Cada entrada debe incluir: fecha, resumen, archivos modificados y notas técnicas.

 ---

 ## 2026-08-18 — Documento de estimación de desarrollo por pantallas

 ### Resumen

 Se creó un documento de estimación de tiempo de desarrollo por pantalla de la SPA Angular (vista activa), con complejidad por pantalla, tiempos de integración con backend y tiempos de pruebas funcionales, orientado a presentación al cliente.

 ### Cambios realizados

 - Nuevo documento `docs/ESTIMACION-DESARROLLO-PANTALLAS.md` (Markdown) con 21 pantallas agrupadas en 4 módulos, desglose FE/BE/QA, resumen por módulo, fases sugeridas, supuestos y riesgos.
 - Nuevo documento `docs/ESTIMACION-DESARROLLO-PANTALLAS.docx` (Word) generado con `python-docx` para presentación al cliente.
 - Estimación total: ~957 horas (536 h frontend, 244 h integración backend, 177 h pruebas), ~6 meses con 1 desarrollador full-stack o ~3 meses con 2.

 ### Archivos principales modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `docs/ESTIMACION-DESARROLLO-PANTALLAS.md` | Estimación en Markdown |
 | `docs/ESTIMACION-DESARROLLO-PANTALLAS.docx` | Estimación en Word |
 | `docs/CHANGES.md` | Este registro |

 ---

 ## 2026-08-09 — Diálogo "Editar acceso" convertido en pantalla navegable

 ### Resumen

 Se sustituyó el diálogo de edición del tab "Accesos por usuario" (apartado "Usuarios") por una pantalla a la que se navega, manteniendo coherencia con el alta que ya se hacía en pantalla. Ahora tanto crear como editar usan la misma página `AccessCreateComponent`; el diálogo de edición y toda su lógica se eliminaron del tab.

 ### Cambios realizados

 #### 1. Frontend
 - **Pantalla de acceso reutilizada** (`front-angular/src/app/pages/access-create/access-create.component.ts`):
   - Se agregó modo edición mediante la ruta `/editar-acceso/:id` (se inyectó `ActivatedRoute`).
   - Al entrar en modo edición: se precarga el usuario, sus nodos de segregación y sus perfiles; el campo Usuario queda bloqueado (sin botón de búsqueda).
   - Título "Editar acceso" y botón "Guardar cambios" en edición; "Nuevo acceso" y "Crear acceso" en alta.
   - `save()` muestra "Acceso actualizado" vs "Acceso creado"; `cancel()` y `save()` navegan a `/usuarios` con `tab: ACCESOS`.
- **Rutas** (`front-angular/src/app/app.routes.ts`):
   - Nueva ruta `/editar-acceso/:id` → `AccessCreateComponent`.
- **Layout** (`front-angular/src/app/pages/layout/layout.component.ts`):
   - `PAGE_META` para `/editar-acceso/:id`.
   - `updateMetaFromPath()` resuelve el título por prefijo para rutas con parámetro.
- **Accesos por usuario** (`front-angular/src/app/pages/user-access/user-access.component.ts`):
   - El botón "Editar" de la tabla navega a `/editar-acceso/:id` en lugar de abrir el diálogo.
   - Se eliminó el diálogo de edición (`showDlg`) y los diálogos de búsqueda de perfiles y nodos, junto con toda su lógica (state, computeds, métodos, autocompletados, imports y estilos sin uso).

 #### 2. Verificación
 - `npm run build` en `front-angular` finaliza correctamente (sin warnings nuevos de `UserAccessComponent` ni `AccessCreateComponent`).

 ### Archivos principales modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `front-angular/src/app/pages/access-create/access-create.component.ts` | Modo edición: precarga, bloqueo de usuario, textos dinámicos y mensajes |
 | `front-angular/src/app/pages/user-access/user-access.component.ts` | Navegación a editar; eliminación del diálogo de edición y su lógica |
 | `front-angular/src/app/app.routes.ts` | Ruta `/editar-acceso/:id` |
 | `front-angular/src/app/pages/layout/layout.component.ts` | Metadatos y título para la nueva ruta |
 | `docs/CHANGES.md` | Este registro |

 ---

 ## 2026-08-09 — Diálogo "Nuevo Perfil" convertido en pantalla navegable

 ### Resumen

 Se sustituyó el diálogo de "Nuevo Perfil"/"Editar Perfil" (botón "Nuevo Perfil" y edición de la lista de Perfiles) por una pantalla a la que se navega. Todos los controles del diálogo se migraron a la nueva página, con mejor visibilidad de los campos y de los programas que se van agregando.

 ### Cambios realizados

 #### 1. Frontend
 - **Nuevo componente**: `front-angular/src/app/pages/perfil-form/perfil-form.component.ts`.
   - Página standalone con cabecera "Nuevo Perfil"/"Editar Perfil" y botón "Volver a Perfiles".
   - Campos: Código, Nombre, Descripción, Estado.
   - Sección "Programas del Perfil" con bloques por programa: selectores de Aplicación/Módulo/Programa (con diálogos de búsqueda), tabla de permisos (Nuevo, Modificar, Eliminar, Imprimir, Consultar) y botón para quitar.
   - Botón "Agregar Programa", validaciones y guardado (crear/actualizar) con confirmación para edición.
   - Navegación de retorno a `/perfiles` tras cancelar o guardar.
- **Rutas** (`front-angular/src/app/app.routes.ts`):
   - `/perfiles/nuevo` → componente `PerfilFormComponent` (crear).
   - `/perfiles/:id/editar` → componente `PerfilFormComponent` (editar).
- **Layout** (`front-angular/src/app/pages/layout/layout.component.ts`):
   - `PAGE_META` para `/perfiles/nuevo` y `/perfiles/:id/editar`.
   - `updateMetaFromPath()` resuelve el título por prefijo para rutas de perfil con parámetro.
- **Perfiles** (`front-angular/src/app/pages/perfiles/perfiles.component.ts`):
   - El botón "Nuevo Perfil" ahora navega a `/perfiles/nuevo`.
   - El botón "Editar" de la lista navega a `/perfiles/:id/editar`.
   - Se eliminó el diálogo de perfil y sus tres diálogos de búsqueda (aplicación, módulo, programa) junto con toda la lógica asociada (state, computeds, métodos, imports y signals de aplicaciones/módulos sin uso).

 #### 2. Verificación
 - `npm run build` en `front-angular` finaliza correctamente (sin warnings nuevos de `PerfilFormComponent`).

 ### Archivos principales modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `front-angular/src/app/pages/perfil-form/perfil-form.component.ts` | Nueva página de crear/editar perfil |
 | `front-angular/src/app/pages/perfiles/perfiles.component.ts` | Navegación desde la lista; eliminación del diálogo y su lógica |
 | `front-angular/src/app/app.routes.ts` | Rutas `/perfiles/nuevo` y `/perfiles/:id/editar` |
 | `front-angular/src/app/pages/layout/layout.component.ts` | Metadatos y título para las nuevas rutas |
 | `docs/CHANGES.md` | Este registro |

 ---

 ## 2026-08-06 — Nuevos endpoints de jerarquía y auditoría en API Gateway + Diagrama ER Mermaid + Corrección modelo de accesos

 ### Resumen

 Se agregaron endpoints al API Gateway para exponer la jerarquía completa de una aplicación, el orden establecido desde "Ordenar Soluciones" y permitir que aplicaciones terceras envíen logs de auditoría visibles en la consola CAM. Se creó un diagrama ER en Mermaid con los atributos de todas las tablas. También se corrigió la documentación del modelo de datos para reflejar que los accesos de usuario a nodos y perfiles se guardan como arrays dentro de `users`.

 ### Cambios realizados

 #### 1. Backend
 - Nuevo endpoint `GET /api/v1/gateway/aplicaciones/:codigo/completo` en `backend/src/gateway/routes.ts`.
   - Requiere scope `seguridades:read`.
   - Respuesta anidada: aplicación → módulos → programas → controles.
   - Solo incluye entidades con estado `ACTIVO`.
 - Nuevo endpoint `GET /api/v1/gateway/aplicaciones/:codigo/orden`.
   - Devuelve la misma jerarquía ordenada por el campo `orden` de cada entidad.
   - Si no tiene `orden`, ordena por `createdAt`.
   - Refleja el orden persistido por el botón "Actualizar Orden" de "Ordenar Soluciones".
 - Nuevo endpoint `POST /api/v1/gateway/audit/logs`.
   - Requiere scope `auditoria:write`.
   - Acepta un log o un array de logs.
   - Persiste los logs en `db.audit` usando `logAudit`, por lo que son visibles en el módulo Auditoría de la SPA.
   - Prefija el `entityType` con `external:` para diferenciar logs de terceros.
 - Nuevo scope `auditoria:write` en `backend/src/types.ts` y `backend/src/store.ts`.
 - Cliente demo actualizado con scope `auditoria:write`.
 - `GatewayRequest` en `backend/src/gateway/auth.ts` ahora expone `gatewayClientId` y `gatewayScopes` de forma tipada.

 #### 2. Documentación
 - Nuevo archivo `docs/DATABASE-MODEL-DIAGRAM.md` con el diagrama ER completo en Mermaid incluyendo atributos de todas las tablas.
 - Actualizado `docs/README.md` con referencia al nuevo diagrama.
 - Actualizado `docs/API-GATEWAY-DISCOVERY.md` con los nuevos endpoints, parámetros, ejemplos de respuesta y reenumeración de secciones.
 - Regenerado `C:\Users\admin\API_Gateway_Discovery.docx`.
 - Corrección en `docs/DATABASE-MODEL.md`:
   - Agregados campos `nodo_ids`, `perfil_codigos` y `role_ids` a la tabla `users`.
   - Actualizado DDL SQL de `users` con los nuevos campos array.
   - `user_nodos` y `user_perfiles` ahora se documentan como alternativas relacionales, no como tablas existentes en la implementación actual.
 - Corrección en `docs/DATABASE-MODEL-DIAGRAM.md`:
   - Agregados `nodo_ids`, `perfil_codigos` y `role_ids` a la entidad `USERS`.
   - Agregada nota explicando que los accesos se guardan como arrays en `users`.
 - Nuevo archivo `docs/API-GATEWAY-WSO2-ROUTES.md` con el mapeo completo de rutas del API Gateway para WSO2 API Manager asumiendo despliegue en Kubernetes.

 ### Archivos principales modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `backend/src/gateway/routes.ts` | Endpoints `/aplicaciones/:codigo/completo`, `/aplicaciones/:codigo/orden` y `/audit/logs` |
 | `backend/src/gateway/auth.ts` | Campos tipados `gatewayClientId` y `gatewayScopes` en `GatewayRequest` |
 | `backend/src/types.ts` | Nuevo scope `auditoria:write` |
 | `backend/src/store.ts` | `auditoria:write` en `GATEWAY_SCOPES` y cliente demo |
 | `docs/DATABASE-MODEL.md` | Corrección del modelo de accesos de usuario |
 | `docs/DATABASE-MODEL-DIAGRAM.md` | Diagrama ER Mermaid con atributos y nota de accesos |
 | `docs/README.md` | Índice actualizado |
 | `docs/API-GATEWAY-DISCOVERY.md` | Documentación de los nuevos endpoints |
 | `docs/API-GATEWAY-WSO2-ROUTES.md` | Mapeo de rutas para WSO2 API Manager |
 | `docs/CHANGES.md` | Este registro |

 ---

 ## 2026-08-05 — Implementación del API Gateway (Opción A)

 ### Resumen

 Se implementó el API Gateway dentro del backend actual para exponer de forma segura la configuración de autorización y segregación a aplicaciones terceras. El gateway usa OAuth2 Client Credentials con tokens JWT, rate limiting por cliente, IP allowlist y scopes de acceso.

 ### Cambios realizados

 #### 1. Modelo de datos
 - Nuevos tipos en `backend/src/types.ts`: `GatewayClient`, `GatewayScope`, `GatewayTokenPayload`.
 - Almacenamiento en memoria `gatewayClients` en `backend/src/store.ts` con semilla desde variable `GATEWAY_CLIENTS` y cliente demo de desarrollo.

 #### 2. Seguridad y autenticación
 - `backend/src/gateway/auth.ts`: endpoint `POST /api/v1/gateway/oauth/token` y middleware `requireGatewayAuth` / `requireGatewayScope`.
 - Tokens JWT con RS256 (configurable vía `GATEWAY_JWT_PRIVATE_KEY` / `GATEWAY_JWT_PUBLIC_KEY`) o HS256 fallback (`GATEWAY_JWT_FALLBACK_SECRET`).
 - Client secrets almacenados como hash bcrypt.
 - `backend/src/gateway/rate-limit.ts`: rate limiting por `client_id` (1000 req/hr por defecto).
 - IP allowlist por cliente.

 #### 3. Endpoints del gateway
 - Lectura: `/aplicaciones`, `/aplicaciones/:codigo`, `/aplicaciones/:codigo/completo`, `/aplicaciones/:codigo/orden`, `/modulos`, `/programas`, `/perfiles`, `/perfiles/:codigo`, `/controles`.
 - Segregación: `/niveles-segregacion`, `/nodos-segregacion`, `/nodos-segregacion/arbol`, `/nodos-segregacion/:id`.
 - Usuarios y accesos: `/usuarios`, `/usuarios/:username`, `/usuarios/:username/nodos`, `/usuarios/:username/perfiles`, `/usuarios/:username/roles`.
 - Validaciones: `POST /validate/perfil`, `POST /validate/programa`, `POST /validate/rol`.
 - Auditoría: `POST /audit/logs`.
 - Admin: `/admin/clients` (CRUD y rotación de secret).
 - Health: `/health`.
 - Documentación Swagger: `/docs`.

 #### 4. Integración y operación
 - Montaje en `backend/src/index.ts` bajo `/api/v1/gateway` y `/api/v1/gateway/admin`.
 - `helmet` habilitado en todo el backend.
 - `backend/scripts/create-gateway-client.ts`: CLI para generar clientes y valor base64 para `GATEWAY_CLIENTS`.
 - `docker-compose.yaml`: variables de entorno `GATEWAY_JWT_FALLBACK_SECRET` y `GATEWAY_CLIENTS`.

 #### 5. Documentación
 - `docs/API-GATEWAY-PLAN.md`: actualizado a estado implementado, con uso rápido y próximos pasos.
 - `docs/API-GATEWAY-DISCOVERY.md`: nuevo documento detallado para consumidores del API Gateway.
 - `docs/README.md`: resumen actualizado.
 - `docs/CHANGES.md`: entrada actual.

 ### Archivos principales modificados

 | Archivo | Descripción |
 |---------|-------------|
 | `backend/src/types.ts` | Tipos `GatewayClient`, `GatewayScope`, `GatewayTokenPayload` |
 | `backend/src/store.ts` | `gatewayClients`, `seedGatewayClients()` |
 | `backend/src/index.ts` | Montaje de routers gateway y `helmet` |
 | `backend/src/gateway/auth.ts` | OAuth2 token + middleware JWT |
 | `backend/src/gateway/rate-limit.ts` | Rate limiting por cliente |
 | `backend/src/gateway/routes.ts` | Endpoints públicos del gateway |
 | `backend/src/gateway/validation.ts` | Lógica de validación runtime |
 | `backend/src/gateway/admin.ts` | Endpoints de administración |
 | `backend/src/gateway/swagger.ts` | Especificación OpenAPI |
 | `backend/scripts/create-gateway-client.ts` | CLI para crear clientes |
 | `backend/package.json` | Dependencias `bcrypt`, `express-rate-limit`, `helmet`, `jsonwebtoken`, `swagger-jsdoc`, `swagger-ui-express`, `zod` |
 | `docker-compose.yaml` | Variables de entorno del gateway |
 | `docs/API-GATEWAY-PLAN.md` | Plan actualizado a implementado |
 | `docs/API-GATEWAY-DISCOVERY.md` | Guía de descubrimiento para consumidores |
 | `docs/README.md` | Índice actualizado |
 | `docs/CHANGES.md` | Este registro |

 ### Notas técnicas
 - El cliente demo (`demo-client` / `demo-secret-do-not-use-in-production`) solo está disponible si no se configura `GATEWAY_CLIENTS`.
 - En producción se recomienda RS256 con claves PEM y rotación periódica de secrets.
 - Pantalla de administración de clientes en Angular: pendiente.

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