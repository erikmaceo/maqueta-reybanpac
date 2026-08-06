# Plan — API Gateway para Consumo de Configuración por Terceros

> **Estado:** Implementado (Opción A).
> 
> **Objetivo:** Exponer de forma segura la configuración de aplicaciones, módulos, programas, perfiles, accesos por usuario, roles, permisos y segregación gestionados en CAM, para que aplicaciones terceras puedan consumirla y validar accesos en runtime.

---

## 1. Alcance y objetivo del gateway

### 1.1. ¿Qué se expondrá?

La API Gateway servirá a aplicaciones externas (`client apps`) para consultar, principalmente en modo **solo lectura**, la configuración de autorización y segregación centralizada:

- **Seguridades (aplicaciones, módulos, programas, perfiles, controles)**
- **Segregación (niveles, nodos, atributos)**
- **Usuarios y accesos efectivos** (roles, grants, perfiles, nodos asignados)
- **Validación de acceso en runtime**: ¿tiene el usuario X el perfil Y sobre el nodo Z? ¿Puede ejecutar el programa P?

### 1.2. ¿Qué NO se expondrá?

- Mutaciones de catálogos (crear/editar/eliminar apps, módulos, perfiles, etc.) seguirán siendo solo por la consola CAM.
- Datos sensibles de autenticación interna (passwords, tokens de sesión de la consola).
- Logs de auditoría completa de la consola (solo se reportan eventos propios del gateway).

---

## 2. Arquitectura propuesta

### 2.1. Opción A: Módulo separado dentro del backend actual (recomendada)

Crear un nuevo namespace de rutas bajo `/api/v1/gateway/*` dentro del mismo backend Express. Es la opción más rápida y mantiene consistencia con el modelo de datos actual.

```text
┌─────────────────┐      ┌────────────────────────────────────┐      ┌─────────────────┐
│   Aplicación    │      │        Backend CAM (Express)       │      │   Consumidores  │
│    Angular      │◄────►│  /api/* (consola)                │      │   externos      │
│   (consola)     │      │  /api/v1/gateway/* (gateway)     │◄────►│   (API Keys)    │
└─────────────────┘      │  store en memoria / BD futura    │      └─────────────────┘
                           └────────────────────────────────────┘
```

### 2.2. Opción B: Servicio independiente (más escalable)

Desplegar un segundo contenedor `cam-gateway` que exponga `/api/v1/*` y se comunique con el backend CAM por una API interna. Más limpio para producción, pero requiere más infraestructura.

> **Recomendación:** Iniciar con **Opción A** para prototipar y validar. Migrar a **Opción B** cuando el tráfico externo justifique separar el servicio.

---

## 3. Modelo de seguridad

### 3.1. Autenticación de clientes externos

- **OAuth2 Client Credentials**: cada cliente tercero recibe un `client_id` + `client_secret` generados criptográficamente.
- Se solicita un token JWT en `POST /api/v1/gateway/oauth/token` y se usa en el header `Authorization: Bearer <token>`.
- Tokens firmados con RS256 si se configuran `GATEWAY_JWT_PRIVATE_KEY` / `GATEWAY_JWT_PUBLIC_KEY`; HS256 de respaldo para desarrollo con `GATEWAY_JWT_FALLBACK_SECRET`.

### 3.2. No se reutilizará la sesión de la consola

Los clientes externos no usan `/api/auth/login` de la consola. El gateway tendrá su propio esquema de credenciales y su propia tabla/servicio de gestión de clientes.

### 3.3. Autorización por cliente

- Cada cliente estará asociado a scopes que limitan qué endpoints puede consumir:
  - `seguridades:read`
  - `segregacion:read`
  - `usuarios:read`
  - `accesos:read`
  - `accesos:validate`
  - `admin:gateway` (gestión de clientes)

### 3.4. Rate limiting

- Límite por cliente: **1000 requests/hora** por defecto, configurable por cliente en `rateLimit`.
- Uso de `express-rate-limit` con `client_id` extraído del token JWT como key generator.
- Headers de cuota: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

### 3.5. Transporte

- **TLS obligatorio** en producción.
- Headers de seguridad con `helmet`.
- CORS restrictivo: solo orígenes registrados por cliente.

