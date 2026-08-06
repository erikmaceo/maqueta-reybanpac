# API Gateway — Documento de Descubrimiento para Consumidores

> **Versión:** 1.0.0
> **Última actualización:** 2026-08-05
> **URL base:** `http://localhost:4000/api/v1/gateway`
> **Ambiente de desarrollo:** `http://localhost:4000/api/v1/gateway`
> **Documentación Swagger interactiva:** `http://localhost:4000/api/v1/gateway/docs`

---

## 1. Visión general

El API Gateway permite a aplicaciones terceras consumir de forma segura la configuración de autorización y segregación gestionada en CAM (Central Access Manager). Todos los endpoints son **REST/JSON** y siguen el flujo **OAuth2 Client Credentials** para obtener un token JWT de acceso.

---

## 2. Flujo de autenticación

### 2.1. Paso 1: Obtener token de acceso

```http
POST /api/v1/gateway/oauth/token
Content-Type: application/json
```

#### Request body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `grant_type` | string | Sí | Siempre `client_credentials` |
| `client_id` | string | Sí | Identificador del cliente |
| `client_secret` | string | Sí | Secreto del cliente |
| `scope` | string | No | Scopes separados por espacio. Si se omite, se otorgan todos los scopes del cliente. |

#### Ejemplo de request

```json
{
  "grant_type": "client_credentials",
  "client_id": "demo-client",
  "client_secret": "demo-secret-do-not-use-in-production",
  "scope": "seguridades:read accesos:validate"
}
```

