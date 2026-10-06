# Design: install-grill-me-skill (skill grill-me)

## Context

El repo ya consume Agent Skills en formato estándar: hay un almacén project-local en `.agents/skills/` (16 skills: `angular-developer` + 15 `openspec-*`), un `skills-lock.json` en la raíz con `source`, `skillPath` y `computedHash` por skill, y OpenCode descubre esas skills en su listado. También existen skills variantes en `.opencode/skills/` (los comandos `openspec-*-change`), pero las instaladas con el CLI viven en `.agents/skills/`.

Se quiere añadir `grill-me` de `mattpocock/skills` (ruta `skills/productivity/grill-me/SKILL.md`, un único archivo + `agents/openai.yaml`), solo en scope project. El CLI `skills` v1.7.0 está disponible con `npx.cmd` (el alias `npx.ps1` está bloqueado por la política de ejecución de PowerShell, hay que usar `.cmd`).

Constraints: sin tocar código de las apps, sin prompts interactivos (sesión no interactiva), y sin instalar las otras 37 skills del repo origen.

## Goals / Non-Goals

**Goals:**
- `grill-me` instalada project-localmente, invocable desde OpenCode con `/grill-me`.
- Entrada coherente en `skills-lock.json` y registro en `docs/CHANGES.md`.
- Instalación no interactiva, acotada y reversible.

**Non-Goals:**
- Instalar `grilling`, `grill-with-docs` u otras skills del mismo repo.
- Instalación global de usuario (`-g`).
- Modificar `AGENTS.md`, `openspec/config.yaml` o código de `backend/`, `front-angular/`, `frontend/`.
- Automatizar la actualización periódica de skills.

## Decisions

**D1 — Usar el CLI oficial `npx.cmd skills add mattpocock/skills --skill grill-me` en lugar de copiar el archivo a mano.**
El CLI descubre la ruta correcta (`skills/productivity/grill-me/SKILL.md`), escribe el lock con el hash y registra los agentes, consistente con las skills existentes.
- Alternativa descartada: descarga manual con `curl` del `SKILL.md` → obligaría a calcular/validar `computedHash` a mano y a mantener el formato del lock; se reserva como *fallback* si el CLI falla por no tener TTY.

**D2 — Scope project (`sin -g`), almacén `.agents/skills/grill-me/`.**
Es lo que eligió el usuario y coincide con cómo están las otras 16 skills (versionables con el repo).
- Alternativa descartada: global `~/.config/opencode/skills` → no queda en el repo ni se comparte con el equipo.

**D3 — Flags no interactivos: `--skill grill-me -y` (y `-a` solo si el CLI pide agentes).**
`-y` salta confirmaciones y auto-detecta project por estar en un repo; `--skill` limita a una skill.
- Si pide agentes: usar la misma vinculación que las skills existentes (OpenCode + los otros ya registrados) para no crear un estado mixto.
- Alternativa descartada: `--agent '*' --all` → instalaría las 38 skills del repo (fuera de alcance).

**D4 — `grill-me` es un stub; se instala también su dependencia `grilling`.**
En `mattpocock/skills` el `SKILL.md` de `grill-me` (7 líneas, `disable-model-invocation: true`) solo dice *"Call the Skill tool with 'grilling'"*. El comportamiento real vive en `skills/productivity/grilling/SKILL.md`. Sin `grilling` instalada, `/grill-me` no funciona. Por eso se instalan ambas (`--skill grill-me` y `--skill grilling`), aunque el usuario pidió "grill-me": es la única forma de que sea funcional.
- Alternativa descartada: instalar solo `grill-me` según el nombre pedido → quedaría un stub roto.
- Alternativa descartada: copiar el cuerpo de `grilling` dentro de `grill-me` → rompería la trazabilidad del lock frente al origen.

