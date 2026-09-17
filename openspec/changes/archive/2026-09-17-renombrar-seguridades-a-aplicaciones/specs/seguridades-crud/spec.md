## ADDED Requirements

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