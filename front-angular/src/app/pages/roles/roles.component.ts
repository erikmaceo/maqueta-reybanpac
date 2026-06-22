import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { CheckboxModule } from 'primeng/checkbox';

import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import {
  TableSkeletonComponent,
  ErrorStateComponent,
  EmptyStateComponent,
  SearchBoxComponent,
  LevelPillComponent,
  SystemTileComponent,
  SwitchComponent,
} from '../../shared/components/ui';
import {
  IconPlusComponent,
  IconRolesComponent,
  IconTrashComponent,
  IconEditComponent,
  IconShieldComponent,
  IconKeyComponent,
  IconUsersComponent,
  IconCloseComponent,
} from '../../shared/components/icons';
import type { Permission, Role, SystemApp, User } from '../../shared/models/types';

const COLORS = ['#2563eb', '#7c3aed', '#0d9488', '#d97706', '#dc2626', '#0891b2', '#db2777', '#475569'];

interface RoleForm {
  name: string;
  description: string;
  systemId: string | null;
  permissionIds: string[];
  isAdmin: boolean;
  authorizerUserId: string | null;
  color: string;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,

    ConfirmDialogModule,
    TableSkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    SearchBoxComponent,
    LevelPillComponent,
    SystemTileComponent,
    SwitchComponent,
    IconPlusComponent,
    IconRolesComponent,
    IconTrashComponent,
    IconEditComponent,
    IconShieldComponent,
    IconKeyComponent,
    IconUsersComponent,
    IconCloseComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Roles y accesos</h1>
        <p>Cree roles, seleccione los accesos que otorgan y designe un autorizador (Dueño Técnico). El rol administrador concentra el acceso completo.</p>
      </div>
      <div class="row gap-3">
        <app-search-box [value]="q()" (valueChange)="q.set($event)" placeholder="Buscar rol…" />
        <button class="btn btn-primary" (click)="openCreate()">
          <app-icon-plus /> Nuevo rol
        </button>
      </div>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="6" [cols]="3" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="load" />
    } @else if (filtered().length === 0) {
      <div class="card">
        <div class="empty">
          <div class="empty-icon"><app-icon-roles /></div>
          <h4>Sin roles</h4>
          <p class="muted small">Cree el primer rol y seleccione sus accesos.</p>
          <div class="mt-4">
            <button class="btn btn-primary" (click)="openCreate()">
              <app-icon-plus /> Nuevo rol
            </button>
          </div>
        </div>
      </div>
    } @else {
      <div class="grid cols-3">
        @for (r of filtered(); track r.id) {
          <div class="card pad" [style.display]="'flex'" [style.flexDirection]="'column'" [style.gap.px]="10" [style.borderTop]="'3px solid ' + r.color">
            <div class="row between">
              <div class="row gap-2">
                <span class="icon-tile" [style.width.px]="34" [style.height.px]="34" [style.background]="r.color">
                  <app-icon-shield *ngIf="r.isAdmin" [width]="16" [height]="16" />
                  <app-icon-roles *ngIf="!r.isAdmin" [width]="16" [height]="16" />
                </span>
                <div>
                  <h3 style="font-size: 15px;">{{ r.name }}</h3>
                  <div class="tiny dim">{{ getSystemName(r.systemId) || 'Transversal · todos los sistemas' }}</div>
                </div>
              </div>
              @if (r.isAdmin) {
                <span class="badge badge-red">
                  <app-icon-shield [width]="12" [height]="12" /> Acceso completo
                </span>
              }
            </div>
            <p class="muted small" style="flex: 1; margin: 0;">{{ r.description }}</p>
            <div class="row gap-3 small muted">
              <span class="row gap-2">
                <app-icon-key [width]="14" [height]="14" /> {{ r.permissionIds.length }} accesos
              </span>
              <span class="row gap-2">
                <app-icon-users [width]="14" [height]="14" /> {{ countUsersWith(r.id) }} usuarios
              </span>
            </div>
            <div class="tiny dim">
              Autorizador: <b style="color: var(--text-2);">{{ getAuthorizerName(r.authorizerUserId) || '— sin asignar' }}</b>
            </div>
            <div class="divider" style="margin: 4px 0;"></div>
            <div class="row gap-2">
              <button class="btn btn-ghost btn-sm grow" (click)="openEdit(r)">
                <app-icon-edit [width]="14" [height]="14" /> Editar accesos
              </button>
              <button
                class="btn btn-danger btn-sm btn-icon"
                title="Eliminar"
                [disabled]="r.isAdmin"
                (click)="confirmDelete(r)"
              >
                <app-icon-trash [width]="15" [height]="15" />
              </button>
            </div>
          </div>
        }
      </div>
    }

    <p-dialog
      [(visible)]="showDialog"
      [header]="editId ? 'Editar rol' : 'Nuevo rol'"
      [modal]="true"
      [style]="{ width: '820px' }"
      [closable]="true"
      (onHide)="closeDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Nombre del rol</label>
          <input class="input" [(ngModel)]="formData.name" placeholder="KS8 DEV — Edit" />
        </div>
        <div class="field">
          <label>Sistema</label>
          <select class="select" [(ngModel)]="formData.systemId" (ngModelChange)="onSystemChange()">
            <option value="">Transversal (todos los sistemas)</option>
            @for (s of systems(); track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>
        </div>
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea class="input" [(ngModel)]="formData.description" rows="2" placeholder="¿Para qué sirve este rol?"></textarea>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Autorizador (Dueño Técnico)</label>
          <select class="select" [(ngModel)]="formData.authorizerUserId">
            <option [ngValue]="null">— Sin asignar</option>
            @for (u of adminUsers(); track u.id) {
              <option [value]="u.id">{{ u.firstName }} {{ u.lastName }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Color</label>
          <div class="row gap-2" style="padding-top: 6px;">
            @for (c of colors; track c) {
              <button
                type="button"
                [style.width.px]="26"
                [style.height.px]="26"
                [style.borderRadius.px]="7"
                [style.background]="c"
                [style.border]="formData.color === c ? '3px solid var(--navy-800)' : '2px solid #fff'"
                [style.boxShadow]="'var(--shadow-sm)'"
                (click)="formData.color = c"
              ></button>
            }
          </div>
        </div>
      </div>

      <div
        class="check-card mb-4"
        [style.borderColor]="formData.isAdmin ? 'var(--red-100)' : 'var(--border)'"
        [style.background]="formData.isAdmin ? 'var(--red-50)' : '#fff'"
      >
        <app-switch [(checked)]="formData.isAdmin" />
        <div>
          <div class="cc-title row gap-2">
            <app-icon-shield [width]="15" [height]="15" /> Rol administrador — acceso completo
          </div>
          <div class="cc-desc">Otorga automáticamente <b>todos</b> los accesos de todos los sistemas. Ideal para el rol administrador.</div>
        </div>
      </div>

      @if (!formData.isAdmin) {
        <div class="row between mb-2">
          <b class="small">Seleccionar accesos</b>
          <button class="btn btn-ghost btn-sm" (click)="toggleAllPerms()">
            {{ isAllSelected() ? 'Quitar todos' : 'Seleccionar todos' }}
          </button>
        </div>

        @if (!hasGroupedPerms()) {
          <div class="empty">
            <div class="empty-icon"><app-icon-key /></div>
            <h4>Este sistema no tiene accesos</h4>
            <p class="muted small">Agregue accesos al sistema desde la sección Sistemas.</p>
          </div>
        } @else {
          <div class="grid" style="gap: 16px;">
            @for (entry of objectEntries(groupedPerms()); track entry[0]) {
              <div>
                <div class="group-label" style="color: var(--text-3); padding: 0 0 8px;">{{ entry[0] }}</div>
                <div class="grid cols-2">
                  @for (p of entry[1]; track p.id) {
                    <label class="check-card" [class.checked]="formData.permissionIds.includes(p.id)">
                      <input
                        type="checkbox"
                        [checked]="formData.permissionIds.includes(p.id)"
                        (change)="togglePerm(p.id)"
                      />
                      <div class="grow">
                        <div class="row between">
                          <span class="cc-title">{{ p.name }}</span>
                          <app-level-pill [level]="p.level" />
                        </div>
                        <div class="cc-desc">{{ p.description }}</div>
                      </div>
                    </label>
                  }
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <div class="banner banner-warn">
          <app-icon-shield /> Este rol recibirá automáticamente los {{ permissions().length }} accesos catalogados en la plataforma.
        </div>
      }

      <ng-template pTemplate="footer">
        <span class="muted small grow">
          {{ formData.isAdmin ? 'Acceso completo · ' + permissions().length + ' accesos' : formData.permissionIds.length + ' accesos seleccionados' }}
        </span>
        <button class="btn btn-ghost" (click)="closeDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="save()">
          {{ editId ? 'Guardar cambios' : 'Crear rol' }}
        </button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
})
export class RolesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  roles = signal<Role[]>([]);
  systems = signal<SystemApp[]>([]);
  permissions = signal<Permission[]>([]);
  users = signal<User[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  q = signal('');

  showDialog = false;
  editId: string | null = null;
  formData: RoleForm = this.blankForm();
  colors = COLORS;

  load = () => this.loadData();

  ngOnInit(): void {
    this.loadData();
    this.events.onDataChanged(() => this.loadData());
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    Promise.all([
      this.api.listRoles().toPromise(),
      this.api.listSystems().toPromise(),
      this.api.listPermissions().toPromise(),
      this.api.listUsers().toPromise(),
    ]).then(([r, s, p, u]) => {
      this.roles.set(r || []);
      this.systems.set(s || []);
      this.permissions.set(p || []);
      this.users.set(u || []);
    }).catch((e) => {
      this.error.set(e.message);
    }).finally(() => {
      this.loading.set(false);
    });
  }

  blankForm(): RoleForm {
    return { name: '', description: '', systemId: null, permissionIds: [], isAdmin: false, authorizerUserId: null, color: COLORS[0] };
  }

  filtered(): Role[] {
    const query = this.q().toLowerCase();
    return this.roles().filter(r => `${r.name} ${r.description}`.toLowerCase().includes(query));
  }

  getSystemName(systemId: string | null): string {
    const sys = this.systems().find(s => s.id === systemId);
    return sys?.name || '';
  }

  getAuthorizerName(userId: string | null): string {
    if (!userId) return '';
    const user = this.users().find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : '';
  }

  countUsersWith(roleId: string): number {
    return this.users().filter(u => u.roleIds.includes(roleId)).length;
  }

  adminUsers(): User[] {
    return this.users().filter(u => u.type === 'ADMIN');
  }

  builderPerms(): Permission[] {
    if (!this.formData.systemId) return this.permissions();
    return this.permissions().filter(p => p.systemId === this.formData.systemId);
  }

  groupedPerms(): Record<string, Permission[]> {
    const map: Record<string, Permission[]> = {};
    for (const p of this.builderPerms()) {
      const sys = this.systems().find(s => s.id === p.systemId);
      const key = `${sys?.code || '—'} · ${p.category}`;
      (map[key] ||= []).push(p);
    }
    return map;
  }

  objectEntries(obj: Record<string, Permission[]>): [string, Permission[]][] {
    return Object.entries(obj);
  }

  hasGroupedPerms(): boolean {
    return Object.keys(this.groupedPerms()).length > 0;
  }

  isAllSelected(): boolean {
    return this.formData.permissionIds.length === this.builderPerms().length && this.builderPerms().length > 0;
  }

  togglePerm(id: string): void {
    const idx = this.formData.permissionIds.indexOf(id);
    if (idx >= 0) {
      this.formData.permissionIds = this.formData.permissionIds.filter(x => x !== id);
    } else {
      this.formData.permissionIds = [...this.formData.permissionIds, id];
    }
  }

  toggleAllPerms(): void {
    if (this.isAllSelected()) {
      this.formData.permissionIds = [];
    } else {
      this.formData.permissionIds = this.builderPerms().map(p => p.id);
    }
  }

  onSystemChange(): void {
    this.formData.permissionIds = [];
  }

  openCreate(): void {
    this.formData = this.blankForm();
    this.editId = null;
    this.showDialog = true;
  }

  openEdit(r: Role): void {
    this.formData = {
      name: r.name,
      description: r.description,
      systemId: r.systemId ?? null,
      permissionIds: [...r.permissionIds],
      isAdmin: r.isAdmin,
      authorizerUserId: r.authorizerUserId,
      color: r.color,
    };
    this.editId = r.id;
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.editId = null;
  }

  async save(): Promise<void> {
    if (!this.formData.name) {
      this.toast.error('Falta el nombre del rol');
      return;
    }
    if (!this.formData.isAdmin && this.formData.permissionIds.length === 0) {
      this.toast.error('Seleccione accesos', 'Elija al menos un acceso o marque "acceso completo".');
      return;
    }
    const payload = { ...this.formData, systemId: this.formData.systemId || null };
    try {
      if (this.editId) {
        await this.api.updateRole(this.editId, payload).toPromise();
        this.toast.success('Rol actualizado');
      } else {
        await this.api.createRole(payload).toPromise();
        this.toast.success('Rol creado', `"${this.formData.name}" con ${this.formData.isAdmin ? 'acceso completo' : this.formData.permissionIds.length + ' accesos'}.`);
      }
      this.events.emitDataChanged();
      this.closeDialog();
      this.loadData();
    } catch (e: any) {
      this.toast.error('Error', e.message);
    }
  }

  confirmDelete(r: Role): void {
    if (confirm(`¿Eliminar el rol "${r.name}"? Se quitará de los usuarios que lo tengan asignado.`)) {
      this.remove(r);
    }
  }

  async remove(r: Role): Promise<void> {
    try {
      await this.api.deleteRole(r.id).toPromise();
      this.toast.success('Rol eliminado');
      this.events.emitDataChanged();
      this.loadData();
    } catch (e: any) {
      this.toast.error('No se pudo eliminar', e.message);
    }
  }
}
