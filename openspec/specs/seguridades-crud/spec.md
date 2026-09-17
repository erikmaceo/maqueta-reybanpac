# seguridades-crud Specification

## Purpose
TBD - created by archiving change botones-formularios-derecha. Update Purpose after archive.
## Requirements
### Requirement: Alineación de acciones en pantallas de captura de Seguridades
Las pantallas de captura de Aplicación, Módulo y Programa de Seguridades (rutas `/seguridades/aplicaciones/nuevo` y `/seguridades/aplicaciones/:id/editar`, `/seguridades/modulos/nuevo` y `/seguridades/modulos/:id/editar`, `/seguridades/programas/nuevo` y `/seguridades/programas/:id/editar`) SHALL mostrar el bloque de acciones "Cancelar"/"Crear/Guardar" alineado al extremo derecho de la tarjeta del formulario. Los botones del bloque SHALL guardar una separación de 5px entre sí, manteniendo el orden actual: "Cancelar" a la izquierda y "Crear/Guardar" a la derecha.

#### Scenario: Las acciones se muestran a la derecha
- **WHEN** el usuario abre cualquiera de las seis pantallas de captura de Aplicación, Módulo o Programa (nuevo o edición)
- **THEN** los botones "Cancelar" y "Crear/Guardar" se presentan alineados al borde derecho de la tarjeta

#### Scenario: Separación de 5px entre acciones
- **WHEN** el usuario visualiza el bloque de acciones en una pantalla de captura de Seguridades
- **THEN** existe una separación de exactamente 5px entre el botón "Cancelar" y el botón "Crear/Guardar"

#### Scenario: Orden y comportamiento de los botones
- **WHEN** el usuario interactúa con el bloque de acciones
- **THEN** el botón "Cancelar" aparece a la izquierda y retorna al listado de Seguridades
- **THEN** el botón "Crear/Guardar" aparece a la derecha y dispara la creación o actualización (con confirmación en edición)

### Requirement: Las búsquedas de entidad padre se realizan en pantallas navegables
Los formularios de captura de Aplicación, Módulo y Programa SHALL reemplazar los diálogos emergentes de búsqueda por pantallas navegables a pantalla completa cuando el usuario pulse el componente `search` de una entidad padre (Nodo de Segregación, Aplicación o Módulo). Las pantallas de selección SHALL presentar los mismos filtros, columnas y paginación que los diálogos reemplazados, renderizados con el ancho completo disponible, y SHALL devolver la entidad elegida al formulario origen para aplicarla sobre la selección.

#### Scenario: Búsqueda de nodo padre desde Aplicación
- **WHEN** el usuario pulsa el `search` del campo `Nodo de Segregación` en la pantalla de captura de una Aplicación
- **THEN** la aplicación navega a la pantalla navegable de selección de nodo padre
- **AND** la pantalla lista solo nodos activos de nivel raíz (sin padre) con filtros de `Código` y `Nombre`
- **AND** al pulsar `Seleccionar` se vuelve al formulario de la Aplicación con el nodo elegido aplicado al campo

#### Scenario: Búsqueda de aplicación desde Módulo
- **WHEN** el usuario pulsa el `search` del campo `Aplicación` en la pantalla de captura de un Módulo
- **THEN** la aplicación navega a la pantalla navegable de selección de aplicación
- **AND** la pantalla presenta filtros de `Código`, `Nombre` y `Estado`, y columnas de `Código`, `Nombre`, `Descripción` y `Estado`
- **AND** al pulsar `Seleccionar` se vuelve al formulario del Módulo con la aplicación elegida aplicada al campo

#### Scenario: Búsqueda de aplicación y módulo desde Programa
- **WHEN** el usuario pulsa el `search` del campo `Aplicación` o del campo `Módulo` en la pantalla de captura de un Programa
- **THEN** la aplicación navega a la pantalla navegable de selección correspondiente (aplicación o módulo)
- **AND** la pantalla de módulos presenta filtros de `Código` y `Nombre`, y una columna con el código de la `Aplicación` de cada módulo antes de su acción `Seleccionar`
- **AND** al volver con un módulo elegido, el campo `Módulo` queda aplicado y, si la elección cambió la aplicación, el módulo previamente seleccionado se limpia

#### Scenario: Selección simple en pantalla con ancho completo
- **WHEN** las pantallas de selección se muestran en un viewport de escritorio
- **THEN** los filtros se muestran en una tarjeta superior y la tabla ocupa todo el ancho disponible con sus columnas completas
- **AND** la paginación ofrece `Anterior`, `Siguiente`, el conteo de registros y un selector de registros por página (5, 10, 15, 20)

#### Scenario: Se conserva el borrador del formulario al seleccionar
- **WHEN** el usuario navega desde un formulario con campos ingresados (código, nombre, descripción, estado, tipo y controles de un programa) hacia una pantalla de selección y vuelve
- **THEN** el formulario restaura los valores ingresados tal como estaban antes de la navegación
- **AND** aplica sobre ellos la entidad padre recién seleccionada, actualizando el texto del campo `search`

#### Scenario: Volver de la pantalla de selección sin elegir
- **WHEN** el usuario pulsa `Volver` en una pantalla de selección sin pulsar `Seleccionar`
- **THEN** se regresa al formulario origen con el borrador intacto y sin cambios en la entidad padre
- **AND** si la pantalla de selección no dispone de una ruta de retorno válida, `Volver` navega a la lista principal de Seguridades

#### Scenario: Comportamiento de validación y guardado sin cambios
- **WHEN** el usuario completa una captura con la entidad padre elegida mediante pantalla navegable
- **THEN** las validaciones de obligatoriedad, el marcado de campos inválidos, la confirmación de edición y el guardado conservan el comportamiento previo a este cambio