#### Ejemplo de respuesta exitosa (200)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 600,
  "scope": "seguridades:read segregacion:read usuarios:read accesos:read accesos:validate"
}
```

> **Nota:** El token expira en **600 segundos (10 minutos)**. El cliente debe renovarlo antes de la expiración.

### 2.2. Paso 2: Consumir endpoints protegidos

Incluir el header en todas las peticiones protegidas:

```http
Authorization: Bearer <access_token>
```

### 2.3. Scopes disponibles

| Scope | Permiso |
|-------|---------|
| `seguridades:read` | Leer aplicaciones, módulos, programas, perfiles y controles |
| `segregacion:read` | Leer niveles y nodos de segregación |
| `usuarios:read` | Leer información de usuarios |
| `accesos:read` | Leer nodos, perfiles y roles asignados a un usuario |
| `accesos:validate` | Validar acceso a perfiles, programas y roles |
| `admin:gateway` | Crear, listar, rotar y revocar clientes del gateway |

---

## 3. Endpoints públicos

### 3.1. Health check

```http
GET /api/v1/gateway/health
```

#### Respuesta exitosa (200)

```json
{
  "status": "ok",
  "ts": "2026-08-06T01:42:55.808Z"
}
```

### 3.2. OpenAPI spec

```http
GET /api/v1/gateway/openapi.json
```

Devuelve la especificación OpenAPI 3.0 del gateway en formato JSON.

### 3.3. Swagger UI

```http
GET /api/v1/gateway/docs
```

Documentación interactiva renderizada con Swagger UI.

---

## 4. Seguridades (`seguridades:read`)

### 4.1. Listar aplicaciones activas

```http
GET /api/v1/gateway/aplicaciones
Authorization: Bearer <token>
```

#### Respuesta exitosa (200)

```json
[
  {
    "id": "app_1",
    "codigo": "APP-SAP",
    "nombre": "SAP ERP",
    "descripcion": "Sistema ERP corporativo",
    "nodoIds": ["nod_emp_1"]
  }
]
```

### 4.2. Obtener aplicación por código

```http
GET /api/v1/gateway/aplicaciones/:codigo
Authorization: Bearer <token>
```

#### Parámetros de ruta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `codigo` | string | Código de la aplicación (case-insensitive) |

#### Respuesta exitosa (200)

```json
{
  "id": "app_1",
  "codigo": "APP-SAP",
  "nombre": "SAP ERP",
  "descripcion": "Sistema ERP corporativo",
  "nodoIds": ["nod_emp_1"],
  "estado": "ACTIVO",
  "createdAt": "2026-04-28T00:54:40.340Z"
}
```

#### Respuesta error (404)

```json
{
  "error": "Aplicación no encontrada."
}
```

### 4.3. Listar módulos

```http
GET /api/v1/gateway/modulos?appCodigo=APP-SAP
Authorization: Bearer <token>
```

#### Query parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `appCodigo` | string | No | Filtrar por código de aplicación (case-insensitive) |

#### Respuesta exitosa (200)

```json
[
  {
    "id": "mod_1",
    "codigo": "MOD-FI",
    "nombre": "Finanzas",
    "appCodigo": "APP-SAP",
    "estado": "ACTIVO",
    "createdAt": "2026-04-29T00:54:40.340Z"
  }
]
```

### 4.4. Listar programas

```http
GET /api/v1/gateway/programas?modCodigo=MOD-FI&appCodigo=APP-SAP
Authorization: Bearer <token>
```

#### Query parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `modCodigo` | string | No | Filtrar por código de módulo |
| `appCodigo` | string | No | Filtrar por código de aplicación |

#### Respuesta exitosa (200)

```json
[
  {
    "id": "prg_1",
    "codigo": "PRG-FI-DOCS",
    "nombre": "Documentos contables",
    "modCodigo": "MOD-FI",
    "tipo": "TRANSACCIONAL",
    "estado": "ACTIVO",
    "createdAt": "2026-05-01T00:54:40.340Z"
  }
]
```

### 4.5. Listar perfiles

```http
GET /api/v1/gateway/perfiles?appCodigo=APP-SAP
Authorization: Bearer <token>
```

#### Query parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `appCodigo` | string | No | Filtrar perfiles que contengan programas de la aplicación indicada |

#### Respuesta exitosa (200)

```json
[
  {
    "id": "seg_perf_1",
    "codigo": "PERF-FI-VIS",
    "nombre": "FI Visualizador",
    "descripcion": "Visualización de documentos contables.",
    "programas": [
      {
        "prgCodigo": "PRG-FI-DOCS",
        "nuevo": false,
        "modificar": false,
        "anular": false,
        "procesar": false,
        "imprimir": true,
        "consultar": true
      }
    ],
    "estado": "ACTIVO",
    "createdAt": "2026-05-28T00:54:40.340Z"
  }
]
```

### 4.6. Obtener perfil por código

```http
GET /api/v1/gateway/perfiles/:codigo
Authorization: Bearer <token>
```

#### Parámetros de ruta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `codigo` | string | Código del perfil (case-insensitive) |

#### Respuesta exitosa (200)

```json
{
  "id": "seg_perf_1",
  "codigo": "PERF-FI-VIS",
  "nombre": "FI Visualizador",
  "descripcion": "Visualización de documentos contables.",
  "programas": [...],
  "estado": "ACTIVO",
  "createdAt": "2026-05-28T00:54:40.340Z"
}
```

#### Respuesta error (404)

```json
{
  "error": "Perfil no encontrado."
}
```

### 4.7. Listar controles

```http
GET /api/v1/gateway/controles?prgCodigo=PRG-FI-DOCS
Authorization: Bearer <token>
```

#### Query parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `prgCodigo` | string | No | Filtrar por código de programa |

#### Respuesta exitosa (200)

```json
[
  {
    "id": "ctrl_1",
    "codigo": "CTRL-FI-DOCS-APROB",
    "nombre": "Aprobación de documentos",
    "prgCodigo": "PRG-FI-DOCS",
    "estado": "ACTIVO"
  }
]
```

---

## 5. Segregación (`segregacion:read`)

### 5.1. Listar niveles de segregación

```http
GET /api/v1/gateway/niveles-segregacion
Authorization: Bearer <token>
```

#### Respuesta exitosa (200)

```json
[
  {
    "id": "niv_emp",
    "codigo": "EMP",
    "nombre": "Empresa",
    "orden": 1,
    "estado": "ACTIVO",
    "createdAt": "2026-04-28T00:54:40.340Z"
  },
  {
    "id": "niv_suc",
    "codigo": "SUC",
    "nombre": "Sucursal",
    "orden": 2,
    "estado": "ACTIVO",
    "createdAt": "2026-04-28T00:54:40.340Z"
  },
  {
    "id": "niv_pv",
    "codigo": "PV",
    "nombre": "Punto de Venta",
    "orden": 3,
    "estado": "ACTIVO",
    "createdAt": "2026-04-28T00:54:40.340Z"
  }
]
```

### 5.2. Listar nodos de segregación

```http
GET /api/v1/gateway/nodos-segregacion?nivelId=niv_suc
Authorization: Bearer <token>
```

#### Query parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `nivelId` | string | No | Filtrar por identificador del nivel |

#### Respuesta exitosa (200)

```json
[
  {
    "id": "nod_suc_1",
    "codigo": "SUC-GYE-01",
    "nombre": "Matriz Guayaquil",
    "nivelId": "niv_suc",
    "padreId": "nod_emp_1",
    "estado": "ACTIVO",
    "createdAt": "2026-05-08T00:54:40.340Z"
  }
]
```

### 5.3. Obtener árbol de nodos de segregación

```http
GET /api/v1/gateway/nodos-segregacion/arbol
Authorization: Bearer <token>
```

#### Respuesta exitosa (200)

```json
{
  "niveles": [
    { "id": "niv_emp", "codigo": "EMP", "nombre": "Empresa", "orden": 1 }
  ],
  "arbol": [
    {
      "id": "nod_emp_1",
      "codigo": "EMP-001",
      "nombre": "Reybanpac",
      "nivelId": "niv_emp",
      "padreId": null,
      "estado": "ACTIVO",
      "children": [
        {
          "id": "nod_suc_1",
          "codigo": "SUC-GYE-01",
          "nombre": "Matriz Guayaquil",
          "nivelId": "niv_suc",
          "padreId": "nod_emp_1",
          "estado": "ACTIVO",
          "children": []
        }
      ]
    }
  ]
}
```

### 5.4. Obtener nodo por ID

```http
GET /api/v1/gateway/nodos-segregacion/:id
Authorization: Bearer <token>
```

#### Parámetros de ruta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | Identificador del nodo |

#### Respuesta exitosa (200)

```json
{
  "id": "nod_suc_1",
  "codigo": "SUC-GYE-01",
  "nombre": "Matriz Guayaquil",
  "nivelId": "niv_suc",
  "padreId": "nod_emp_1",
  "estado": "ACTIVO",
  "createdAt": "2026-05-08T00:54:40.340Z"
}
```

#### Respuesta error (404)

```json
{
  "error": "Nodo no encontrado."
}
```

---

## 6. Usuarios (`usuarios:read`)

### 6.1. Listar usuarios

```http
GET /api/v1/gateway/usuarios?type=CLIENTE_FINAL&source=LDAP
Authorization: Bearer <token>
```

#### Query parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `type` | string | No | Filtrar por tipo: `EMPLEADO`, `CLIENTE_FINAL`, `CONTRATISTA`, `EXTERNO` |
| `source` | string | No | Filtrar por origen: `LOCAL`, `LDAP`, `AZURE` |

#### Respuesta exitosa (200)

```json
[
  {
    "id": "u_ldap_001",
    "username": "jlopez001",
    "firstName": "Juan",
    "lastName": "López",
    "email": "jlopez001@reybanpac.com",
    "type": "CLIENTE_FINAL",
    "source": "LDAP",
    "nodoIds": ["nod_emp_1"],
    "perfilCodigos": [],
    "roleIds": []
  }
]
```

### 6.2. Obtener usuario por username

```http
GET /api/v1/gateway/usuarios/:username
Authorization: Bearer <token>
```

#### Parámetros de ruta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `username` | string | Nombre de usuario único |

#### Respuesta exitosa (200)

```json
{
  "id": "u_ldap_001",
  "username": "jlopez001",
  "firstName": "Juan",
  "lastName": "López",
  "email": "jlopez001@reybanpac.com",
  "type": "CLIENTE_FINAL",
  "source": "LDAP",
  "status": "ACTIVE",
  "nodoIds": ["nod_emp_1"],
  "perfilCodigos": ["PERF-FI-VIS"],
  "roleIds": ["role_1"]
}
```

#### Respuesta error (404)

```json
{
  "error": "Usuario no encontrado."
}
```

---

## 7. Accesos (`accesos:read`)

### 7.1. Listar nodos asignados a un usuario

```http
GET /api/v1/gateway/usuarios/:username/nodos
Authorization: Bearer <token>
```

#### Respuesta exitosa (200)

```json
[
  {
    "id": "nod_emp_1",
    "codigo": "EMP-001",
    "nombre": "Reybanpac",
    "nivelId": "niv_emp",
    "padreId": null,
    "estado": "ACTIVO"
  }
]
```

### 7.2. Listar perfiles asignados a un usuario

```http
GET /api/v1/gateway/usuarios/:username/perfiles
Authorization: Bearer <token>
```

#### Respuesta exitosa (200)

```json
[
  {
    "id": "seg_perf_1",
    "codigo": "PERF-FI-VIS",
    "nombre": "FI Visualizador",
    "programas": [...]
  }
]
```

### 7.3. Listar roles efectivos de un usuario

```http
GET /api/v1/gateway/usuarios/:username/roles
Authorization: Bearer <token>
```

#### Respuesta exitosa (200)

```json
[
  {
    "id": "role_1",
    "name": "Administrador",
    "description": "Acceso total",
    "permissions": ["users:read", "users:write"]
  }
]
```

---

## 8. Validaciones en runtime (`accesos:validate`)

### 8.1. Validar perfil para un usuario

```http
POST /api/v1/gateway/validate/perfil
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `username` | string | Sí | Nombre de usuario |
| `perfilCodigo` | string | Sí | Código del perfil |
| `nodoCodigo` | string | No | Código del nodo sobre el que se valida (opcional) |

