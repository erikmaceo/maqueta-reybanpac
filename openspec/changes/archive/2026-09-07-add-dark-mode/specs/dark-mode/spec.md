## ADDED Requirements

### Requirement: Theme selection

La consola Angular SHALL proporcionar un control visible y accesible para alternar entre los temas claro y oscuro desde el layout autenticado. El cambio SHALL aplicarse sin recargar la página y SHALL actualizar el estado visual del control.

#### Scenario: User activates dark mode

- **WHEN** the authenticated user activates the theme control while the light theme is selected
- **THEN** the application applies the dark theme immediately without a page reload
- **AND** the control exposes that dark mode is the active state

#### Scenario: User returns to light mode

- **WHEN** the user activates the theme control while the dark theme is selected
- **THEN** the application restores the light theme immediately
- **AND** existing light-theme behavior remains available

#### Scenario: Theme control is keyboard accessible

- **WHEN** the user reaches the theme control with keyboard navigation and activates it
- **THEN** the same theme transition occurs as with pointer activation
- **AND** the control has a visible focus state and an accessible label describing its action or state

### Requirement: Theme preference persistence

The application SHALL persist the selected theme locally and SHALL restore it when the Angular application starts again. A missing, invalid, or unavailable stored value MUST fall back to the light theme without preventing the application from loading.

#### Scenario: Stored dark preference is restored

- **WHEN** the user previously selected dark mode and opens the application in a later browser session
- **THEN** the application restores dark mode before the interactive content is displayed

#### Scenario: New user receives the current default

- **WHEN** no valid theme preference exists in browser storage
- **THEN** the application starts in the existing light theme

#### Scenario: Browser storage is unavailable

- **WHEN** browser storage cannot be read or written
- **THEN** the application continues to load using the current in-memory theme
- **AND** theme switching remains available for the current session

### Requirement: Complete Angular theme coverage

The dark theme SHALL provide readable, coherent styles for the application shell, login screen, pages, cards, tables, forms, inputs, selects, tabs, dialogs, overlays, toast messages, empty states, loading states, scrollbars, hover states, disabled states, and focus states. PrimeNG components rendered through global overlays MUST receive the active theme as well.

#### Scenario: Main authenticated surfaces use dark tokens

- **WHEN** dark mode is active on any authenticated route
- **THEN** the page background, content surfaces, borders, headings, body text, inputs, tables, buttons, and status badges use dark-theme tokens
- **AND** no light-only surface or hard-coded black text makes the content unreadable

#### Scenario: Dialog and overlay use dark tokens

- **WHEN** the user opens a PrimeNG dialog, dropdown, confirmation overlay, or toast while dark mode is active
- **THEN** the overlay surface, text, borders, controls, mask, hover states, and focus states match the dark theme

#### Scenario: Login inherits the saved theme

- **WHEN** a saved dark preference exists and the user visits the login route
- **THEN** the login form and its surrounding surfaces render in the dark theme
- **AND** brand elements remain distinguishable from the dark background

### Requirement: Theme accessibility and compatibility

The dark theme SHALL preserve the existing navigation and application behavior, SHALL maintain a visible focus indicator, and SHALL meet WCAG AA contrast expectations for normal text, interactive controls, and status messaging at supported desktop and mobile sizes.

#### Scenario: Existing workflow is unchanged by theme selection

- **WHEN** the user changes theme on any supported route
- **THEN** route navigation, forms, dialogs, API interactions, and session state continue to behave as before

#### Scenario: Responsive layout remains usable

- **WHEN** dark mode is active on a desktop or mobile viewport
- **THEN** the theme control, navigation, content, forms, tables, and overlays remain usable without horizontal overflow caused by the theme feature
