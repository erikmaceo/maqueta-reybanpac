# Proposal: add-agents-md

## Why

El repositorio no tiene un archivo de instrucciones para agentes de IA (AGENTS.md), por lo que cada sesión de agente empieza sin contexto del proyecto y debe redescubrir estructura, comandos y convenciones a partir de cero — con riesgo de seguir el flujo equivocado (por ejemplo, usar `frontend/` React legado en vez de `front-angular/`, o usar `docker restart` que no aplica cambios de código). Con `openspec/config.yaml` ya inyectando contexto en los artefactos de OpenSpec, falta un archivo raíz legible por cualquier agente (opencode, Claude Code, Copilot, etc.) que resuma cómo trabajar en este monorepo.

## What Changes

- Se crea `AGENTS.md` en la raíz del repo (`C:\REYBANPAC\AGENTS.md`) con las instrucciones de trabajo para agentes:
  - Visión general de CAM y mapa del monorepo (`backend/`, `front-angular/`, `frontend/` legado, `ldap/`, `matriz/`, `docs/`).
  - Comandos de desarrollo y verificación (Docker, Angular, typecheck del backend).
  - Convenciones: español para UI/docs, TypeScript estricto, endpoints bajo `/api`, flujo OpenSpec antes de codificar.
  - Reglas de mantenimiento de documentación (`docs/CHANGES.md`, `ARCHITECTURE.md`, `DEV-GUIDE.md`).
  - Advertencias frecuentes (`docker restart` no aplica cambios; `frontend/` es legado).
- El contenido se deriva de la documentación existente (`docs/`), sin duplicar detalles que ya viven allí: se enlaza a los documentos fuente en lugar de copiarlos.
- No se modifica código de `backend/`, `front-angular/` ni `frontend/`.

**Fuera de alcance**: crear otros archivos de instrucciones (CLAUDE.md, .cursorrules, etc.), modificar `openspec/config.yaml` (ya creado) o cambiar comportamiento de la aplicación.

## Capabilities

### New Capabilities
- `agent-instructions`: requisitos del archivo `AGENTS.md` (ubicación, contenido mínimo, enlaces a `docs/`, reglas de actualización y verificación).

### Modified Capabilities
- _(ninguna — los specs existentes `seguridades-crud`, `profile-permission-routes` y `dark-mode` no cambian)_

## Impact

- **Archivos**: se agrega `AGENTS.md` (raíz); ningún otro archivo se modifica.
- **APIs / sistemas**: sin impacto en backend, API Gateway, LDAP ni frontends.
- **Dependencias**: ninguna nueva.
- **Documentación**: se mantiene `docs/` como fuente de verdad; `AGENTS.md` solo referencia y resume.

### Criterios de aceptación
1. `AGENTS.md` existe en la raíz del repo y es Markdown válido en español.
2. Contiene el mapa del monorepo, los comandos de arranque/verificación y las convenciones (español, TS estricto, OpenSpec).
3. Enlaza al menos `docs/ARCHITECTURE.md`, `docs/DEV-GUIDE.md` y `docs/README.md`.
4. No duplica tablas extensas de `docs/` (rutas, endpoints) sino que apunta a ellas.
5. No se modifica ningún archivo fuera de `AGENTS.md`.

### Cómo revertir
Eliminar `AGENTS.md` (`git rm AGENTS.md` + commit). No hay dependencias ni efectos secundarios.