#### Ejemplo de request

```json
{
  "username": "jlopez001",
  "perfilCodigo": "PERF-FI-VIS",
  "nodoCodigo": "EMP-001"
}
```

#### Respuesta exitosa (200)

```json
{
  "allowed": true,
  "username": "jlopez001",
  "perfilCodigo": "PERF-FI-VIS",
  "nodoCodigo": "EMP-001",
  "motivo": "Usuario tiene perfil asignado y nodo está en la cadena de acceso.",
  "requestedAt": "2026-08-06T01:43:55.537Z"
}
```

### 8.2. Validar programa para un usuario

```http
POST /api/v1/gateway/validate/programa
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `username` | string | Sí | Nombre de usuario |
| `programaCodigo` | string | Sí | Código del programa |
| `nodoCodigo` | string | No | Código del nodo (opcional) |

#### Ejemplo de request

```json
{
  "username": "jlopez001",
  "programaCodigo": "PRG-FI-DOCS",
  "nodoCodigo": "EMP-001"
}
```

#### Respuesta exitosa (200)

```json
{
  "allowed": true,
  "username": "jlopez001",
  "programaCodigo": "PRG-FI-DOCS",
  "nodoCodigo": "EMP-001",
  "motivo": "El usuario tiene un perfil que incluye el programa.",
  "requestedAt": "2026-08-06T01:43:55.537Z"
}
```

### 8.3. Validar rol para un usuario

```http
POST /api/v1/gateway/validate/rol
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `username` | string | Sí | Nombre de usuario |
| `rolId` | string | Sí | Identificador del rol |

