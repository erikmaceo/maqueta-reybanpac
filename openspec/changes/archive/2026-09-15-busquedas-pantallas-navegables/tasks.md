## 1. Servicio de borrador

- [x] 1.1 Crear `SeguridadDraftService` en `front-angular/src/app/core/services/seguridad-draft.service.ts` (`providedIn: 'root'`) con `save(draft)` y `consume()` (devuelve y limpia el borrador pendiente).

## 2. Pantallas de selección

- [x] 2.1 Crear `AplicacionSelectComponent` (ruta `/seguridades/seleccionar-aplicacion`): filtros Código/Nombre/Estado; tabla con Código, Nombre, Descripción, Estado (badge) y acción `Seleccionar`; paginación local con selector 5/10/15/20; regresa a `returnTo` con `appCodigo` (`Volver` sin seleccionar y `returnTo` inválido → `/seguridades`).
- [x] 2.2 Crear `ModuloSelectComponent` (ruta `/seguridades/seleccionar-modulo`): filtros Código/Nombre; tabla con Código, Nombre, Aplicación (badge) y acción `Seleccionar`; paginación local con selector 5/10/15/20; regresa a `returnTo` con `modCodigo`.
- [x] 2.3 Crear `NodoPadreSelectComponent` (ruta `/seguridades/seleccionar-nodo`): solo nodos activos con `padreId === null` (nivel raíz); filtros Código/Nombre; columna Nivel (via `listNivelesSegregacion`); paginación local con selector 5/10/15/20; regresa a `returnTo` con `nodoId`.

## 3. Rutas

- [x] 3.1 Registrar las rutas `seguridades/seleccionar-aplicacion`, `seguridades/seleccionar-modulo` y `seguridades/seleccionar-nodo` en `app.routes.ts` con lazy loading y `adminGuard`.

## 4. Formulario de Aplicación

- [x] 4.1 Reemplazar el diálogo de búsqueda de nodo padre en `AplicacionFormComponent`: guardar borrador, navegar a `seleccionar-nodo` con `returnTo`; en `ngOnInit` consumir borrador y aplicar `nodoId`; eliminar el `p-dialog`, su estado/métodos y los import/`DialogModule` sin uso.

## 5. Formulario de Módulo

- [x] 5.1 Reemplazar el diálogo de búsqueda de aplicación en `ModuloFormComponent`: guardar borrador, navegar a `seleccionar-aplicacion` con `returnTo`; en `ngOnInit` consumir borrador y aplicar `appCodigo`; eliminar el `p-dialog`, su estado/métodos y los import/`DialogModule` sin uso.

## 6. Formulario de Programa

- [x] 6.1 Reemplazar los diálogos de búsqueda de aplicación y módulo en `ProgramaFormComponent`: guardar borrador (incluida la lista `prgControles`), navegar a `seleccionar-aplicacion`/`seleccionar-modulo` con `returnTo`; en `ngOnInit` consumir borrador y aplicar `appCodigo`/`modCodigo`; conservar la limpieza de `modCodigo` cuando cambia la aplicación; eliminar los `p-dialog`, su estado/métodos y los import/`DialogModule` sin uso. El selector de módulo filtra por `appCodigo` cuando se llega desde el formulario de programa.

## 7. Verificación

- [x] 7.1 Ejecutar `npm.cmd run build` en `front-angular` y confirmar compilación sin errores.
- [x] 7.2 Verificar visualmente en rutas nuevo/editar de las tres entidades que los `search` navegan a pantallas de ancho completo, que el borrador se conserva, que la entidad seleccionada se aplica (con limpieza de módulo al cambiar aplicación en Programa) y que `Volver` funciona sin cambios en validaciones ni guardado.