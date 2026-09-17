## 1. Reiniciar servidor de desarrollo

- [x] 1.1 Detener el servidor de desarrollo actual (Ctrl+C en la terminal donde corre `ng serve`)
- [x] 1.2 Limpiar la carpeta de caché de Angular ejecutando `Remove-Item -Recurse -Force .angular\cache` en `front-angular/`
- [ ] 1.3 Reiniciar el servidor de desarrollo ejecutando `npm.cmd start` en `front-angular/` y esperar a que complete la compilación inicial

## 2. Corregir link de navegación en tabla de perfiles

- [x] 2.1 En `front-angular/src/app/pages/perfiles/perfiles.component.ts` (línea 73), reemplazar `<a class="perfil-link" (click)="goToPerfilDetail(p)">{{ p.nombre }}</a>` con `<a class="perfil-link" [routerLink]="p.id ? ['/perfiles', p.id] : null" [class.disabled]="!p.id">{{ p.nombre }}</a>` para usar `routerLink` con validación defensiva
- [x] 2.2 Eliminar el método `goToPerfilDetail()` del componente (líneas 265-267) ya que no es necesario al usar `routerLink`
- [x] 2.3 Agregar estilo CSS `.perfil-link.disabled { pointer-events: none; opacity: 0.5; cursor: not-allowed; }` para perfiles sin ID válido

## 3. Verificación

- [x] 3.1 Ejecutar `npm.cmd run build` en `front-angular` y confirmar compilación sin errores
- [ ] 3.2 Verificar visualmente que al hacer click en el nombre de un perfil navega correctamente al detalle del perfil
- [ ] 3.3 Verificar que el link funciona con Ctrl+Click (abrir en nueva pestaña)
- [ ] 3.4 Verificar que perfiles sin ID válido muestran el nombre sin link navegable (estilo deshabilitado)
