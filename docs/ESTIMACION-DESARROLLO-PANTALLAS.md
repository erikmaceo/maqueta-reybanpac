# Estimación de Desarrollo por Pantallas — Central Access Manager (CAM)

**Cliente:** Reybanpac / Favorita Fruit Company
**Proyecto:** Central Access Manager (CAM) — Gestión de Seguridades y Accesos
**Fecha:** 2026-08-18
**Alcance:** SPA Angular (front-angular) — vista activa en desarrollo
**Referencias:** `docs/ARCHITECTURE.md`, `docs/BACKEND-API-ROUTES.md`, `docs/DEV-GUIDE.md`

---

## 1. Resumen ejecutivo

El presente documento detalla la estimación de tiempo de desarrollo **por pantalla** de la aplicación CAM, desglosada en tres componentes:

1. **Desarrollo frontend** (SPA Angular + PrimeNG).
2. **Integración con backend** (servicios REST existentes, 88 endpoints, autenticación JWT, LDAP y API Gateway).
3. **Pruebas funcionales** (QA manual de cada funcionalidad).

La estimación total asciende a **aproximadamente 957 horas** (~120 jornadas de 8 horas), lo que equivale a **~6 meses de un desarrollador full-stack** o **~3 meses con un equipo de 2 desarrolladores full-stack trabajando en paralelo**.

### Cifras clave

| Concepto | Horas | % del total |
|----------|-------|-------------|
| Desarrollo frontend | 536 h | 56 % |
| Integración con backend | 244 h | 25 % |
| Pruebas funcionales | 177 h | 19 % |
| **Total** | **957 h** | **100 %** |

---

## 2. Metodología y supuestos

- **Jornada laboral:** 8 horas efectivas por día.
- **Complejidad:** clasificada en 4 niveles (Baja, Media, Alta, Muy Alta) según número de entidades, interacciones, validaciones y casos borde.
- **Frontend:** SPA Angular 21 + PrimeNG 21, componentes standalone, señales (signals), estilos globales compartidos.
- **Backend:** API REST Express + TypeScript con datos en memoria (maqueta), 88 endpoints documentados, autenticación JWT, integración LDAP y API Gateway (WSO2).
- **Las horas incluyen:** diseño de la pantalla, componentes, validaciones, mensajería, exportación a Excel cuando aplica, y corrección de defectos detectados en las pruebas.
- **No incluye:** infraestructura de producción, alta disponibilidad, seguridad a nivel de red, ni gestión de cambio organizacional.

---

## 3. Estimación detallada por pantalla

> **Convención de unidades:** FE = desarrollo frontend, BE = integración con backend, QA = pruebas funcionales.

### 3.1 Infraestructura y base de la aplicación

| # | Pantalla | Complejidad | FE | BE | QA | Total |
|---|----------|-------------|----|----|----|-------|
| 1 | **Login y autenticación** (login, sesión, JWT) | Media | 12 h | 4 h | 4 h | **20 h** |
| 2 | **Layout y navegación** (shell, sidebar, guards, breadcrumbs, roles de acceso) | Media | 24 h | 0 h | 6 h | **30 h** |
| 3 | **Dashboard** (resumen, indicadores, accesos rápidos) | Media | 12 h | 4 h | 4 h | **20 h** |
| | *Subtotal infraestructura* | | *48 h* | *8 h* | *14 h* | ***70 h*** |

### 3.2 Catálogos y seguridades

