## Purpose

Proveer la skill de entrevista `grill-me` (de `mattpocock/skills`) instalada a nivel de proyecto, funcional, trazable y disponible para los agentes de OpenCode en este repositorio.

## Requirements

### Requirement: Skill `grill-me` instalada en scope project

El proyecto SHALL contener la skill `grill-me` de `mattpocock/skills` instalada a nivel de proyecto en `.agents/skills/grill-me/SKILL.md`, proveniente de `skills/productivity/grill-me/SKILL.md` del repositorio origen.

#### Scenario: Archivo de la skill presente

- **GIVEN** el repositorio CAM clonado
- **WHEN** se comprueba la existencia de `.agents/skills/grill-me/SKILL.md`
- **THEN** el archivo existe y su frontmatter declara `name: grill-me` y un `description:` no vacío

#### Scenario: Instalación no interactiva

- **GIVEN** el CLI `skills` v1.7.0 disponible vía `npx.cmd`
- **WHEN** se ejecuta la instalación con `npx.cmd skills add mattpocock/skills --skill grill-me` y flags no interactivos
- **THEN** la instalación termina sin esperar entrada del usuario y sin instalar otras skills del repositorio

#### Scenario: Registro en el listado del CLI

- **GIVEN** la skill instalada
- **WHEN** se ejecuta `npx.cmd skills list --json`
- **THEN** aparece una entrada `grill-me` con `scope: "project"` y `source: "mattpocock/skills"`

### Requirement: Dependencia `grilling` instalada

Dado que en `mattpocock/skills` la skill `grill-me` es un alias de compatibilidad cuyo `SKILL.md` reenvía a la skill `grilling`, el proyecto SHALL instalar también `grilling` (`.agents/skills/grilling/SKILL.md`) para que `grill-me` sea funcional.

#### Scenario: La skill de comportamiento existe

- **GIVEN** `grill-me` instalada y apuntando a "grilling"
- **WHEN** se comprueba `.agents/skills/grilling/SKILL.md`
- **THEN** el archivo existe con frontmatter `name: grilling` válido

#### Scenario: Instalación por separado

- **GIVEN** el CLI `skills` disponible
- **WHEN** se ejecuta `npx.cmd skills add mattpocock/skills --skill grilling -y`
- **THEN** termina sin prompts, registra `grilling` en el lock y NO instala las demás skills del repo

### Requirement: Trazabilidad en `skills-lock.json`

El repositorio SHALL registrar las skills instaladas en `skills-lock.json` con su fuente, ruta y hash calculado, al mismo nivel que las skills existentes.

#### Scenario: Entradas del lock creadas

- **GIVEN** `skills-lock.json` en la raíz
- **WHEN** se leen las claves `skills.grill-me` y `skills.grilling`
- **THEN** cada una contiene `source: "mattpocock/skills"`, `sourceType: "github"`, `skillPath` apuntando al `SKILL.md` de origen y `computedHash` de 64 caracteres hexadecimales

#### Scenario: Integridad verificable

- **GIVEN** las entradas del lock y los archivos instalados
- **WHEN** se re-ejecuta la verificación de integridad del CLI (`skills update` / reinstall)
- **THEN** los hashes registrados coinciden con el contenido instalado o se reporta la discrepancia

### Requirement: Disponibilidad de la skill en OpenCode

La skill SHALL estar disponible para OpenCode (y los agentes ya vinculados del proyecto) sin pasos manuales adicionales por parte del usuario.

#### Scenario: Descubrimiento en sesión

- **GIVEN** una nueva sesión de OpenCode en este repo
- **WHEN** se lista el conjunto de skills disponibles
- **THEN** `grill-me` (y `grilling`) aparecen con su descripción y pueden cargarse mediante la herramienta de skills

#### Scenario: Invocación por comando o frase

- **GIVEN** la skill disponible
- **WHEN** el usuario escribe `/grill-me <tema>` o una frase de activación como "gríllame sobre…" / "stress-test esto…"
- **THEN** la skill se carga y el agente entra en modo entrevista sobre el tema indicado

### Requirement: Instalación aislada y reversible

La instalación SHALL tocar únicamente `.agents/skills/grill-me/`, `.agents/skills/grilling/`, `skills-lock.json` y el registro en `docs/CHANGES.md`, y SHALL poder deshacerse con el CLI.

#### Scenario: Alcance de archivos

- **GIVEN** el estado posterior a la instalación
- **WHEN** se ejecuta `git status --porcelain`
- **THEN** solo aparecen modificados `skills-lock.json` y `docs/CHANGES.md`, como nuevos los directorios de skills (`.agents/skills/grill-me/`, `.agents/skills/grilling/`) y los artefactos del cambio OpenSpec, y no existe `.claude/`

#### Scenario: Desinstalación limpia

- **GIVEN** las skills instaladas
- **WHEN** se ejecuta `npx.cmd skills remove grill-me grilling -y`
- **THEN** se eliminan los archivos de las skills y sus entradas de `skills-lock.json`, sin afectar a las demás skills

### Requirement: Mantenimiento documentado

El cambio SHALL quedar registrado en `docs/CHANGES.md` y las skills SHALL poder actualizarse con el CLI oficial.

#### Scenario: Entrada de changelog

- **GIVEN** `docs/CHANGES.md`
- **WHEN** se busca la entrada de esta fecha
- **THEN** documenta la instalación de `grill-me` y `grilling`, archivos tocados y el comando de actualización

#### Scenario: Actualización posterior

- **GIVEN** las skills instaladas vía CLI con lock
- **WHEN** se ejecuta `npx.cmd skills update grill-me grilling`
- **THEN** el CLI actualiza las skills desde `mattpocock/skills` y renueva los hashes en el lock
