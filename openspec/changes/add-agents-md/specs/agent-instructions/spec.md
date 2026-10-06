# agent-instructions — Especificación (delta)

## ADDED Requirements

### Requirement: Archivo de instrucciones para agentes en la raíz
El repositorio SHALL contener un archivo `AGENTS.md` ubicado en la raíz del proyecto (`C:\REYBANPAC\AGENTS.md`), escrito en Markdown y en español, pensado para ser leído por agentes de IA como primera fuente de contexto del proyecto.

#### Scenario: El archivo existe en la raíz
- **GIVEN** el repositorio CAM clonado en la raíz del proyecto
- **WHEN** se lista el contenido de la raíz
- **THEN** se encuentra `AGENTS.md` junto a `docker-compose.yaml` y la carpeta `openspec/`

#### Scenario: Legibilidad en Markdown
- **GIVEN** el contenido de `AGENTS.md`
- **WHEN** se interpreta como Markdown
- **THEN** usa encabezados `#`/`##`/`###`, listas y bloques de código con fence de lenguaje correcto, sin errores de formato

### Requirement: Mapa del monorepo
`AGENTS.md` SHALL describir la estructura del monorepo indicando el rol de cada directorio y cuál es el frontend activo.

#### Scenario: Directorios cubiertos
- **GIVEN** `AGENTS.md`
- **WHEN** se revisa la sección de estructura
- **THEN** menciona `backend/`, `front-angular/`, `frontend/`, `ldap/`, `matriz/` y `docs/` con una línea de descripción cada uno

#### Scenario: Frontend activo vs legado
- **GIVEN** `AGENTS.md`
- **WHEN** se lee la descripción de `front-angular/` y `frontend/`
- **THEN** indica que `front-angular/` (Angular 21 + PrimeNG) es el frontend activo y que `frontend/` (React) es legado, reservado solo para mantenimiento

### Requirement: Comandos de desarrollo y verificación
`AGENTS.md` SHALL incluir los comandos esenciales para levantar y verificar el entorno, tomados de `docs/DEV-GUIDE.md`.

#### Scenario: Comandos presentes
- **GIVEN** `AGENTS.md`
- **WHEN** se revisa la sección de comandos
- **THEN** incluye al menos `docker compose up -d backend ldap`, `docker compose build backend`, el arranque de Angular en el puerto 5174 con proxy y el typecheck/build del frontend

#### Scenario: Comandos verificables
- **GIVEN** los comandos listados en `AGENTS.md`
- **WHEN** se ejecutan en un entorno con Docker Desktop y Node 20+ instalados
- **THEN** cada comando termina sin error o produce el efecto descrito

### Requirement: Convenciones de trabajo
`AGENTS.md` SHALL declarar las convenciones que rigen los cambios en el proyecto.

#### Scenario: Convenciones presentes
- **GIVEN** `AGENTS.md`
- **WHEN** se revisa la sección de convenciones
- **THEN** indica: español para UI, documentación y comentarios de negocio; TypeScript estricto sin `any` salvo justificación; endpoints REST bajo `/api` con respuestas JSON; y que los cambios se modelan con OpenSpec (proposal → specs → design → tasks) antes de codificar

#### Scenario: Advertencias operativas
- **GIVEN** `AGENTS.md`
- **WHEN** se leen las advertencias
- **THEN** advierte que `docker restart` NO aplica cambios de código (usar `docker compose build backend` + `docker compose up -d backend`) y que `frontend/` es legado

### Requirement: Enlaces a la documentación fuente
`AGENTS.md` SHALL enlazar a `docs/` como fuente de verdad en lugar de duplicar su contenido extenso.

#### Scenario: Enlaces mínimos
- **GIVEN** `AGENTS.md`
- **WHEN** se revisan los enlaces
- **THEN** incluye rutas relativas a `docs/ARCHITECTURE.md`, `docs/DEV-GUIDE.md` y `docs/README.md`

#### Scenario: Sin duplicación de tablas extensas
- **GIVEN** tablas de rutas Angular y de endpoints que ya existen en `docs/`
- **WHEN** se compara `AGENTS.md` con esos documentos
- **THEN** `AGENTS.md` no las copia completas, solo las resume o apunta a ellas

### Requirement: Mantenimiento del archivo
`AGENTS.md` SHALL indicar cuándo debe actualizarse para no quedar desactualizado.

#### Scenario: Sección de mantenimiento
- **GIVEN** `AGENTS.md`
- **WHEN** se lee la última sección
- **THEN** indica que debe actualizarse cuando cambien comandos de arranque, estructura de directorios o convenciones, y que `docs/CHANGES.md` registra los cambios del proyecto
