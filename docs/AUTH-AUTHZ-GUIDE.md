# Guía de Autenticación y Autorización — Central Access Manager

> **Ámbito:** Recomendaciones de arquitectura, tecnologías y mejores prácticas para el backend de CAM, basadas en el estado actual del proyecto y en el stack Node.js / Express / TypeScript.
> 
> **Estado actual del backend:** Express 4 + TypeScript, datos en memoria (`store.ts`), sesiones opacas en `Map`, autenticación por contraseña en texto plano para usuarios `LOCAL`, integración LDAP para usuarios corporativos, y autorización RBAC simple basada en roles `isAdmin`.

---

## 1. Resumen ejecutivo

El backend actual es una **maqueta funcional** que demuestra el dominio de negocio, pero no está preparado para producción en los temas de seguridad. Esta guía propone una ruta de maduración en dos fases:

1. **Fase 1 — Fortalecer Express** sin cambiar el proveedor de identidad: JWT firmado asimétricamente, hashing de contraseñas, control de sesiones, rate-limiting y middleware de autorización más expresivo.
2. **Fase 2 — Integrar un Proveedor de Identidad (IdP)** corporativo vía OpenID Connect / OAuth 2.0, delegando autenticación, MFA, revocación y federación al directorio que ya existe en la organización.

> Recomendación estratégica: **no implementar un IAM propio desde cero**. El dominio de CAM es el gobierno de accesos a aplicaciones; la identidad debe delegarse en un servicio especializado.

---

## 2. Estado actual y riesgos identificados

| Componente | Implementación actual | Riesgo | Prioridad |
|------------|----------------------|--------|-----------|
| Contraseñas locales | Comparación en texto plano (`user.password !== password`) | Exposición total si se filtra la base de datos | Crítica |
| Sesiones | `Map<string, Session>` en memoria del proceso | Se pierden al reiniciar; no escala horizontalmente; no hay revocación centralizada | Crítica |
| Tokens | Token opaco de 64 bytes hexadecimales | Bien diseñado, pero requiere almacenamiento persistente para producción | Media |
| Autorización | `roleIds.some(... isAdmin)` | No soporta permisos granulares por recurso ni por acción | Media |
| Auditoría | Log en memoria con actor string | Riesgo de repudio; no está firmado ni persistido | Media |
| LDAP | Bind con credenciales hardcodeadas | Debe moverse a secretos de runtime | Media |
| Transporte | HTTP en `cors()` sin HSTS/helmet | Vulnerable a interceptación sin TLS | Alta |

---

## 3. Autenticación (¿quién eres?)

### 3.1. Opciones de estrategia

| Estrategia | Cuándo usarla | Complejidad | Recomendación para CAM |
|------------|---------------|-------------|------------------------|
| **JWT asimétrico propio** | Fase 1, mientras no haya IdP corporativo | Media | ✅ A corto plazo |
| **OpenID Connect (OIDC) con IdP corporativo** | Fase 2, integración con Azure AD / Keycloak / Okta | Baja-Media | ✅ Objetivo final |
| **LDAP directo como login** | Solo para validar credenciales corporativas | Media | ⚠️ Viable, pero limitado |
| **OAuth 2.0 + PKCE para SPAs** | Frontend Angular consumiendo API | Baja | ✅ Recomendado con OIDC |

### 3.2. JWT asimétrico (fase 1)

Si se mantiene autenticación propia, migrar de tokens opacos a **JWT firmados con RS256**:

- **Clave privada** en el servidor (un solo lugar que firma tokens).
- **Clave pública** expuesta en un endpoint `/api/auth/.well-known/jwks.json` para que otros servicios validen sin compartir secretos.
- Tiempo de vida corto para access tokens (**15 minutos**).
- Refresh tokens de larga vida almacenados en base de datos/hash (rotación obligatoria).

Librerías recomendadas:

```json
{
  "jsonwebtoken": "^9.0.0",
  "jwks-rsa": "^3.1.0",
  "bcrypt": "^5.1.0",
  "express-rate-limit": "^7.3.0",
  "helmet": "^7.1.0"
}
```

Ejemplo de flujo:

