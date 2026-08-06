# Inventario de APIs y Rutas del Backend

> **Backend:** `backend/src/index.ts` (Express 4 + TypeScript)
> 
> **Total de rutas registradas:** 88
> - `GET`: 26
> - `POST`: 27
> - `PUT`: 19
> - `DELETE`: 16

---

## 1. Autenticación (`/api/auth`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| POST | `/api/auth/login` | — | Login de usuarios locales con usuario y contraseña. |
| POST | `/api/auth/logout` | `requireAuth` | Cierra la sesión actual (elimina token de la sesión en memoria). |
| GET | `/api/auth/me` | `requireAuth` | Devuelve el usuario autenticado y si es administrador global. |

**Total: 3 rutas**

---

## 2. Dashboard / Estadísticas

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/stats` | `requireAuth` | Resumen de contadores para el dashboard. |

**Total: 1 ruta**

---

## 3. Sistemas (`/api/systems`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/systems` | `requireAuth` | Lista todos los sistemas/aplicaciones gobernadas. |
| POST | `/api/systems` | `requireAuth`, `requireGlobalAdmin` | Crea un nuevo sistema. |
| PUT | `/api/systems/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza un sistema. |
| DELETE | `/api/systems/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina un sistema en cascada (roles, permisos, solicitudes, grants). |

**Total: 4 rutas**

---

## 4. Permisos (`/api/permissions`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/permissions` | `requireAuth` | Lista permisos, opcionalmente filtrados por `systemId`. |
| POST | `/api/permissions` | `requireAuth`, `requireGlobalAdmin` | Crea un nuevo permiso/acceso. |

**Total: 2 rutas**

---

## 5. Roles (`/api/roles`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/roles` | `requireAuth` | Lista todos los roles. |
| POST | `/api/roles` | `requireAuth`, `requireGlobalAdmin` | Crea un rol (con `isAdmin` y acceso completo opcional). |
| PUT | `/api/roles/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza un rol. |
| DELETE | `/api/roles/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina un rol (no permite eliminar roles administradores). |

**Total: 4 rutas**

---

## 6. Usuarios (`/api/users`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/users` | `requireAuth` | Lista usuarios, filtrables por `type` y `source`. |
| POST | `/api/users` | `requireAuth`, `requireGlobalAdmin` | Crea un usuario local o LDAP. |
| PUT | `/api/users/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza datos de un usuario (no permite cambiar `roleIds`). |
| DELETE | `/api/users/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina un usuario y sus sesiones. |
| PUT | `/api/users/:id/roles` | `requireAuth`, `requireGlobalAdmin` | Asigna roles a un usuario. |

**Total: 5 rutas**

---

## 7. Acceso por Usuario (`/api/user-access`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/user-access` | `requireAuth`, `requireGlobalAdmin` | Lista usuarios con sus accesos (nodos + perfiles). |
| PUT | `/api/user-access/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza nodos y perfiles de un usuario. |
| POST | `/api/user-access/bulk` | `requireAuth`, `requireGlobalAdmin` | Carga masiva de accesos por usuario. |

**Total: 3 rutas**

---

## 8. LDAP (`/api/ldap`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/ldap/users` | `requireAuth` | Consulta usuarios corporativos desde LDAP (o fallback). |
| POST | `/api/ldap/import` | `requireAuth`, `requireGlobalAdmin` | Importa un usuario LDAP a la consola. |

**Total: 2 rutas**

---

## 9. Solicitudes / Autorizador (`/api/requests`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/requests` | `requireAuth` | Lista solicitudes de acceso, filtrables por `status`. |
| POST | `/api/requests` | `requireAuth` | Crea una solicitud de acceso a un rol. |
| POST | `/api/requests/:id/approve` | `requireAuth` | Aprueba una solicitud (solo autorizador o admin global). |
| POST | `/api/requests/:id/reject` | `requireAuth` | Rechaza una solicitud (solo autorizador o admin global). |

**Total: 4 rutas**

---

## 10. Accesos Efectivos (`/api/grants`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/grants` | `requireAuth` | Lista todos los accesos efectivos vigentes. |
| DELETE | `/api/grants/:id` | `requireAuth`, `requireGlobalAdmin` | Revoca un acceso efectivo. |

**Total: 2 rutas**

---

## 11. Auditoría (`/api/audit`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/audit` | `requireAuth` | Consulta logs de auditoría con filtros y paginación. |

**Total: 1 ruta**

---

## 12. Administración (`/api/admin`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| POST | `/api/admin/reset` | `requireAuth`, `requireGlobalAdmin` | Reinicia la base de datos en memoria a los datos semilla. |

**Total: 1 ruta**

---

