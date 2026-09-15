## 1. Reordenamiento de Aplicación

- [x] 1.1 En `AplicacionFormComponent`, envolver `Estado` y `Nodo de Segregación` en un `.form-grid` lado a lado y mover el campo `Descripción` al final de la tarjeta, después de los campos.

## 2. Reordenamiento de Módulo

- [x] 2.1 En `ModuloFormComponent`, envolver la búsqueda de `Aplicación` y el campo `Estado` en un `.form-grid` lado a lado y mover el campo `Descripción` al final de la tarjeta, después de los campos.

## 3. Reordenamiento de Programa

- [x] 3.1 En `ProgramaFormComponent`, envolver las búsquedas de `Aplicación` y `Módulo` en un `.form-grid` lado a lado y los campos `Tipo de Programa` + `Estado` en otro `.form-grid`; mover `Descripción` al final (antes de la sección de controles).

## 4. Verificación

- [x] 4.1 Ejecutar `npm.cmd run build` en `front-angular` y confirmar compilación sin errores.
- [x] 4.2 Verificar visualmente en rutas nuevo/editar de las tres entidades que los campos quedan en filas de dos según el requerimiento, `Descripción` al final, y sin cambios en validaciones ni búsquedas.