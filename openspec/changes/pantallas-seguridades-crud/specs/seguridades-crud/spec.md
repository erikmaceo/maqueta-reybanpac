## ADDED Requirements

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
