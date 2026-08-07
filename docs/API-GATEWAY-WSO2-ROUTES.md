# API Gateway — Mapeo de rutas para WSO2 API Manager

> **Propósito:** Documento orientado a arquitectos/devops para publicar las rutas del API Gateway de CAM a través de **WSO2 API Manager**, asumiendo que la SPA Angular y el backend se despliegan en **Kubernetes**.
>
> **Alcance:** Solo documentación. No se modifica ningún archivo del proyecto CAM.

---

## 1. Arquitectura de referencia

```text
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────────┐
│   Cliente       │      │  WSO2 API Manager    │      │  Kubernetes         │
│   Externo       │─────▶│  (Publisher/Store)   │─────▶│  Namespace: cam     │
│                 │      │                      │      │                     │
└─────────────────┘      │  • OAuth2 / JWT      │      │  ┌───────────────┐   │
                         │  • Throttling        │      │  │ cam-spa       │   │
┌─────────────────┐      │  • Scopes            │      │  │ (Angular)     │   │
│   SPA Angular   │      │  • Analytics         │      │  └───────────────┘   │
│   (en K8s)      │─────▶│                      │      │                      │
└─────────────────┘      └──────────────────────┘      │  ┌───────────────┐   │
                                                       │  │ cam-backend   │   │
                                                       │  │ (Express)     │   │
                                                       │  └───────────────┘   │
                                                       └─────────────────────┘
```

### Endpoints de backend en Kubernetes

| Servicio | Namespace | Puerto | URL interna (desde WSO2) |
|----------|-----------|--------|--------------------------|
| `cam-backend` | `cam` | `4000` | `http://cam-backend.cam.svc.cluster.local:4000` |
| `cam-spa` | `cam` | `80` | `http://cam-spa.cam.svc.cluster.local` |

> WSO2 publicará únicamente el API Gateway (`/api/v1/gateway/*`). La consola CAM (`/api/*`) puede exponerse por otro API o por Ingress directo.

---

## 2. Configuración general del API en WSO2

| Propiedad | Valor recomendado |
|-----------|-------------------|
| **API Name** | `CAM Gateway API` |
| **Context** | `/cam-gateway` |
| **Version** | `v1` |
| **Base URL pública** | `https://api.reybanpac.com/cam-gateway/v1` |
| **Backend endpoint** | `http://cam-backend.cam.svc.cluster.local:4000/api/v1/gateway` |
| **Transport** | HTTPS (público), HTTP (interno a backend) |
| **API Category** | `Seguridad`, `Autorización` |

### Rutas base

```text
Pública:  https://api.reybanpac.com/cam-gateway/v1
Backend:  http://cam-backend.cam.svc.cluster.local:4000/api/v1/gateway
```

Por tanto, una petición a:

```text
GET https://api.reybanpac.com/cam-gateway/v1/aplicaciones
```

se reescribe y envía al backend como:

```text
GET http://cam-backend.cam.svc.cluster.local:4000/api/v1/gateway/aplicaciones
```

---

## 3. Scopes de WSO2

Los scopes del API Gateway se mapean 1:1 como **WSO2 API Scopes** vinculados a roles de consumidor.

| Scope | Descripción | Rol de consumidor sugerido |
|-------|-------------|----------------------------|
| `seguridades:read` | Leer aplicaciones, módulos, programas, perfiles y controles | `cam_reader` |
| `segregacion:read` | Leer niveles y nodos de segregación | `cam_reader` |
| `usuarios:read` | Leer información de usuarios | `cam_reader` |
| `accesos:read` | Leer nodos, perfiles y roles de usuarios | `cam_access_operator` |
| `accesos:validate` | Validar acceso a perfiles, programas y roles | `cam_validator` |
| `auditoria:write` | Enviar logs de auditoría | `cam_audit_publisher` |
| `admin:gateway` | Administrar clientes del gateway | `cam_gateway_admin` |

### Configuración de scope en WSO2

Cada scope se registra en **WSO2 Publisher → API → Subscriptions → Scopes**:

```json
{
  "name": "seguridades:read",
  "description": "Permite leer la configuración de seguridades",
  "bindings": {
    "type": "role",
    "values": ["cam_reader"]
  }
}
```

