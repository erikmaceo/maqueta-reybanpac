# Arquitectura — Central Access Manager (Reybanpac)

## Visión general

Central Access Manager (CAM) es una consola de gobierno de accesos para Reybanpac (Favorita Fruit Company). Permite administrar aplicaciones, módulos, programas, controles, perfiles, usuarios, roles y solicitudes de acceso, con integración LDAP para usuarios corporativos. Además expone un **API Gateway** para que aplicaciones terceras consulten la configuración de autorización/segregación y envíen logs de auditoría.

```
┌───────────────────────────────────────────────────────────────┐
│                         Navegador                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐   │
│  │  React SPA          │    │  Angular SPA (PrimeNG 21)   │   │
│  │  (frontend/)        │    │  (front-angular/)           │   │
│  │  Puerto 8080 (Docker)│    │  Puerto 5174 (ng serve)     │   │
│  └────────┬────────────┘    └────────┬────────────────────┘   │
└───────────┼───────────────────────────┼───────────────────────┘
            │ /api (proxy)              │ /api (proxy.conf.json)
            ▼                           ▼
┌───────────────────────────────────────────────────────────────┐
│                    Backend (Express + TS)                      │
│                    (backend/, puerto 4000)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Auth     │  │ Segurida- │  │ Cargas   │  │ LDAP     │     │
│  │ (JWT)    │  │ des CRUD  │  │ Masivas  │  │ Client   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ API Gateway (/api/v1/gateway)                         │   │
│  │ OAuth2 Client Credentials · JWT · Scopes · Rate Limit │   │
│  └──────────────────────────────────────────────────────┘   │
│                    │                                          │
│          ┌─────────▼──────────┐                               │
│          │  Store en memoria   │                               │
│          │  (db: IRAM)         │                               │
│          └────────────────────┘                               │
└───────────┬───────────────────────────┬──────────────────────┘
            │ LDAP protocol             │ Aplicaciones terceras
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────────────────┐
│  OpenLDAP (cam-ldap)   │   │  Apps terceras → OAuth2 token →   │
│  Puerto 389 (3890 host)│   │  /api/v1/gateway/*                │
└───────────────────────┘   └───────────────────────────────────┘
```

## Componentes

### 1. Backend (`backend/`)
- **Stack**: Express + TypeScript, ejecutado con `tsx` sobre Node 20 (Alpine).
- **Seguridad HTTP**: `helmet` habilitado en todo el backend.
- **Persistencia**: Datos en memoria RAM (IRAM). Se pierden al reiniciar el contenedor, excepto el seed inicial.
- **Autenticación**: Sesiones opacas con token `cam.<hex>`, TTL de 8 horas.
- **Autorización**: Middleware `requireAuth` y `requireGlobalAdmin`.
- **Endpoints principales**:
  - `POST /api/auth/login` — Login (local o LDAP)
  - `GET/POST/PUT/DELETE /api/seg-aplicaciones` — CRUD Aplicaciones (+ `POST /api/seg-aplicaciones/bulk`)
  - `GET/POST/PUT/DELETE /api/seg-modulos` — CRUD Módulos (+ `PUT /api/seg-modulos/reordenar`)
  - `GET/POST/PUT/DELETE /api/seg-programas` — CRUD Programas (con campo `tipo` y controles asociados; + `PUT /api/seg-programas/reordenar`)
  - `GET /api/seg-controles` — Listar controles (+ `PUT /api/seg-controles/reordenar`)
  - `GET/POST/PUT/DELETE /api/seg-perfiles` — CRUD Perfiles
  - `GET/POST/PUT/DELETE /api/niveles-segregacion` — CRUD Niveles de Segregación
  - `GET/POST/PUT/DELETE /api/nodos-segregacion` — CRUD Nodos de Segregación
  - Cargas masivas (ver flujo "Cargas Masivas"):
    - `POST /api/seg-aplicaciones/bulk` — upsert de aplicaciones, módulos y programas
    - `POST /api/seg-perfiles/bulk` — upsert de perfiles con permisos
    - `POST /api/nodos-segregacion/bulk` — upsert de nodos de segregación
    - `POST /api/user-access/bulk` — carga de accesos por usuario
    - `GET /api/bulk-uploads` — historial de cargas masivas
    - `POST /api/bulk-uploads/registro` — registro de cargas rechazadas (auditoría)
  - `GET /api/nodos-segregacion/arbol` — Árbol jerárquico de nodos
  - `GET/POST/PUT/DELETE /api/niveles-atributos` — CRUD de atributos dinámicos por nivel
  - `GET /api/nodos-atributo-valor` — Valores de atributos por nodo
  - `GET/POST/PUT/DELETE /api/param-paises|provincias|ciudades|dispositivos-moviles` — Parámetros generales
  - `GET /api/users`, `GET /api/roles`, `GET /api/grants`, `GET /api/audit`
  - `GET /api/ldap/users` — Usuarios desde OpenLDAP

