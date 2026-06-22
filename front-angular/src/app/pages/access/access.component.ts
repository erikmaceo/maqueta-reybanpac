import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import {
  TableSkeletonComponent,
  EmptyStateComponent,
  SearchBoxComponent,
  AvatarComponent,
} from '../../shared/components/ui';
import {
  IconAccessComponent,
  IconTrashComponent,
  IconUserComponent,
  IconKeyComponent,
} from '../../shared/components/icons';
import type { Grant, Role, SystemApp, User } from '../../shared/models/types';

@Component({
  selector: 'app-access',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TableModule,
    ConfirmDialogModule,
        TableSkeletonComponent,
    EmptyStateComponent,
    SearchBoxComponent,
    AvatarComponent,
    IconAccessComponent,
    IconTrashComponent,
    IconUserComponent,
    IconKeyComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Accesos efectivos</h1>
        <p>Matriz de accesos vigentes por usuario y sistema. Puede revocar un acceso en cualquier momento.</p>
      </div>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="6" [cols]="5" />
    } @else if (grants().length === 0) {
      <div class="card">
        <div class="empty">
          <div class="empty-icon"><app-icon-access /></div>
          <h4>Sin accesos efectivos</h4>
          <p class="muted small">Aprobar solicitudes de acceso para que los usuarios tengan accesos vigentes.</p>
        </div>
      </div>
    } @else {
      <div class="tabs mb-4">
        <button [class.active]="viewMode() === 'list'" (click)="viewMode.set('list')">
          Lista
        </button>
        <button [class.active]="viewMode() === 'matrix'" (click)="viewMode.set('matrix')">
          Matriz
        </button>
      </div>

      @if (viewMode() === 'list') {
        <div class="card table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Sistema</th>
                <th>Otorgado el</th>
                <th>Por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (g of grants(); track g.id) {
                <tr>
                  <td>
                    <div class="row gap-2">
                      <app-avatar [first]="getUserFirst(g.userId)" [last]="getUserLast(g.userId)" size="sm" />
                      <div>
                        <div class="small">{{ getUserName(g.userId) }}</div>
                        <div class="tiny dim mono">{{ getUserUsername(g.userId) }}</div>
                      </div>
                    </div>
                  </td>
                  <td><b>{{ getRoleName(g.roleId) }}</b></td>
                  <td>
                    @if (getSystemName(g.systemId)) {
                      <span class="badge badge-blue">{{ getSystemName(g.systemId) }}</span>
                    } @else {
                      <span class="muted small">Transversal</span>
                    }
                  </td>
                  <td>
                    <div>{{ formatDate(g.grantedAt) }}</div>
                    <div class="tiny dim">{{ formatDateTime(g.grantedAt) }}</div>
                  </td>
                  <td>{{ getUserName(g.authorizedByUserId || '') }}</td>
                  <td>
                    <button class="btn btn-danger btn-sm btn-icon" title="Revocar acceso" (click)="confirmRevoke(g)">
                      <app-icon-trash [width]="15" [height]="15" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="card">
          <div class="card-body" style="overflow-x: auto;">
            <table class="data" style="min-width: 800px;">
              <thead>
                <tr>
                  <th style="position: sticky; left: 0; background: var(--surface-2);">Usuario</th>
                  @for (s of systems(); track s.id) {
                    <th class="center">{{ s.code }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (u of activeUsers(); track u.id) {
                  <tr>
                    <td style="position: sticky; left: 0; background: var(--surface);">
                      <div class="row gap-2">
                        <app-avatar [first]="u.firstName" [last]="u.lastName" [ldap]="u.source === 'LDAP'" size="sm" />
                        <div>
                          <div class="small">{{ u.firstName }} {{ u.lastName }}</div>
                          <div class="tiny dim">{{ u.department || '—' }}</div>
                        </div>
                      </div>
                    </td>
                    @for (s of systems(); track s.id) {
                      <td class="center">
                        @if (hasAccess(u.id, s.id)) {
                          <app-icon-key [width]="16" [height]="16" style="color: var(--green-600);" />
                        } @else {
                          <span class="muted">—</span>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    }

    <p-confirmDialog></p-confirmDialog>
  `,
})
export class AccessComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  grants = signal<Grant[]>([]);
  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  systems = signal<SystemApp[]>([]);
  loading = signal(false);
  viewMode = signal<'list' | 'matrix'>('list');

  ngOnInit(): void {
    this.loadData();
    this.events.onDataChanged(() => this.loadData());
  }

  loadData(): void {
    this.loading.set(true);
    Promise.all([
      this.api.listGrants().toPromise(),
      this.api.listUsers().toPromise(),
      this.api.listRoles().toPromise(),
      this.api.listSystems().toPromise(),
    ]).then(([g, u, r, s]) => {
      this.grants.set(g || []);
      this.users.set(u || []);
      this.roles.set(r || []);
      this.systems.set(s || []);
    }).finally(() => {
      this.loading.set(false);
    });
  }

  getUser(id: string): User | undefined {
    return this.users().find((u) => u.id === id);
  }

  getUserName(id: string): string {
    const u = this.getUser(id);
    return u ? `${u.firstName} ${u.lastName}` : '—';
  }

  getUserFirst(id: string): string {
    return this.getUser(id)?.firstName || '';
  }

  getUserLast(id: string): string {
    return this.getUser(id)?.lastName || '';
  }

  getUserUsername(id: string): string {
    return this.getUser(id)?.username || '';
  }

  getRole(id: string): Role | undefined {
    return this.roles().find((r) => r.id === id);
  }

  getRoleName(id: string): string {
    return this.getRole(id)?.name || id;
  }

  getSystemName(id: string | null): string {
    if (!id) return '';
    return this.systems().find((s) => s.id === id)?.name || '';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  activeUsers(): User[] {
    const userIdsWithGrants = new Set(this.grants().map((g) => g.userId));
    return this.users().filter((u) => userIdsWithGrants.has(u.id));
  }

  hasAccess(userId: string, systemId: string): boolean {
    return this.grants().some((g) => {
      if (g.userId !== userId) return false;
      const role = this.getRole(g.roleId);
      if (!role) return false;
      if (role.isAdmin) return true;
      if (role.systemId && role.systemId !== systemId) return false;
      const perms = role.permissionIds;
      if (perms.length === 0) return false;
      return true;
    });
  }

  confirmRevoke(g: Grant): void {
    if (confirm('¿Revocar este acceso?')) {
      this.revoke(g);
    }
  }

  revoke(g: Grant): void {
    this.api.revokeGrant(g.id).subscribe({
      next: () => {
        this.toast.success('Acceso revocado');
        this.events.emitDataChanged();
        this.loadData();
      },
      error: (e) => this.toast.error('Error', e.message),
    });
  }
}
