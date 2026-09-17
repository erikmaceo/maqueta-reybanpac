## Context

El componente `PerfilesComponent` renderiza una tabla con perfiles, donde la columna "Nombre" debe navegar al detalle del perfil. Actualmente usa un handler `(click)="goToPerfilDetail(p)"` que llama a `this.router.navigate(['/perfiles', p.id])`. El usuario reporta que al hacer click no ocurre nada, y posteriormente se observa un error en consola: `Failed to fetch dynamically imported module`.

Las rutas están correctamente configuradas en `app.routes.ts` (líneas 118-121):
- `perfiles/:perfilId` → `PerfilDetailComponent` (lazy loaded)

El componente `PerfilDetailComponent` existe y está correctamente implementado en `front-angular/src/app/pages/perfil-detail/perfil-detail.component.ts`.

## Goals / Non-Goals

**Goals:**
- Corregir la navegación del link "Nombre" en la tabla de perfiles para que navegue correctamente al detalle del perfil
- Usar `routerLink` en lugar de un handler programático para mejorar la semántica HTML y robustez
- Verificar que el servidor de desarrollo esté actualizado y los chunks dinámicos se carguen correctamente

**Non-Goals:**
- Modificar la ruta `perfiles/:perfilId` en `app.routes.ts`
- Cambiar el comportamiento del componente `PerfilDetailComponent`
- Modificar la lógica de `goToEditarPerfil()` que requiere navegación programática

## Decisions

1. **Usar `routerLink` en lugar de handler `(click)`**: El template actual usa `(click)="goToPerfilDetail(p)"` que es menos robusto y no aprovecha las ventajas de `routerLink` (semántica HTML, soporte para Ctrl+Click, etc.). El cambio a `[routerLink]="['/perfiles', p.id]"` es más idiomático y robusto.

2. **Eliminar método `goToPerfilDetail()`**: Al usar `routerLink`, el método `goToPerfilDetail()` ya no es necesario y puede eliminarse para reducir código muerto.

3. **Verificar servidor de desarrollo**: El error "Failed to fetch dynamically imported module" sugiere que el servidor de desarrollo puede necesitar reinicio o que hay un problema con los chunks dinámicos. Se incluirá una tarea para verificar esto.

4. **Mantener `goToEditarPerfil()` sin cambios**: Este método usa `this.router.navigate(['/perfiles', p.id, 'editar'])` y requiere lógica adicional (posible validación antes de navegar), por lo que se mantiene como está.

## Risks / Trade-offs

- **[Riesgo] Servidor de desarrollo desactualizado**: El error de carga dinámica puede persistir si el servidor no se reinicia después de los cambios → Mitigación: incluir tarea de verificación y reinicio del servidor
- **[Riesgo] `p.id` undefined**: Si la API no devuelve `id` para algún perfil, `routerLink` generará una URL inválida → Mitigación: agregar validación condicional en el template (mostrar texto plano si no hay `id`)
- **[Trade-off] Pérdida de flexibilidad**: Al usar `routerLink` en lugar de handler, se pierde la capacidad de agregar lógica antes de la navegación → Mitigación: el caso de uso actual no requiere lógica previa; si se necesita en el futuro, se puede revertir a handler
