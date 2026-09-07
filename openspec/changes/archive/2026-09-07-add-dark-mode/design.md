## Context

La SPA Angular (`front-angular/`) es la interfaz en desarrollo activo. Su sistema visual ya concentra gran parte de los colores en variables CSS globales de `src/styles.css`, pero todavía existen colores claros codificados directamente en estilos de layout, login y overrides de PrimeNG. El layout ya dispone de una barra superior adecuada para alojar un control de preferencia.

El cambio debe ser exclusivamente de frontend. No hay necesidad de modificar el backend, las sesiones, LDAP, el API Gateway ni el modelo de datos. La SPA React (`frontend/`) se mantiene como referencia visual y no forma parte de esta migración.

## Goals / Non-Goals

**Goals:**

- Permitir alternar entre temas claro y oscuro desde la consola Angular sin recargar la página.
- Aplicar el tema de forma consistente al shell, login, páginas, formularios, tablas, tarjetas, diálogos, overlays, mensajes y componentes PrimeNG.
- Conservar la preferencia en `localStorage` y restaurarla al iniciar la aplicación.
- Mantener el tema claro actual como valor predeterminado para usuarios sin preferencia guardada.
- Proporcionar un control accesible por teclado, con estado semántico y foco visible.

**Non-Goals:**

- No agregar un tercer modo basado en la preferencia del sistema operativo.
- No cambiar la identidad de marca ni rediseñar la navegación.
- No modificar la SPA React de referencia.
- No introducir persistencia en el servidor ni preferencias asociadas a la cuenta.

## Decisions

### 1. Usar un atributo de tema en el elemento raíz

El servicio de tema aplicará `data-theme="light"` o `data-theme="dark"` en `document.documentElement`. Las variables claras existentes permanecerán como base y un bloque `[data-theme="dark"]` definirá sus equivalentes oscuros.

Esto mantiene el cambio global, evita duplicar clases en cada componente y permite que los overlays de PrimeNG, que se renderizan fuera de algunos componentes, reciban el mismo tema. Se descarta alternar clases individuales por componente porque sería frágil y aumentaría el riesgo de superficies sin tematizar.

### 2. Centralizar el estado en un `ThemeService`

Un servicio Angular singleton expondrá el modo actual mediante un signal, inicializará el atributo raíz, alternará el modo y guardará la selección bajo una clave estable de `localStorage`. Solo se aceptarán los valores `light` y `dark`; una preferencia ausente o inválida resolverá a `light`.

El servicio será instanciado desde el arranque de la aplicación para que el tema guardado se aplique antes de que el usuario interactúe con las rutas. Si `localStorage` no está disponible, el cambio seguirá funcionando durante la sesión con el valor en memoria.

### 3. Colocar el control en el topbar del layout

El control se ubicará junto a la información del usuario y al cierre de sesión. Será un botón de icono con `aria-label`, `aria-pressed`, foco visible y una indicación textual o tooltip del modo que se activará. El login heredará el tema guardado, aunque el control principal pertenezca al layout autenticado.

Se elige un botón de alternancia en lugar de un menú de preferencias porque solo existen dos estados y la acción debe ser inmediata. El icono y la etiqueta cambiarán para que el estado no dependa únicamente del color.

### 4. Extender tokens semánticos y corregir excepciones de color

El tema oscuro definirá fondos, superficies, bordes, texto, sombras, estados semánticos y controles a partir de los tokens existentes. Se revisarán los colores directos como `#fff`, `#000` y fondos claros en `styles.css`, los estilos locales de `LayoutComponent` y `LoginComponent`, sustituyéndolos por variables cuando representen superficies o texto temables. Los colores de marca deliberadamente constantes, como el degradado de la barra lateral y el dorado de la marca, podrán conservarse si mantienen contraste.

Los overrides globales de PrimeNG se ajustarán para que tablas, inputs, dropdowns, tabs, diálogos, máscaras y estados hover/focus utilicen los mismos tokens. No se cambiará la configuración del tema mediante una dependencia nueva.

### Alternativas consideradas

- `prefers-color-scheme`: descartado como comportamiento principal porque puede cambiar la interfaz sin una acción explícita del usuario y no conserva una preferencia propia de CAM.
- Dos hojas de estilos completas intercambiables: descartado porque duplicaría reglas y se alejaría del sistema de variables ya existente.
- Preferencia en el backend: descartado porque el modo es una preferencia visual local y el backend usa datos en memoria; además, requeriría cambios de API y de autenticación sin aportar valor al alcance.

## Risks / Trade-offs

- **[Riesgo]** Reglas con colores literales pueden dejar zonas claras o texto ilegible. **Mitigación:** auditar estilos globales, estilos inline y overrides de PrimeNG; validar las rutas y componentes principales en ambos temas.
- **[Riesgo]** Colores semánticos claros pueden perder contraste sobre superficies oscuras. **Mitigación:** definir variantes oscuras por estado y revisar texto normal, controles, bordes y foco con contraste WCAG AA.
- **[Riesgo]** La preferencia puede no restaurarse si el almacenamiento del navegador está bloqueado. **Mitigación:** usar `localStorage` de forma tolerante a errores y mantener fallback en memoria a tema claro.
- **[Riesgo]** La aplicación del tema después del primer render puede producir un destello claro. **Mitigación:** inicializar el servicio en el componente raíz y aplicar el atributo antes de mostrar el contenido interactivo.
- **[Trade-off]** El modo oscuro añade una matriz visual adicional para QA, pero evita imponer cambios en la API y reutiliza la arquitectura CSS actual.

## Migration Plan

1. Añadir el servicio y el control de tema manteniendo el modo claro como comportamiento inicial.
2. Añadir tokens oscuros y sustituir excepciones de color en los estilos globales y componentes compartidos.
3. Validar build, navegación, persistencia, accesibilidad y las rutas representativas en ambos temas.
4. Desplegar como cambio compatible de frontend. Para revertir, retirar el control, el servicio y las reglas oscuras; los datos de `localStorage` pueden ignorarse sin afectar sesiones ni datos del backend.

## Open Questions

No hay decisiones bloqueantes pendientes. La paleta exacta debe ajustarse durante la validación visual sin cambiar el contrato funcional de la capacidad.