| # | Pantalla | Complejidad | FE | BE | QA | Total |
|---|----------|-------------|----|----|----|-------|
| 4 | **Sistemas** (CRUD catálogo de aplicaciones) | Media | 20 h | 8 h | 6 h | **34 h** |
| 5 | **Seguridades** (pestañas Aplicaciones, Módulos, Programas, Controles y Perfiles; CRUD, permisos, exportación Excel, paginación) | Muy Alta | 60 h | 24 h | 16 h | **100 h** |
| 6 | **Roles** (CRUD, asignación de permisos por rol) | Media-Alta | 24 h | 12 h | 8 h | **44 h** |
| 7 | **Usuarios** (CRUD, usuarios locales + LDAP, asignación de roles, estado) | Alta | 36 h | 20 h | 12 h | **68 h** |
| 8 | **Perfiles** (lista, detalle, permisos por programa y controles por perfil) | Alta | 32 h | 12 h | 10 h | **54 h** |
| 9 | **Perfil Form** (crear/editar perfil con programas y permisos Nuevo/Modificar/Eliminar/Imprimir/Consultar) | Alta | 36 h | 12 h | 10 h | **58 h** |
| | *Subtotal catálogos y seguridades* | | *208 h* | *88 h* | *62 h* | ***358 h*** |

### 3.3 Segregación de funciones y parámetros

| # | Pantalla | Complejidad | FE | BE | QA | Total |
|---|----------|-------------|----|----|----|-------|
| 10 | **Niveles de Segregación** (niveles, nodos en árbol jerárquico, atributos dinámicos por nivel, valores por nodo, exportación Excel) | Muy Alta | 56 h | 24 h | 16 h | **96 h** |
| 11 | **Parámetros de Configuración** (países, provincias, ciudades, dispositivos móviles, fuentes de selects) | Media | 28 h | 16 h | 10 h | **54 h** |
| | *Subtotal segregación y parámetros* | | *84 h* | *40 h* | *26 h* | ***150 h*** |

### 3.4 Operación: autorización, accesos y directorio

| # | Pantalla | Complejidad | FE | BE | QA | Total |
|---|----------|-------------|----|----|----|-------|
| 12 | **Autorizador** (bandeja de solicitudes, aprobación/rechazo, comentarios) | Alta | 32 h | 16 h | 12 h | **60 h** |
| 13 | **Accesos** (consulta de accesos por usuario) | Alta | 32 h | 16 h | 12 h | **60 h** |
| 14 | **Nuevo / Editar Acceso** (asignación de nodos de segregación en árbol y perfiles; alta y edición navegable) | Alta | 32 h | 16 h | 12 h | **60 h** |
| 15 | **Acceso por dispositivo móvil** (validación de dispositivo) | Baja | 12 h | 8 h | 4 h | **24 h** |
| 16 | **Directorio LDAP** (consulta y sincronización de usuarios del directorio) | Media | 16 h | 16 h | 8 h | **40 h** |
| 17 | **Selección de Empresa / Selección de Usuario** (diálogos de búsqueda reutilizables) | Baja | 8 h | 4 h | 2 h | **14 h** |
| 18 | **Soluciones** (vista jerárquica módulo → programa → perfil por aplicación) | Media | 20 h | 8 h | 6 h | **34 h** |
| 19 | **Matriz de Acceso** (carga masiva Excel, plantilla de descarga, resumen de carga) | Media | 20 h | 12 h | 10 h | **42 h** |
| 20 | **Auditoría** (consulta de logs de actividad, filtros, exportación) | Media | 20 h | 12 h | 8 h | **40 h** |
| 21 | **Configuración** (wrapper/redirección a Niveles de Segregación) | Baja | 4 h | 0 h | 1 h | **5 h** |
| | *Subtotal operación* | | *196 h* | *108 h* | *75 h* | ***379 h*** |

---

## 4. Resumen por módulo

| Módulo | FE | BE | QA | Total |
|--------|----|----|----|-------|
| Infraestructura y base | 48 h | 8 h | 14 h | **70 h** |
| Catálogos y seguridades | 208 h | 88 h | 62 h | **358 h** |
| Segregación y parámetros | 84 h | 40 h | 26 h | **150 h** |
| Operación y accesos | 196 h | 108 h | 75 h | **379 h** |
| **Total** | **536 h** | **244 h** | **177 h** | **957 h** |

### Conversión a tiempo calendario

| Equipo | Horas | Jornadas (8 h) | Meses calendario* |
|--------|-------|----------------|-------------------|
| 1 desarrollador full-stack | 957 h | ~120 | ~6 meses |
| 2 desarrolladores full-stack | 957 h | ~60 | ~3 meses |

