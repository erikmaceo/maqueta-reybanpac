# Guía de desarrollo — Central Access Manager (Reybanpac)

## Requisitos previos

- **Node.js** 20+
- **Docker Desktop** (para backend + LDAP)
- **Angular CLI** (`npm install -g @angular/cli@21`)
- Credenciales de prueba: `ctudela` / `admin123`

## Arranque del entorno

### Backend + LDAP (Docker)
```bash
# Construir y levantar backend + LDAP
docker compose up -d backend ldap

# Reconstruir imagen del backend tras cambios de código
docker compose build backend
docker compose up -d backend
```

> **Importante**: `docker restart` NO actualiza el código. Siempre que modifiques archivos en `backend/src/`, debes hacer `docker compose build backend` seguido de `docker compose up -d backend`.

### Frontend Angular (desarrollo local)
```bash
cd front-angular
npm install
npx ng serve --port 5174 --proxy-config proxy.conf.json
```

La app estará en `http://localhost:5174`. Las peticiones `/api/*` se proxyan a `http://localhost:4000` (backend en Docker).

### Verificar que el backend está corriendo
```bash
docker ps --filter "name=cam-backend" --format "{{.Status}}"
# Debería decir "Up ..."
```

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `docker compose up -d backend ldap` | Levanta backend + LDAP |
| `docker compose build backend` | Reconstruye imagen del backend |
| `docker compose up -d backend` | Recrea el contenedor con la nueva imagen |
| `docker logs cam-backend --tail 20` | Ver logs del backend |
| `docker ps` | Ver contenedores en ejecución |
| `npx ng serve --port 5174 --proxy-config proxy.conf.json` | Levantar Angular en modo dev |
| `npx ng build` | Build de producción de Angular |

## Estructura de rutas (Angular)

| Ruta | Componente | Guard | Descripción |
|------|------------|-------|-------------|
| `/` | Dashboard | authGuard | Panel de control |
| `/login` | LoginComponent | guestGuard | Inicio de sesión |
| `/sistemas` | SystemsComponent | adminGuard | Catálogo de aplicaciones |
| `/seguridades` | SecurityComponent | adminGuard | CRUD seguridades (4 tabs) |
| `/roles` | RolesComponent | adminGuard | Roles y accesos |
| `/usuarios` | UsersComponent | adminGuard | Usuarios |
| `/matriz-acceso` | MatrixAccessComponent | adminGuard | Carga masiva Excel |
| `/directorio` | DirectoryComponent | adminGuard | Directorio LDAP |
| `/soluciones` | SolucionesComponent | adminGuard | Vista jerárquica por app |
| `/soluciones/:codigo` | SolucionesComponent | adminGuard | Jerarquía de una app específica |
| `/autorizador` | AuthorizerComponent | authGuard | Aprobación de solicitudes |
| `/accesos` | AccessComponent | adminGuard | Accesos efectivos |
| `/auditoria` | AuditComponent | adminGuard | Auditoría |

## Endpoints del backend (Seguridades)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/seg-aplicaciones` | Listar aplicaciones |
| POST | `/api/seg-aplicaciones` | Crear aplicación |
| PUT | `/api/seg-aplicaciones/:id` | Actualizar aplicación |
| DELETE | `/api/seg-aplicaciones/:id` | Eliminar aplicación |
| GET | `/api/seg-modulos` | Listar módulos |
| POST | `/api/seg-modulos` | Crear módulo |
| PUT | `/api/seg-modulos/:id` | Actualizar módulo |
| DELETE | `/api/seg-modulos/:id` | Eliminar módulo |
| GET | `/api/seg-programas` | Listar programas |
| POST | `/api/seg-programas` | Crear programa (incluye `tipo`) |
| PUT | `/api/seg-programas/:id` | Actualizar programa |
| DELETE | `/api/seg-programas/:id` | Eliminar programa |
| GET | `/api/seg-perfiles` | Listar perfiles |
| POST | `/api/seg-perfiles` | Crear perfil |
| PUT | `/api/seg-perfiles/:id` | Actualizar perfil |
| DELETE | `/api/seg-perfiles/:id` | Eliminar perfil |
| POST | `/api/seg-matriz/upload` | Carga masiva desde Excel |

## Plantilla Excel — Matriz de Acceso

14 columnas (A-N):