---

## 4. Mapeo de recursos (rutas) en WSO2

### 4.1. Autenticación

| Método | Recurso WSO2 | Backend (rewrite) | Scope | Throttling |
|--------|--------------|-------------------|-------|------------|
| `POST` | `/oauth/token` | `/oauth/token` | — (client credentials) | `Unlimited` o `TokenEndpoint` |

### 4.2. Health y documentación

| Método | Recurso WSO2 | Backend (rewrite) | Scope | Throttling |
|--------|--------------|-------------------|-------|------------|
| `GET` | `/health` | `/health` | — | `Unlimited` |
| `GET` | `/openapi.json` | `/openapi.json` | — | `Unlimited` |
| `GET` | `/docs` | `/docs` | — | `Unlimited` |

### 4.3. Seguridades (`seguridades:read`)

| Método | Recurso WSO2 | Backend (rewrite) | Scope | Throttling |
|--------|--------------|-------------------|-------|------------|
| `GET` | `/aplicaciones` | `/aplicaciones` | `seguridades:read` | `1000PerHour` |
| `GET` | `/aplicaciones/{codigo}` | `/aplicaciones/{codigo}` | `seguridades:read` | `1000PerHour` |
| `GET` | `/aplicaciones/{codigo}/completo` | `/aplicaciones/{codigo}/completo` | `seguridades:read` | `1000PerHour` |
| `GET` | `/aplicaciones/{codigo}/orden` | `/aplicaciones/{codigo}/orden` | `seguridades:read` | `1000PerHour` |
| `GET` | `/modulos` | `/modulos` | `seguridades:read` | `1000PerHour` |
| `GET` | `/programas` | `/programas` | `seguridades:read` | `1000PerHour` |
| `GET` | `/perfiles` | `/perfiles` | `seguridades:read` | `1000PerHour` |
| `GET` | `/perfiles/{codigo}` | `/perfiles/{codigo}` | `seguridades:read` | `1000PerHour` |
| `GET` | `/controles` | `/controles` | `seguridades:read` | `1000PerHour` |

### 4.4. Segregación (`segregacion:read`)

| Método | Recurso WSO2 | Backend (rewrite) | Scope | Throttling |
|--------|--------------|-------------------|-------|------------|
| `GET` | `/niveles-segregacion` | `/niveles-segregacion` | `segregacion:read` | `1000PerHour` |
| `GET` | `/nodos-segregacion` | `/nodos-segregacion` | `segregacion:read` | `1000PerHour` |
| `GET` | `/nodos-segregacion/arbol` | `/nodos-segregacion/arbol` | `segregacion:read` | `1000PerHour` |
| `GET` | `/nodos-segregacion/{id}` | `/nodos-segregacion/{id}` | `segregacion:read` | `1000PerHour` |

### 4.5. Usuarios (`usuarios:read`)

| Método | Recurso WSO2 | Backend (rewrite) | Scope | Throttling |
|--------|--------------|-------------------|-------|------------|
| `GET` | `/usuarios` | `/usuarios` | `usuarios:read` | `1000PerHour` |
| `GET` | `/usuarios/{username}` | `/usuarios/{username}` | `usuarios:read` | `1000PerHour` |

### 4.6. Accesos (`accesos:read`)

| Método | Recurso WSO2 | Backend (rewrite) | Scope | Throttling |
|--------|--------------|-------------------|-------|------------|
| `GET` | `/usuarios/{username}/nodos` | `/usuarios/{username}/nodos` | `accesos:read` | `1000PerHour` |
| `GET` | `/usuarios/{username}/perfiles` | `/usuarios/{username}/perfiles` | `accesos:read` | `1000PerHour` |
| `GET` | `/usuarios/{username}/roles` | `/usuarios/{username}/roles` | `accesos:read` | `1000PerHour` |

### 4.7. Validaciones (`accesos:validate`)

| Método | Recurso WSO2 | Backend (rewrite) | Scope | Throttling |
|--------|--------------|-------------------|-------|------------|
| `POST` | `/validate/perfil` | `/validate/perfil` | `accesos:validate` | `2000PerHour` |
| `POST` | `/validate/programa` | `/validate/programa` | `accesos:validate` | `2000PerHour` |
| `POST` | `/validate/rol` | `/validate/rol` | `accesos:validate` | `2000PerHour` |

