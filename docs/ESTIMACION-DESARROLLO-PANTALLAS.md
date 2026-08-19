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

La estimación total asciende a **aproximadamente 907 horas** (~113 jornadas de 8 horas), lo que equivale a **~6 meses de un desarrollador full-stack** o **~3 meses con un equipo de 2 desarrolladores full-stack trabajando en paralelo**.

### Cifras clave

| Concepto | Horas | % del total |
|----------|-------|-------------|
| Desarrollo frontend | 508 h | 56 % |
| Integración con backend | 232 h | 26 % |
| Pruebas funcionales | 167 h | 18 % |
| **Total** | **907 h** | **100 %** |

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
| 12 | **Accesos** (consulta de accesos por usuario) | Alta | 32 h | 16 h | 12 h | **60 h** |
| 13 | **Nuevo / Editar Acceso** (asignación de nodos de segregación en árbol y perfiles; alta y edición navegable) | Alta | 32 h | 16 h | 12 h | **60 h** |
| 14 | **Acceso por dispositivo móvil** (validación de dispositivo) | Baja | 12 h | 8 h | 4 h | **24 h** |
| 15 | **Directorio LDAP** (consulta y sincronización de usuarios del directorio) | Media | 16 h | 16 h | 8 h | **40 h** |
| 16 | **Selección de Empresa / Selección de Usuario** (diálogos de búsqueda reutilizables) | Baja | 8 h | 4 h | 2 h | **14 h** |
| 17 | **Ordenar Soluciones** (jerarquía por aplicación con arrastrar y soltar: módulos, programas y controles; botón "Actualizar Orden") | Media-Alta | 24 h | 12 h | 8 h | **44 h** |
| 18 | **Matriz de Acceso** (carga masiva Excel, plantilla de descarga, resumen de carga) | Media | 20 h | 12 h | 10 h | **42 h** |
| 19 | **Auditoría** (consulta de logs de actividad, filtros, exportación) | Media | 20 h | 12 h | 8 h | **40 h** |
| 20 | **Configuración** (wrapper/redirección a Niveles de Segregación) | Baja | 4 h | 0 h | 1 h | **5 h** |
| | *Subtotal operación* | | *168 h* | *96 h* | *65 h* | ***329 h*** |

---

## 4. Diálogos de gestión de entidades

Los diálogos de creación, edición, búsqueda y carga masiva son componentes que se ejecutan dentro de las pantallas de la sección 3. A continuación se desglosan los **33 diálogos** de gestión de entidades con su propia estimación (FE/BE/QA).

> **Nota:** las horas de estos diálogos ya están incluidas dentro de la estimación de las pantallas correspondientes (sección 3). Se presentan aquí como detalle de su desarrollo y **no se suman** al total general para evitar doble contabilización.

