# Arquitectura — Central Access Manager (Reybanpac)

## Visión general

Central Access Manager (CAM) es una consola de gobierno de accesos para Reybanpac (Favorita Fruit Company). Permite administrar aplicaciones, módulos, programas, perfiles, usuarios, roles y solicitudes de acceso, con integración LDAP para usuarios corporativos.

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
│  │ Auth     │  │ Segurida- │  │ Matriz   │  │ LDAP     │     │
│  │ (JWT)    │  │ des CRUD  │  │ Upload   │  │ Client   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                    │                                          │
│          ┌─────────▼──────────┐                               │
│          │  Store en memoria   │                               │
│          │  (db: IRAM)         │                               │
│          └────────────────────┘                               │
└───────────────────────────┬───────────────────────────────────┘
                            │ LDAP protocol
                ┌───────────▼───────────┐
                │  OpenLDAP (cam-ldap)   │
                │  Puerto 389 (3890 host)│
                └───────────────────────┘
```

## Componentes

### 1. Backend (`backend/`)
- **Stack**: Express + TypeScript, ejecutado con `tsx` sobre Node 20 (Alpine).
- **Persistencia**: Datos en memoria RAM (IRAM). Se pierden al reiniciar el contenedor, excepto el seed inicial.
- **Autenticación**: Sesiones opacas con token `cam.<hex>`, TTL de 8 horas.
- **Autorización**: Middleware `requireAuth` y `requireGlobalAdmin`.
- **Endpoints principales**:
  - `POST /api/auth/login` — Login (local o LDAP)
  - `GET/POST/PUT/DELETE /api/seg-aplicaciones` — CRUD Aplicaciones
  - `GET/POST/PUT/DELETE /api/seg-modulos` — CRUD Módulos
  - `GET/POST/PUT/DELETE /api/seg-programas` — CRUD Programas (con campo `tipo`)
  - `GET/POST/PUT/DELETE /api/seg-perfiles` — CRUD Perfiles
  - `GET/POST/PUT/DELETE /api/niveles-segregacion` — CRUD Niveles de Segregación
  - `GET/POST/PUT/DELETE /api/nodos-segregacion` — CRUD Nodos de Segregación
  - `GET /api/nodos-segregacion/arbol` — Árbol jerárquico de nodos
  - `POST /api/seg-matriz/upload` — Carga masiva desde Excel
  - `GET /api/users`, `GET /api/roles`, `GET /api/grants`, `GET /api/audit`
  - `GET /api/ldap/people` — Usuarios desde OpenLDAP

### 2. Frontend Angular (`front-angular/`)
- **Stack**: Angular 21 standalone components, PrimeNG 21,Signals.
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
│   ├── layout/                # Shell con sidebar + router-outlet
│   ├── dashboard/             # Panel de control
│   ├── systems/              # Sistemas (catálogo de aplicaciones)
│   ├── security/             # Seguridades (4 tabs: Apps, Mods, Prgs, Perfs)
│   ├── roles/                # Roles y accesos
│   ├── users/                # Usuarios
│   ├── matrix-access/        # Matriz de Acceso (upload Excel)
│   ├── directory/            # Directorio LDAP
│   ├── soluciones/           # Vista jerárquica por aplicación
│   ├── authorizer/           # Autorizador de solicitudes
│   ├── access/               # Accesos efectivos
│   └── audit/                # Auditoría
└── shared/
    ├── components/            # Icons, UI components
    └── models/
        └── types.ts          # Interfaces TypeScript del dominio
```

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
          └── Perfil (perf_codigo, prg_codigo)
```

### Segregación dinámica

La jerarquía de segregación ya no está fija. Se modela con dos entidades genéricas:

```
NivelSegregacion (id, codigo, nombre, orden, estado)
  └── NodoSegregacion (id, codigo, nombre, nivelId, padreId, estado)
```

- `NivelSegregacion` define los tipos de nivel: Empresa (1), Sucursal (2), Punto de Venta (3), Caja de Venta (4), etc.
- `NodoSegregacion` son las instancias concretas. `padreId` apunta al nodo del nivel anterior.
- `User.nodoIds` asocia un usuario a uno o varios nodos.
- El modelo permite 0, 3 o N niveles sin cambiar código.

### Tipos de Programa
`Menú` | `Submenú` | `Maestro` | `Transacción` | `Proceso` | `Consulta` | `Reporte` | `Objeto`

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
  backend:       # Express API, puerto 4000:4000
  frontend:      # React (nginx), puerto 8080:80
  front-angular: # Angular (nginx), puerto 5174:80
```

### Notas importantes
- El backend **no usa volume mounts**. Los cambios de código requieren `docker compose build backend` + `docker compose up -d backend`.
- `docker restart` NO actualiza el código; solo reinicia el proceso con la misma imagen.
- El Angular frontend en Docker es un build estático (nginx). Para desarrollo se usa `ng serve` local en puerto 5174 con proxy.

## Flujos principales

### Login
1. Usuario ingresa credenciales en `/login`.
2. `AuthService.login()` → `POST /api/auth/login`.
3. Backend: si es admin local, valida en memoria; si es cliente final, hace bind LDAP.
4. Retorna token opaco. Se guarda en `localStorage`.
5. `authGuard` valida el token en cada navegación.

### CRUD Seguridades
1. `SecurityComponent` carga datos vía `ApiService` (signals).
2. Cada tab (Aplicaciones/Módulos/Programas/Perfiles) tiene su propio signal de datos, filtro computed y paginación computed.
3. Crear/editar abre `p-dialog` con formulario.
4. Guardar llama a POST/PUT del backend y recarga el signal.
5. `EventsService.emitDataChanged()` notifica a otros componentes (ej. Soluciones).

### Matriz de Acceso (Upload)
1. Usuario descarga plantilla `.xlsx` con 14 columnas (A-N).
2. Llena filas con la jerarquía App → Módulo → Programa → Perfil.
3. Upload: `POST /api/seg-matriz/upload` (multipart/form-data).
4. Backend parsea con `xlsx`, hace upsert por código de cada entidad.
5. Retorna resumen con cantidades creadas y errores.
</parameter>
</invoke>