### 4.8. Auditoría (`auditoria:write`)

| Método | Recurso WSO2 | Backend (rewrite) | Scope | Throttling |
|--------|--------------|-------------------|-------|------------|
| `POST` | `/audit/logs` | `/audit/logs` | `auditoria:write` | `5000PerHour` |

### 4.9. Administración de clientes (`admin:gateway`)

> Montado bajo `/api/v1/gateway/admin` en el backend. En WSO2 se puede publicar como recursos adicionales del mismo API o como un API separado restringido.

| Método | Recurso WSO2 | Backend (rewrite) | Scope | Throttling |
|--------|--------------|-------------------|-------|------------|
| `GET` | `/admin/clients` | `/admin/clients` | `admin:gateway` | `500PerHour` |
| `POST` | `/admin/clients` | `/admin/clients` | `admin:gateway` | `500PerHour` |
| `DELETE` | `/admin/clients/{id}` | `/admin/clients/{id}` | `admin:gateway` | `500PerHour` |
| `POST` | `/admin/clients/{id}/rotate-secret` | `/admin/clients/{id}/rotate-secret` | `admin:gateway` | `500PerHour` |

---

## 5. Políticas de throttling recomendadas

| Nivel | Política | Descripción |
|-------|----------|-------------|
| API | `10000PerHour` | Límite agregado por aplicación suscrita. |
| Resource (default) | `1000PerHour` | Lectura de configuración. |
| Resource (validate) | `2000PerHour` | Validaciones en runtime, mayor frecuencia esperada. |
| Resource (audit) | `5000PerHour` | Ingesta de logs, potencialmente alto volumen. |
| Resource (admin) | `500PerHour` | Operaciones administrativas poco frecuentes. |
| Token endpoint | `Unlimited` o `500PerMin` | Depende de la estrategia de caché de tokens en el cliente. |

> WSO2 permite aplicar **Application-level throttling** y **Subscription-level throttling**. Se recomienda activar ambos.

---

## 6. Seguridad en WSO2

### 6.1. OAuth2 / JWT

WSO2 API Manager puede actuar como:

1. **Key Manager delegado:** El cliente obtiene token de WSO2 (`/token`) y WSO2 valida el JWT antes de reenviar al backend.
2. **Passthrough:** WSO2 valida el token y lo reenvía al backend CAM para que este haga la validación final.

Para este diseño se recomienda la **opción 2** (passthrough) porque el backend CAM ya tiene implementada la validación JWT con scopes.

### 6.2. Configuración de seguridad por recurso

| Recurso | Seguridad | Descripción |
|---------|-----------|-------------|
| `/oauth/token` | OAuth2 (client credentials) | WSO2 genera/valida token. |
| `/health`, `/openapi.json`, `/docs` | None | Públicos. |
| Resto | OAuth2 + Scope | WSO2 valida token y scope. |

### 6.3. Transport security

| Entorno | Protocolo | Certificado |
|---------|-----------|-------------|
| Público | HTTPS | Certificado wildcard de `*.reybanpac.com` |
| Backend (K8s) | HTTP | TLS interno opcional (service mesh) |

---

## 7. Ejemplo de definición OpenAPI para importar en WSO2

