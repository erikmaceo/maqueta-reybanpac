## MODIFIED Requirements

### Requirement: Profile detail is addressable by route
The system SHALL expose the detail of a profile through a navigable route that identifies the profile and SHALL navigate to that route when an administrator selects the profile name from the profiles table. The navigation SHALL use Angular's `routerLink` directive to ensure proper HTML semantics and robustness, and SHALL gracefully handle cases where the profile identifier is missing.

#### Scenario: Open profile detail from the profiles table
- **WHEN** an administrator clicks the `Nombre` link for a profile in `/perfiles`
- **THEN** the application navigates to the profile detail route for that profile
- **AND** the detail opens on the `Programas por perfil` tab

#### Scenario: Link uses routerLink for semantic HTML
- **WHEN** the profiles table renders the `Nombre` column
- **THEN** each profile name is rendered as an anchor element with `[routerLink]` bound to the profile's route
- **AND** the link does not rely on a click handler for navigation

#### Scenario: Handle missing profile identifier
- **WHEN** a profile row is rendered without a valid identifier
- **THEN** the `Nombre` column displays the profile name as plain text without a link
- **AND** no broken or undefined routes are generated

#### Scenario: Open profile detail directly or after reload
- **WHEN** an administrator loads or reloads a valid profile detail URL directly
- **THEN** the application loads the profile identified by the route
- **AND** it renders the same profile header, program table, and available profile tabs as the in-app navigation