| Col | Campo | Obligatorio | Descripción |
|-----|-------|-------------|-------------|
| A | app_codigo | Sí | Código único de la aplicación |
| B | app_nombre | Sí | Nombre de la aplicación |
| C | app_descripcion | No | Descripción de la aplicación |
| D | mod_codigo | Sí | Código único del módulo |
| E | mod_nombre | Sí | Nombre del módulo |
| F | mod_descripcion | No | Descripción del módulo |
| G | prg_codigo | Sí | Código único del programa |
| H | prg_nombre | Sí | Nombre del programa |
| I | prg_descripcion | No | Descripción del programa |
| J | prg_tipo | No | Tipo: Menú, Submenú, Maestro, Transacción, Proceso, Consulta, Reporte, Objeto. Default: Transacción |
| K | perf_codigo | Sí | Código único del perfil |
| L | perf_nombre | Sí | Nombre del perfil |
| M | perf_descripcion | No | Descripción del perfil |
| N | estado | No | ACTIVO o INACTIVO. Default: ACTIVO |

## Convenciones de código

### Angular
- **Standalone components**: Todos los componentes son `standalone: true`. No usar NgModules.
- **Signals**: Usar `signal()` y `computed()` para estado reactivo. Evitar `BehaviorSubject` salvo necesidad específica.
- **PrimeNG 21**: Usar la nueva sintaxis de Tabs (`p-tabs`, `p-tab`, `p-tabpanels`, `p-tabpanel`). No usar `TabViewModule` (obsoleto).
- **NgModel**: Usar `[(ngModel)]` para formularios simples (no se usa ReactiveForms).
- **Control flow**: Usar `@if`, `@for`, `@empty` (nueva sintaxis de Angular 17+).
- **Templates inline**: Los templates están en el mismo archivo `.ts` (no archivos `.html` separados).
- **Comentarios**: NO agregar comentarios al código salvo que se solicite explícitamente.

### Backend
- **TypeScript**: Tipos en `types.ts`. Usar `import type` para tipos.
- **Store en memoria**: `db` es un objeto en RAM. No hay persistencia entre reinicios.
- **Errores**: Retornar `{ error: "mensaje" }` con código HTTP apropiado.
- **Audit**: Registrar operaciones con `logAudit()`.

### Estilos (CSS)
- **Tokens compartidos**: Colores, badgen, botones definidos en `styles.css` global.
- **Clases utilitarias**: `.muted`, `.small`, `.mono`, `.cell-strong`, `.tiny`, `.dim`.
- **Badges**: `.badge .badge-green`, `.badge-gray`, `.badge-blue`.
- **Buttons**: `.btn .btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.btn-icon`.
- **Toast**: `z-index: 3000` para superar overlays de PrimeNG.

## Dependencias

### Backend (`backend/package.json`)
- `express`, `cors`, `tsx`
- `multer` + `@types/multer` — Upload de archivos
- `xlsx` — Parsing/escritura de Excel
- `ldapjs` — Cliente LDAP

### Frontend Angular (`front-angular/package.json`)
- `@angular/*` v21
- `primeng` v21
- `xlsx` — Exportación a Excel

## Solución de problemas

### El backend no refleja mis cambios de código
**Causa**: El contenedor Docker usa una imagen vieja.
**Solución**:
```bash
docker compose build backend
docker compose up -d backend
```

### Angular no detecta nuevos archivos/directorios
**Causa**: `ng serve` no detecta directorios nuevos en caliente.
**Solución**: Detener `ng serve` (Ctrl+C) y volver a ejecutar el comando.

### Error 409 en CRUD de seguridades
**Causa**: Conflicto de código duplicado. El backend retorna el error en `e.error.error`, no en `e.message`.
**Solución**: Usar `e?.error?.error || e?.message` en los catch de errores.

### El toast aparece detrás de diálogos
**Causa**: PrimeNG overlays tienen `z-index` alto.
**Solución**: El toast custom tiene `z-index: 3000`. Si aparece detrás de algo, aumentar ese valor en `styles.css`.

### Login falla
**Causa**: El backend o LDAP no están corriendo.
**Solución**: `docker ps` para verificar que `cam-backend` y `cam-ldap` estén "Up". Si no, `docker compose up -d backend ldap`.

## Cómo actualizar la documentación

Al hacer cambios en el proyecto:
1. **`docs/CHANGES.md`**: Agregar una entrada con fecha, resumen, archivos modificados y notas técnicas.
2. **`docs/ARCHITECTURE.md`**: Actualizar si cambia la arquitectura (nuevos componentes, endpoints, flujos).
3. **`docs/DEV-GUIDE.md`**: Actualizar si cambian comandos, convenciones, endpoints o la plantilla Excel.
4. **`docs/README.md`**: Actualizar si cambian las descripciones o el índice de documentos.
</parameter>
</invoke>