#### API Gateway (`backend/src/gateway/`)
Expone la configuración de autorización a aplicaciones terceras. Montado en `index.ts` bajo `/api/v1/gateway` y `/api/v1/gateway/admin`.

- **Autenticación** (`gateway/auth.ts`): OAuth2 Client Credentials vía `POST /api/v1/gateway/oauth/token`. Tokens JWT firmados con RS256 (claves PEM vía `GATEWAY_JWT_PRIVATE_KEY` / `GATEWAY_JWT_PUBLIC_KEY`) o fallback HS256 (`GATEWAY_JWT_FALLBACK_SECRET`). Los client secrets se almacenan como hash bcrypt. Middlewares `requireGatewayAuth` y `requireGatewayScope`.
- **Rate limiting** (`gateway/rate-limit.ts`): por `client_id`, 1000 req/hora por defecto. IP allowlist por cliente.
- **Scopes**: `seguridades:read`, `segregacion:read`, `usuarios:read`, `accesos:read`, `accesos:validate`, `auditoria:write`, `admin:gateway`.
- **Clientes** (`store.ts`): almacenados en memoria en `gatewayClients`, semilla desde la variable `GATEWAY_CLIENTS` (base64) o cliente demo de desarrollo si no se configura.
- **Endpoints de lectura**: `/aplicaciones`, `/aplicaciones/:codigo`, `/aplicaciones/:codigo/completo` (jerarquía anidada app → módulos → programas → controles, solo ACTIVOS), `/aplicaciones/:codigo/orden` (jerarquía ordenada por el campo `orden` persistido por "Ordenar Soluciones"), `/modulos`, `/programas`, `/perfiles`, `/perfiles/:codigo`, `/controles`.
- **Segregación**: `/niveles-segregacion`, `/nodos-segregacion`, `/nodos-segregacion/arbol`, `/nodos-segregacion/:id`.
- **Usuarios y accesos**: `/usuarios`, `/usuarios/:username`, `/usuarios/:username/nodos`, `/usuarios/:username/perfiles`, `/usuarios/:username/roles`.
- **Validación runtime** (`gateway/validation.ts`): `POST /validate/perfil`, `POST /validate/programa`, `POST /validate/rol`.
- **Auditoría externa**: `POST /audit/logs` (scope `auditoria:write`) acepta un log o un array; persiste vía `logAudit` (visibles en el módulo Auditoría de la SPA); el `entityType` se prefija con `external:` para logs de terceros.
- **Administración** (`gateway/admin.ts`): CRUD de clientes y rotación de secret en `/admin/clients` (scope `admin:gateway`).
- **Documentación**: Swagger UI en `/api/v1/gateway/docs` (`gateway/swagger.ts`).
- **CLI**: `backend/scripts/create-gateway-client.ts` genera clientes y el valor base64 para `GATEWAY_CLIENTS`.

### 2. Frontend Angular (`front-angular/`)
- **Stack**: Angular 21 standalone components, PrimeNG 21, Signals.
- **Standalone**: Todos los componentes son `standalone: true` (sin NgModules).
- **Routing**: Lazy loading con `loadComponent` y guards (`authGuard`, `adminGuard`, `guestGuard`).
- **Proxy**: `/api/*` redirige a `http://localhost:4000` via `proxy.conf.json`.
- **Estado global**: Signals + `EventsService` para comunicación entre componentes.