```text
POST /api/auth/login
  → Valida usuario + contraseña (bcrypt/argon2)
  → Emite access_token (JWT, 15 min) + refresh_token (opaque, hash SHA-256, BD, 7 días)
  → Frontend guarda access_token en memoria y refresh_token en httpOnly cookie

GET /api/roles
  → Authorization: Bearer <access_token>
  → Middleware valida firma RS256 con clave pública
  → Rechaza 401 si expiró; frontend usa refresh_token para renovar
```

### 3.3. Delegación OIDC (fase 2)

La opción más robusta para una empresa con directorio activo es delegar la autenticación a un **Identity Provider**:

- **Azure Entra ID** (Active Directory) — si la organización ya usa Microsoft.
- **Keycloak / Red Hat SSO** — open source, auto-alojado, buen fit con LDAP existente.
- **Okta / Auth0** — SaaS, rápido de implementar, costo asociado.
- **Authentik / FusionAuth** — alternativas open source modernas.

Ventajas:

- MFA/2FA, reset de contraseñas, lockout, logging de seguridad, consentimiento y federación listos.
- El backend solo valida tokens JWT del IdP y enriquece con roles locales.
- El frontend Angular usa `angular-oauth2-oidc` o `@auth0/auth0-angular`.

Flujo recomendado (Authorization Code + PKCE para SPAs):

```text
Navegador → IdP /authorize (PKCE)
Navegador ← IdP redirect con code
Frontend  → Backend /api/auth/callback (o directamente al IdP con PKCE)
Backend/IdP → Emite tokens
Frontend  → Llama /api/* con access_token del IdP
Backend   → Valida JWT del IdP + mapea a roles/permisos locales
```

Librerías Node.js:

```json
{
  "openid-client": "^5.6.0",
  "passport": "^0.7.0",
  "passport-openidconnect": "^0.1.1"
}
```

### 3.4. Política de contraseñas

- Nunca almacenar contraseñas en texto plano. Usar **Argon2id** o **bcrypt** con costo ≥ 12.
- Validar complejidad mínima (longitud ≥ 12, no en listas de contraseñas filtradas).
- Forzar cambio en primer login para usuarios `LOCAL` creados con password temporal.
- Implementar rate limiting en login: máximo 5 intentos por IP + usuario en 15 minutos.

### 3.5. Sesiones y revocación

| Aspecto | Recomendación |
|---------|---------------|
| Almacenamiento | Redis / PostgreSQL / base de datos persistente, no memoria de proceso |
| TTL | Access token 15 min; refresh token 7-30 días con rotación |
| Revocación | Endpoint `/api/auth/logout` invalida refresh token; cambio de password invalida todas las sesiones del usuario |
| Cierre por inactividad | 30 min en frontend; TTL de access token alinea la ventana máxima en backend |
| Compromiso de token | Lista de revocación (blocklist) de JWT por `jti` hasta su expiración, o tiempos de vida muy cortos |

---

## 4. Autorización (¿qué puedes hacer?)

### 4.1. Modelos de autorización

| Modelo | Descripción | Apto para CAM |
|--------|-------------|---------------|
| **RBAC** (Role-Based) | Usuario → Rol → Permisos | ✅ Base actual; suficiente para administración de consola |
| **ABAC** (Attribute-Based) | Decisiones basadas en atributos de usuario, recurso y entorno | ✅ Útil para reglas como "solo autorizador del rol X puede aprobar" |
| **ReBAC** (Relationship-Based) | Permisos basados en relaciones (Google Zanzibar) | ⚠️ Poderoso pero excesivo para esta etapa |
| **PBAC** (Policy-Based) | Políticas centralizadas evaluadas por motor (OPA, Casbin) | ✅ Recomendado a mediano plazo |

### 4.2. Autorización recomendada para CAM

Mantener **RBAC como modelo principal**, pero expresarlo de forma más rica:

```typescript
// En lugar de solo "isAdmin"
permissions = [
  { action: 'system:read',   resource: 'system', scope: 'global' },
  { action: 'system:create', resource: 'system', scope: 'global' },
  { action: 'user:read',     resource: 'user',   scope: 'global' },
  { action: 'request:approve', resource: 'request', scope: 'own' }, // solo si soy autorizador
]
```

Cada endpoint debería declarar qué permiso requiere:

```typescript
app.post('/api/roles', requireAuth, requirePermission('role:create'), createRole);
app.post('/api/requests/:id/approve', requireAuth, requirePermission('request:approve'), approveRequest);
```

### 4.3. Motor de políticas (opcional pero recomendado)

Para evitar dispersar lógica de autorización en middlewares, considerar:

- **Casbin** (`casbin`, `casbin-express`): ligero, modelos RBAC/ABAC, políticas en CSV/DB.
- **Open Policy Agent (OPA)** (`@open-policy-agent/wasm`): motor separado, ideal para microservicios, decisiones centralizadas.
- **Permissions-JS / AccessControl**: soluciones simples en memoria para prototipos.

Ejemplo Casbin:

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = r.sub == p.sub && keyMatch(r.obj, p.obj) && (r.act == p.act || p.act == '*')
```

```csv
# policy.csv
p, admin, *, *
p, authorizer, request:*, approve
p, authorizer, request:*, reject
p, operator, system, read
```

### 4.4. Autorización en el flujo de solicitudes (autorizador)

El flujo actual ya tiene buenas ideas (segregación de funciones, dueño técnico). Se recomienda formalizarlo como políticas:

```yaml
policies:
  - name: no-auto-approval
    description: Un usuario no puede aprobar una solicitud donde él es el beneficiario.
  - name: authorizer-or-admin
    description: Solo el dueño técnico del rol o un administrador global pueden aprobar/rechazar.
  - name: admin-only-local
    description: El rol administrador global solo puede asignarse a usuarios locales.
```

### 4.5. Autorización para APIs de seguridades y segregación

Las entidades de seguridades (`Aplicacion`, `Modulo`, `Programa`, `Perfil`) y segregación (`NivelSegregacion`, `NodoSegregacion`) deben protegerse con permisos específicos:

```typescript
const SEG_SECURITY_PERMISSIONS = {
  read:    'seg:read',
  create:  'seg:create',
  update:  'seg:update',
  delete:  'seg:delete',
  bulk:    'seg:bulk-upload',
} as const;
```

Considerar además restricciones por **nodo de segregación**: un administrador regional podría tener `seg:update` pero solo sobre nodos de su región (ABAC).

---

## 5. Tecnologías recomendadas por capa

### 5.1. Stack inmediato (sin cambiar proveedor de identidad)

```json
{
  "dependencies": {
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.3.0",
    "jsonwebtoken": "^9.0.2",
    "jwks-rsa": "^3.1.0",
    "bcrypt": "^5.1.1",
    "zod": "^3.23.0",
    "casbin": "^5.29.0",
    "cookie-parser": "^1.4.6",
    "dotenv": "^16.4.5"
  }
}
```

### 5.2. Stack con OIDC (fase 2)

```json
{
  "dependencies": {
    "openid-client": "^5.6.4",
    "passport": "^0.7.0",
    "passport-openidconnect": "^0.1.1",
    "express-session": "^1.18.0",
    "connect-redis": "^7.1.1"
  }
}
```

### 5.3. Frontend Angular

```json
{
  "dependencies": {
    "angular-oauth2-oidc": "^17.0.0",
    "@auth0/auth0-angular": "^2.2.0"
  }
}
```

Alternativa: manejo manual de JWT con HttpInterceptors (estado actual) + refresh token en cookie `httpOnly`.

---

## 6. Arquitectura de seguridad propuesta

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                              Cliente (Angular)                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ Access token     │  │ Refresh token    │  │ OAuth2/OIDC client   │  │
│  │ (memoria)        │  │ (httpOnly cookie)│  │ (PKCE)               │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
└───────────┼─────────────────────┼───────────────────────┼──────────────┘
            │                     │                       │
            │ Bearer JWT          │ POST /auth/refresh    │ redirect
            ▼                     ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             Backend Express                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ helmet/cors  │  │ rate-limit   │  │ JWT/OIDC     │  │ Casbin/OPA  │  │
│  │              │  │              │  │ middleware   │  │ middleware  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
│                              ▼                                          │
│                    ┌───────────────────┐                                │
│                    │  PostgreSQL/Redis │                                │
│                    │  users, sessions, │                                │
│                    │  audit, policies  │                                │
│                    └───────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────┘
            │
            │ LDAP / OIDC
            ▼
┌─────────────────────────────────────────┐
│   Identity Provider (Azure/Keycloak)    │
└─────────────────────────────────────────┘
```