### 3.6. IP allowlist (opcional)

- Cada cliente puede tener una lista de IPs/CIDRs permitidos para restringir aún más el origen de las peticiones.

---

## 4. Endpoints propuestos (v1)

### 4.1. Autenticación / gestión de clientes

> Los endpoints de administración requieren el scope `admin:gateway`.

| Método | Ruta | Descripción | Scope |
|--------|------|-------------|-------|
| POST | `/api/v1/gateway/oauth/token` | Obtener token JWT | Público (con credenciales) |
| POST | `/api/v1/gateway/admin/clients` | Crear cliente externo | `admin:gateway` |
| GET | `/api/v1/gateway/admin/clients` | Listar clientes | `admin:gateway` |
| DELETE | `/api/v1/gateway/admin/clients/:id` | Revocar cliente | `admin:gateway` |
| POST | `/api/v1/gateway/admin/clients/:id/rotate-secret` | Rotar secret | `admin:gateway` |

### 4.2. Configuración de seguridades

| Método | Ruta | Descripción | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/gateway/aplicaciones` | Lista aplicaciones activas | `seguridades:read` |
| GET | `/api/v1/gateway/aplicaciones/:codigo` | Detalle de aplicación | `seguridades:read` |
| GET | `/api/v1/gateway/modulos` | Lista módulos | `seguridades:read` |
| GET | `/api/v1/gateway/programas` | Lista programas | `seguridades:read` |
| GET | `/api/v1/gateway/perfiles` | Lista perfiles | `seguridades:read` |
| GET | `/api/v1/gateway/perfiles/:codigo` | Detalle de perfil con permisos | `seguridades:read` |
| GET | `/api/v1/gateway/controles` | Lista controles | `seguridades:read` |

### 4.3. Configuración de segregación

| Método | Ruta | Descripción | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/gateway/niveles-segregacion` | Niveles configurados | `segregacion:read` |
| GET | `/api/v1/gateway/nodos-segregacion` | Nodos de segregación | `segregacion:read` |
| GET | `/api/v1/gateway/nodos-segregacion/arbol` | Jerarquía completa | `segregacion:read` |
| GET | `/api/v1/gateway/nodos-segregacion/:id` | Detalle de nodo | `segregacion:read` |

### 4.4. Usuarios y accesos

| Método | Ruta | Descripción | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/gateway/usuarios` | Lista usuarios activos | `usuarios:read` |
| GET | `/api/v1/gateway/usuarios/:username` | Accesos de un usuario | `usuarios:read` |
| GET | `/api/v1/gateway/usuarios/:username/nodos` | Nodos asignados al usuario | `accesos:read` |
| GET | `/api/v1/gateway/usuarios/:username/perfiles` | Perfiles asignados al usuario | `accesos:read` |
| GET | `/api/v1/gateway/usuarios/:username/roles` | Roles efectivos del usuario | `accesos:read` |

### 4.5. Validación de acceso en runtime

| Método | Ruta | Descripción | Scope |
|--------|------|-------------|-------|
| POST | `/api/v1/gateway/validate/perfil` | Valida si un usuario tiene un perfil sobre un nodo | `accesos:validate` |
| POST | `/api/v1/gateway/validate/programa` | Valida si un usuario puede ejecutar un programa | `accesos:validate` |
| POST | `/api/v1/gateway/validate/rol` | Valida si un usuario tiene un rol asignado | `accesos:validate` |

### 4.6. Health / metadata

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/gateway/health` | Estado del gateway | Pública |
| GET | `/api/v1/gateway/openapi.json` | Especificación OpenAPI | Pública |

---

## 5. Formato de request/response

### 5.1. Request de validación de perfil

```json
POST /api/v1/gateway/validate/perfil
Headers: Authorization: Bearer <token>

{
  "username": "grobles",
  "perfilCodigo": "PERF-FI-VIS",
  "nodoCodigo": "EMP-001"
}
```

### 5.2. Response

```json
{
  "allowed": true,
  "username": "grobles",
  "perfilCodigo": "PERF-FI-VIS",
  "nodoCodigo": "EMP-001",
  "motivo": "Usuario tiene perfil asignado y nodo está en la cadena de acceso.",
  "requestedAt": "2026-08-05T12:00:00Z"
}
```

