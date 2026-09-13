## MODIFIED Requirements

### Requirement: Program permissions are edited through a navigable screen
The system SHALL expose a route identifying both the profile and program whose permissions are being edited, SHALL replace the `Permisos del Programa` dialog with a full screen at that route, and SHALL present the permission editor using the available screen width with the profile/program context and program permissions arranged horizontally on desktop layouts.

#### Scenario: Open program permissions from the program table
- **WHEN** an administrator clicks the edit action for a program in the `Programas por perfil` tab
- **THEN** the application navigates to the permissions route containing the selected profile and program
- **AND** the screen displays the profile code and name, program code and name, and the current permission values

#### Scenario: Display the context fields in one row
- **WHEN** the permissions screen is displayed on a desktop-width viewport
- **THEN** the profile code, profile name, program code, and program name are displayed in a single horizontal row
- **AND** the containing permissions card uses the maximum available width with `5px` of internal padding

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

### Requirement: Saving permissions preserves the profile and program associations
The system SHALL save the edited program permissions and all edited control permissions from every controls page as part of the selected profile without removing or resetting the other programs associated with that profile.

#### Scenario: Save valid program permissions
- **WHEN** an administrator selects `Guardar` after editing program or control permissions
- **THEN** the application updates the selected profile through the existing profile update operation
- **AND** it shows the existing success feedback
- **AND** it navigates back to that profile's detail route on the `Programas por perfil` tab with the updated values visible

#### Scenario: Save controls edited across pages
- **WHEN** an administrator edits controls on more than one visible page and selects `Guardar`
- **THEN** the application includes the pending values from all controls, not only the currently displayed page, in the existing profile update operation

#### Scenario: Save failure
- **WHEN** the profile update operation fails
- **THEN** the application shows the existing error feedback
- **AND** it keeps the administrator on the permissions screen with the pending values available for correction or retry
