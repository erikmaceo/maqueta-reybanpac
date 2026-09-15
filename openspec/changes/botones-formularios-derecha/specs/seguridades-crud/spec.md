# COBIJA

## ADDED Requirements

### Requirement: Alineación de acciones en pantallas de captura de Seguridades
Las pantallas de captura de Aplicación, Módulo y Programa de Seguridades (rutas `/seguridades/aplicaciones/nuevo` y `/seguridades/aplicaciones/:id/editar`, `/seguridades/modulos/nuevo` y `/seguridades/modulos/:id/editar`, `/seguridades/programas/nuevo` y `/seguridades/programas/:id/editar`) SHALL mostrar el bloque de acciones "Cancelar"/"Crear/Guardar" alineado al extremo derecho de la tarjeta del formulario. Los botones del bloque SHALL guardar una separación de 5px entre sí, manteniendo el orden actual: "Cancelar" a la izquierda y "Crear/Guardar" a la derecha.

#### Scenario: Las acciones se muestran a la derecha
- **WHEN** el usuario abre cualquiera de las seis pantallas de captura de Aplicación, Módulo o Programa (nuevo o edición)
- **THEN** los botones "Cancelar" y "Crear/Guardar" se presentan alineados al borde derecho de la tarjeta

#### Scenario: Separación de 5px entre acciones
- **WHEN** el usuario visualiza el bloque de acciones en una pantalla de captura de Seguridades
- **THEN** existe una separación de exactamente 5px entre el botón "Cancelar" y el botón "Crear/Guardar"

#### Scenario: Orden y comportamiento de los botones
- **WHEN** el usuario interactúa con el bloque de acciones
- **THEN** el botón "Cancelar" aparece a la izquierda y retorna al listado de Seguridades
- **THEN** el botón "Crear/Guardar" aparece a la derecha y dispara la creación o actualización (con confirmación en edición)