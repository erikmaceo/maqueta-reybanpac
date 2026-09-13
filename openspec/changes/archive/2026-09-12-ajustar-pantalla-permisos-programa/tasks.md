## 1. Distribución visual

- [x] 1.1 Ajustar `.permission-card` para ocupar el ancho disponible, eliminar el límite de `980px`, aplicar `5px` de padding y conservar `box-sizing` correcto.
- [x] 1.2 Cambiar la grilla de contexto a cuatro columnas y la grilla de permisos a cinco columnas en escritorio, con wrapping usable en viewport estrecho.
- [x] 1.3 Alinear el grupo de botones `Volver`/`Guardar` a la derecha y aplicar una separación de `2px` sin cambiar sus handlers ni estados.

## 2. Tabla de controles y paginación

- [x] 2.1 Agregar el estado de página, tamaño de página, total de páginas y colección visible para la paginación local de `permControles`.
- [x] 2.2 Implementar los cambios de página y tamaño con las opciones `5`, `10`, `15` y `20`, reiniciando la página al cambiar el tamaño.
- [x] 2.3 Reestructurar la tabla de controles con el markup de Auditoría: `card table-wrap`, `table.data`, `pagination`, `page-controls` y `page-size-selector`.
- [x] 2.4 Renderizar la página visible sin reemplazar la colección completa y conservar todos los cambios de distintas páginas al ejecutar `savePermissions()`.

## 3. Verificación

- [x] 3.1 Ejecutar `npm run build` en `front-angular` y corregir errores de compilación o templates.
- [x] 3.2 Validar visualmente el ancho, padding, filas horizontales, botones y comportamiento responsive en escritorio y móvil.
- [x] 3.3 Validar la tabla contra Auditoría, paginar con todos los tamaños, editar controles en páginas distintas y confirmar que Guardar persiste todos los cambios.
- [x] 3.4 Confirmar que `Volver`, la carga de datos, los mensajes de error y la navegación existente no tengan regresiones.
