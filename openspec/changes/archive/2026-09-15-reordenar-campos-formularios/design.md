## Context

Las tarjetas de captura de Seguridades (`AplicacionFormComponent`, `ModuloFormComponent`, `ProgramaFormComponent`) usan un `.form-grid` (grid de 2 columnas, 1 columna en viewports ≤600px) solo para el par Código/Nombre; el resto de campos son `<div class="field">` independientes que ocupan el ancho completo. El objetivo es agrupar los campos homogéneos en pares lado a lado y dejar `Descripción` como último campo de ancho completo.

## Goals / Non-Goals

**Goals:**
- Aplicación: fila Código+Nombre; fila Estado+Nodo de Segregación; Descripción al final.
- Módulo: fila Código+Nombre; fila Aplicación(búsqueda)+Estado; Descripción al final.
- Programa: fila Código+Nombre; fila Aplicación(búsqueda)+Módulo(búsqueda); fila Tipo+Estado; Descripción al final; controles después de Descripción cuando apliquen.
- Mantener comportamiento, validaciones y diálogos de búsqueda intactos.

**Non-Goals:**
- No cambiar CSS global (`.form-grid`, `.field`, `.search-field` ya cubren el layout deseado).
- No tocar lógica de guardado ni los diálogos de búsqueda.

## Decisions

1. **Reutilizar `.form-grid` para los nuevos pares** — envolver los pares Estado+Nodo de Segregación (Aplicación), Aplicación+Estado (Módulo) y Aplicación+Módulo, Tipo+Estado (Programa) en `<div class="form-grid">`, igual que el par Código/Nombre. `.form-grid` ya es responsive (2 columnas → 1 en móvil) y da `gap: 0 16px` sin requerir estilos nuevos.
   - *Por qué*: cero CSS adicional y consistencia visual con el patrón existente.
   - *Alternativas consideradas*: inline-flex / `flex: 1` por campo; se descartan por duplicar lógica de layout ya resuelta en `.form-grid`.
2. **Descripción siempre al final, ancho completo** — mover el bloque `<textarea>` después de los pares en las tres plantillas.
3. **Programa: los controles van después de Descripción** — la sección `Controles del Programa` (condicional según tipo) permanece después del campo Descripción, conservando su markup y estilos.

## Risks / Trade-offs

- En viewports ≤600px los pares colapsan a 1 columna → Mitigación: es el comportamiento existente de `.form-grid`, sin regresión.
- Los campos de búsqueda (con botón) ocupan media columna: a 2 columnas puede quedar estrecho si la tarjeta es angosta → Mitigación: se conservan van 16px de separación y la definición existente de `.search-field` (input flexible + botón); se validará visualmente en la verificación.