import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () => import('./pages/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      {
        path: 'sistemas',
        loadComponent: () => import('./pages/systems/systems.component').then(m => m.SystemsComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'seguridades',
        loadComponent: () => import('./pages/security/security.component').then(m => m.SecurityComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./pages/configuration/configuration.component').then(m => m.ConfigurationComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'roles',
        loadComponent: () => import('./pages/roles/roles.component').then(m => m.RolesComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'matriz-acceso',
        loadComponent: () => import('./pages/matrix-access/matrix-access.component').then(m => m.MatrixAccessComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'directorio',
        loadComponent: () => import('./pages/directory/directory.component').then(m => m.DirectoryComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'soluciones',
        loadComponent: () => import('./pages/soluciones/soluciones.component').then(m => m.SolucionesComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'soluciones/:codigo',
        loadComponent: () => import('./pages/soluciones/soluciones.component').then(m => m.SolucionesComponent),
        canActivate: [adminGuard],
      },
      { path: 'autorizador', loadComponent: () => import('./pages/authorizer/authorizer.component').then(m => m.AuthorizerComponent) },
      {
        path: 'accesos',
        loadComponent: () => import('./pages/access/access.component').then(m => m.AccessComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'auditoria',
        loadComponent: () => import('./pages/audit/audit.component').then(m => m.AuditComponent),
        canActivate: [adminGuard],
      },
    ],
  },
  { path: '**', redirectTo: '/' },
];