| # | Pantalla | Diálogo | Complejidad | FE | BE | QA | Total |
|---|----------|---------|-------------|----|----|----|-------|
| 1 | Seguridades | Nueva/Editar Aplicación | Media | 8 h | 3 h | 2 h | **13 h** |
| 2 | Seguridades | Nueva/Editar Módulo | Media | 8 h | 3 h | 2 h | **13 h** |
| 3 | Seguridades | Nueva/Editar Programa (con controles dinámicos) | Alta | 14 h | 5 h | 4 h | **23 h** |
| 4 | Seguridades | Carga masiva de aplicaciones (Excel) | Media | 8 h | 5 h | 3 h | **16 h** |
| 5 | Seguridades | Buscar aplicación (×2) | Baja | 8 h | 2 h | 2 h | **12 h** |
| 6 | Seguridades | Buscar módulo | Baja | 4 h | 1 h | 1 h | **6 h** |
| 7 | Seguridades | Buscar nodo de segregación (árbol) | Media | 6 h | 2 h | 2 h | **10 h** |
| | *Subtotal Seguridades* | | | *56 h* | *21 h* | *16 h* | ***93 h*** |
| 8 | Niveles de Segregación | Nuevo/Editar Nivel | Media | 8 h | 3 h | 2 h | **13 h** |
| 9 | Niveles de Segregación | Nuevo/Editar Nodo (con atributos dinámicos) | Alta | 14 h | 5 h | 4 h | **23 h** |
| 10 | Niveles de Segregación | Nuevo/Editar Atributo | Alta | 12 h | 5 h | 4 h | **21 h** |
| 11 | Niveles de Segregación | Carga masiva de nodos (Excel) | Media | 8 h | 5 h | 3 h | **16 h** |
| 12 | Niveles de Segregación | Confirmar carga masiva | Baja | 3 h | 1 h | 1 h | **5 h** |
| | *Subtotal Niveles de Segregación* | | | *45 h* | *19 h* | *14 h* | ***78 h*** |
| 13 | Parámetros de Configuración | Nuevo/Editar País | Baja | 5 h | 2 h | 1 h | **8 h** |
| 14 | Parámetros de Configuración | Nueva/Editar Provincia | Baja | 5 h | 2 h | 1 h | **8 h** |
| 15 | Parámetros de Configuración | Nueva/Editar Ciudad | Baja | 5 h | 2 h | 1 h | **8 h** |
| 16 | Parámetros de Configuración | Nuevo/Editar Dispositivo Móvil | Media | 8 h | 3 h | 2 h | **13 h** |
| | *Subtotal Parámetros* | | | *23 h* | *9 h* | *5 h* | ***37 h*** |
| 17 | Usuarios | Nuevo usuario | Alta | 12 h | 5 h | 4 h | **21 h** |
| 18 | Usuarios | Editar usuario | Alta | 12 h | 5 h | 4 h | **21 h** |
| 19 | Usuarios | Asignar roles | Media | 8 h | 3 h | 2 h | **13 h** |
| | *Subtotal Usuarios* | | | *32 h* | *13 h* | *10 h* | ***55 h*** |
| 20 | Sistemas | Nuevo/Editar Sistema | Media | 8 h | 3 h | 2 h | **13 h** |
| 21 | Sistemas | Detalle de accesos del sistema | Media | 8 h | 3 h | 2 h | **13 h** |
| | *Subtotal Sistemas* | | | *16 h* | *6 h* | *4 h* | ***26 h*** |
| 22 | Perfiles | Carga masiva de perfiles (Excel) | Media | 8 h | 5 h | 3 h | **16 h** |
| 23 | Perfiles | Permisos del Programa | Media | 8 h | 3 h | 2 h | **13 h** |
| | *Subtotal Perfiles* | | | *16 h* | *8 h* | *5 h* | ***29 h*** |
| 24 | Perfil Form | Buscar aplicación | Baja | 4 h | 1 h | 1 h | **6 h** |
| 25 | Perfil Form | Buscar módulo | Baja | 4 h | 1 h | 1 h | **6 h** |
| 26 | Perfil Form | Buscar programa | Baja | 4 h | 1 h | 1 h | **6 h** |
| | *Subtotal Perfil Form* | | | *12 h* | *3 h* | *3 h* | ***18 h*** |
| 27 | User Access | Carga masiva de accesos (Excel) | Media | 8 h | 5 h | 3 h | **16 h** |
| 28 | Directorio | Importar usuario desde LDAP | Media | 8 h | 4 h | 2 h | **14 h** |
| 29 | Device Access | Nuevo/Editar Acceso (dispositivo) | Media | 8 h | 4 h | 3 h | **15 h** |
| 30 | Device Access | Buscar usuario | Baja | 4 h | 1 h | 1 h | **6 h** |
| 31 | Device Access | Buscar dispositivo móvil | Baja | 4 h | 1 h | 1 h | **6 h** |
| | *Subtotal Device Access* | | | *16 h* | *6 h* | *5 h* | ***27 h*** |
| | **Total diálogos (33)** | | | **232 h** | **94 h** | **67 h** | **393 h** |

> **Nota:** la pantalla **Autorizador** (eliminada del alcance) contendría 3 diálogos adicionales (Aprobar solicitud, Rechazar solicitud y Nueva solicitud, ~16 h FE / 8 h BE / 6 h QA ≈ 30 h), que no se incluyen.

---

## 5. Resumen por módulo

| Módulo | FE | BE | QA | Total |
|--------|----|----|----|-------|
| Infraestructura y base | 48 h | 8 h | 14 h | **70 h** |
| Catálogos y seguridades | 208 h | 88 h | 62 h | **358 h** |
| Segregación y parámetros | 84 h | 40 h | 26 h | **150 h** |
| Operación y accesos | 168 h | 96 h | 65 h | **329 h** |
| **Total** | **508 h** | **232 h** | **167 h** | **907 h** |

### Conversión a tiempo calendario

