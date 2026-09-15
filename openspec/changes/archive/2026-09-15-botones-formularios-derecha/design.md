## Context

Las pantallas de captura creadas en `pantallas-seguridades-crud` (`AplicacionFormComponent`, `ModuloFormComponent` y `ProgramaFormComponent`) renderizan sus botones de acción en un `<div class="form-actions">` dentro de la tarjeta. Ninguna de las tres componentes define estilos para `.form-actions`, por lo que el bloque queda alineado a la izquierda (comportamiento por defecto de un div). El resto de formularios del sistema (p. ej. `perfil-form`, `access-create`, `perfil-permissions`) ya alinean este bloque a la derecha mediante una regla css `.form-actions { display: flex; justify-content: flex-end; gap: 12px; }`. Componentes de selección (`perfil-select`, `nodo-select`, `empresa-select`) usan `gap: 5px` inline.

## Goals / Non-Goals

**Goals:**
- Alinear a la derecha los botones "Cancelar" y "Crear/Guardar" en las tres pantallas nuevas de Seguridades.
- Separación de exactamente 5px entre ambos botones.
- Mantener orden, texto y comportamiento actuales de los botones.

**Non-Goals:**
- No cambiar la lógica de guardado, validaciones, toasts, rutas ni el botón "Volver".
- No modificar las otras pantallas de selección ni otros formularios existentes.

## Decisions

1. **Estilos scoped por componente** — agregar un bloque `styles` en cada una de las tres componentes con:
   `.form-actions { display: flex; justify-content: flex-end; gap: 5px; margin-top: 24px; }`
   - *Por qué*: es el patrón dominante en el código (regla css por componente) y evita repetir estilos inline; el `gap: 5px` cumple el requerimiento exacto mientras que el resto del estilo sigue la convención de `perfil-form`.
   - *Alternativa considerada*: inline `style="display: flex; justify-content: flex-end; gap: 5px;"` en el div (como en `perfil-select`). Se descarta por duplicar el mismo literal tres veces y por desviarse del patrón de componentes de formulario.
2. **No tocar el marcado** — los botones permanecen en el mismo `<div class="form-actions">` en el mismo orden (Cancelar primero, Crear/Guardar después); solo cambia la presentación.

## Risks / Trade-offs

- Estilo scoped duplica la misma regla en tres archivos → Mitigación: la regla es mínima y cada componente se mantiene autocontenida, consistente con otras pantallas del proyecto.
- Posible regresión visual si el elemento `.form-actions` original buscaba estilos globales inexistentes → Mitigación: el CSS base (.btn) no cambia; la regla solo agrega alineación y separación.