#### Estructura de carpetas Angular
```
front-angular/src/app/
├── app.routes.ts              # Definición de rutas con guards
├── core/
│   ├── guards/                # authGuard, adminGuard, guestGuard
│   └── services/              # AuthService, ApiService, EventsService
├── pages/
│   ├── layout/                # Shell con sidebar + router-outlet (PAGE_META)
│   ├── dashboard/             # Panel de control
│   ├── systems/               # Sistemas (catálogo)
│   ├── aplicaciones/          # Aplicaciones
│   ├── security/              # Seguridades (Apps, Módulos, Programas+Controles)
│   ├── segregation-levels/    # Niveles de Segregación (tabs: Niveles, Nodos, Atributos)
│   ├── parameters-configuration/ # Parámetros (países, provincias, ciudades, dispositivos)
│   ├── roles/                 # Roles y accesos
│   ├── users/                 # Usuarios
│   ├── perfiles/              # Lista de Perfiles
│   ├── perfil-form/           # Crear/editar Perfil (pantalla navegable)
│   ├── access/                # Accesos efectivos
│   ├── access-create/         # Nuevo/editar acceso (pantalla navegable, modo edición por ruta)
│   ├── user-select/           # Búsqueda de usuario (diálogo-página)
│   ├── perfil-select/         # Búsqueda de perfil (diálogo-página)
│   ├── nodo-select/           # Selección jerárquica de nodos (diálogo-página)
│   ├── directory/             # Directorio LDAP
│   ├── soluciones/            # Vista jerárquica por aplicación + Ordenar Soluciones (drag & drop)
│   ├── authorizer/            # Autorizador de solicitudes
│   ├── device-access/         # Acceso a dispositivos
│   └── audit/                 # Auditoría
└── shared/
    ├── components/            # Icons, UI components
    └── models/
        └── types.ts           # Interfaces TypeScript del dominio
```

#### Rutas principales
- `/seguridades`, `/niveles-segregacion` (con redirección desde `/configuracion`), `/parametros`
- `/perfiles`, `/perfiles/nuevo`, `/perfiles/:id/editar` → `PerfilFormComponent`
- `/accesos`, `/nuevo-acceso`, `/editar-acceso/:id` → `AccessCreateComponent` (crear y editar comparten pantalla; sub-rutas `/seleccionar-usuario|perfil|empresa|nodo` para los selectores)
- `/soluciones`, `/soluciones/:codigo` — vista jerárquica y ordenamiento por aplicación
- `/directorio`, `/autorizador`, `/acceso-dispositivos`, `/auditoria`

### 3. Frontend React (`frontend/`)
- **Stack**: React + Vite. Es la versión original de referencia.
- **Puerto**: 8080 (Docker nginx).
- **Estado**: Activo como referencia visual; la migración a Angular es la versión en desarrollo activo.

### 4. OpenLDAP (`ldap/`)
- **Imagen**: `osixia/openldap:1.5.0`.
- **Puerto**: 389 (expuesto como 3890 en host).
- **Bootstrap**: `ldap/bootstrap.ldif` con usuarios "cliente final".
- **Credenciales admin**: `cn=admin,dc=reybanpac,dc=com` / `admin123`.

## Modelo de datos

### Entidades de Seguridades (Relación jerárquica)

```
Aplicacion (app_codigo)
  └── Modulo (mod_codigo, app_codigo)
      └── Programa (prg_codigo, mod_codigo, tipo)
          ├── Perfil (perf_codigo, prg_codigo)
          └── Control (prgCodigo, tipoControl, descripcion)   # solo para tipos ≠ Menú/Submenú
```

El orden de módulos, programas y controles se persiste en el campo `orden` y se gestiona desde la pantalla "Ordenar Soluciones" mediante los endpoints `PUT /api/seg-*-reordenar`.

