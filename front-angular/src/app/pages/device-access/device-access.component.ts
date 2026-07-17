import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import {
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent,
} from '../../shared/components/icons';
import type { User, DispositivoMovil, AccesoDispositivoMovil } from '../../shared/models/types';

type Estado = 'ACTIVO' | 'INACTIVO';

const MOCK_USERS: User[] = [
  { id: 'u_admin', username: 'ctudela', firstName: 'Cristóbal', lastName: 'Tudela', email: 'ctudela@reybanpac.com', cargo: 'DevOps', department: 'Desarrollo', company: 'Reybanpac', nodoIds: [], perfilCodigos: [], status: 'ACTIVE', roleIds: [], type: 'ADMIN', source: 'LOCAL', createdAt: new Date().toISOString(), lastLogin: null },
  { id: 'u_ldiaz', username: 'ldiaz', firstName: 'Lázaro', lastName: 'Diaz', email: 'ldiaz@reybanpac.com', cargo: 'Líder', department: 'Desarrollo', company: 'Reybanpac', nodoIds: [], perfilCodigos: [], status: 'ACTIVE', roleIds: [], type: 'ADMIN', source: 'LOCAL', createdAt: new Date().toISOString(), lastLogin: null },
  { id: 'u_grobles', username: 'grobles', firstName: 'Geovanny', lastName: 'Robles', email: 'grobles@reybanpac.com', cargo: 'Analista', department: 'Desarrollo', company: 'Reybanpac', nodoIds: [], perfilCodigos: [], status: 'ACTIVE', roleIds: [], type: 'CLIENTE_FINAL', source: 'LDAP', createdAt: new Date().toISOString(), lastLogin: null },
];

const MOCK_DISPOSITIVOS: DispositivoMovil[] = [
  { id: '1', codigo: 'DM-001', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '2', codigo: 'DM-002', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '3', codigo: 'DM-003', estado: 'INACTIVO', createdAt: new Date().toISOString() },
];

const MOCK_ACCESOS: AccesoDispositivoMovil[] = [
  { id: '1', userId: 'u_admin', dispositivoId: 'param_disp_1', createdAt: new Date().toISOString() },
  { id: '2', userId: 'u_ldiaz', dispositivoId: 'param_disp_2', createdAt: new Date().toISOString() },
];

interface AccesoView extends AccesoDispositivoMovil {
  username: string;
  firstName: string;
  lastName: string;
  dispositivoCodigo: string;
  dispositivoEstado: Estado;
}

