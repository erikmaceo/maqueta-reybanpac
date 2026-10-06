# Tasks: add-agents-md

## 1. Preparación y fuentes

- [x] 1.1 Confirmar que `C:\REYBANPAC\AGENTS.md` no existe aún y que `git status` está limpio
- [x] 1.2 Releer `docs/DEV-GUIDE.md` y `docs/ARCHITECTURE.md` para extraer los comandos y estructura oficiales (no inventar comandos)
- [x] 1.3 Verificar que `openspec/config.yaml` no contradice el contenido planeado (estructura, comandos, convenciones)

## 2. Creación de `AGENTS.md` (archivo raíz)

- [x] 2.1 Crear `C:\REYBANPAC\AGENTS.md` con encabezado y sección "Visión general" de CAM en español
- [x] 2.2 Agregar sección "Mapa del monorepo" describiendo `backend/`, `front-angular/` (activo), `frontend/` (legado), `ldap/`, `matriz/`, `docs/`
- [x] 2.3 Agregar sección "Comandos" con `docker compose up -d backend ldap`, `docker compose build backend`, `docker compose up -d backend`, logs/ps de Docker y arranque de Angular en puerto 5174 con `proxy.conf.json`
- [x] 2.4 Agregar sección "Convenciones" (español, TypeScript estricto sin `any`, endpoints bajo `/api`, flujo OpenSpec antes de codificar)
- [x] 2.5 Agregar sección "Advertencias" (`docker restart` no aplica cambios de código; `frontend/` es legado; actualizar `docs/CHANGES.md` en cada cambio)
- [x] 2.6 Agregar sección "Documentación" con enlaces relativos a `docs/ARCHITECTURE.md`, `docs/DEV-GUIDE.md` y `docs/README.md` (sin copiar tablas de rutas ni de endpoints)
- [x] 2.7 Agregar sección "Mantenimiento" indicando cuándo actualizar `AGENTS.md`

## 3. Verificación

- [x] 3.1 Validar que el Markdown renderiza (encabezados, listas, fences) y que el archivo tiene ≤ ~100 líneas
- [x] 3.2 Comprobar con `Test-Path` que los enlaces relativos del archivo existen (`docs/ARCHITECTURE.md`, `docs/DEV-GUIDE.md`, `docs/README.md`)
- [x] 3.3 Contrastar cada comando listado contra `docs/DEV-GUIDE.md` y corregir diferencias
- [x] 3.4 Ejecutar `openspec status --change "add-agents-md"` sin errores y `git status` mostrando solo `AGENTS.md` agregado
- [x] 3.5 Correr verificación de build del proyecto: `npm run typecheck` en `backend/` y `npm run build` en `front-angular/` (sin cambios de código, deben pasar igual)
- [x] 3.6 Agregar entrada al final de `docs/CHANGES.md` con fecha, título del cambio, resumen, archivos modificados y notas técnicas