#### Ejemplo de request

```json
{
  "username": "jlopez001",
  "rolId": "role_1"
}
```

#### Respuesta exitosa (200)

```json
{
  "allowed": true,
  "username": "jlopez001",
  "rolId": "role_1",
  "motivo": "Usuario tiene rol asignado.",
  "requestedAt": "2026-08-06T01:43:55.537Z"
}
```

---

## 9. Administración de clientes (`admin:gateway`)

> Estos endpoints requieren el scope `admin:gateway`. No están disponibles para el cliente demo.

### 9.1. Listar clientes

```http
GET /api/v1/gateway/admin/clients
Authorization: Bearer <token>
```

#### Respuesta exitosa (200)

```json
[
  {
    "id": "gw_client_1001",
    "name": "Demo Client",
    "clientId": "demo-client",
    "scopes": ["seguridades:read", "accesos:validate"],
    "allowedIps": [],
    "rateLimit": 1000,
    "isActive": true,
    "createdAt": "2026-08-05T12:00:00Z",
    "lastUsedAt": "2026-08-06T01:30:00Z"
  }
]
```

> **Nota:** El campo `clientSecretHash` nunca se devuelve en las respuestas.

### 9.2. Crear cliente

```http
POST /api/v1/gateway/admin/clients
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | string | Sí | Nombre descriptivo del cliente |
| `scopes` | string[] | Sí | Scopes permitidos |
| `allowedIps` | string[] | No | IPs o CIDRs permitidos |
| `rateLimit` | number | No | Límite de requests por hora (default: 1000) |

#### Ejemplo de request

```json
{
  "name": "Portal Externo",
  "scopes": ["seguridades:read", "accesos:validate"],
  "allowedIps": ["192.168.1.0/24"],
  "rateLimit": 5000
}
```

#### Respuesta exitosa (201)

```json
{
  "id": "gw_client_1002",
  "name": "Portal Externo",
  "clientId": "client_abc123",
  "clientSecret": "secret-def456",
  "scopes": ["seguridades:read", "accesos:validate"],
  "allowedIps": ["192.168.1.0/24"],
  "rateLimit": 5000,
  "isActive": true,
  "createdAt": "2026-08-06T01:45:00Z"
}
```

> **Importante:** El `clientSecret` solo se devuelve al crear el cliente. No se puede recuperar después.

### 9.3. Rotar secreto de cliente

```http
POST /api/v1/gateway/admin/clients/:id/rotate-secret
Authorization: Bearer <token>
```

#### Respuesta exitosa (200)

```json
{
  "id": "gw_client_1002",
  "clientId": "client_abc123",
  "clientSecret": "new-secret-xyz789"
}
```

### 9.4. Revocar cliente

```http
DELETE /api/v1/gateway/admin/clients/:id
Authorization: Bearer <token>
```

#### Respuesta exitosa (204)

Sin contenido.

---

## 10. Errores comunes

### 10.1. Autenticación

#### 401 — Token inválido o ausente

```json
{
  "error": "invalid_token",
  "error_description": "Missing or invalid Authorization header."
}
```

#### 401 — Cliente inválido (token endpoint)

```json
{
  "error": "invalid_client",
  "error_description": "Client credentials invalid, IP not allowed or scopes insufficient."
}
```

### 10.2. Autorización

#### 403 — Scope insuficiente

```json
{
  "error": "insufficient_scope",
  "error_description": "Required scope(s): accesos:validate."
}
```

### 10.3. Rate limiting

#### 429 — Too many requests

```json
{
  "error": "Too many requests, please try again later."
}
```

### 10.4. Recursos

#### 404 — Recurso no encontrado

```json
{
  "error": "Usuario no encontrado."
}
```

### 10.5. Validación de datos

#### 400 — Datos inválidos

```json
{
  "error": "Datos inválidos.",
  "details": {
    "fieldErrors": {
      "username": ["Required"]
    }
  }
}
```

---

## 11. Rate limiting y headers

Cada cliente tiene un límite de **1000 requests/hora** por defecto. Los headers incluyen:

```http
RateLimit-Limit: 1000
RateLimit-Remaining: 998
RateLimit-Reset: 1691302800
```

El límite se aplica tanto al endpoint de token como a los endpoints protegidos.

---

## 12. Ejemplo completo con curl

### 12.1. Obtener token

```bash
curl -X POST http://localhost:4000/api/v1/gateway/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "demo-client",
    "client_secret": "demo-secret-do-not-use-in-production"
  }'
