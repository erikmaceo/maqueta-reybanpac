## Why

En las tres pantallas de captura de Seguridades (Aplicación, Módulo y Programa) los botones "Cancelar" y "Crear/Guardar" quedan alineados a la izquierda dentro de la tarjeta, rompiendo la convención visual de los formularios del sistema donde las acciones se ubican a la derecha.

## What Changes

- Mover el bloque de acciones (botones "Cancelar" y "Crear/Guardar") al extremo derecho en las pantallas de:
  - Aplicación (`AplicacionFormComponent`)
  - Módulo (`ModuloFormComponent`)
  - Programa (`ProgramaFormComponent`)
- Agregar una separación de 5px entre ambos botones dentro de cada bloque de acciones.
- Mantener el orden y comportamiento actual de los botones (Cancelar → retorno al listado; Crear/Guardar → persistencia con confirmación en edición).

## Capabilities

### New Capabilities

### Modified Capabilities
- `seguridades-crud`: Las pantallas de captura de Aplicación, Módulo y Programa deben alinear el bloque de acciones Cancelar/Crear a la derecha, con separación de 5px entre botones.

## Impact

- Archivos: `front-angular/src/app/pages/aplicacion-form/aplicacion-form.component.ts`, `front-angular/src/app/pages/modulo-form/modulo-form.component.ts`, `front-angular/src/app/pages/programa-form/programa-form.component.ts` (solo templates/estilos).
- Sin cambios de API, datos, rutas ni lógica de negocio.