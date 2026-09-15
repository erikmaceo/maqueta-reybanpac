## MODIFIED Requirements

### Requirement: Program permissions are edited through a navigable screen
The system SHALL expose a route identifying both the profile and program whose permissions are being edited, SHALL replace the `Permisos del Programa` dialog with a full screen at that route, SHALL present the permission editor using the available screen width with the profile/program context and program permissions arranged horizontally on desktop layouts, and SHALL rely on the application header for the screen title and description instead of duplicating that text inside the screen card.

#### Scenario: Open program permissions from the program table
- **WHEN** an administrator clicks the edit action for a program in the `Programas por perfil` tab
- **THEN** the application navigates to the permissions route containing the selected profile and program
- **AND** the screen displays the profile code and name, program code and name, and the current permission values

#### Scenario: Do not duplicate the application header
- **WHEN** the permissions screen is displayed
- **THEN** it does not render the internal texts `Permisos del Programa` or `Configure los permisos del programa dentro del perfil seleccionado.`
- **AND** the application header remains the source of the screen title and description

#### Scenario: Display the context fields in one row
- **WHEN** the permissions screen is displayed on a desktop-width viewport
- **THEN** the profile code, profile name, program code, and program name are displayed in a single horizontal row
- **AND** the containing permissions card uses the maximum available width with `10px` of internal padding

#### Scenario: Display program-level permissions in one row
- **WHEN** the permissions screen is displayed on a desktop-width viewport
- **THEN** the `Nuevo`, `Modificar`, `Eliminar`, `Imprimir`, and `Consultar` checkboxes are displayed in a single horizontal row

#### Scenario: Preserve usable layout on narrow viewports
- **WHEN** the permissions screen is displayed on a viewport that cannot fit all context fields or permission checkboxes horizontally
- **THEN** the fields and checkboxes wrap into readable rows without horizontal page overflow

#### Scenario: Edit program-level permissions
- **WHEN** an administrator changes any of `Nuevo`, `Modificar`, `Eliminar`, `Imprimir`, or `Consultar`
- **THEN** the screen updates the pending values without changing the persisted profile until `Guardar` is selected

#### Scenario: Edit control-level permissions
- **WHEN** the selected program has registered controls
- **THEN** the screen displays each control with its code, type, description, `Visualizar`, and `Modificar` values
- **AND** the administrator can change the two permission values for each control before saving

#### Scenario: Display controls with the Audit table pattern
- **WHEN** the selected program has registered controls
- **THEN** the controls table uses the same `card table-wrap`, `table.data`, and `pagination` structure used by the `Consulta de logs` table in Auditoría
- **AND** the table provides `Anterior`, `Siguiente`, current-page information, and a records-per-page selector

#### Scenario: Paginate controls locally
- **WHEN** the administrator changes the controls page or records-per-page selector
- **THEN** the table displays only the selected page using the options `5`, `10`, `15`, and `20`
- **AND** the page is reset to the first page when the records-per-page value changes
- **AND** the existing values for controls on other pages remain pending for saving

#### Scenario: Place the form actions below the card
- **WHEN** the permissions editor is displayed
- **THEN** the bottom `Volver` and `Guardar` buttons are rendered outside the permissions card
- **AND** the action group has a `10px` top margin from the card
- **AND** the header `Volver` button remains available without changing its navigation behavior