## 13. Health Check

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/health` | — | Verificación de salud del servicio. |

**Total: 1 ruta**

---

## 14. Seguridades — Aplicaciones (`/api/seg-aplicaciones`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/seg-aplicaciones` | `requireAuth` | Lista aplicaciones de seguridades. |
| POST | `/api/seg-aplicaciones` | `requireAuth`, `requireGlobalAdmin` | Crea una aplicación. |
| PUT | `/api/seg-aplicaciones/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza una aplicación. |
| DELETE | `/api/seg-aplicaciones/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina aplicación en cascada (módulos, programas, perfiles). |
| POST | `/api/seg-aplicaciones/bulk` | `requireAuth`, `requireGlobalAdmin` | Carga masiva de aplicaciones, módulos y programas desde Excel. |

**Total: 5 rutas**

---

## 15. Seguridades — Módulos (`/api/seg-modulos`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/seg-modulos` | `requireAuth` | Lista módulos ordenados. |
| POST | `/api/seg-modulos` | `requireAuth`, `requireGlobalAdmin` | Crea un módulo. |
| PUT | `/api/seg-modulos/reordenar` | `requireAuth`, `requireGlobalAdmin` | Reordena módulos. |
| PUT | `/api/seg-modulos/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza un módulo. |
| DELETE | `/api/seg-modulos/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina un módulo en cascada. |

**Total: 5 rutas**

---

## 16. Seguridades — Programas (`/api/seg-programas`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/seg-programas` | `requireAuth` | Lista programas ordenados. |
| POST | `/api/seg-programas` | `requireAuth`, `requireGlobalAdmin` | Crea un programa (posiblemente con controles). |
| PUT | `/api/seg-programas/reordenar` | `requireAuth`, `requireGlobalAdmin` | Reordena programas. |
| PUT | `/api/seg-programas/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza un programa y sus controles. |
| DELETE | `/api/seg-programas/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina un programa en cascada. |

**Total: 5 rutas**

---

## 17. Seguridades — Perfiles (`/api/seg-perfiles`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/seg-perfiles` | `requireAuth` | Lista perfiles. |
| POST | `/api/seg-perfiles` | `requireAuth`, `requireGlobalAdmin` | Crea un perfil con programas y permisos. |
| PUT | `/api/seg-perfiles/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza un perfil. |
| DELETE | `/api/seg-perfiles/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina un perfil. |
| POST | `/api/seg-perfiles/bulk` | `requireAuth`, `requireGlobalAdmin` | Carga masiva de perfiles desde Excel. |

**Total: 5 rutas**

---

## 18. Seguridades — Controles (`/api/seg-controles`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/seg-controles` | `requireAuth` | Lista controles ordenados. |
| PUT | `/api/seg-controles/reordenar` | `requireAuth`, `requireGlobalAdmin` | Reordena controles. |
| DELETE | `/api/seg-controles/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina un control. |

**Total: 3 rutas**

---

## 19. Seguridades — Matriz de Acceso (`/api/seg-matriz`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| POST | `/api/seg-matriz/upload` | `requireAuth`, `requireGlobalAdmin`, `upload.single('file')` | Carga la matriz de acceso completa desde Excel. |

**Total: 1 ruta**

---

## 20. Segregación — Niveles (`/api/niveles-segregacion`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/niveles-segregacion` | `requireAuth` | Lista niveles de segregación. |
| POST | `/api/niveles-segregacion` | `requireAuth`, `requireGlobalAdmin` | Crea un nivel de segregación. |
| PUT | `/api/niveles-segregacion/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza un nivel. |
| DELETE | `/api/niveles-segregacion/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina un nivel en cascada. |

**Total: 4 rutas**

---

## 21. Segregación — Nodos (`/api/nodos-segregacion`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/nodos-segregacion` | `requireAuth` | Lista nodos de segregación. |
| GET | `/api/nodos-segregacion/arbol` | `requireAuth` | Devuelve la jerarquía de nodos como árbol. |
| GET | `/api/nodos-atributo-valor` | `requireAuth` | Lista valores de atributos de los nodos. |
| POST | `/api/nodos-segregacion` | `requireAuth`, `requireGlobalAdmin` | Crea un nodo. |
| POST | `/api/nodos-segregacion/bulk` | `requireAuth`, `requireGlobalAdmin` | Carga masiva de nodos desde Excel. |
| PUT | `/api/nodos-segregacion/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza un nodo. |
| DELETE | `/api/nodos-segregacion/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina un nodo. |

**Total: 7 rutas**

---

## 22. Segregación — Atributos de Nivel (`/api/niveles-atributos`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/niveles-atributos` | `requireAuth` | Lista atributos configurados por nivel. |
| POST | `/api/niveles-atributos` | `requireAuth`, `requireGlobalAdmin` | Crea un atributo. |
| PUT | `/api/niveles-atributos/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza un atributo. |
| DELETE | `/api/niveles-atributos/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina un atributo. |

