import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { EventsService } from '../../core/services/events.service';
import { AvatarComponent } from '../../shared/components/ui';
import type { Aplicacion } from '../../shared/models/types';
import {
  IconDashboardComponent, IconSystemsComponent, IconRolesComponent,
  IconUsersComponent, IconAuthorizerComponent, IconAccessComponent,
  IconAuditComponent, IconLogoutComponent, IconLdapComponent,
  IconSecurityComponent, IconMatrixComponent, IconServerComponent, IconChevronRightComponent,
  IconBuildingComponent, IconSettingsComponent,
} from '../../shared/components/icons';

interface NavItem {
  path: string;
  label: string;
  icon: any;
  end?: boolean;
  group: string;
  adminOnly?: boolean;
  badge?: boolean;
  isSection?: boolean;
  children?: { label: string; path: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: IconDashboardComponent, end: true, group: 'General' },
  { path: '/sistemas', label: 'Sistemas', icon: IconSystemsComponent, group: 'Gobierno de accesos', adminOnly: true },
  { path: '/seguridades', label: 'Seguridades', icon: IconSecurityComponent, group: 'Gobierno de accesos', adminOnly: true },
  { path: '/configuracion', label: 'Empresas y Sucursales', icon: IconBuildingComponent, group: 'Gobierno de accesos', adminOnly: true },
  { path: '/parametros', label: 'Parámetros y Configuración', icon: IconSettingsComponent, group: 'Gobierno de accesos', adminOnly: true },
  { path: '/usuarios', label: 'Usuarios', icon: IconUsersComponent, group: 'Gobierno de accesos', adminOnly: true },
  { path: '/acceso-usuarios', label: 'Accesos por usuario', icon: IconRolesComponent, group: 'Gobierno de accesos', adminOnly: true },
  { path: '/matriz-acceso', label: 'Matriz de Acceso', icon: IconMatrixComponent, group: 'Gobierno de accesos', adminOnly: true },
  { path: '/directorio', label: 'Directorio LDAP', icon: IconLdapComponent, group: 'Gobierno de accesos', adminOnly: true },
  { path: '/soluciones', label: 'Soluciones', icon: IconServerComponent, group: 'Soluciones', adminOnly: true, isSection: true },
  { path: '/accesos', label: 'Accesos efectivos', icon: IconAccessComponent, group: 'Operación', adminOnly: true },
  { path: '/auditoria', label: 'Auditoría', icon: IconAuditComponent, group: 'Operación', adminOnly: true },
];

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/': { title: 'Panel de control', sub: 'Resumen de la gestión centralizada de accesos' },
  '/sistemas': { title: 'Sistemas', sub: 'Aplicativos gobernados y su catálogo de accesos' },
  '/seguridades': { title: 'Seguridades', sub: 'Configuración de seguridades y políticas de acceso' },
  '/configuracion': { title: 'Configuración', sub: 'Gestión de empresas, sucursales y puntos de venta' },
  '/parametros': { title: 'Parámetros y Configuración', sub: 'Gestión de países, provincias y ciudades' },
  '/usuarios': { title: 'Usuarios', sub: 'Administradores locales y clientes finales desde LDAP' },
  '/acceso-usuarios': { title: 'Accesos por usuario', sub: 'Gestión de Empresa y Perfiles asignados a cada usuario' },
  '/matriz-acceso': { title: 'Matriz de Acceso', sub: 'Carga masiva de seguridades mediante archivo Excel' },
  '/directorio': { title: 'Directorio LDAP', sub: 'Usuarios cliente final integrados desde el directorio corporativo' },
  '/autorizador': { title: 'Módulo autorizador', sub: 'Aprobación y rechazo de solicitudes de acceso' },
  '/accesos': { title: 'Accesos efectivos', sub: 'Matriz de accesos vigentes por usuario y sistema' },
  '/auditoria': { title: 'Auditoría', sub: 'Trazabilidad de todas las acciones de la consola' },
  '/soluciones': { title: 'Soluciones', sub: 'Navegación por aplicación y su jerarquía de seguridades' },
};

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    AvatarComponent,
    IconDashboardComponent,
    IconSystemsComponent,
    IconRolesComponent,
    IconUsersComponent,
    IconAuthorizerComponent,
    IconAccessComponent,
    IconAuditComponent,
    IconLogoutComponent,
    IconLdapComponent,
    IconSecurityComponent, IconMatrixComponent, IconServerComponent, IconChevronRightComponent,
  ],
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <img src="assets/logo-reybanpac.png" alt="Reybanpac" />
          <div>
            <div class="title">Central Access<br/>Manager</div>
            <div class="sub">Reybanpac</div>
          </div>
        </div>

        <nav class="nav">
          @for (group of groups(); track group) {
            <div>
              <div class="group-label">{{ group }}</div>
              @for (item of visibleNavItems(); track item.path) {
                @if (item.group === group && !item.isSection) {
                  <a
                    [routerLink]="item.path"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="{ exact: item.end || false }"
                    class="nav-link"
                  >
                    <ng-container *ngIf="true">
                      <span [class]="getIconClass(item.icon)">
                        <ng-container *ngComponentOutlet="item.icon"></ng-container>
                      </span>
                    </ng-container>
                    <span>{{ item.label }}</span>
                    @if (item.badge && pendingCount() > 0) {
                      <span class="badge-count">{{ pendingCount() }}</span>
                    }
                  </a>
                }
                @if (item.group === group && item.isSection) {
                  <button class="nav-link nav-section-header" (click)="toggleSoluciones()">
                    <span class="chevron-wrap">
                      <app-icon-chevron-right [width]="14" [height]="14" [class.rotated]="solucionesExpanded()" />
                    </span>
                    <span>Soluciones</span>
                    <span class="apps-count">{{ solucionApps().length }}</span>
                  </button>
                  @if (solucionesExpanded()) {
                    @for (app of solucionApps(); track app.id) {
                      <a
                        [routerLink]="'/soluciones/' + app.codigo"
                        routerLinkActive="active"
                        class="nav-link nav-sub-link"
                      >
                        <span></span>
                        <span class="sub-label">{{ app.nombre }}</span>
                      </a>
                    }
                    @if (solucionApps().length === 0) {
                      <span class="nav-link sub-empty">Cargando...</span>
                    }
                  }
                }
              }
            </div>
          }
        </nav>

        <div class="foot">
          v1.0 · Maqueta · Datos en memoria<br/>Favorita Fruit Company
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <div class="grow">
            <div class="page-title">{{ currentMeta().title }}</div>
            <div class="page-sub">{{ currentMeta().sub }}</div>
          </div>
          @if (user()) {
            <div class="row gap-3">
              <div class="userchip">
                <app-avatar
                  [first]="user()!.firstName"
                  [last]="user()!.lastName"
                  size="sm"
                />
                <div class="meta">
                  <b>{{ user()!.firstName }} {{ user()!.lastName }}</b><br/>
                  <span>{{ user()!.cargo || 'Administrador' }}</span>
                </div>
              </div>
              <button
                class="btn btn-ghost btn-icon"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                (click)="logout()"
              >
                <app-icon-logout />
              </button>
            </div>
          }
        </header>
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      margin: 2px 0;
      color: #c2d4f5;
      font-weight: 600;
      font-size: 13.5px;
      transition: background .15s, color .15s;
      text-decoration: none;
    }
    .nav-link:hover {
      background: rgba(255, 255, 255, .07);
      color: #fff;
    }
    .nav-link.active {
      background: rgba(244, 194, 13, .16);
      color: #fff;
      box-shadow: inset 3px 0 0 var(--gold-500);
    }
    .nav-link span:first-child {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nav-link span:first-child svg {
      width: 18px;
      height: 18px;
    }
    .badge-count {
      margin-left: auto;
      background: var(--gold-500);
      color: var(--navy-900);
      font-size: 11px;
      font-weight: 800;
      border-radius: 999px;
      padding: 1px 8px;
    }
    .nav-sub-link {
      padding-left: 28px !important;
      font-size: 13px !important;
      font-weight: 500 !important;
    }
    .nav-sub-link.active {
      box-shadow: inset 2px 0 0 var(--gold-500);
    }
    .sub-label {
      color: #a8c4e8;
    }
    .sub-empty {
      display: block;
      padding: 8px 28px;
      color: #5a7a9a;
      font-size: 12px;
      font-style: italic;
    }
    .nav-section-header {
      width: 100%;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      color: #c2d4f5;
      font-weight: 600;
      font-size: 13.5px;
    }
    .nav-section-header:hover {
      background: rgba(255, 255, 255, .07);
      color: #fff;
    }
    .chevron-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      transition: transform .2s;
    }
    .chevron-wrap app-icon-chevron-right {
      transition: transform .2s;
    }
    .apps-count {
      margin-left: auto;
      background: rgba(255,255,255,.1);
      color: #8ab4d8;
      font-size: 11px;
      font-weight: 700;
      border-radius: 999px;
      padding: 1px 8px;
    }
  `],
})
export class LayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private events = inject(EventsService);
  private router = inject(Router);
  private location = inject(Location);

  user = this.auth.user;
  pendingCount = signal(0);
  solucionApps = signal<Aplicacion[]>([]);
  solucionesExpanded = signal(true);

  groups = signal<string[]>([]);
  visibleNavItems = signal<NavItem[]>([]);
  currentMeta = signal({ title: 'Central Access Manager', sub: '' });

  ngOnInit(): void {
    this.updateNav();
    this.refreshPending();
    this.updateMetaFromPath();
    this.loadSolucionApps();

    this.events.onDataChanged(() => {
      this.refreshPending();
      this.loadSolucionApps();
    });

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.updateMetaFromPath();
        this.refreshPending();
        this.loadSolucionApps();
      });
  }

  private loadSolucionApps(): void {
    this.api.listAplicaciones().subscribe({
      next: (apps) => this.solucionApps.set(apps),
      error: () => {},
    });
  }

  private updateNav(): void {
    const isAdmin = this.auth.isAdmin();
    const visible = NAV_ITEMS.filter(n => isAdmin || !n.adminOnly);
    const groupSet = [...new Set(visible.map(n => n.group))];
    this.groups.set(groupSet);
    this.visibleNavItems.set(visible);
  }

  private refreshPending(): void {
    if (this.auth.isAdmin()) {
      this.api.listRequests('PENDING').subscribe({
        next: (reqs) => this.pendingCount.set(reqs.length),
        error: () => {},
      });
    } else if (this.auth.user()) {
      Promise.all([
        this.api.listRequests('PENDING').toPromise(),
        this.api.listRoles().toPromise(),
      ]).then(([reqs, roles]) => {
        if (!reqs || !roles) return;
        const count = reqs.filter((req: any) => {
          const role = roles.find((r: any) => r.id === req.roleId);
          return role?.authorizerUserId === this.auth.user()?.id;
        }).length;
        this.pendingCount.set(count);
      });
    }
  }

  private updateMetaFromPath(): void {
    const path = this.location.path();
    const meta = PAGE_META[path] || PAGE_META['/'] || { title: 'Central Access Manager', sub: '' };
    this.currentMeta.set(meta);
  }

  getIconClass(icon: any): string {
    return '';
  }

  toggleSoluciones(): void {
    this.solucionesExpanded.update(v => !v);
  }

  logout(): void {
    this.auth.logout();
  }
}