### Requirement: Aplicación navegable para alta y edición
The system SHALL provide navigable screens for creating and editing Aplicaciones with the same fields and validations as the current dialog (Código, Nombre, Descripción, Estado, Nodo de Segregación con búsqueda).

#### Scenario: Abrir alta de Aplicación desde el tab Aplicaciones
- **WHEN** user clicks "Nueva Aplicación" in `/seguridades` tab Aplicaciones
- **THEN** system navigates to the Aplicación create screen with empty form and Volver button top-right

#### Scenario: Abrir edición de Aplicación
- **WHEN** user clicks Editar on an Aplicación row (non-system)
- **THEN** system navigates to the Aplicación edit screen preloaded by id with the same fields, nodo search text and validations

#### Scenario: Volver desde Aplicación
- **WHEN** user clicks Volver on Aplicación create/edit screen
- **THEN** system navigates back to `/seguridades` preserving the Aplicaciones tab without saving pending changes

#### Scenario: Validación de Aplicación preservada
- **WHEN** user tries to save without Código, Nombre or Nodo de Segregación
- **THEN** system shows the same "Faltan datos" errors and does not call the API

### Requirement: Módulo navegable para alta y edición
The system SHALL provide navigable screens for creating and editing Módulos with the same fields and validations as the current dialog (Código, Nombre, Aplicación con búsqueda, Descripción, Estado).

#### Scenario: Abrir alta de Módulo desde el tab Módulos
- **WHEN** user clicks "Nuevo Módulo" in `/seguridades` tab Módulos
- **THEN** system navigates to the Módulo create screen with empty form and Volver button top-right

#### Scenario: Abrir edición de Módulo
- **WHEN** user clicks Editar on a Módulo row (non-system)
- **THEN** system navigates to the Módulo edit screen preloaded by id with aplicación search text resolved

#### Scenario: Volver desde Módulo
- **WHEN** user clicks Volver on Módulo create/edit screen
- **THEN** system navigates back to `/seguridades` preserving the Módulos tab

#### Scenario: Validación de Módulo preservada
- **WHEN** user tries to save without Código, Nombre or Aplicación
- **THEN** system shows the same "Faltan datos" error and does not call the API

### Requirement: Programa navegable para alta y edición
The system SHALL provide navigable screens for creating and editing Programas with the same fields, dependent selects, tipo logic and controles management as the current dialog.

#### Scenario: Abrir alta de Programa desde el tab Programas
- **WHEN** user clicks "Nuevo Programa" in `/seguridades` tab Programas
- **THEN** system navigates to the Programa create screen with empty form, tipo list, and Volver button top-right

#### Scenario: Abrir edición de Programa
- **WHEN** user clicks Editar on a Programa row (non-system)
- **THEN** system navigates to the Programa edit screen preloaded by id with aplicación/módulo search texts and ordered controles

#### Scenario: Gestión de controles preservada
- **WHEN** user adds, removes or reorders controles with drag-drop on Programa screen
- **THEN** system keeps the same behavior: add Control, quitar, drag-handle reorder, estado/log toggles and per-row validation

#### Scenario: Validación de Programa y controles preservada
- **WHEN** user tries to save without Código, Nombre, Aplicación or Módulo, or with incomplete controles for non-Menú/Submenú tipos
- **THEN** system shows the same "Faltan datos" errors and does not call the API

#### Scenario: Volver desde Programa
- **WHEN** user clicks Volver on Programa create/edit screen
- **THEN** system navigates back to `/seguridades` preserving the Programas tab

### Requirement: Consistencia visual y de navegación
The system SHALL present each new screen inside a card with the same components as its dialog, a Volver button top-right, and layout header titles; dialogs auxiliares de búsqueda, confirmaciones, toasts and eventos SHALL remain unchanged.

#### Scenario: Card contiene los componentes del diálogo
- **WHEN** any of the six new screens is displayed
- **THEN** it shows inside a card the same inputs, selects, search-fields, textareas, tipo/control lists and footer actions (Volver + Crear/Guardar) as the corresponding dialog

#### Scenario: Diálogos auxiliares siguen disponibles
- **WHEN** user needs to pick nodo, aplicación or módulo on a new screen
- **THEN** system opens the same search dialogs with filters, pagination and Seleccionar behavior

#### Scenario: Guardado conserva confirmaciones y feedback
- **WHEN** user saves a create or edit on a new screen
- **THEN** system keeps the same confirm dialog for edits, success/error toasts, data-changed events and reload behavior, navigating back to `/seguridades` on success

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

### Requirement: Etiqueta del sidebar para la sección de Seguridades
El item de navegación del sidebar con ruta `/seguridades` SHALL mostrar la etiqueta visible "Aplicaciones" en lugar de "Seguridades", manteniendo su ruta, icono, grupo y condición de administrador sin cambios.

#### Scenario: La etiqueta del sidebar muestra "Aplicaciones"
- **WHEN** un usuario administrador visualiza el sidebar
- **THEN** el item que navega a `/seguridades` muestra la etiqueta "Aplicaciones"
- **AND** seleccionar el item navega a `/seguridades` con el mismo comportamiento previo

#### Scenario: Sin cambios en navegación ni visibilidad
- **WHEN** el usuario interactúa con la entrada renombrada
- **THEN** la ruta, el icono, el grupo ("Sistemas y Configuración") y la visibilidad solo para administradores se conservan
- **AND** los títulos de página y breadcrumb de la sección no se ven alterados