```

### 12.2. Listar perfiles

```bash
curl -X GET http://localhost:4000/api/v1/gateway/perfiles \
  -H "Authorization: Bearer <access_token>"
```

### 12.3. Validar acceso a un programa

```bash
curl -X POST http://localhost:4000/api/v1/gateway/validate/programa \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jlopez001",
    "programaCodigo": "PRG-FI-DOCS",
    "nodoCodigo": "EMP-001"
  }'
```

---

## 13. Consideraciones de seguridad

- **TLS obligatorio** en producción.
- **No exponer el `client_secret`** en repositorios ni logs.
- **Rotar el secreto** periódicamente usando `/admin/clients/:id/rotate-secret`.
- **Usar IP allowlist** cuando sea posible para restringir el origen de las peticiones.
- **En producción usar RS256**: configurar `GATEWAY_JWT_PRIVATE_KEY` y `GATEWAY_JWT_PUBLIC_KEY` con claves PEM.
- El modo de desarrollo usa HS256 fallback con `GATEWAY_JWT_FALLBACK_SECRET`.

---

## 14. Crear un cliente productivo

Se incluye un script CLI para generar clientes de forma segura:

```bash
cd backend
npx tsx scripts/create-gateway-client.ts "Portal Externo" "seguridades:read,accesos:validate"
```

El script genera un `client_id`, `client_secret` y un valor base64 listo para asignar a la variable de entorno `GATEWAY_CLIENTS`.

---

## 15. Referencias

- **Plan de implementación:** `docs/API-GATEWAY-PLAN.md`
- **Rutas del backend CAM:** `docs/BACKEND-API-ROUTES.md`
- **Swagger UI:** `http://localhost:4000/api/v1/gateway/docs`
- **OpenAPI JSON:** `http://localhost:4000/api/v1/gateway/openapi.json`