**Total: 4 rutas**

---

## 23. Parámetros — Países (`/api/param-paises`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/param-paises` | `requireAuth` | Lista países. |
| POST | `/api/param-paises` | `requireAuth`, `requireGlobalAdmin` | Crea un país. |
| PUT | `/api/param-paises/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza un país. |
| DELETE | `/api/param-paises/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina un país. |

**Total: 4 rutas**

---

## 24. Parámetros — Provincias (`/api/param-provincias`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/param-provincias` | `requireAuth` | Lista provincias. |
| POST | `/api/param-provincias` | `requireAuth`, `requireGlobalAdmin` | Crea una provincia. |
| PUT | `/api/param-provincias/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza una provincia. |
| DELETE | `/api/param-provincias/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina una provincia. |

**Total: 4 rutas**

---

## 25. Parámetros — Ciudades (`/api/param-ciudades`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/param-ciudades` | `requireAuth` | Lista ciudades. |
| POST | `/api/param-ciudades` | `requireAuth`, `requireGlobalAdmin` | Crea una ciudad. |
| PUT | `/api/param-ciudades/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza una ciudad. |
| DELETE | `/api/param-ciudades/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina una ciudad. |

**Total: 4 rutas**

---

## 26. Parámetros — Dispositivos Móviles (`/api/param-dispositivos-moviles`)

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/api/param-dispositivos-moviles` | `requireAuth` | Lista dispositivos móviles. |
| POST | `/api/param-dispositivos-moviles` | `requireAuth`, `requireGlobalAdmin` | Crea un dispositivo móvil. |
| PUT | `/api/param-dispositivos-moviles/:id` | `requireAuth`, `requireGlobalAdmin` | Actualiza un dispositivo móvil. |
| DELETE | `/api/param-dispositivos-moviles/:id` | `requireAuth`, `requireGlobalAdmin` | Elimina un dispositivo móvil. |

**Total: 4 rutas**

---

## Resumen por Grupo Funcional

| Grupo Funcional | Prefijo | Rutas |
|-----------------|---------|-------|
| Autenticación | `/api/auth` | 3 |
| Dashboard | `/api/stats` | 1 |
| Sistemas | `/api/systems` | 4 |
| Permisos | `/api/permissions` | 2 |
| Roles | `/api/roles` | 4 |
| Usuarios | `/api/users` | 5 |
| Acceso por Usuario | `/api/user-access` | 3 |
| LDAP | `/api/ldap` | 2 |
| Solicitudes | `/api/requests` | 4 |
| Grants | `/api/grants` | 2 |
| Auditoría | `/api/audit` | 1 |
| Admin | `/api/admin` | 1 |
| Health | `/api/health` | 1 |
| Seguridades — Aplicaciones | `/api/seg-aplicaciones` | 5 |
| Seguridades — Módulos | `/api/seg-modulos` | 5 |
| Seguridades — Programas | `/api/seg-programas` | 5 |
| Seguridades — Perfiles | `/api/seg-perfiles` | 5 |
| Seguridades — Controles | `/api/seg-controles` | 3 |
| Seguridades — Matriz | `/api/seg-matriz` | 1 |
| Segregación — Niveles | `/api/niveles-segregacion` | 4 |
| Segregación — Nodos | `/api/nodos-segregacion` + `/api/nodos-atributo-valor` | 7 |
| Segregación — Atributos | `/api/niveles-atributos` | 4 |
| Parámetros — Países | `/api/param-paises` | 4 |
| Parámetros — Provincias | `/api/param-provincias` | 4 |
| Parámetros — Ciudades | `/api/param-ciudades` | 4 |
| Parámetros — Dispositivos Móviles | `/api/param-dispositivos-moviles` | 4 |
| **Total** | | **88** |

---

## Resumen por Método HTTP

| Método | Cantidad |
|--------|----------|
| GET | 26 |
| POST | 27 |
| PUT | 19 |
| DELETE | 16 |
| **Total** | **88** |

---

## Notas

- Todas las rutas protegidas usan `requireAuth` para validar el token Bearer.
- Las operaciones de escritura (crear, actualizar, eliminar) también requieren `requireGlobalAdmin`.
- Las excepciones son:
  - `POST /api/auth/login` y `GET /api/health` son públicas.
  - `POST /api/requests` permite crear solicitudes a cualquier usuario autenticado.
  - `POST /api/requests/:id/approve` y `POST /api/requests/:id/reject` validan internamente que el usuario sea el autorizador del rol o un administrador global.