| Equipo | Horas | Jornadas (8 h) | Meses calendario* |
|--------|-------|----------------|-------------------|
| 1 desarrollador full-stack | 907 h | ~113 | ~6 meses |
| 2 desarrolladores full-stack | 907 h | ~57 | ~3 meses |

\*Considerando un 80 % de eficiencia (reuniones, contextos, imprevistos) y sin contar la fase de pruebas integrales UAT final (~10 % adicional).

---

## 6. Desglose de integración con backend por servicio

La integración se basa en la API existente (88 endpoints: 26 GET, 27 POST, 19 PUT, 16 DELETE). Los tiempos de integración más significativos corresponden a:

| Servicio / Endpoint | Horas BE | Pantallas afectadas |
|---------------------|----------|---------------------|
| Seguridades CRUD (`/api/seg-*`) + exportación | 24 h | Seguridades, Perfiles, Perfil Form |
| Segregación dinámica (`/api/niveles-segregacion`, `/api/nodos-segregacion`, `/api/nodos-segregacion/arbol`, atributos) | 24 h | Niveles de Segregación, Nuevo/Editar Acceso |
| Usuarios y roles (`/api/usuarios`, `/api/roles`, acceso por usuario) | 20 h | Usuarios, Roles, Accesos |
| Parámetros (países, provincias, ciudades, dispositivos) | 16 h | Parámetros, Acceso por dispositivo |
| Directorio LDAP | 16 h | Directorio LDAP, Usuarios |
| Matriz de Acceso (upload XLSX con multer) | 12 h | Matriz de Acceso |
| Auditoría (logs) | 12 h | Auditoría |
| Reordenamiento de jerarquía (`PUT /api/seg-*/reordenar`, gateway `/aplicaciones/:codigo/orden`) | 12 h | Ordenar Soluciones |
| API Gateway (autenticación OAuth2, scopes, validación runtime) | — | Aplica a todas las pantallas como requisito transversal de terceros |

---

## 7. Fases sugeridas para la entrega

| Fase | Contenido | Horas | Duración (2 devs) |
|------|-----------|-------|-------------------|
| **Fase 1 — Base** | Login, Layout, Dashboard, guards | 70 h | ~1 semana |
| **Fase 2 — Seguridades** | Sistemas, Seguridades, Roles, Usuarios | 246 h | ~2–3 semanas |
| **Fase 3 — Perfiles** | Perfiles, Perfil Form | 112 h | ~1 semana |
| **Fase 4 — Segregación** | Niveles de Segregación, Parámetros | 150 h | ~1–2 semanas |
| **Fase 5 — Operación** | Accesos, Nuevo/Editar Acceso, Directorio, Dispositivos, Ordenar Soluciones, Matriz, Auditoría, Configuración | 329 h | ~2–3 semanas |
| **Fase 6 — UAT / Estabilización** (Pruebas de Aceptación de Usuario) | Pruebas integrales con el cliente, ajustes | ~90 h | ~1 semana |

---

## 8. Supuestos y riesgos

- **Backend en memoria:** la API actual persiste datos en memoria (maqueta). Al conectar una base de datos real se debe reservar tiempo adicional (~10–15 % del total) para ajustes en consultas y transacciones.
- **LDAP:** los tiempos asumen acceso al directorio corporativo real de Reybanpac para pruebas.
- **API Gateway / WSO2:** el despliegue en WSO2 API Manager y Kubernetes no está incluido en las horas por pantalla; es una actividad transversal de infraestructura.
- **Exportaciones Excel:** estimadas por pantalla; si se requieren plantillas corporativas con formatos específicos, añadir +2 h por pantalla.
- **Riesgo principal:** cambios de alcance en la definición de segregación de funciones (niveles y atributos) pueden ampliar la Fase 4/5 en hasta un 20 %.

---

## 9. Documentos de referencia

| Documento | Descripción |
|-----------|-------------|
| `docs/ARCHITECTURE.md` | Arquitectura general (SPA React/Angular, backend Express, LDAP) |
| `docs/BACKEND-API-ROUTES.md` | Inventario de los 88 endpoints del backend |
| `docs/DATABASE-MODEL.md` | Modelo de datos |
| `docs/DEV-GUIDE.md` | Guía de desarrollo, rutas y endpoints |
| `docs/API-GATEWAY-DISCOVERY.md` | Documentación del API Gateway para consumidores |
| `docs/CHANGES.md` | Registro de cambios del proyecto |
