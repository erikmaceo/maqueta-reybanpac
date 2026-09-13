## Context

La aplicación activa es `front-angular`, una SPA Angular con rutas lazy-loaded, componentes standalone y PrimeNG. Actualmente `PerfilesComponent` combina tres responsabilidades: listado de perfiles, detalle del perfil y edición de permisos por programa.

El clic en la columna `Nombre` solo cambia el signal `selectedPerfil`, por lo que el detalle no tiene URL propia ni puede recargarse o compartirse directamente. Desde la pestaña `Programas por perfil`, la acción de un programa abre el diálogo `Permisos del Programa`, que mantiene una copia local de cinco permisos del programa y de los permisos `Visualizar`/`Modificar` de sus controles. Al guardar, se envía el arreglo completo `programas` mediante `PUT /api/seg-perfiles/:id`.

El cambio debe conservar las rutas existentes `/perfiles`, `/perfiles/nuevo` y `/perfiles/:id/editar`, reutilizar el contrato actual de perfiles y no alterar el modelo de datos. El detalle debe seguir abriendo inicialmente en `Programas por perfil`, y la edición debe regresar a ese detalle mediante `Volver`.

## Goals / Non-Goals

**Goals:**

- Hacer navegable el detalle de un perfil mediante una ruta identificada por el perfil.
- Hacer navegable la edición de permisos mediante una ruta identificada por el perfil y el programa.
- Mantener la tabla `Programas por perfil`, la pestaña `Controles por perfil` y los datos visualizados actualmente.
- Mantener la edición de `Nuevo`, `Modificar`, `Eliminar`, `Imprimir`, `Consultar`, `Visualizar` y `Modificar` de controles.
- Mantener la edición aislada hasta seleccionar `Guardar` y regresar al detalle actualizado después de guardar.
- Permitir carga directa y recarga de las nuevas URLs.
- Mantener el backend y los endpoints existentes sin cambios.

**Non-Goals:**

- No cambiar la estructura del modelo `PerfilPrograma` ni crear un endpoint específico para permisos.
- No modificar la pantalla de creación/edición completa de perfiles.
- No convertir la pestaña `Controles por perfil` en una ruta independiente.
- No agregar filtros, paginación o permisos nuevos al editor.
- No conservar el diálogo `Permisos del Programa` como flujo alternativo.

## Decisions

### 1. Usar dos pantallas standalone y rutas planas

Se agregará una pantalla standalone para el detalle del perfil y otra para la edición de permisos por programa. Las rutas conceptuales serán:

- `/perfiles/:perfilId` para el detalle del perfil.
- `/perfiles/:perfilId/programas/:prgCodigo/permisos` para editar los permisos del programa.

Las rutas se registrarán junto a las rutas existentes, con las rutas estáticas y específicas antes de los segmentos dinámicos. La ruta de permisos se declarará antes de la ruta de detalle genérica para evitar ambigüedades.

Se elige esta estructura sobre una única ruta con estados internos porque cada vista tendrá una URL estable, soportará recarga y permitirá que el botón del navegador represente el flujo real. También evita mantener el listado, el detalle y la edición en un componente monolítico.

### 2. Separar responsabilidades de `PerfilesComponent`

`PerfilesComponent` conservará el listado, la búsqueda, la exportación y la carga masiva. El detalle del perfil se trasladará a un componente de detalle y la lógica del antiguo diálogo de permisos a un componente de edición de permisos.

El componente de detalle cargará el perfil a partir de `perfilId`, resolverá los programas y controles necesarios y renderizará inicialmente `Programas por perfil`. La acción de editar un programa navegará al componente de permisos con ambos parámetros de ruta.

Esta separación permite eliminar `selectedPerfil`, los estados del diálogo y sus métodos de `PerfilesComponent` sin cambiar el flujo de administración de la lista.

### 3. Cargar por parámetros de ruta y mantener estado editable local

Cada pantalla leerá sus parámetros con `ActivatedRoute` y cargará datos mediante `ApiService`. El editor de permisos localizará el perfil, verificará que el programa pertenezca al perfil y resolverá los metadatos del programa y sus controles.

El editor mantendrá copias locales de los permisos del programa y de los permisos de controles. `Volver` navegará al detalle sin llamar al API, por lo que los cambios pendientes se descartan. `Guardar` construirá una nueva colección `programas` preservando todas las asociaciones no seleccionadas y reemplazando únicamente la asociación editada, incluida su colección de controles.

La asociación de controles seguirá usando el orden estable de controles y `ctrlIndex`, tal como exige el modelo existente. La opción interna `procesar` permanecerá fuera de la interfaz y conservará el comportamiento actual del diálogo al persistir.

