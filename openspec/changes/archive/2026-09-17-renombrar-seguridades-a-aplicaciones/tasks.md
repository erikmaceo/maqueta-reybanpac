## 1. Cambio de etiqueta en el sidebar

- [x] 1.1 En `front-angular/src/app/pages/layout/layout.component.ts`, cambiar en `NAV_ITEMS` la etiqueta del item con `path: '/seguridades'` de `'Seguridades'` a `'Aplicaciones'`, conservando ruta, icono, grupo y `adminOnly` sin cambios.

## 2. Verificación

- [x] 2.1 Ejecutar `npm.cmd run build` en `front-angular` y confirmar compilación sin errores.
- [x] 2.2 Verificar visualmente que el sidebar muestra "Aplicaciones" para la entrada `/seguridades` y que la navegación, icono y visibilidad se conservan.