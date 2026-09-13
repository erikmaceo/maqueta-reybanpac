## ADDED Requirements

### Requirement: Profile detail is addressable by route
The system SHALL expose the detail of a profile through a navigable route that identifies the profile and SHALL navigate to that route when an administrator selects the profile name from the profiles table.

#### Scenario: Open profile detail from the profiles table
- **WHEN** an administrator clicks the `Nombre` link for a profile in `/perfiles`
- **THEN** the application navigates to the profile detail route for that profile
- **AND** the detail opens on the `Programas por perfil` tab

#### Scenario: Open profile detail directly or after reload
- **WHEN** an administrator loads or reloads a valid profile detail URL directly
- **THEN** the application loads the profile identified by the route
- **AND** it renders the same profile header, program table, and available profile tabs as the in-app navigation

### Requirement: Profile detail preserves the existing program view
The profile detail screen SHALL preserve the current `Programas por perfil` functionality, including the program identity columns, the five read-only permission indicators, the `Controles por perfil` tab, and navigation back to the profiles list.

#### Scenario: Display program permissions in the detail tab
- **WHEN** a profile with associated programs is loaded
- **THEN** the `Programas por perfil` tab displays each program with `Nuevo`, `Modificar`, `Eliminar`, `Imprimir`, and `Consultar` indicators
- **AND** the indicators reflect the values stored for that profile-program association

#### Scenario: Return from profile detail to the profiles list
- **WHEN** an administrator selects `Volver a Perfiles` from the profile detail screen
- **THEN** the application navigates to `/perfiles`

### Requirement: Program permissions are edited through a navigable screen
The system SHALL expose a route identifying both the profile and program whose permissions are being edited, and SHALL replace the `Permisos del Programa` dialog with a full screen at that route.

#### Scenario: Open program permissions from the program table
- **WHEN** an administrator clicks the edit action for a program in the `Programas por perfil` tab
- **THEN** the application navigates to the permissions route containing the selected profile and program
- **AND** the screen displays the profile code and name, program code and name, and the current permission values

#### Scenario: Edit program-level permissions
- **WHEN** an administrator changes any of `Nuevo`, `Modificar`, `Eliminar`, `Imprimir`, or `Consultar`
- **THEN** the screen updates the pending values without changing the persisted profile until `Guardar` is selected

#### Scenario: Edit control-level permissions
- **WHEN** the selected program has registered controls
- **THEN** the screen displays each control with its code, type, description, `Visualizar`, and `Modificar` values
- **AND** the administrator can change the two permission values for each control before saving

### Requirement: Saving permissions preserves the profile and program associations
The system SHALL save the edited program permissions and control permissions as part of the selected profile without removing or resetting the other programs associated with that profile.

#### Scenario: Save valid program permissions
- **WHEN** an administrator selects `Guardar` after editing program or control permissions
- **THEN** the application updates the selected profile through the existing profile update operation
- **AND** it shows the existing success feedback
- **AND** it navigates back to that profile's detail route on the `Programas por perfil` tab with the updated values visible

#### Scenario: Save failure
- **WHEN** the profile update operation fails
- **THEN** the application shows the existing error feedback
- **AND** it keeps the administrator on the permissions screen with the pending values available for correction or retry

### Requirement: Returning from permissions discards unsaved changes
The permissions screen SHALL provide a `Volver` action instead of `Cancelar` and SHALL return to the selected profile detail without persisting pending edits.

#### Scenario: Return without saving
- **WHEN** an administrator selects `Volver` after changing one or more permission values
- **THEN** the application navigates back to the selected profile detail
- **AND** it opens the `Programas por perfil` tab
- **AND** the unsaved changes are not persisted

#### Scenario: Invalid route context
- **WHEN** the profile, program, or profile-program association identified by the route cannot be found
- **THEN** the application displays an error state instead of the permissions editor
- **AND** it provides a way to return to the profiles area

### Requirement: Existing profile routes remain available
The change SHALL preserve the existing profile list, create, and edit routes and SHALL not require a new backend endpoint or data model.

#### Scenario: Use existing profile management routes
- **WHEN** an administrator navigates to `/perfiles`, `/perfiles/nuevo`, or `/perfiles/:id/editar`
- **THEN** the corresponding existing profile management screen continues to load and operate

#### Scenario: Use existing persistence contract
- **WHEN** the permissions screen saves changes
- **THEN** it reuses the existing profile read and update contract
- **AND** no separate permissions endpoint is required
