## Context

El sidebar está definido en `layout.component.ts` mediante el arreglo `NAV_ITEMS`, donde cada item declara `path`, `label`, `icon`, `group` y flags opcionales (`adminOnly`, `hidden`). La entrada con `path: '/seguridades'` muestra hoy la etiqueta "Seguridades". La sección es funcionalmente la gestión de Aplicaciones/Módulos/Programas, por lo que se renombra solo la etiqueta visible.

## Goals / Non-Goals

**Goals:**
- Mostrar "Aplicaciones" como etiqueta del item del sidebar que apunta a `/seguridades`.
- Mantener intactos ruta, icono, grupo, orden y `adminOnly` del item.

**Non-Goals:**
- No renombrar rutas, títulos de `PAGE_META`, breadcrumbs, ni textos internos de pantallas (`security.component.ts`, etc.).
- No tocar el item oculto `/aplicaciones` ni la página `/aplicaciones`.

## Decisions

1. **Cambio mínimo de literal en `NAV_ITEMS`**: se sustituye `label: 'Seguridades'` por `label: 'Aplicaciones'` en el item con `path: '/seguridades'`.
   - Alternativa considerada: renombrar también `PAGE_META['/seguridades']` y el `<h1>` de la pantalla; descartada porque el requerimiento es solo la etiqueta del sidebar y mantiene el alcance acotado y verificable.
2. **Sin cambio de componente NI18N**: el proyecto usa etiquetas hardcodeadas en `NAV_ITEMS`; no hay infraestructura de i18n que tocar.
3. **Verificación por build**: al ser un cambio de plantilla/literal, la verificación es compilar y revisar visualmente el sidebar.

## Risks / Trade-offs

- Confusión temporal entre la etiqueta "Aplicaciones" del sidebar y títulos de página que aún dicen "Seguridades" → Mitigación: el alcance solicitado es solo el sidebar; cualquier renombrado adicional quedará documentado como cambio futuro.
- Riesgo de tocar el item oculto `/aplicaciones` por similitud de nombre → Mitigación: la edición se limita exactamente a la línea del item `/seguridades`.