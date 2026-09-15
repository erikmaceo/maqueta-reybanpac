## ADDED Requirements

### Requirement: Campos de captura de Seguridades ordenados en filas de dos
Las pantallas de captura de Aplicación, Módulo y Programa de Seguridades SHALL presentar sus campos agrupados en filas de dos elementos del mismo nivel —usando el mismo comportamiento responsive que el par Código/Nombre— y SHALL ubicar el campo `Descripción` como último campo de ancho completo de la tarjeta. El campo `Descripción` SHALL permanecer al final incluso cuando la sección de controles de un programa sea visible.

#### Scenario: Aplicación agrupa Estado y Nodo de Segregación
- **WHEN** el usuario abre la pantalla de captura de una Aplicación (nueva o edición)
- **THEN** los campos `Código` y `Nombre` se muestran lado a lado en la primera fila
- **AND** los campos `Estado` y `Nodo de Segregación` se muestran lado a lado en la misma fila
- **AND** el campo `Descripción` se muestra al final, ocupando todo el ancho de la tarjeta

#### Scenario: Módulo agrupa Aplicación y Estado
- **WHEN** el usuario abre la pantalla de captura de un Módulo (nueva o edición)
- **THEN** los campos `Código` y `Nombre` se muestran lado a lado
- **AND** la búsqueda de `Aplicación` y el campo `Estado` se muestran lado a lado en la misma fila
- **AND** el campo `Descripción` se muestra al final, ocupando todo el ancho de la tarjeta

#### Scenario: Programa agrupa búsquedas y Tipo con Estado
- **WHEN** el usuario abre la pantalla de captura de un Programa (nueva o edición)
- **THEN** los campos `Código` y `Nombre` se muestran lado a lado
- **AND** las búsquedas de `Aplicación` y `Módulo` se muestran lado a lado en la misma fila
- **AND** los campos `Tipo de Programa` y `Estado` se muestran lado a lado en la misma fila
- **AND** el campo `Descripción` se muestra al final, antes de la sección de controles del programa cuando esta sea visible

#### Scenario: Layout responsive preservado
- **WHEN** alguna de las pantallas de captura se muestra en un viewport angosto (≤600px)
- **THEN** los campos agrupados pasan a una única columna sin overflow horizontal

#### Scenario: Comportamiento de los campos sin cambios
- **WHEN** el usuario completa una pantalla de captura reordenada
- **THEN** las validaciones, marcadores de obligatorio, diálogos de búsqueda y el guardado conservan su comportamiento previo al reordenamiento