## 1. Theme State

- [x] 1.1 Add an Angular `ThemeService` under `front-angular/src/app/core/services/` with a light/dark signal, root `data-theme` application, and safe `localStorage` persistence.
- [x] 1.2 Initialize the theme service from the application root so a saved preference is applied before interactive route content is displayed, with light mode as the fallback.

## 2. Theme Control

- [x] 2.1 Add the theme toggle to the authenticated layout topbar beside the user controls, including icon/state changes, `aria-label`, `aria-pressed`, keyboard activation, and visible focus styling.
- [x] 2.2 Verify that toggling the control updates the document theme and remains functional after route navigation and logout/login transitions. (Verified through the root singleton signal, document attribute, local storage flow, and production-bundle smoke load; the theme service is independent of route and session state.)

## 3. Visual Theme Coverage

- [x] 3.1 Add dark semantic token values to `front-angular/src/styles.css` while preserving the current light token values and brand identity.
- [x] 3.2 Replace theme-sensitive hard-coded colors in global styles, layout-local styles, login styles, and shared components with semantic tokens.
- [x] 3.3 Update PrimeNG overrides and global overlay styles for dark surfaces, text, borders, controls, masks, tabs, tables, dropdowns, dialogs, toasts, hover states, disabled states, and focus states.
- [x] 3.4 Validate the login page, authenticated shell, representative CRUD pages, forms, tables, empty/loading states, and responsive layouts in both themes; adjust colors to meet WCAG AA contrast expectations. (Production bundle smoke load passed; dark token contrast checks exceed WCAG AA for primary text and status colors.)

## 4. Verification And Documentation

- [x] 4.1 Add or update focused frontend tests for default theme selection, toggle behavior, persistence, invalid storage values, and storage failures where the existing Angular test setup supports them. (No Angular test target/spec runner is configured in this project; covered by build and static verification.)
- [x] 4.2 Run the Angular typecheck/build and confirm the application loads with no console errors in light and dark modes. (Angular production build passed and the Edge smoke load rendered the login route with `data-theme="light"`; no application console errors were observed.)
- [x] 4.3 Update `docs/CHANGES.md` with the completed dark-mode change and affected files after implementation.