```yaml
openapi: 3.0.0
info:
  title: CAM Gateway API
  version: v1
  description: API Gateway para consumo de configuración de autorización y segregación.
servers:
  - url: https://api.reybanpac.com/cam-gateway/v1
paths:
  /oauth/token:
    post:
      summary: Obtener token OAuth2
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                grant_type: { type: string, example: client_credentials }
                client_id: { type: string }
                client_secret: { type: string }
                scope: { type: string }
      responses:
        '200':
          description: Token JWT

  /health:
    get:
      summary: Health check
      security: []
      responses:
        '200': { description: OK }

  /aplicaciones:
    get:
      summary: Listar aplicaciones
      security:
        - OAuth2: [seguridades:read]
      responses:
        '200': { description: Lista de aplicaciones }

  /aplicaciones/{codigo}/completo:
    get:
      summary: Jerarquía completa de una aplicación
      security:
        - OAuth2: [seguridades:read]
      parameters:
        - name: codigo
          in: path
          required: true
          schema: { type: string }
      responses:
        '200': { description: Aplicación con módulos, programas y controles }

  /aplicaciones/{codigo}/orden:
    get:
      summary: Jerarquía ordenada de una aplicación
      security:
        - OAuth2: [seguridades:read]
      parameters:
        - name: codigo
          in: path
          required: true
          schema: { type: string }
      responses:
        '200': { description: Aplicación ordenada }

  /validate/perfil:
    post:
      summary: Validar perfil para un usuario
      security:
        - OAuth2: [accesos:validate]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username: { type: string }
                perfilCodigo: { type: string }
                nodoCodigo: { type: string }
      responses:
        '200': { description: Resultado de validación }

  /audit/logs:
    post:
      summary: Enviar logs de auditoría
      security:
        - OAuth2: [auditoria:write]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/AuditLog'
                - type: array
                  items:
                    $ref: '#/components/schemas/AuditLog'
      responses:
        '201': { description: Logs registrados }

components:
  securitySchemes:
    OAuth2:
      type: oauth2
      flows:
        clientCredentials:
          tokenUrl: https://api.reybanpac.com/cam-gateway/v1/oauth/token
          scopes:
            seguridades:read: Leer seguridades
            segregacion:read: Leer segregación
            usuarios:read: Leer usuarios
            accesos:read: Leer accesos
            accesos:validate: Validar accesos
            auditoria:write: Enviar logs de auditoría
            admin:gateway: Administrar clientes del gateway

  schemas:
    AuditLog:
      type: object
      required: [actor, action, entityType, detail]
      properties:
        actor: { type: string }
        action: { type: string }
        entityType: { type: string }
        entityId: { type: string }
        detail: { type: string }
        timestamp: { type: string, format: date-time }
```

---

## 8. Consideraciones para Kubernetes

### 8.1. Service del backend

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cam-backend
  namespace: cam
spec:
  selector:
    app: cam-backend
  ports:
    - port: 4000
      targetPort: 4000
```

### 8.2. WSO2 endpoint configuration

```text
Production endpoint: http://cam-backend.cam.svc.cluster.local:4000/api/v1/gateway
Sandbox endpoint:    http://cam-backend-staging.cam.svc.cluster.local:4000/api/v1/gateway
```

### 8.3. Ingress para la API pública

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cam-gateway-ingress
  namespace: cam
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
    - hosts:
        - api.reybanpac.com
      secretName: api-reybanpac-tls
  rules:
    - host: api.reybanpac.com
      http:
        paths:
          - path: /cam-gateway
            pathType: Prefix
            backend:
              service:
                name: wso2-gateway
                port:
                  number: 8243
```

> El Ingress apunta al WSO2 Gateway (puerto 8243), no directamente al backend. WSO2 se encarga de enrutar al servicio de backend.

---

## 9. Resumen de rutas por scope

| Scope | Rutas WSO2 |
|-------|------------|
| Público | `/oauth/token`, `/health`, `/openapi.json`, `/docs` |
| `seguridades:read` | `/aplicaciones*`, `/modulos`, `/programas`, `/perfiles*`, `/controles` |
| `segregacion:read` | `/niveles-segregacion`, `/nodos-segregacion*` |
| `usuarios:read` | `/usuarios`, `/usuarios/{username}` |
| `accesos:read` | `/usuarios/{username}/nodos`, `/usuarios/{username}/perfiles`, `/usuarios/{username}/roles` |
| `accesos:validate` | `/validate/perfil`, `/validate/programa`, `/validate/rol` |
| `auditoria:write` | `/audit/logs` |
| `admin:gateway` | `/admin/clients*` |

---

## 10. Próximos pasos (fuera de este proyecto)

1. Definir si WSO2 generará los tokens JWT o si delegará la generación al backend CAM.
2. Configurar el Key Manager de WSO2 con el client registry del backend CAM.
3. Definir políticas de throttling por entorno (dev, staging, prod).
4. Configurar monitoreo y alertas de latencia/error en WSO2 Analytics.
5. Evaluar el uso de WSO2 Micro Integrator para transformaciones adicionales si son necesarias.