---

## 6. Tecnologías y librerías recomendadas

### 6.1. Backend (Express actual)

```json
{
  "helmet": "^7.1.0",
  "express-rate-limit": "^7.3.0",
  "cors": "^2.8.5",
  "zod": "^3.23.0",
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.0"
}
```

### 6.2. Opcional: Kong / Traefik (futuro)

Si se opta por un gateway corporativo, se puede delegar rate-limit, auth y logging a:
- **Kong Gateway** (plugins de rate-limiting, key-auth, ACL)
- **Traefik** con middlewares de rate-limit y forward-auth
- **Azure API Management** (más integrado con Entra ID)

---

## 7. Plan de implementación por fases

### Fase 1: OAuth2 Client Credentials + endpoints de solo lectura ✅

Completada. Los archivos clave son:

- `backend/src/types.ts` — tipos `GatewayClient`, `GatewayScope`, `GatewayTokenPayload`.
- `backend/src/store.ts` — almacenamiento `gatewayClients` y semilla vía `GATEWAY_CLIENTS`.
- `backend/src/gateway/auth.ts` — endpoint de token y middleware de autenticación/scope.
- `backend/src/gateway/rate-limit.ts` — rate limit por `client_id`.
- `backend/src/gateway/routes.ts` — endpoints de lectura bajo `/api/v1/gateway/*`.
- `backend/src/gateway/swagger.ts` — especificación OpenAPI.
- `backend/src/index.ts` — montaje de routers gateway.
- `backend/scripts/create-gateway-client.ts` — CLI para crear clientes.
- `docker-compose.yaml` — variables de entorno del gateway.

### Fase 2: Endpoints de validación en runtime ✅

Implementados:
- `POST /api/v1/gateway/validate/perfil`
- `POST /api/v1/gateway/validate/programa`
- `POST /api/v1/gateway/validate/rol`

> Caché en memoria: pendiente (opcional).

### Fase 3: Administración de clientes (parcialmente ✅)

Endpoints de admin implementados bajo `/api/v1/gateway/admin/*` y protegidos por `admin:gateway`. Pantalla en Angular: pendiente.

### Fase 4: Hardening y producción (pendiente)

1. Migrar almacenamiento de clientes a base de datos/Redis.
2. TLS obligatorio.
3. RS256 obligatorio en producción (eliminar HS256 fallback).
4. Monitoreo de latencia y uso por cliente.
5. Caché en memoria para validaciones de alto tráfico.

---

## 8. Consideraciones de seguridad adicionales

| Aspecto | Medida |
|---------|--------|
| Client Secrets | Almacenar solo hash (bcrypt). Mostrar el secret solo al crear. |
| Rotación | Endpoint `/api/v1/gateway/admin/clients/:id/rotate-secret`. |
| Revocación | Flag `isActive` + opción de eliminar. |
| IP allowlist | Lista `allowedIps` por cliente. |
| Logging | Registro de uso por cliente en `lastUsedAt`. |
| Rate limiting | `express-rate-limit` por `client_id`. |
| Timeouts | Validaciones en memoria, típicamente < 50 ms. |
| Versionado | `/api/v1/gateway/*` para evolución sin romper clientes. |
| Headers | `helmet` habilitado en todo el backend. |

---

## 9. Uso rápido

### 9.1. Cliente demo de desarrollo

```bash
curl -X POST http://localhost:4000/api/v1/gateway/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "demo-client",
    "client_secret": "demo-secret-do-not-use-in-production"
  }'
```

### 9.2. Crear un cliente productivo

```bash
cd backend
npx tsx scripts/create-gateway-client.ts "Mi App" "seguridades:read,accesos:validate"
```

Copiar el valor base64 en la variable de entorno `GATEWAY_CLIENTS`.

### 9.3. Documentación Swagger

Disponible en: `http://localhost:4000/api/v1/gateway/docs`

---

## 10. Próximos pasos

1. Crear pantalla de administración de clientes en Angular.
2. Agregar caché en memoria para validaciones de alto tráfico.
3. Sustituir JWT HS256 fallback por RS256 en producción.
4. Persistir clientes en base de datos en lugar de variable de entorno.
5. Migrar a servicio independiente (Opción B) si el tráfico externo lo justifica.