---

## 7. Buenas prácticas operativas

### 7.1. Transporte y headers

- Forzar **HTTPS** en producción; nunca enviar tokens por HTTP.
- Usar `helmet()` para headers de seguridad (HSTS, CSP, X-Frame-Options, etc.).
- Configurar `cors()` con `origin` explícito, no `*` cuando se usen cookies.
- Cookie de refresh token con atributos: `httpOnly`, `secure`, `sameSite=strict`, `path=/api/auth/refresh`.

### 7.2. Validación de entrada

- Validar y sanitizar todo body/query/param con **Zod** antes de tocar la lógica de negocio.
- Ejemplo:

```typescript
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
});

app.post('/api/auth/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos.' });
  // ...
});
```

### 7.3. Manejo de secretos

- Nunca commitear secretos; usar variables de entorno.
- En producción usar **Azure Key Vault**, **AWS Secrets Manager**, **HashiCorp Vault** o similar.
- Rotar claves de firma JWT periódicamente; mantener varias claves públicas activas durante la rotación.

### 7.4. Auditoría y no repudio

- Persistir logs de auditoría en base de datos inmutable o syslog externo.
- Incluir en cada entrada: actor, acción, tipo de entidad, id de entidad, timestamp, IP origen, user-agent.
- Considerar firma de hash encadenado para auditoría (blockchain ligero o log firmado).

### 7.5. Rate limiting

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { error: 'Demasiados intentos. Intente más tarde.' },
  keyGenerator: (req) => `${req.ip}:${req.body?.username || ''}`,
});

app.use('/api/auth/login', authLimiter);
```

---

## 8. Checklist de migración recomendada

### Fase 1: Fortalecer Express (1-2 semanas)

- [ ] Reemplazar comparación de contraseñas en texto plano por `bcrypt` / `argon2`.
- [ ] Migrar tokens opacos en memoria a **JWT RS256** con access/refresh tokens.
- [ ] Agregar `helmet`, `cors` restringido y `express-rate-limit`.
- [ ] Mover credenciales LDAP a variables de entorno / secret manager.
- [ ] Implementar revocación de sesiones en logout y cambio de password.
- [ ] Validar entradas con Zod en todos los endpoints de `auth`, `users` y `roles`.
- [ ] Extraer middleware `requireAuth` y `requirePermission` reutilizables.

### Fase 2: Delegar identidad (2-4 semanas)

- [ ] Elegir IdP corporativo (Azure Entra ID / Keycloak / Okta).
- [ ] Configurar aplicación OIDC con scopes `openid profile email` y grupos/roles.
- [ ] Implementar `/api/auth/callback` o usar PKCE desde Angular.
- [ ] Mapear grupos del IdP a roles locales de CAM.
- [ ] Mantener usuarios `LOCAL` solo para emergencia/service accounts.

### Fase 3: Autorización avanzada (mediano plazo)

- [ ] Definir catálogo de permisos granular (`system:*`, `user:*`, `seg:*`, `request:*`).
- [ ] Evaluar adopción de Casbin o OPA para políticas centralizadas.
- [ ] Implementar autorización por nodo de segregación (ABAC).
- [ ] Auditoría firmada y exportable.

---

## 9. Ejemplo de middleware objetivo

```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const PUBLIC_KEY = process.env.JWT_PUBLIC_KEY!;

export interface AuthenticatedRequest extends Request {
  user?: { id: string; username: string; roles: string[] };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const auth = req.header('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'No autenticado.' });

  try {
    const decoded = jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] }) as any;
    req.user = { id: decoded.sub, username: decoded.username, roles: decoded.roles || [] };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autenticado.' });
    // En una implementación real consultarías Casbin/DB.
    if (!user.roles.includes('admin') && !user.permissions?.includes(permission)) {
      return res.status(403).json({ error: 'Permiso denegado.' });
    }
    next();
  };
}
```

---

## 10. Referencias

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OAuth 2.0 for Browser-Based Apps — IETF](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [Passport.js](http://www.passportjs.org/)
- [Casbin](https://casbin.org/)
- [Open Policy Agent](https://www.openpolicyagent.org/)