### 4. Reutilizar el contrato actual de persistencia

No se agregará un servicio ni endpoint de permisos. El editor usará:

- `GET /api/seg-perfiles` para cargar el perfil.
- `GET /api/seg-programas` para resolver el nombre y tipo del programa.
- `GET /api/seg-controles` para mostrar los controles.
- `PUT /api/seg-perfiles/:id` con el arreglo completo de programas para guardar.

Después de un guardado exitoso se emitirá el evento de datos existente, se mostrará el toast actual y se navegará a `/perfiles/:perfilId`. Si el guardado falla, la pantalla conservará los valores locales para permitir reintento.

### 5. Mantener el contexto de navegación explícito

El enlace `Nombre` navegará a `/perfiles/:perfilId`. El detalle siempre iniciará en la pestaña `Programas por perfil`, que es el equivalente al estado actual `p-tabs value="0"`. `Volver a Perfiles` navegará a `/perfiles`.

Desde el editor, tanto `Volver` como el guardado exitoso navegarán explícitamente a `/perfiles/:perfilId`, en vez de depender del historial del navegador. Esto garantiza que el usuario vuelva al perfil correcto y a la pestaña requerida.

### 6. Actualizar los metadatos del layout para rutas dinámicas

Se agregarán metadatos para el detalle del perfil y para la pantalla de permisos. `updateMetaFromPath()` deberá resolver primero la ruta específica de permisos, luego la ruta de detalle y finalmente las rutas existentes de creación/edición, para que el encabezado del layout no muestre `Editar Perfil` en las nuevas pantallas.

### Alternativas consideradas

- **Mantener una vista interna dentro de `PerfilesComponent`**: descartada porque no ofrece una ruta real, recarga directa ni separación clara de responsabilidades.
- **Convertir únicamente el editor en ruta y mantener el detalle interno**: descartada porque `Volver` no podría recuperar de forma confiable el perfil seleccionado después de una recarga.
- **Reutilizar `PerfilFormComponent`**: descartada porque esa pantalla edita la composición completa del perfil y no contiene la tabla de controles ni el flujo específico de permisos por programa.
- **Agregar un endpoint específico por perfil-programa**: descartada porque el backend actual ya valida y actualiza el arreglo completo de programas mediante `PUT /api/seg-perfiles/:id`.

## Risks / Trade-offs

- [Riesgo] El detalle que antes vivía en el mismo componente se divide entre rutas y componentes, con riesgo de duplicar consultas o presentación. → [Mitigación] Compartir los tipos existentes, reutilizar `ApiService` y mantener una única fuente de transformación para programas y controles.
- [Riesgo] Un perfil o programa eliminado mientras una URL está abierta puede dejar parámetros válidos pero datos inexistentes. → [Mitigación] Validar perfil, programa y asociación; mostrar `ErrorStateComponent` y ofrecer retorno a `/perfiles`.
- [Riesgo] El guardado envía el arreglo completo y una carga desactualizada podría sobrescribir cambios hechos en otra vista. → [Mitigación] Mantener el contrato actual, recargar la entidad al entrar y no enviar cambios hasta que el usuario confirme explícitamente con `Guardar`.
- [Riesgo] Cambiar el diálogo por una pantalla puede afectar la adaptación en viewport pequeño. → [Mitigación] Reutilizar los estilos de tablas, tarjetas y formularios existentes y verificar escritorio y móvil durante la validación.
- [Trade-off] Se agregan URLs más explícitas y componentes nuevos a cambio de eliminar estado implícito y obtener navegación directa.

## Migration Plan

1. Agregar las rutas y los componentes nuevos manteniendo `/perfiles` como entrada existente.
2. Cambiar el enlace de nombre y la acción de edición para navegar a las nuevas rutas.
3. Retirar el markup, estado y métodos del detalle y del diálogo de permisos de `PerfilesComponent`.
4. Verificar que la creación, edición completa, listado, carga masiva y eliminación de perfiles continúen funcionando.
5. Ejecutar `npm run build` en `front-angular` y validar manualmente navegación directa, recarga, guardado, error y retorno.

No se requiere migración de datos ni despliegue coordinado con el backend. Para revertir el cambio, se restauran las rutas y el flujo anterior del componente; el contrato de API y los datos persistidos permanecen compatibles.

## Open Questions

No quedan preguntas funcionales bloqueantes. La decisión de usar rutas explícitas para el detalle y el editor queda fijada por este diseño; la pestaña `Programas por perfil` seguirá siendo la vista inicial y destino de retorno.