### Segregación dinámica

La jerarquía de segregación ya no está fija. Se modela con dos entidades genéricas:

```
NivelSegregacion (id, codigo, nombre, orden, estado)
  ├── NodoSegregacion (id, codigo, nombre, nivelId, padreId, estado)
  └── NivelAtributo (id, nivelId, codigo, nombre, tipo, obligatorio, orden, estado, config?)
        └── NodoAtributoValor (nodoId, atributoId, valor)
```

- `NivelSegregacion` define los tipos de nivel: Empresa (1), Sucursal (2), Punto de Venta (3), Caja de Venta (4), etc.
- `NodoSegregacion` son las instancias concretas. `padreId` apunta al nodo del nivel anterior (Adjacency List, con validación de ciclo y eliminación en cascada de descendientes).
- `NivelAtributo` define campos descriptivos personalizados por nivel (tipos: `texto`, `numero`, `telefono`, `email`, `select`; el tipo `select` puede configurar `config.fuente` con `paises`, `provincias` o `ciudades`).
- `NodoAtributoValor` guarda el valor de cada atributo por nodo; se envían como array `{ atributoId, valor }` en POST/PUT de nodos.
- El modelo permite 0, 3 o N niveles sin cambiar código.

### Usuarios y accesos

Los accesos del usuario se guardan como arrays dentro de la entidad `users`:

- `nodo_ids`: nodos de segregación asignados.
- `perfil_codigos`: perfiles asignados por aplicación.
- `role_ids`: roles globales.

(`user_nodos` y `user_perfiles` están documentadas solo como alternativa relacional, no existen en la implementación actual.)

### Tipos de Programa
`Menú` | `Submenú` | `Maestro` | `Transacción` | `Proceso` | `Consulta` | `Reporte` | `Objeto`

### Tipos de Control
`Caja de Texto` | `Botón` | `Check` | `Combo` | `Grid` | `Option` | `Otros`

### Estados
`ACTIVO` | `INACTIVO`

### Usuarios
- **ADMIN**: Usuarios locales (en memoria). Login directo sin LDAP.
- **CLIENTE_FINAL**: Usuarios desde LDAP. Autenticación vía bind LDAP.

## Docker

### docker-compose.yaml
```yaml
services:
  ldap:          # OpenLDAP, puerto 3890:389
  backend:       # Express API, puerto 4000:4000 (variables GATEWAY_JWT_FALLBACK_SECRET, GATEWAY_CLIENTS)
  frontend:      # React (nginx), puerto 8080:80
  front-angular: # Angular (nginx), puerto 5174:80
```

### Notas importantes
- El backend **no usa volume mounts**. Los cambios de código requieren `docker compose build backend` + `docker compose up -d backend`.
- `docker restart` NO actualiza el código; solo reinicia el proceso con la misma imagen.
- El Angular frontend en Docker es un build estático (nginx). Para desarrollo se usa `ng serve` local en puerto 5174 con proxy.
- En producción se recomienda RS256 con claves PEM y rotación periódica de secrets del gateway. El cliente demo (`demo-client`) solo existe si no se configura `GATEWAY_CLIENTS`.

## Flujos principales

### Login
1. Usuario ingresa credenciales en `/login`.
2. `AuthService.login()` → `POST /api/auth/login`.
3. Backend: si es admin local, valida en memoria; si es cliente final, hace bind LDAP.
4. Retorna token opaco. Se guarda en `localStorage`.
5. `authGuard` valida el token en cada navegación.

### CRUD Seguridades
1. `SecurityComponent` carga datos vía `ApiService` (signals).
2. Cada tab tiene su propio signal de datos, filtro computed y paginación computed.
3. Crear/editar abre `p-dialog` con formulario; el diálogo de Programa incluye filas dinámicas de Controles (se ocultan para tipos Menú/Submenú) y envía el array `controles` en POST/PUT (replace strategy).
4. Guardar llama a POST/PUT del backend y recarga el signal.
5. `EventsService.emitDataChanged()` notifica a otros componentes (ej. Soluciones).

