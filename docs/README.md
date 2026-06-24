# Documentación — Central Access Manager (Reybanpac)

Esta carpeta contiene la documentación del proyecto CAM (Central Access Manager) para Reybanpac / Favorita Fruit Company.

## Índice de documentos

| Documento | Descripción |
|-----------|-------------|
| [**CHANGES.md**](./CHANGES.md) | Registro cronológico de todos los cambios realizados en el proyecto. Se actualiza con cada nueva modificación. |
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | Arquitectura del sistema: componentes, modelo de datos, flujos principales y diagrama. |
| [**DEV-GUIDE.md**](./DEV-GUIDE.md) | Guía de desarrollo: comandos, convenciones de código, endpoints, solución de problemas. |

## Cómo mantener esta documentación

Cada vez que se realice un cambio en el proyecto:

1. **`CHANGES.md`**: Agregar una entrada nueva al final con:
   - Fecha (YYYY-MM-DD)
   - Título del cambio
   - Resumen
   - Cambios realizados (bullet points)
   - Archivos modificados (tabla)
   - Notas técnicas (opcional)

2. **`ARCHITECTURE.md`**: Actualizar sólo si cambia la arquitectura (nuevos componentes, endpoints, flujos o entidades).

3. **`DEV-GUIDE.md`**: Actualizar si cambian:
   - Comandos de arranque
   - Convenciones de código
   - Nuevos endpoints
   - Estructura de la plantilla Excel
   - Solución de problemas

4. **Este README**: Actualizar sólo si se agregan o eliminan documentos de la carpeta `docs/`.

## Resumen del proyecto

CAM es una consola de gobierno de accesos centralizado para Reybanpac. Permite:

- Administrar aplicaciones, módulos, programas (con tipo) y perfiles (Seguridades).
- Cargar masivamente la jerarquía de seguridades desde Excel (Matriz de Acceso).
- Ver la jerarquía por aplicación (Soluciones).
- Gestionar usuarios locales y LDAP.
- Administrar roles y accesos.
- Aprobar/rechazar solicitudes de acceso.
- Consultar accesos efectivos y auditoría.

**Stack**: Angular 21 + PrimeNG (frontend) / Express + TypeScript (backend) / OpenLDAP / Docker.

**Login de prueba**: `ctudela` / `admin123`
</parameter>
</invoke>