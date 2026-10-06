# Proposal: install-grill-me-skill

## Why

El equipo necesita una forma repetible de estresar planes y diseños antes de escribir código (las sesiones de agente tienden a empezar a implementar con decisiones sin resolver). La skill `grill-me` de `mattpocock/skills` hace exactamente eso: una entrevista implacable para afilar un plan o diseño. Hoy no está instalada en este proyecto, aunque el repo ya usa el formato de Agent Skills con `skills-lock.json` y skills en `.agents/skills/`.

## What Changes

- Se instala la skill **`grill-me`** de `mattpocock/skills` (ruta origen `skills/productivity/grill-me/SKILL.md`) en scope **project**, con el CLI oficial `npx skills add` (skills@1.7.0).
- `grill-me` en `mattpocock/skills` es un **stub de compatibilidad**: su `SKILL.md` solo reenvía a la skill **`grilling`**. Por lo tanto se instala también **`grilling`** (ruta origen `skills/productivity/grilling/SKILL.md`), que contiene el comportamiento real de la entrevista. Ambas quedan en el almacén del proyecto.
- Los archivos quedan en el almacén del proyecto `.agents/skills/grill-me/` y `.agents/skills/grilling/` (mismo lugar que `angular-developer` y las `openspec-*`), quedan disponibles para OpenCode y los demás agentes ya registrados.
- Se actualiza `skills-lock.json` con las entradas `grill-me` y `grilling` (fuente, ruta y hash), como el resto de las skills del proyecto.
- La skill pasa a ser invocable con `/grill-me …` o por frase ("gríllame sobre…", "stress-test esto…").
- Se elimina el directorio `.claude/` generado por el CLI (los skills previos del proyecto no están vinculados a Claude Code; se mantiene paridad).
- Documentación: se registra la instalación en `docs/CHANGES.md`.

**Fuera de alcance**: instalar las otras skills del repo (`ask-matt`, `to-spec`, etc.), instalación global de usuario, modificar `AGENTS.md` o `openspec/config.yaml`, y cualquier cambio en `backend/`, `front-angular/` o `frontend/`.

## Capabilities

### New Capabilities
- `grill-me-skill`: disponibilidad project-local de la skill `grill-me` **y su dependencia `grilling`** (instalación, registro en el lock, invocación desde OpenCode y mantenimiento/actualización).

### Modified Capabilities
- _(ninguna — los specs existentes `seguridades-crud`, `profile-permission-routes` y `dark-mode` no cambian)_

## Impact

- **Archivos**: `.agents/skills/grill-me/` y `.agents/skills/grilling/` (nuevos), `skills-lock.json` (dos entradas nuevas), `docs/CHANGES.md` (registro).
- **APIs / sistemas**: sin impacto en backend, API Gateway, LDAP ni frontends; no hay dependencias de `package.json`.
- **Agentes**: OpenCode (y los otros agentes ya vinculados) descubren la skill nueva en el próximo arranque de sesión.
- **Riesgo de supply chain**: se copia un único `SKILL.md` de un repo de terceros (MIT); el hash del lock permite detectar cambios posteriores.

### Criterios de aceptación
1. `.agents/skills/grill-me/SKILL.md` y `.agents/skills/grilling/SKILL.md` existen; ambos con frontmatter válido (`name` y `description`).
2. `npx skills list --json` muestra `grill-me` **y** `grilling` con `scope: "project"` y `source: "mattpocock/skills"`.
3. `skills-lock.json` contiene las entradas `grill-me` y `grilling` con `computedHash` coherente con los archivos instalados.
4. La skill aparece en el listado de skills disponibles de la sesión (OpenCode) sin prompts interactivos pendientes.
5. No existe el directorio `.claude/` en la raíz.
6. No se modificó ningún archivo fuera de `.agents/skills/grill-me/`, `.agents/skills/grilling/`, `skills-lock.json` y `docs/CHANGES.md`.

### Cómo revertir
`npx skills remove grill-me -y` (elimina archivos y entrada del lock) o `git revert` del commit; no hay dependencias de código.