### Perfiles y Accesos por usuario (pantallas navegable)
- Alta y edición de Perfiles usan `PerfilFormComponent` (`/perfiles/nuevo`, `/perfiles/:id/editar`) con bloques por programa y tabla de permisos (Nuevo, Modificar, Eliminar, Imprimir, Consultar).
- Alta y edición de accesos usan `AccessCreateComponent` (`/nuevo-acceso`, `/editar-acceso/:id`). En edición el campo Usuario queda bloqueado y se precargan nodos y perfiles.
- La selección de nodos usa un árbol jerárquico con selección/deselección en cascada (marcar un padre marca todos sus descendientes).

### Ordenar Soluciones
1. En `/soluciones` se arrastra módulos, programas y controles para definir su orden dentro de cada aplicación.
2. El botón "Actualizar Orden" llama a `PUT /api/seg-modulos/reordenar`, `PUT /api/seg-programas/reordenar` y `PUT /api/seg-controles/reordenar`.
3. El orden queda persistido en el campo `orden` y lo refleja el endpoint del gateway `GET /aplicaciones/:codigo/orden`.

### Cargas Masivas

La carga masiva única desde "Matriz de Acceso" fue reemplazada por 4 apartados desacoplados, accesibles con el botón **"Carga Masiva"** en cada pantalla:

| Apartado | Ruta / Tab | Endpoint | Alcance |
|----------|-----------|----------|---------|
| Aplicaciones | `/seguridades` · tab Aplicaciones | `POST /api/seg-aplicaciones/bulk` | Upsert de aplicaciones, módulos y programas |
| Nodos de Segregación | `/niveles-segregacion` · tab Nodos | `POST /api/nodos-segregacion/bulk` | Upsert de nodos por nivel |
| Perfiles | `/perfiles` | `POST /api/seg-perfiles/bulk` | Upsert de perfiles con permisos |
| Accesos por usuario | `/usuarios` · tab Accesos por usuario | `POST /api/user-access/bulk` | Asignación de nodos y perfiles a usuarios |

Flujo común en los 4 apartados:
1. El usuario descarga la plantilla `.xlsx` específica del apartado (botón "Descargar Plantilla", generada en el cliente con `xlsx`).
2. Al seleccionar el archivo, este se parsea y valida **en el cliente** (sin subirlo al backend): se detectan errores por fila antes de procesar.
3. Se muestra un diálogo de confirmación con un resumen (total de filas, nuevos vs actualizaciones por upsert según código).
4. Al confirmar, se envían las filas como JSON al endpoint `/bulk` correspondiente; el backend hace upsert fila por fila y retorna `processed`, contadores created/updated y errores por número de fila.
5. Las cargas rechazadas (con errores) se registran vía `POST /api/bulk-uploads/registro` y quedan auditadas (`BULK_UPLOAD_REJECTED`); el historial de cargas masivas es consultable en Auditoría (`GET /api/bulk-uploads`, tab "Historial de cargas masivas").

### Consumo por aplicaciones terceras (API Gateway)
1. La app tercera solicita token: `POST /api/v1/gateway/oauth/token` con `client_id`/`client_secret` (Client Credentials).
2. Consume los endpoints de lectura/validación según sus scopes (rate limit por cliente aplica).
3. Puede enviar logs propios con `POST /audit/logs`; aparecen en la consola CAM con `entityType` prefijado `external:`.

## Documentación relacionada

- `docs/DATABASE-MODEL.md` y `docs/DATABASE-MODEL-DIAGRAM.md` — modelo de datos y diagrama ER Mermaid.
- `docs/API-GATEWAY-DISCOVERY.md` — guía detallada para consumidores del gateway.
- `docs/API-GATEWAY-WSO2-ROUTES.md` — mapeo de rutas para WSO2 API Manager (Kubernetes).
- `docs/AUTH-AUTHZ-GUIDE.md`, `docs/BACKEND-API-ROUTES.md`, `docs/DEV-GUIDE.md`, `docs/CHANGES.md`.
