## Why

La consola CAM se utiliza durante jornadas prolongadas y actualmente solo ofrece una interfaz clara. Esto puede causar fatiga visual en ambientes con poca luz; agregar un tema oscuro mejora la comodidad sin cambiar los flujos de administración existentes.

## What Changes

- Agregar un modo oscuro seleccionable desde la interfaz principal de la consola Angular.
- Mantener la preferencia de tema del usuario entre sesiones y navegaciones.
- Aplicar colores oscuros coherentes a la estructura de la aplicación, formularios, tablas, tarjetas, diálogos, mensajes, estados y controles de PrimeNG.
- Mantener el modo claro actual como opción y como comportamiento alternativo.
- Asegurar contraste suficiente, estados de foco visibles y legibilidad en escritorio y móvil.
- Mantener fuera de alcance la SPA React de referencia, que no es la interfaz en desarrollo activo.

## Capabilities

### New Capabilities

- `dark-mode`: Permite seleccionar, aplicar y conservar el tema visual claro u oscuro de la consola Angular.

### Modified Capabilities

- Ninguna.

## Impact

- Frontend Angular: shell/layout, estilos globales, servicios de estado visual y componentes compartidos.
- Estilos globales y overrides de PrimeNG: nuevas variables y estados para superficies, texto, bordes, controles, overlays y componentes interactivos.
- Persistencia del navegador: almacenamiento local de la preferencia de tema; no requiere cambios de backend, API, LDAP ni modelo de datos.
- Verificación visual y funcional en las rutas protegidas, login, diálogos, tablas, formularios y tamaños de pantalla soportados.
