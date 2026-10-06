# Tasks: install-grill-me-skill

## 1. Preparación y diagnóstico

- [x] 1.1 Confirmar que `grill-me` no está instalada: `npx.cmd skills list --json` no la incluye
- [x] 1.2 Verificar que ya existe `C:\REYBANPAC\skills-lock.json` con las 16 skills del proyecto y anotar su formato (source/sourceType/skillPath/computedHash)
- [x] 1.3 Anotar el estado inicial de `git status --porcelain` para detectar diferencias al final
- [x] 1.4 Constatar que la skill instalable `grill-me` de `mattpocock/skills` es un stub que depende de `grilling` (revisar `SKILL.md` de origen) y registrar la dependencia en proposal/specs/design

## 2. Instalación de la skill

- [x] 2.1 Ejecutar `npx.cmd skills add mattpocock/skills --skill grill-me -y` (project scope) con timeout amplio y capturar salida
- [x] 2.2 Ejecutar `npx.cmd skills add mattpocock/skills --skill grilling -y` (dependencia real de `grill-me`)
- [x] 2.3 Si el CLI pide selección de agentes, responder con la misma vinculación que las skills existentes (OpenCode + agentes ya registrados); si bloquea por TTY, aplicar el fallback manual: descargar `SKILL.md` de `grill-me` y `grilling` a `.agents/skills/<skill>/SKILL.md` y registrar las entradas en `skills-lock.json` con hash SHA-256 del archivo
- [x] 2.4 Revisar el contenido de `.agents/skills/grill-me/SKILL.md` (stub de 7 líneas que reenvía a "grilling") y de `.agents/skills/grilling/SKILL.md` (entrevista por rondas frontier) y verificar que las instrucciones son legítimas, sin comandos peligrosos
- [x] 2.5 Confirmar que NO se instalaron otras skills del repo origen; desinstalar extras si las hubiera con `npx.cmd skills remove <nombre> -y`
- [x] 2.6 Eliminar `.claude/` creado por el CLI si el repo no lo tenía (paridad con las skills previas)

## 3. Documentación (lock y changelog)

- [x] 3.1 Verificar que `skills-lock.json` tiene las entradas `grill-me` y `grilling` con `source: "mattpocock/skills"`, `sourceType: "github"`, `skillPath` de origen y `computedHash` de 64 hex
- [x] 3.2 Agregar entrada al final de `docs/CHANGES.md` (fecha 2026-10-06, título, resumen con `grill-me` + dependencia `grilling`, archivos modificados, comando de actualización `npx.cmd skills update grill-me grilling`)

## 4. Verificación

- [x] 4.1 `Test-Path .agents\skills\grill-me\SKILL.md` y `Test-Path .agents\skills\grilling\SKILL.md` → True y frontmatter válido
- [x] 4.2 `npx.cmd skills list --json` muestra `grill-me` y `grilling` con `scope: "project"` y `source: "mattpocock/skills"`
- [x] 4.3 `git status --porcelain` muestra solo: `.agents/skills/grill-me/` y `.agents/skills/grilling/` (nuevos), `skills-lock.json` y `docs/CHANGES.md` (modificados) + artefactos del cambio OpenSpec; y `.claude/` NO existe
- [x] 4.4 Ejecutar `npm.cmd run typecheck` en `backend/` (confirmar que nada cambió) y `openspec.cmd status --change "install-grill-me-skill"` sin errores
- [x] 4.5 Resumen final con criterios de aceptación y rollback (`npx.cmd skills remove grill-me grilling -y`)