import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import {
  TableSkeletonComponent,
  ErrorStateComponent,
  EmptyStateComponent,
  SearchBoxComponent,
  AvatarComponent,
  TypeBadgeComponent,
  SourceBadgeComponent,
} from '../../shared/components/ui';
import {
  IconPlusComponent,
  IconUsersComponent,
  IconTrashComponent,
  IconEditComponent,
  IconRolesComponent,
  IconShieldComponent,
  IconLdapComponent,
  IconUserPlusComponent,
  IconDownloadComponent,
  IconCheckComponent,
  IconCloseComponent,
} from '../../shared/components/icons';
import type { LdapPerson, Role, User, UserType } from '../../shared/models/types';

type Tab = 'ALL' | 'ADMIN' | 'CLIENTE_FINAL';

interface UserForm {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  cargo: string;
  department: string;
  password: string;
  roleIds: string[];
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    ConfirmDialogModule,
    TableSkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    SearchBoxComponent,
    AvatarComponent,
    TypeBadgeComponent,
    SourceBadgeComponent,
    IconPlusComponent,
    IconUsersComponent,
    IconTrashComponent,
    IconEditComponent,
    IconRolesComponent,
    IconShieldComponent,
    IconLdapComponent,
    IconUserPlusComponent,
    IconDownloadComponent,
    IconCheckComponent,
    IconCloseComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Usuarios</h1>
        <p>Los administradores se crean localmente en la consola; los clientes finales se integran exclusivamente desde LDAP. A todos se les asignan roles.</p>
      </div>
    </div>

    <div class="tabs mb-4">
      <button [class.active]="tab() === 'ALL'" (click)="tab.set('ALL')">
        Todos ({{ totalCount }})
      </button>
      <button [class.active]="tab() === 'ADMIN'" (click)="tab.set('ADMIN')">
        Administradores ({{ adminCount }})
      </button>
      <button [class.active]="tab() === 'CLIENTE_FINAL'" (click)="tab.set('CLIENTE_FINAL')">
        Clientes finales ({{ clienteFinalCount }})
      </button>
    </div>

