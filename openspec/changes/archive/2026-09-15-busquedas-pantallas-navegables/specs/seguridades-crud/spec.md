## ADDED Requirements

### Requirement: Las búsquedas de entidad padre se realizan en pantallas navegables
Los formularios de captura de Aplicación, Módulo y Programa SHALL reemplazar los diálogos emergentes de búsqueda por pantallas navegables a pantalla completa cuando el usuario pulse el componente `search` de una entidad padre (Nodo de Segregación, Aplicación o Módulo). Las pantallas de selección SHALL presentar los mismos filtros, columnas y paginación que los diálogos reemplazados, renderizados con el ancho completo disponible, y SHALL devolver la entidad elegida al formulario origen para aplicarla sobre la selección.

#### Scenario: Búsqueda de nodo padre desde Aplicación
- **WHEN** el usuario pulsa el `search` del campo `Nodo de Segregación` en la pantalla de captura de una Aplicación
- **THEN** la aplicación navega a la pantalla navegable de selección de nodo padre
- **AND** la pantalla lista solo nodos activos de nivel raíz (sin padre) con filtros de `Código` y `Nombre`
- **AND** al pulsar `Seleccionar` se vuelve al formulario de la Aplicación con el nodo elegido aplicado al campo

#### Scenario: Búsqueda de aplicación desde Módulo
- **WHEN** el usuario pulsa el `search` del campo `Aplicación` en la pantalla de captura de un Módulo
- **THEN** la aplicación navega a la pantalla navegable de selección de aplicación
- **AND** la pantalla presenta filtros de `Código`, `Nombre` y `Estado`, y columnas de `Código`, `Nombre`, `Descripción` y `Estado`
- **AND** al pulsar `Seleccionar` se vuelve al formulario del Módulo con la aplicación elegida aplicada al campo

#### Scenario: Búsqueda de aplicación y módulo desde Programa
- **WHEN** el usuario pulsa el `search` del campo `Aplicación` o del campo `Módulo` en la pantalla de captura de un Programa
- **THEN** la aplicación navega a la pantalla navegable de selección correspondiente (aplicación o módulo)
- **AND** la pantalla de módulos presenta filtros de `Código` y `Nombre`, y una columna con el código de la `Aplicación` de cada módulo antes de su acción `Seleccionar`
- **AND** al volver con un módulo elegido, el campo `Módulo` queda aplicado y, si la elección cambió la aplicación, el módulo previamente seleccionado se limpia

#### Scenario: Selección simple en pantalla con ancho completo
- **WHEN** las pantallas de selección se muestran en un viewport de escritorio
- **THEN** los filtros se muestran en una tarjeta superior y la tabla ocupa todo el ancho disponible con sus columnas completas
- **AND** la paginación ofrece `Anterior`, `Siguiente`, el conteo de registros y un selector de registros por página (5, 10, 15, 20)

#### Scenario: Se conserva el borrador del formulario al seleccionar
- **WHEN** el usuario navega desde un formulario con campos ingresados (código, nombre, descripción, estado, tipo y controles de un programa) hacia una pantalla de selección y vuelve
- **THEN** el formulario restaura los valores ingresados tal como estaban antes de la navegación
- **AND** aplica sobre ellos la entidad padre recién seleccionada, actualizando el texto del campo `search`

#### Scenario: Volver de la pantalla de selección sin elegir
- **WHEN** el usuario pulsa `Volver` en una pantalla de selección sin pulsar `Seleccionar`
- **THEN** se regresa al formulario origen con el borrador intacto y sin cambios en la entidad padre
- **AND** si la pantalla de selección no dispone de una ruta de retorno válida, `Volver` navega a la lista principal de Seguridades

#### Scenario: Comportamiento de validación y guardado sin cambios
- **WHEN** el usuario completa una captura con la entidad padre elegida mediante pantalla navegable
- **THEN** las validaciones de obligatoriedad, el marcado de campos inválidos, la confirmación de edición y el guardado conservan el comportamiento previo a este cambio