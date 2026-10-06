# Design: add-agents-md (AGENTS.md)

## Context

El repo CAM no tiene ningún archivo raíz de instrucciones para agentes (`AGENTS.md`, `CLAUDE.md`, etc.). Cada sesión de agente reconoce el proyecto leyendo `docs/` a mano, lo que consume contexto y produce errores evitables (usar `docker restart`, tocar el React legado, olvidar el registro en `docs/CHANGES.md`).

Estado actual:
- `openspec/config.yaml` ya inyecta contexto y reglas en los artefactos de OpenSpec (no forma parte de este cambio).
- `docs/` es la fuente de verdad: `ARCHITECTURE.md`, `DEV-GUIDE.md`, `README.md`, `BACKEND-API-ROUTES.md`, `CHANGES.md`, etc.
- No hay dependencias nuevas, ni cambios de API ni de datos: el cambio es documental y de una sola capa (raíz del repo).

Stakeholders: agentes de IA (opencode, Claude Code, Copilot) y desarrolladores humanos que leen la raíz del repo.

## Goals / Non-Goals

**Goals:**
- Un `AGENTS.md` en la raíz, en español, que dé a un agente nuevo el mínimo para trabajar bien: estructura, comandos, convenciones, advertencias y enlaces a `docs/`.
- Mantenerlo corto (≈1 pantalla y media) para que no domine el contexto de la sesión.
- Que sea la puerta de entrada a `docs/`, no un duplicado de ellos.

**Non-Goals:**
- Crear `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md` u otros archivos de instrucciones por herramienta.
- Modificar `openspec/config.yaml`, `docs/` o cualquier código de `backend/`, `front-angular/`, `frontend/`.
- Cambiar rutas, contratos de API o el modelo de datos en memoria.
- Automatizar la verificación de que `AGENTS.md` esté desactualizado (script/lint).

## Decisions

**D1 — Un solo archivo en la raíz, en español.**
`AGENTS.md` en `C:\REYBANPAC\AGENTS.md`.
- Alternativas descartadas: `docs/AGENTS.md` (los agentes buscan la raíz; bajar a subcarpetas reduce descubrimiento) e inglés (contradice la convención de proyecto de escribir docs en español).

**D2 — Resumen + enlaces, no duplicado.**
Se copian solo comandos cortos (1-2 líneas cada uno) y se enlaza `docs/DEV-GUIDE.md` para detalle; las tablas de rutas Angular y de endpoints se omiten y se referencian.
- Alternativa descartada: copiar las tablas completas → se desincronizan con `docs/` en el primer cambio de endpoint.
- Riesgo: un lector deba abrir dos archivos. Mitigación: los enlaces son relativos y el resumen es suficiente para tareas rutinarias.

**D3 — Secciones fijas.**
Estructura: visión general → mapa del monorepo → comandos → convenciones y advertencias → documentación (enlaces) → mantenimiento.
- Alternativa descartada: orden alfabético o por carpetas → el flujo "qué es → dónde está → cómo corro → cómo trabajo" es el que sigue un agente nuevo.

**D4 — Reglas duras como advertencias explícitas.**
Los errores históricos se redactan como advertencias destacadas: `docker restart` no aplica cambios (usar `build` + `up -d`), `frontend/` es legado, `docs/CHANGES.md` se actualiza con cada cambio.
- Justificación: una advertencia explícita previene mejor que una descripción neutra.

**D5 — Coherencia con `openspec/config.yaml`.**
El `context` del config y el contenido de `AGENTS.md` deben decir lo mismo (estructura, comandos, convenciones). Este cambio no edita el config, pero verifica que no haya contradicciones.
- Alternativa descartada: que `AGENTS.md` incluya el contexto de OpenSpec → duplicaría el config; los artefactos de OpenSpec ya lo reciben inyectado.

## Impacto

- **API (rutas, contratos)**: ninguno. No se toca `backend/src/`, el API Gateway (`/api/v1/gateway`) ni el proxy `/api`.
- **Modelo de datos en memoria (IRAM)**: ninguno. Sin cambios de entidades, seeds ni persistencia.
- **Dependencias**: ninguna (`package.json` sin cambios).
- **Archivos tocados**: solo `AGENTS.md` (nuevo).

## Risks / Trade-offs

- [Contenido desactualizado con el tiempo] → La sección "Mantenimiento" obliga a actualizar `AGENTS.md` cuando cambien comandos o estructura; `docs/CHANGES.md` queda como registro. Aceptamos que no hay lint automático.
- [Duplicación parcial de `docs/DEV-GUIDE.md`] → Se limita a comandos de una línea; el detalle vive en `docs/`.
- [Tamaño excesivo que consume contexto del agente] → Se fija como objetivo ≤ ~100 líneas; lo que quede fuera se enlaza.
- [Contradicción con `openspec/config.yaml`] → Revisión manual de ambos archivos en la tarea de verificación.

## Migration Plan

1. Crear `AGENTS.md` en la raíz.
2. Verificar formato Markdown y enlaces relativos existentes.
3. Commit del archivo nuevo. Rollback: `git rm AGENTS.md` + commit (no hay dependencias).

No hay despliegue: el archivo no entra en las imágenes Docker (fuera de `backend/` y `front-angular/`).

## Verification

- `openspec list` / `openspec status` sin errores (config sigue válido).
- Comprobar que cada enlace relativo (`docs/ARCHITECTURE.md`, `docs/DEV-GUIDE.md`, `docs/README.md`) existe con `Test-Path`.
- Validar que los comandos listados existen tal cual en `docs/DEV-GUIDE.md`.
- Prueba manual: un lector nuevo responde correctamente a "¿qué frontend es el activo?" y "¿cómo aplico un cambio en `backend/src/`?" usando solo `AGENTS.md`.
- `git status` muestra únicamente `AGENTS.md` como archivo agregado.

## Open Questions

- ¿Conviene en el futuro añadir un check de sincronización (script que valide enlaces rotos de `AGENTS.md`)? Fuera de alcance por ahora.