**D5 — Limpiar `.claude/` generado por el CLI.**
`skills add -y` crea symlinks en `.claude/` para Claude Code. Los 16 skills previos del proyecto no están vinculados a Claude Code (solo universal + los 4 agentes). Para mantener paridad y honrar el alcance de archivos de la spec, se elimina `.claude/` tras la instalación (son symlinks, recreables con el CLI).
- Justificación: criterio de aceptación explícito del proposal; evita commitear directorios de una herramienta que el repo no usa.

**D6 — Actualizaciones con `npx.cmd skills update grill-me grilling`.**
Mantiene hashes y fuente sincronizados; queda documentado en la entrada de `docs/CHANGES.md`.

## Impacto

- **API (rutas, contratos)**: ninguno. No se toca `backend/src/` ni `/api/v1/gateway`.
- **Modelo de datos en memoria (IRAM)**: ninguno.
- **Dependencias**: ninguna en `package.json` (el CLI se invoca vía `npx`, sin instalar).
- **Archivos tocados**: `.agents/skills/grill-me/**` y `.agents/skills/grilling/**` (nuevos), `skills-lock.json` (entradas `grill-me` y `grilling`), `docs/CHANGES.md` (registro); se elimina `.claude/` generado por el CLI.

## Risks / Trade-offs

- [El CLI quiera TTY y se cuelgue en sesión no interactiva] → Usar `-y --skill <skill>` y timeout; *fallback* manual: descargar `SKILL.md` al almacén y agregar la entrada al lock con el hash SHA-256 del archivo.
- [El CLI instale más skills de las pedidas o cree `.claude/` extra] → Verificar con `npx.cmd skills list --json` que solo aparecieron `grill-me` y `grilling`; si instala de más, `skills remove` de las extras; eliminar `.claude/` si no estaba.
- [Skill de terceros con instrucciones maliciosas] → Tanto `grill-me` (stub de 7 líneas) como `grilling` (~2 KB) se revisan antes de dar por buena la instalación (leer frontmatter y cuerpo); ambos Safe/0 alerts/Low Risk; MIT, repo conocido; el lock fija el hash.
- [Hash del lock no coincida con el método usado por el CLI] → No recalcular a mano si el CLI ya lo escribe; solo validar longitud/formato y que `skills update` no reporte drift.
- [Nombre colisionado con otra skill `grill-me` global] → `skills list` permite filtrar por scope; la project-local tiene prioridad en el listado del repo.
- [`grill-me` quede roto si alguien instala solo el stub] → Documentado en proposal/design/specs que `grilling` es requisito; el lock registra ambas.

## Migration Plan

1. Ejecutar la instalación no interactiva de `grill-me` y su dependencia `grilling`.
2. Verificar archivos, lock, listado y ausencia de `.claude/`.
3. Registrar en `docs/CHANGES.md` y dejar los checkboxes de `tasks.md` en `[x]`.
4. Commit del conjunto. Rollback: `npx.cmd skills remove grill-me grilling -y` + revert del changelog.

No hay despliegue: nada de esto entra en las imágenes Docker.

## Verification

- `Test-Path .agents\skills\grill-me\SKILL.md` y `Test-Path .agents\skills\grilling\SKILL.md` → `True`; frontmatter válido.
- `npx.cmd skills list --json` → entradas `grill-me` y `grilling`, `scope: "project"`, `source: "mattpocock/skills"`.
- `skills-lock.json` contiene `grill-me` y `grilling` con `computedHash` de 64 hex.
- `git status --porcelain` muestra solo los archivos esperados y no existe `.claude/`.
- Nueva sesión de OpenCode: `grill-me` visible en el listado de skills (o `/grill-me` responde).
- Sin cambios en `backend/` ni `front-angular/` (no requiere typecheck/build, pero se puede correr `npm.cmd run typecheck` en `backend/` para confirmar que nada cambió).

## Open Questions

- ¿Vincular también la skill a otros agentes (Copilot/Gemini) o solo OpenCode? Depende de lo que el CLI haga con `-y`; si pide selección, mantener la paridad con las skills existentes.