\*Considerando un 80 % de eficiencia (reuniones, contextos, imprevistos) y sin contar la fase de pruebas integrales UAT final (~10 % adicional).

---

## 5. Desglose de integración con backend por servicio

La integración se basa en la API existente (88 endpoints: 26 GET, 27 POST, 19 PUT, 16 DELETE). Los tiempos de integración más significativos corresponden a:

| Servicio / Endpoint | Horas BE | Pantallas afectadas |
|---------------------|----------|---------------------|
| Seguridades CRUD (`/api/seg-*`) + exportación | 24 h | Seguridades, Perfiles, Perfil Form |
| Segregación dinámica (`/api/niveles-segregacion`, `/api/nodos-segregacion`, `/api/nodos-segregacion/arbol`, atributos) | 24 h | Niveles de Segregación, Nuevo/Editar Acceso |
| Usuarios y roles (`/api/usuarios`, `/api/roles`, acceso por usuario) | 20 h | Usuarios, Roles, Accesos |
| Autorizador y solicitudes de acceso | 16 h | Autorizador, Accesos, Nuevo/Editar Acceso |
| Parámetros (países, provincias, ciudades, dispositivos) | 16 h | Parámetros, Acceso por dispositivo |
| Directorio LDAP | 16 h | Directorio LDAP, Usuarios |
| Matriz de Acceso (upload XLSX con multer) | 12 h | Matriz de Acceso |
| Auditoría (logs) | 12 h | Auditoría |
| API Gateway (autenticación OAuth2, scopes, validación runtime) | — | Aplica a todas las pantallas como requisito transversal de terceros |

---

## 6. Fases sugeridas para la entrega

| Fase | Contenido | Horas | Duración (2 devs) |
|------|-----------|-------|-------------------|
| **Fase 1 — Base** | Login, Layout, Dashboard, guards | 70 h | ~1 semana |
| **Fase 2 — Seguridades** | Sistemas, Seguridades, Roles, Usuarios | 246 h | ~2–3 semanas |
| **Fase 3 — Perfiles** | Perfiles, Perfil Form | 112 h | ~1 semana |
| **Fase 4 — Segregación** | Niveles de Segregación, Parámetros | 150 h | ~1–2 semanas |
| **Fase 5 — Operación** | Autorizador, Accesos, Nuevo/Editar Acceso, Directorio, Dispositivos, Matriz, Auditoría, Soluciones | 379 h | ~3 semanas |
| **UAT / estabilización** | Pruebas integrales con el cliente, ajustes | ~100 h | ~1 semana |

---

## 7. Supuestos y riesgos

- **Backend en memoria:** la API actual persiste datos en memoria (maqueta). Al conectar una base de datos real se debe reservar tiempo adicional (~10–15 % del total) para ajustes en consultas y transacciones.
- **LDAP:** los tiempos asumen acceso al directorio corporativo real de Reybanpac para pruebas.
- **API Gateway / WSO2:** el despliegue en WSO2 API Manager y Kubernetes no está incluido en las horas por pantalla; es una actividad transversal de infraestructura.
- **Exportaciones Excel:** estimadas por pantalla; si se requieren plantillas corporativas con formatos específicos, añadir +2 h por pantalla.
- **Riesgo principal:** cambios de alcance en los flujos de aprobación del Autorizador y en la definición de segregación de funciones (niveles y atributos) pueden ampliar la Fase 5 en hasta un 20 %.

---

## 8. Documentos de referencia

| Documento | Descripción |
|-----------|-------------|
| `docs/ARCHITECTURE.md` | Arquitectura general (SPA React/Angular, backend Express, LDAP) |
| `docs/BACKEND-API-ROUTES.md` | Inventario de los 88 endpoints del backend |
| `docs/DATABASE-MODEL.md` | Modelo de datos |
| `docs/DEV-GUIDE.md` | Guía de desarrollo, rutas y endpoints |
| `docs/API-GATEWAY-DISCOVERY.md` | Documentación del API Gateway para consumidores |
| `docs/CHANGES.md` | Registro de cambios del proyecto |