    <div class="row between mb-4">
      <app-search-box [value]="q()" (valueChange)="q.set($event)" placeholder="Buscar usuario…" />
      <button class="btn btn-primary" (click)="showCreateDialog = true">
        <app-icon-user-plus /> Nuevo Usuario
      </button>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="6" [cols]="6" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="load" />
    } @else if (filtered().length === 0) {
      <div class="card">
        <div class="empty">
          <div class="empty-icon"><app-icon-users /></div>
          <h4>Sin usuarios</h4>
          <p class="muted small">Cree un administrador local o integre un cliente final desde LDAP.</p>
          <div class="mt-4">
            <button class="btn btn-primary" (click)="showCreateDialog = true">
              <app-icon-user-plus /> Nuevo Usuario
            </button>
          </div>
        </div>
      </div>
    } @else {
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Cargo / Departamento</th>
              <th>Tipo</th>
              <th>Origen</th>
              <th>Roles</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (u of filtered(); track u.id) {
              <tr>
                <td>
                  <div class="row gap-3">
                    <app-avatar [first]="u.firstName" [last]="u.lastName" [ldap]="u.source === 'LDAP'" />
                    <div>
                      <div class="cell-strong">{{ u.firstName }} {{ u.lastName }}</div>
                      <div class="tiny dim mono">{{ u.username }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{{ u.cargo || '—' }}</div>
                  <div class="tiny dim">{{ u.department || '—' }}</div>
                </td>
                <td><app-type-badge [type]="u.type" /></td>
                <td><app-source-badge [source]="u.source" /></td>
                <td>
                  @if (u.roleIds.length === 0) {
                    <span class="muted small">Sin roles</span>
                  } @else {
                    <div class="row gap-2 wrap">
                      @for (rid of u.roleIds.slice(0, 2); track rid) {
                        <span class="badge badge-gray">{{ getRoleName(rid) }}</span>
                      }
                      @if (u.roleIds.length > 2) {
                        <span class="badge badge-gray">+{{ u.roleIds.length - 2 }}</span>
                      }
                    </div>
                  }
                </td>
                <td>
                  <span class="badge" [class.badge-green]="u.status === 'ACTIVE'" [class.badge-gray]="u.status !== 'ACTIVE'">
                    {{ u.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <div class="cell-actions">
                    <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openEdit(u)">
                      <app-icon-edit [width]="15" [height]="15" />
                    </button>
                    <button class="btn btn-ghost btn-sm btn-icon" title="Asignar roles" (click)="openRoles(u)">
                      <app-icon-roles [width]="15" [height]="15" />
                    </button>
                    @if (u.source === 'LOCAL') {
                      <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDelete(u)">
                        <app-icon-trash [width]="15" [height]="15" />
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <p-dialog
      [(visible)]="showCreateDialog"
      header="Nuevo usuario"
      [modal]="true"
      [style]="{ width: '560px' }"
      [closable]="true"
      (onHide)="closeCreateDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Usuario</label>
          <input class="input" [(ngModel)]="userForm.username" placeholder="juan.perez" />
        </div>
        <div class="field">
          <label>Contraseña</label>
          <input class="input" type="password" [(ngModel)]="userForm.password" placeholder="••••••••" />
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Nombre</label>
          <input class="input" [(ngModel)]="userForm.firstName" placeholder="Juan" />
        </div>
        <div class="field">
          <label>Apellido</label>
          <input class="input" [(ngModel)]="userForm.lastName" placeholder="Pérez" />
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Email</label>
          <input class="input" type="email" [(ngModel)]="userForm.email" placeholder="juan.perez@reybanpac.com" />
        </div>
        <div class="field">
          <label>Cargo</label>
          <input class="input" [(ngModel)]="userForm.cargo" placeholder="Analista de Sistemas" />
        </div>
      </div>
      <div class="field">
        <label>Departamento</label>
        <input class="input" [(ngModel)]="userForm.department" placeholder="Tecnología" />
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeCreateDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="createUser()">Crear Usuario</button>
      </ng-template>
    </p-dialog>

    <p-dialog
      [(visible)]="showEditDialog"
      header="Editar usuario"
      [modal]="true"
      [style]="{ width: '560px' }"
      [closable]="true"
      (onHide)="closeEditDialog()"
    >
      @if (editUser) {
        <div class="form-grid">
          <div class="field">
            <label>Usuario</label>
            <input class="input" [(ngModel)]="userForm.username" />
          </div>
          <div class="field">
            <label>Nueva contraseña</label>
            <input class="input" type="password" [(ngModel)]="userForm.password" placeholder="Dejar en blanco para no cambiar" />
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Nombre</label>
            <input class="input" [(ngModel)]="userForm.firstName" />
          </div>
          <div class="field">
            <label>Apellido</label>
            <input class="input" [(ngModel)]="userForm.lastName" />
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Email</label>
            <input class="input" type="email" [(ngModel)]="userForm.email" />
          </div>
          <div class="field">
            <label>Cargo</label>
            <input class="input" [(ngModel)]="userForm.cargo" />
          </div>
        </div>
        <div class="field">
          <label>Departamento</label>
          <input class="input" [(ngModel)]="userForm.department" />
        </div>
      }
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeEditDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="updateUser()">Guardar Cambios</button>
      </ng-template>
    </p-dialog>

    <p-dialog
      [(visible)]="showRolesDialog"
      header="Asignar roles"
      [modal]="true"
      [style]="{ width: '560px' }"
      [closable]="true"
      (onHide)="closeRolesDialog()"
    >
      @if (rolesUser) {
        <div class="mb-4 row gap-3">
          <app-avatar [first]="rolesUser.firstName" [last]="rolesUser.lastName" [ldap]="rolesUser.source === 'LDAP'" />
          <div>
            <b>{{ rolesUser.firstName }} {{ rolesUser.lastName }}</b>
            <div class="tiny dim mono">{{ rolesUser.username }}</div>
          </div>
        </div>
        <div class="field">
          <label>Seleccionar roles</label>
          <div class="grid" style="gap: 8px; margin-top: 8px;">
            @for (r of roles(); track r.id) {
              <label class="check-card" [class.checked]="isRoleSelected(r.id)">
                <input
                  type="checkbox"
                  [checked]="isRoleSelected(r.id)"
                  (change)="toggleRole(r.id)"
                />
                <div class="grow">
                  <div class="row gap-2">
                    <span class="cc-title">{{ r.name }}</span>
                    @if (r.isAdmin) {
                      <app-icon-shield [width]="12" [height]="12" />
                    }
                  </div>
                  <div class="cc-desc">{{ r.description }}</div>
                </div>
              </label>
            }
          </div>
        </div>
      }
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeRolesDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="saveRoles()">Guardar Roles</button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
})
export class UsersComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  tab = signal<Tab>('ALL');
  q = signal('');

  showCreateDialog = false;
  showEditDialog = false;
  showRolesDialog = false;
  editUser: User | null = null;
  rolesUser: User | null = null;
  userForm: UserForm = this.blankForm();
  selectedRoleIds: string[] = [];

  load = () => this.loadData();

  get totalCount(): number { return this.users().length; }
  get adminCount(): number { return this.users().filter(u => u.type === 'ADMIN').length; }
  get clienteFinalCount(): number { return this.users().filter(u => u.type === 'CLIENTE_FINAL').length; }

  ngOnInit(): void {
    this.loadData();
    this.events.onDataChanged(() => this.loadData());
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    Promise.all([
      this.api.listUsers().toPromise(),
      this.api.listRoles().toPromise(),
    ]).then(([u, r]) => {
      this.users.set(u || []);
      this.roles.set(r || []);
    }).catch((e) => {
      this.error.set(e.message);
    }).finally(() => {
      this.loading.set(false);
    });
  }

  blankForm(): UserForm {
    return { username: '', firstName: '', lastName: '', email: '', cargo: '', department: '', password: '', roleIds: [] };
  }

  filtered(): User[] {
    return this.users()
      .filter(u => this.tab() === 'ALL' || u.type === this.tab())
      .filter(u => `${u.firstName} ${u.lastName} ${u.username} ${u.cargo} ${u.department}`.toLowerCase().includes(this.q().toLowerCase()));
  }

  getRoleName(roleId: string): string {
    const role = this.roles().find(r => r.id === roleId);
    return role?.name || roleId;
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
    this.userForm = this.blankForm();
  }

  openEdit(u: User): void {
    this.editUser = u;
    this.userForm = {
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      cargo: u.cargo,
      department: u.department,
      password: '',
      roleIds: [...u.roleIds],
    };
    this.showEditDialog = true;
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.editUser = null;
  }

  openRoles(u: User): void {
    this.rolesUser = u;
    this.selectedRoleIds = [...u.roleIds];
    this.showRolesDialog = true;
  }

  closeRolesDialog(): void {
    this.showRolesDialog = false;
    this.rolesUser = null;
  }

  isRoleSelected(roleId: string): boolean {
    return this.selectedRoleIds.includes(roleId);
  }

  toggleRole(roleId: string): void {
    const idx = this.selectedRoleIds.indexOf(roleId);
    if (idx >= 0) {
      this.selectedRoleIds = this.selectedRoleIds.filter(id => id !== roleId);
    } else {
      this.selectedRoleIds = [...this.selectedRoleIds, roleId];
    }
  }

  async createUser(): Promise<void> {
    if (!this.userForm.username || !this.userForm.password || !this.userForm.firstName) {
      this.toast.error('Faltan datos', 'Usuario, contraseña y nombre son obligatorios.');
      return;
    }
    try {
      await this.api.createUser(this.userForm).toPromise();
      this.toast.success('Usuario creado', `${this.userForm.firstName} ${this.userForm.lastName} fue agregado.`);
      this.events.emitDataChanged();
      this.closeCreateDialog();
      this.loadData();
    } catch (e: any) {
      this.toast.error('Error', e.message);
    }
  }

  async updateUser(): Promise<void> {
    if (!this.editUser) return;
    if (!this.userForm.username || !this.userForm.firstName) {
      this.toast.error('Faltan datos');
      return;
    }
    const payload: any = {
      username: this.userForm.username,
      firstName: this.userForm.firstName,
      lastName: this.userForm.lastName,
      email: this.userForm.email,
      cargo: this.userForm.cargo,
      department: this.userForm.department,
    };
    if (this.userForm.password) {
      payload.password = this.userForm.password;
    }
    try {
      await this.api.updateUser(this.editUser.id, payload).toPromise();
      this.toast.success('Usuario actualizado');
      this.events.emitDataChanged();
      this.closeEditDialog();
      this.loadData();
    } catch (e: any) {
      this.toast.error('Error', e.message);
    }
  }

  async saveRoles(): Promise<void> {
    if (!this.rolesUser) return;
    try {
      await this.api.setUserRoles(this.rolesUser.id, this.selectedRoleIds).toPromise();
      this.toast.success('Roles actualizados');
      this.events.emitDataChanged();
      this.closeRolesDialog();
      this.loadData();
    } catch (e: any) {
      this.toast.error('Error', e.message);
    }
  }

  confirmDelete(u: User): void {
    if (confirm(`¿Eliminar a ${u.firstName} ${u.lastName}?`)) {
      this.remove(u);
    }
  }

  async remove(u: User): Promise<void> {
    try {
      await this.api.deleteUser(u.id).toPromise();
      this.toast.success('Usuario eliminado');
      this.events.emitDataChanged();
      this.loadData();
    } catch (e: any) {
      this.toast.error('Error', e.message);
    }
  }
}
