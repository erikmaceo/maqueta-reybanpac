# AGENTS.md

Instrucciones para agentes de IA que trabajan en este repositorio.

## Visión general

**Central Access Manager (CAM)** — consola de gobierno de accesos para Reybanpac (Favorita Fruit Company). Administra aplicaciones, módulos, programas, controles, perfiles, usuarios, roles y solicitudes de acceso; integra LDAP corporativo y expone un API Gateway (`/api/v1/gateway`) para aplicaciones terceras.

## Mapa del monorepo

| Carpeta | Rol |
|---------|-----|
| `backend/` | API Express + TypeScript (ESM, `tsx`, Node 20), puerto 4000. Datos en memoria (IRAM), auth por sesiones opacas `cam.<hex>` (TTL 8h), validación con zod. |
| `front-angular/` | **Frontend activo**: Angular 21 + PrimeNG 21 + PrimeFlex, puerto 5174, proxy `/api` → `proxy.conf.json`. |
| `frontend/` | SPA React **legada** (puerto 8080 en Docker). Solo mantenimiento: no agregar features nuevas aquí. |
| `ldap/` | OpenLDAP (`cam-ldap`, 389 → 3890 en host) con usuarios corporativos. |
| `matriz/` | Datos/contenido de la matriz de aplicaciones y permisos. |
| `docs/` | Fuente de verdad de la documentación. |
| `openspec/` | Specs y cambios del flujo OpenSpec (`config.yaml` inyecta contexto y reglas). |

## Comandos

```bash
# Backend + LDAP (Docker)
docker compose up -d backend ldap      # levantar
docker compose build backend           # reconstruir tras cambios en backend/src/
docker compose up -d backend           # recrear contenedor con la nueva imagen
docker logs cam-backend --tail 20      # logs
docker ps                              # contenedos en ejecución

# Verificar backend
docker ps --filter "name=cam-backend" --format "{{.Status}}"

# Frontend Angular (desarrollo local, http://localhost:5174)
cd front-angular && npm install
npx ng serve --port 5174 --proxy-config proxy.conf.json
# o desde front-angular/: npm start

# Build / verificación
npm run build        # front-angular: build de producción
npm run typecheck    # backend: tsc --noEmit
```

## Convenciones

- **Idioma**: español para UI, documentación y comentarios de negocio.
- **TypeScript estricto**, sin `any` salvo justificación.
- **API**: REST bajo `/api`, respuestas JSON, errores con status HTTP coherente.
- **OpenSpec**: los cambios se modelan antes de codificar (`proposal → specs → design → tasks`); ejecutar `/opsx-apply` para implementar.
- **Angular**: componentes `standalone`, signals para estado, control flow `@if`/`@for`, templates inline en `.ts`, PrimeNG 21 (`p-tabs`, no `TabViewModule`), `[(ngModel)]` para formularios simples.
- **Backend**: tipos en `types.ts` con `import type`; auditoría con `logAudit()`; store en memoria sin persistencia entre reinicios.
- **Sin comentarios en el código** salvo que se solicite explícitamente.

## Advertencias

- **`docker restart` NO aplica cambios de código**: tras modificar `backend/src/` usa `docker compose build backend` + `docker compose up -d backend`.
- **`frontend/` (React) es legado**: el desarrollo activo va en `front-angular/`.
- **Actualizar `docs/CHANGES.md`** con cada cambio (fecha, título, resumen, archivos modificados).
- Credenciales de prueba: `ctudela` / `admin123`.

## Documentación

Detalle completo en `docs/` (no duplicar aquí):

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitectura, componentes, modelo de datos, flujos.
- [`docs/DEV-GUIDE.md`](docs/DEV-GUIDE.md) — comandos, rutas Angular, endpoints, convenciones, troubleshooting.
- [`docs/README.md`](docs/README.md) — índice de toda la documentación (`BACKEND-API-ROUTES.md`, `DATABASE-MODEL.md`, `AUTH-AUTHZ-GUIDE.md`, `API-GATEWAY-*.md`).

## Mantenimiento

Actualizar este archivo cuando cambien: comandos de arranque, estructura de directorios o convenciones de código. Los cambios del proyecto se registran en [`docs/CHANGES.md`](docs/CHANGES.md).