@Component({
  selector: 'app-device-access',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Accesos por dispositivo móvil</h1>
        <p>Gestión de dispositivos móviles asignados a cada usuario.</p>
      </div>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="5" [cols]="5" />
    } @else {
      <div class="row between mb-4">
        <div class="search">
          <app-icon-search [width]="15" [height]="15" />
          <input type="text" placeholder="Buscar por usuario o dispositivo..."
            [ngModel]="search()" (ngModelChange)="search.set($event)" />
        </div>
        <button class="btn btn-primary" (click)="openDialog()">
          <app-icon-plus [width]="14" [height]="14" /> Nuevo acceso
        </button>
      </div>
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Código de usuario</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Código dispositivo</th>
              <th>Estado dispositivo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (a of filteredAccesos(); track a.id) {
              <tr>
                <td class="mono">{{ a.username }}</td>
                <td><div class="cell-strong">{{ a.firstName }}</div></td>
                <td><div class="cell-strong">{{ a.lastName }}</div></td>
                <td class="mono">{{ a.dispositivoCodigo }}</td>
                <td>
                  <span class="badge" [class.badge-green]="a.dispositivoEstado === 'ACTIVO'" [class.badge-gray]="a.dispositivoEstado !== 'ACTIVO'">
                    {{ a.dispositivoEstado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <div class="cell-actions">
                    <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openDialog(a)">
                      <app-icon-edit [width]="15" [height]="15" />
                    </button>
                    <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDelete(a)">
                      <app-icon-trash [width]="15" [height]="15" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin accesos registrados.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }

    <p-dialog
      [(visible)]="showDlg"
      [header]="editId ? 'Editar Acceso' : 'Nuevo Acceso'"
      [modal]="true" [style]="{ width: '480px' }" [closable]="true"
      (onHide)="closeDialog()"
    >
      <div class="field">
        <label>Usuario</label>
        <div class="search-field">
          <input class="select" type="text" [ngModel]="userSearchText()" readonly placeholder="Seleccione un usuario..." />
          <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openUserSearchDialog()" title="Buscar usuario">
            <app-icon-search [width]="16" [height]="16" />
          </button>
        </div>
      </div>
      <div class="field">
        <label>Dispositivo móvil</label>
        <div class="search-field">
          <input class="select" type="text" [ngModel]="dispositivoSearchText()" readonly placeholder="Seleccione un dispositivo..." />
          <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openDispSearchDialog()" title="Buscar dispositivo">
            <app-icon-search [width]="16" [height]="16" />
          </button>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="save()">{{ editId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <p-dialog
      [(visible)]="showUserSearchDlg"
      header="Buscar usuario"
      [modal]="true" [style]="{ width: '900px' }" [closable]="true"
      (onHide)="closeUserSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="userFilterCodigo" placeholder="Código de usuario" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="userFilterNombre" placeholder="Nombre" />
        </div>
        <div class="field">
          <label>Apellido</label>
          <input type="text" class="select" [(ngModel)]="userFilterApellido" placeholder="Apellido" />
        </div>
        <div class="field">
          <label>Correo</label>
          <input type="text" class="select" [(ngModel)]="userFilterCorreo" placeholder="Correo" />
        </div>
        <div class="field">
          <label>Departamento</label>
          <input type="text" class="select" [(ngModel)]="userFilterDepartamento" placeholder="Departamento" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyUserFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearUserFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Correo</th>
              <th>Departamento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (u of paginatedUsersForSearch(); track u.id) {
              <tr>
                <td class="mono">{{ u.username }}</td>
                <td><div class="cell-strong">{{ u.firstName }}</div></td>
                <td><div class="cell-strong">{{ u.lastName }}</div></td>
                <td>{{ u.email }}</td>
                <td>{{ u.department }}</td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectUserFromDialog(u)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="userSearchPage() === 1" (click)="changeUserPage(-1)">Anterior</button>
        <span>Página {{ userSearchPage() }} de {{ userSearchTotalPages() }} ({{ filteredUsersForSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="userSearchPage() === userSearchTotalPages()" (click)="changeUserPage(1)">Siguiente</button>
      </div>
    </p-dialog>

    <p-dialog
      [(visible)]="showDispSearchDlg"
      header="Buscar dispositivo móvil"
      [modal]="true" [style]="{ width: '700px' }" [closable]="true"
      (onHide)="closeDispSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="dispFilterCodigo" placeholder="Código de dispositivo" />
        </div>
        <div class="field">
          <label>Estado</label>
          <select class="select" [(ngModel)]="dispFilterEstado">
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyDispFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearDispFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (d of paginatedDispsForSearch(); track d.id) {
              <tr>
                <td class="mono">{{ d.codigo }}</td>
                <td>
                  <span class="badge" [class.badge-green]="d.estado === 'ACTIVO'" [class.badge-gray]="d.estado !== 'ACTIVO'">
                    {{ d.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectDispFromDialog(d)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="3" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="dispSearchPage() === 1" (click)="changeDispPage(-1)">Anterior</button>
        <span>Página {{ dispSearchPage() }} de {{ dispSearchTotalPages() }} ({{ filteredDispsForSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="dispSearchPage() === dispSearchTotalPages()" (click)="changeDispPage(1)">Siguiente</button>
      </div>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
})
export class DeviceAccessComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  usuarios = signal<User[]>([]);
  dispositivos = signal<DispositivoMovil[]>([]);
  accesos = signal<AccesoDispositivoMovil[]>([]);

  loading = signal(true);
  search = signal('');

  showDlg = false;
  editId: string | null = null;
  form = { userId: '', dispositivoId: '' };
  userSearchText = signal('');
  dispositivoSearchText = signal('');

  showUserSearchDlg = false;
  showDispSearchDlg = false;

  userFilterCodigo = '';
  userFilterNombre = '';
  userFilterApellido = '';
  userFilterCorreo = '';
  userFilterDepartamento = '';
  appliedUserFilterCodigo = signal('');
  appliedUserFilterNombre = signal('');
  appliedUserFilterApellido = signal('');
  appliedUserFilterCorreo = signal('');
  appliedUserFilterDepartamento = signal('');
  userSearchPage = signal(1);
  userSearchPageSize = signal(10);

  dispFilterCodigo = '';
  dispFilterEstado = '';
  appliedDispFilterCodigo = signal('');
  appliedDispFilterEstado = signal('');
  dispSearchPage = signal(1);
  dispSearchPageSize = signal(10);

  userMap = computed(() => new Map(this.usuarios().map(u => [u.id, u])));
  dispositivoMap = computed(() => new Map(this.dispositivos().map(d => [d.id, d])));

  accesosView = computed<AccesoView[]>(() => {
    return this.accesos().map(a => {
      const u = this.userMap().get(a.userId);
      const d = this.dispositivoMap().get(a.dispositivoId);
      return {
        ...a,
        username: u?.username || '',
        firstName: u?.firstName || '',
        lastName: u?.lastName || '',
        dispositivoCodigo: d?.codigo || '',
        dispositivoEstado: d?.estado || 'ACTIVO',
      };
    });
  });

  filteredAccesos = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.accesosView();
    return this.accesosView().filter(a =>
      a.username.toLowerCase().includes(q) ||
      a.firstName.toLowerCase().includes(q) ||
      a.lastName.toLowerCase().includes(q) ||
      a.dispositivoCodigo.toLowerCase().includes(q)
    );
  });

  filteredUsersForSearch = computed(() => {
    const qCodigo = this.appliedUserFilterCodigo().toLowerCase().trim();
    const qNombre = this.appliedUserFilterNombre().toLowerCase().trim();
    const qApellido = this.appliedUserFilterApellido().toLowerCase().trim();
    const qCorreo = this.appliedUserFilterCorreo().toLowerCase().trim();
    const qDepartamento = this.appliedUserFilterDepartamento().toLowerCase().trim();
    return this.usuarios().filter(u =>
      (!qCodigo || u.username.toLowerCase().includes(qCodigo)) &&
      (!qNombre || u.firstName.toLowerCase().includes(qNombre)) &&
      (!qApellido || u.lastName.toLowerCase().includes(qApellido)) &&
      (!qCorreo || u.email.toLowerCase().includes(qCorreo)) &&
      (!qDepartamento || u.department.toLowerCase().includes(qDepartamento))
    );
  });

  paginatedUsersForSearch = computed(() => {
    const start = (this.userSearchPage() - 1) * this.userSearchPageSize();
    return this.filteredUsersForSearch().slice(start, start + this.userSearchPageSize());
  });

  userSearchTotalPages = computed(() => {
    const total = this.filteredUsersForSearch().length;
    return Math.max(1, Math.ceil(total / this.userSearchPageSize()));
  });

  filteredDispsForSearch = computed(() => {
    const qCodigo = this.appliedDispFilterCodigo().toLowerCase().trim();
    const qEstado = this.appliedDispFilterEstado().trim();
    return this.dispositivos().filter(d =>
      (!qCodigo || d.codigo.toLowerCase().includes(qCodigo)) &&
      (!qEstado || d.estado === qEstado)
    );
  });

  paginatedDispsForSearch = computed(() => {
    const start = (this.dispSearchPage() - 1) * this.dispSearchPageSize();
    return this.filteredDispsForSearch().slice(start, start + this.dispSearchPageSize());
  });

  dispSearchTotalPages = computed(() => {
    const total = this.filteredDispsForSearch().length;
    return Math.max(1, Math.ceil(total / this.dispSearchPageSize()));
  });

  selectUser(u: User): void {
    this.form.userId = u.id;
    this.userSearchText.set(`${u.username} · ${u.firstName} ${u.lastName}`);
  }

  selectDispositivo(d: DispositivoMovil): void {
    this.form.dispositivoId = d.id;
    this.dispositivoSearchText.set(d.codigo);
  }

  openUserSearchDialog(): void {
    this.userFilterCodigo = '';
    this.userFilterNombre = '';
    this.userFilterApellido = '';
    this.userFilterCorreo = '';
    this.userFilterDepartamento = '';
    this.appliedUserFilterCodigo.set('');
    this.appliedUserFilterNombre.set('');
    this.appliedUserFilterApellido.set('');
    this.appliedUserFilterCorreo.set('');
    this.appliedUserFilterDepartamento.set('');
    this.userSearchPage.set(1);
    this.showUserSearchDlg = true;
  }

  closeUserSearchDialog(): void {
    this.showUserSearchDlg = false;
  }

  applyUserFilters(): void {
    this.appliedUserFilterCodigo.set(this.userFilterCodigo);
    this.appliedUserFilterNombre.set(this.userFilterNombre);
    this.appliedUserFilterApellido.set(this.userFilterApellido);
    this.appliedUserFilterCorreo.set(this.userFilterCorreo);
    this.appliedUserFilterDepartamento.set(this.userFilterDepartamento);
    this.userSearchPage.set(1);
  }

  clearUserFilters(): void {
    this.userFilterCodigo = '';
    this.userFilterNombre = '';
    this.userFilterApellido = '';
    this.userFilterCorreo = '';
    this.userFilterDepartamento = '';
    this.applyUserFilters();
  }

  changeUserPage(delta: number): void {
    this.userSearchPage.set(Math.min(Math.max(this.userSearchPage() + delta, 1), this.userSearchTotalPages()));
  }

  selectUserFromDialog(u: User): void {
    this.selectUser(u);
    this.closeUserSearchDialog();
  }

  openDispSearchDialog(): void {
    this.dispFilterCodigo = '';
    this.dispFilterEstado = '';
    this.appliedDispFilterCodigo.set('');
    this.appliedDispFilterEstado.set('');
    this.dispSearchPage.set(1);
    this.showDispSearchDlg = true;
  }

  closeDispSearchDialog(): void {
    this.showDispSearchDlg = false;
  }

  applyDispFilters(): void {
    this.appliedDispFilterCodigo.set(this.dispFilterCodigo);
    this.appliedDispFilterEstado.set(this.dispFilterEstado);
    this.dispSearchPage.set(1);
  }

  clearDispFilters(): void {
    this.dispFilterCodigo = '';
    this.dispFilterEstado = '';
    this.applyDispFilters();
  }

  changeDispPage(delta: number): void {
    this.dispSearchPage.set(Math.min(Math.max(this.dispSearchPage() + delta, 1), this.dispSearchTotalPages()));
  }

  selectDispFromDialog(d: DispositivoMovil): void {
    this.selectDispositivo(d);
    this.closeDispSearchDialog();
  }

  ngOnInit(): void {
    this.loadData();
    this.events.onDataChanged(() => this.loadData());
  }

  loadData(): void {
    this.loading.set(true);
    this.api.listUsers().subscribe({
      next: (users) => {
        this.usuarios.set(users);
        this.api.listDispositivosMoviles().subscribe({
          next: (disp) => {
            this.dispositivos.set(disp);
            this.accesos.set([...MOCK_ACCESOS]);
            this.loading.set(false);
          },
          error: () => { this.dispositivos.set([...MOCK_DISPOSITIVOS]); this.accesos.set([...MOCK_ACCESOS]); this.loading.set(false); },
        });
      },
      error: () => {
        this.usuarios.set([...MOCK_USERS]);
        this.dispositivos.set([...MOCK_DISPOSITIVOS]);
        this.accesos.set([...MOCK_ACCESOS]);
        this.loading.set(false);
      },
    });
  }

  openDialog(a?: AccesoView): void {
    if (a) {
      this.editId = a.id;
      this.form = { userId: a.userId, dispositivoId: a.dispositivoId };
      const u = this.userMap().get(a.userId);
      this.userSearchText.set(u ? `${u.username} · ${u.firstName} ${u.lastName}` : '');
      const d = this.dispositivoMap().get(a.dispositivoId);
      this.dispositivoSearchText.set(d ? d.codigo : '');
    } else {
      this.editId = null;
      this.form = { userId: '', dispositivoId: '' };
      this.userSearchText.set('');
      this.dispositivoSearchText.set('');
    }
    this.showDlg = true;
  }

  closeDialog(): void {
    this.showDlg = false;
    this.editId = null;
    this.form = { userId: '', dispositivoId: '' };
    this.userSearchText.set('');
    this.dispositivoSearchText.set('');
  }

  save(): void {
    if (!this.form.userId || !this.form.dispositivoId) {
      this.toast.error('Faltan datos', 'Debe seleccionar usuario y dispositivo móvil.');
      return;
    }
    if (this.editId) {
      const idx = this.accesos().findIndex(a => a.id === this.editId);
      if (idx >= 0) {
        const updated = [...this.accesos()];
        updated[idx] = { ...updated[idx], userId: this.form.userId, dispositivoId: this.form.dispositivoId };
        this.accesos.set(updated);
        this.toast.success('Acceso actualizado');
      }
    } else {
      const nuevo: AccesoDispositivoMovil = {
        id: Date.now().toString(),
        userId: this.form.userId,
        dispositivoId: this.form.dispositivoId,
        createdAt: new Date().toISOString(),
      };
      this.accesos.set([...this.accesos(), nuevo]);
      this.toast.success('Acceso creado');
    }
    this.closeDialog();
  }

  confirmDelete(a: AccesoView): void {
    if (confirm(`¿Eliminar el acceso de "${a.username}" al dispositivo "${a.dispositivoCodigo}"?`)) {
      this.accesos.set(this.accesos().filter(x => x.id !== a.id));
      this.toast.success('Acceso eliminado');
    }
  }
}
