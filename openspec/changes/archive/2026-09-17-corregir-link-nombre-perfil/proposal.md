## Why

El link de la columna "Nombre" en la tabla de Perfiles no funciona: al hacer click no navega al detalle del perfil. El problema afecta la usabilidad de la sección de Perfiles y rompe el flujo esperado de navegación.

## What Changes

- Reemplazar el handler `(click)="goToPerfilDetail(p)"` con `[routerLink]="['/perfiles', p.id]"` en el template de la tabla de Perfiles
- Eliminar el método `goToPerfilDetail()` del componente (ya no necesario)
- Mantener la navegación programática en `goToEditarPerfil()` que requiere lógica adicional

## Capabilities

### New Capabilities
<!-- Ninguna nueva capacidad introducida -->

### Modified Capabilities
- `profile-permission-routes`: el comportamiento de navegación desde la lista de Perfiles hacia el detalle se modifica para usar `routerLink` directo en lugar de un handler programático, mejorando la robustez y semántica HTML

## Impact

- **Código afectado:** `front-angular/src/app/pages/perfiles/perfiles.component.ts` (template línea 73 y método `goToPerfilDetail()` en clase)
- **Rutas:** sin cambios en `app.routes.ts`
- **APIs:** sin cambios
- **Dependencias:** sin cambios (usa `RouterLink` que ya está importado)
