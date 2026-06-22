import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent } from '../../shared/components/ui';
import {
  IconSystemsComponent,
  IconRolesComponent,
  IconUsersComponent,
  IconAuthorizerComponent,
  IconKeyComponent,
  IconAccessComponent,
  IconChevronRightComponent,
  IconClockComponent,
  IconShieldComponent,
  IconLdapComponent,
} from '../../shared/components/icons';
import type { Stats } from '../../shared/models/types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TableSkeletonComponent,
    IconSystemsComponent,
    IconRolesComponent,
    IconUsersComponent,
    IconAuthorizerComponent,
    IconKeyComponent,
    IconAccessComponent,
    IconChevronRightComponent,
    IconClockComponent,
    IconShieldComponent,
    IconLdapComponent,
  ],
  template: `
    @if (!stats()) {
      <app-table-skeleton [rows]="6" [cols]="4" />
    } @else {
      <div class="grid" style="gap: 18px;">
        <div class="grid cols-4">
          <div class="card kpi">
            <div class="kpi-icon" style="background: var(--blue-50); color: var(--navy-600);">
              <app-icon-systems />
            </div>
            <div class="kpi-val">{{ stats()!.systems }}</div>
            <div class="kpi-label">Sistemas gobernados</div>
            <div class="kpi-foot">{{ stats()!.permissions }} accesos catalogados</div>
          </div>
          <div class="card kpi">
            <div class="kpi-icon" style="background: #f5f3ff; color: var(--violet-600);">
              <app-icon-roles />
            </div>
            <div class="kpi-val">{{ stats()!.roles }}</div>
            <div class="kpi-label">Roles definidos</div>
            <div class="kpi-foot">Admin / Edit / View y más</div>
          </div>
          <div class="card kpi">
            <div class="kpi-icon" style="background: var(--green-50); color: var(--green-700);">
              <app-icon-users />
            </div>
            <div class="kpi-val">{{ stats()!.users }}</div>
            <div class="kpi-label">Usuarios</div>
            <div class="kpi-foot">{{ stats()!.localUsers }} locales · {{ stats()!.ldapUsers }} LDAP</div>
          </div>
          <div class="card kpi">
            <div class="kpi-icon" style="background: var(--amber-50); color: var(--amber-700);">
              <app-icon-authorizer />
            </div>
            <div class="kpi-val">{{ pendingVal }}</div>
            <div class="kpi-label">Solicitudes pendientes</div>
            <div class="kpi-foot">{{ pendingFoot }}</div>
          </div>
        </div>

        <div class="grid cols-3">
          <div class="card" style="grid-column: span 2;">
            <div class="card-head">
              <h3>Roles por sistema</h3>
              @if (isAdmin) {
                <a routerLink="/sistemas" class="btn btn-ghost btn-sm">
                  Ver sistemas <app-icon-chevron-right [width]="14" [height]="14" />
                </a>
              }
            </div>
            <div class="card-body grid" style="gap: 14px;">
              @for (s of stats()!.rolesPerSystem; track s.systemId) {
                <div>
                  <div class="row between mb-2">
                    <div class="row gap-2">
                      <span class="icon-tile" [style.width.px]="26" [style.height.px]="26" [style.fontSize.px]="10" [style.background]="s.color">
                        {{ s.code.slice(0, 2) }}
                      </span>
                      <b class="small">{{ s.name }}</b>
                    </div>
                    <span class="muted small">{{ s.roles }} {{ s.roles === 1 ? 'rol' : 'roles' }}</span>
                  </div>
                  <div class="bar">
                    <span [style.width.%]="(s.roles / maxRoles) * 100" [style.background]="s.color"></span>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h3>Usuarios</h3></div>
            <div class="card-body">
              <div class="row gap-3 mb-4">
                <div class="grow">
                  <div class="row gap-2">
                    <app-icon-shield [width]="16" [height]="16" />
                    <b class="small">Administradores</b>
                  </div>
                  <div style="font-size: 24px; font-weight: 800;">{{ stats()!.usersByType.ADMIN }}</div>
                  <div class="tiny dim">Creados localmente</div>
                </div>
                <div class="grow">
                  <div class="row gap-2">
                    <app-icon-ldap [width]="16" [height]="16" />
                    <b class="small">Cliente final</b>
                  </div>
                  <div style="font-size: 24px; font-weight: 800;">{{ stats()!.usersByType.CLIENTE_FINAL }}</div>
                  <div class="tiny dim">Desde LDAP</div>
                </div>
              </div>
              <div class="bar" style="height: 10px;">
                <span [style.width.%]="adminPct" style="background: var(--navy-500);"></span>
              </div>
              <div class="row between tiny dim mt-2">
                <span>{{ adminPct }}% admin local</span>
                <span>{{ 100 - adminPct }}% LDAP</span>
              </div>

              <div class="divider"></div>
              <div class="grid" style="gap: 8px;">
                <div class="row between">
                  <span class="muted small">Accesos vigentes</span>
                  <b>{{ stats()!.grants }}</b>
                </div>
                <div class="row between">
                  <span class="muted small">Aprobadas</span>
                  <span class="badge badge-green">{{ stats()!.approvedRequests }}</span>
                </div>
                <div class="row between">
                  <span class="muted small">Rechazadas</span>
                  <span class="badge badge-red">{{ stats()!.rejectedRequests }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid cols-3">
          <div class="card pad">
            <h3 class="mb-3">Accesos rápidos</h3>
            <div class="grid" style="gap: 10px;">
              @if (isAdmin) {
                <a routerLink="/roles" class="btn btn-ghost" style="justify-content: flex-start;">
                  <app-icon-roles /> Crear un rol y elegir accesos
                </a>
                <a routerLink="/usuarios" class="btn btn-ghost" style="justify-content: flex-start;">
                  <app-icon-users /> Crear usuario y asignar roles
                </a>
              }
              <a routerLink="/autorizador" class="btn btn-ghost" style="justify-content: flex-start;">
                <app-icon-authorizer /> Crear y autorizar solicitudes
              </a>
              @if (isAdmin) {
                <a routerLink="/accesos" class="btn btn-ghost" style="justify-content: flex-start;">
                  <app-icon-access /> Consultar accesos efectivos
                </a>
              }
            </div>
          </div>

          <div class="card" style="grid-column: span 2;">
            <div class="card-head">
              <h3>Actividad reciente</h3>
              @if (isAdmin) {
                <a routerLink="/auditoria" class="btn btn-ghost btn-sm">
                  Ver auditoría <app-icon-chevron-right [width]="14" [height]="14" />
                </a>
              }
            </div>
            <div class="card-body">
              <ul class="list-clean">
                @for (a of stats()!.recentAudit; track a.id) {
                  <li class="timeline-item">
                    <span class="timeline-dot">
                      <app-icon-clock />
                    </span>
                    <div class="grow">
                      <div class="small">
                        <b>{{ a.actor }}</b> · {{ a.detail }}
                      </div>
                      <div class="tiny dim">{{ events.relativeTime(a.timestamp) }} · {{ a.action }}</div>
                    </div>
                  </li>
                }
              </ul>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  events = inject(EventsService);

  stats = signal<Stats | null>(null);
  myPending = signal<number | null>(null);

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  get pendingVal(): number {
    return this.isAdmin
      ? (this.stats()?.pendingRequests ?? 0)
      : (this.myPending() ?? 0);
  }

  get pendingFoot(): string {
    return this.isAdmin ? 'Requieren autorización' : 'Le corresponde autorizar';
  }

  get maxRoles(): number {
    if (!this.stats()) return 1;
    return Math.max(1, ...this.stats()!.rolesPerSystem.map(s => s.roles));
  }

  get totalUsers(): number {
    if (!this.stats()) return 1;
    const { ADMIN, CLIENTE_FINAL } = this.stats()!.usersByType;
    return ADMIN + CLIENTE_FINAL || 1;
  }

  get adminPct(): number {
    if (!this.stats()) return 0;
    return Math.round((this.stats()!.usersByType.ADMIN / this.totalUsers) * 100);
  }

  ngOnInit(): void {
    this.api.stats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => {},
    });

    if (!this.isAdmin && this.auth.user()) {
      Promise.all([
        this.api.listRequests('PENDING').toPromise(),
        this.api.listRoles().toPromise(),
      ]).then(([reqs, roles]) => {
        if (!reqs || !roles) return;
        const count = reqs.filter((req: any) => {
          const role = roles.find((r: any) => r.id === req.roleId);
          return role?.authorizerUserId === this.auth.user()?.id;
        }).length;
        this.myPending.set(count);
      });
    }
  }
}
