import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import {
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconDownloadComponent,
} from '../../shared/components/icons';
import type { User, NivelSegregacion, NodoSegregacion, Perfil } from '../../shared/models/types';

@Component({
  selector: 'app-user-access',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconDownloadComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Accesos por usuario</h1>
        <p>Gestión de Nodos de Segregación y Perfiles asignados a cada usuario.</p>
      </div>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="5" [cols]="5" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="loadData" />
    } @else {
      <div class="row between mb-4">
        <div class="search">
          <app-icon-search [width]="15" [height]="15" />
          <input type="text" placeholder="Buscar por nombre, usuario o empresa..."
            [ngModel]="search()" (ngModelChange)="search.set($event)" />
        </div>
        <div class="row gap-2">
          <button class="btn btn-ghost" (click)="exportData()">
            <app-icon-download [width]="14" [height]="14" /> Exportar
          </button>
          <button class="btn btn-primary" (click)="openNewDialog()">
            <app-icon-plus [width]="14" [height]="14" /> Nuevo acceso
          </button>
        </div>
      </div>
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Nodos de Segregación</th>
              <th>Perfiles</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (u of paginatedUsers(); track u.id) {
              <tr>
                <td class="mono">{{ u.username }}</td>
                <td><div class="cell-strong">{{ u.firstName }} {{ u.lastName }}</div><div class="tiny dim">{{ u.email }}</div></td>
                <td>
                  <div style="display:flex;flex-wrap:wrap;gap:4px;">
                    @for (nodoId of u.nodoIds; track nodoId) {
                      <span class="badge badge-blue">{{ getNodoLabel(nodoId) }}</span>
                    } @empty {
                      <span class="muted small">—</span>
                    }
                  </div>
                </td>
                <td>
                  <div style="display:flex;flex-wrap:wrap;gap:4px;">
                    @for (pc of u.perfilCodigos; track pc) {
                      <span class="badge badge-amber">{{ pc }}</span>
                    } @empty {
                      <span class="muted small">—</span>
                    }
                  </div>
                </td>
                <td>
                  <span class="badge" [class.badge-green]="u.status === 'ACTIVE'" [class.badge-gray]="u.status !== 'ACTIVE'">
                    {{ u.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <div class="cell-actions">
                    <button class="btn btn-ghost btn-sm btn-icon" title="Editar acceso" (click)="openDialog(u)">
                      <app-icon-edit [width]="15" [height]="15" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin usuarios encontrados.</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (totalPages() > 1) {
        <div class="pagination">
          <div class="page-controls">
            <button class="btn btn-ghost btn-sm" [disabled]="page() === 0" (click)="setPage(page() - 1)">‹</button>
            @for (p of getPageNumbers(totalPages(), page()); track p) {
              <button class="btn btn-sm" [class.btn-primary]="p === page()" [class.btn-ghost]="p !== page()" (click)="setPage(p)">{{ p + 1 }}</button>
            }
            <button class="btn btn-ghost btn-sm" [disabled]="page() === totalPages() - 1" (click)="setPage(page() + 1)">›</button>
          </div>
        </div>
      }
    }

    <!-- ============ DIÁLOGO EDITAR ACCESO ============ -->
    <p-dialog
      [(visible)]="showDlg"
      [header]="isNew ? 'Nuevo acceso' : 'Acceso de ' + (editUser?.firstName || '') + ' ' + (editUser?.lastName || '')"
      [modal]="true" [style]="{ width: '520px' }" [closable]="true"
      (onHide)="closeDialog()"
    >
      @if (isNew) {
        <div class="field">
          <label>Usuario <span class="required">*</span></label>
          <div class="search-field">
            <input class="select" type="text" [ngModel]="userSearchDisplayText()" readonly placeholder="Seleccione un usuario..." />
            <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openUserSearchDialog()" title="Buscar usuario">
              <app-icon-search [width]="16" [height]="16" />
            </button>
          </div>
        </div>
      }
      <div class="field">
        <label>Nodos de Segregación</label>
        <div class="tree-wrap">
          <ng-template #nodoTree let-nodo>
            <div class="tree-node">
              <div class="tree-row">
                @if (tieneHijos(nodo.id)) {
                  <button type="button" class="tree-toggle" (click)="toggleExpand(nodo.id)">
                    <i class="pi" [class.pi-chevron-down]="isExpanded(nodo.id)" [class.pi-chevron-right]="!isExpanded(nodo.id)"></i>
                  </button>
                } @else {
                  <span class="tree-toggle-spacer"></span>
                }
                <label class="tree-label" [class.tree-label-disabled]="!puedeSeleccionar(nodo.id)">
                  <input type="checkbox" [checked]="isNodoSelected(nodo.id)"
                    [disabled]="!puedeSeleccionar(nodo.id)"
                    (change)="toggleNodo(nodo.id)" />
                  <span><b>{{ nodo.codigo }}</b> · {{ nodo.nombre }} <span class="tree-meta">({{ getNivelNombre(nodo.nivelId) }})</span></span>
                </label>
              </div>
              @if (isExpanded(nodo.id)) {
                <div class="tree-children">
                  @for (hijo of hijosDe(nodo.id); track hijo.id) {
                    <ng-container *ngTemplateOutlet="nodoTree; context: { $implicit: hijo }"></ng-container>
                  }
                </div>
              }
            </div>
          </ng-template>

          @for (nodo of nodosRaices(); track nodo.id) {
            <ng-container *ngTemplateOutlet="nodoTree; context: { $implicit: nodo }"></ng-container>
          } @empty {
            <span class="muted small">No hay nodos configurados.</span>
          }
        </div>
      </div>
      <div class="field">
        <label>Perfiles</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;">
          <button class="btn btn-ghost btn-sm" type="button" (click)="openPerfilSearchDialog()" title="Buscar perfiles">
            <app-icon-search [width]="14" [height]="14" /> Buscar perfiles
          </button>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:10px;background:var(--surface-2);">
          @for (p of selectedPerfilesDetails(); track p.codigo) {
            <label style="display:flex;align-items:center;gap:8px;cursor:default;opacity:0.85;">
              <input type="checkbox" checked disabled style="width:16px;height:16px;cursor:default;" />
              <span><b>{{ p.codigo }}</b> · {{ p.nombre }}</span>
            </label>
          } @empty {
            <span class="muted small">No hay perfiles asignados.</span>
          }
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="save()">{{ isNew ? 'Crear' : 'Guardar' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO BÚSQUEDA USUARIO ============ -->
    <p-dialog
      [(visible)]="showUserSearchDlg"
      header="Buscar usuario"
      [modal]="true" [style]="{ width: '900px' }" [closable]="true"
      (onHide)="closeUserSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="userSearchCodigo" placeholder="Código de usuario" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="userSearchNombre" placeholder="Nombre" />
        </div>
        <div class="field">
          <label>Apellido</label>
          <input type="text" class="select" [(ngModel)]="userSearchApellido" placeholder="Apellido" />
        </div>
        <div class="field">
          <label>Correo</label>
          <input type="text" class="select" [(ngModel)]="userSearchCorreo" placeholder="Correo" />
        </div>
        <div class="field">
          <label>Empresa</label>
          <input type="text" class="select" [(ngModel)]="userSearchEmpresa" placeholder="Empresa" />
        </div>
        <div class="field">
          <label>Departamento</label>
          <input type="text" class="select" [(ngModel)]="userSearchDepartamento" placeholder="Departamento" />
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
              <th>Empresa</th>
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
                <td>{{ u.company }}</td>
                <td>{{ u.department }}</td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectUserFromDialog(u)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="userSearchPage() === 1" (click)="changeUserSearchPage(-1)">Anterior</button>
        <span>Página {{ userSearchPage() }} de {{ userSearchTotalPages() }} ({{ filteredUsersForSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="userSearchPage() === userSearchTotalPages()" (click)="changeUserSearchPage(1)">Siguiente</button>
      </div>
    </p-dialog>

    <!-- ============ DIÁLOGO BÚSQUEDA PERFILES (MULTI-SELECCIÓN) ============ -->
    <p-dialog
      [(visible)]="showPerfilSearchDlg"
      header="Buscar perfiles"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="cancelPerfilSearch()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="perfilSearchCodigo" placeholder="Código de perfil" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="perfilSearchNombre" placeholder="Nombre de perfil" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyPerfilFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearPerfilFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th style="width:40px;"></th>
              <th>Código</th>
              <th>Nombre</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            @for (p of paginatedPerfilesForSearch(); track p.id) {
              <tr>
                <td class="center">
                  <input type="checkbox" [checked]="tempSelectedPerfilCodigos().includes(p.codigo)"
                    (change)="togglePerfilSelection(p.codigo)" style="width:16px;height:16px;cursor:pointer;" />
                </td>
                <td class="mono">{{ p.codigo }}</td>
                <td><div class="cell-strong">{{ p.nombre }}</div></td>
                <td>{{ p.descripcion }}</td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="perfilSearchPage() === 1" (click)="changePerfilSearchPage(-1)">Anterior</button>
        <span>Página {{ perfilSearchPage() }} de {{ perfilSearchTotalPages() }} ({{ filteredPerfilesForSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="perfilSearchPage() === perfilSearchTotalPages()" (click)="changePerfilSearchPage(1)">Siguiente</button>
      </div>

      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="cancelPerfilSearch()">Cancelar</button>
        <button class="btn btn-primary" (click)="acceptPerfilSearch()">Aceptar ({{ tempSelectedPerfilCodigos().length }})</button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .tree-wrap { max-height: 260px; overflow: auto; display: flex; flex-direction: column; gap: 2px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; padding: 8px; }
    .tree-node { display: flex; flex-direction: column; }
    .tree-row { display: flex; align-items: center; gap: 4px; min-height: 28px; }
    .tree-toggle { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: none; cursor: pointer; color: var(--muted, #6b7280); padding: 0; }
    .tree-toggle:hover { color: var(--primary, #2563eb); }
    .tree-toggle-spacer { width: 20px; flex-shrink: 0; }
    .tree-label { display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1; font-size: 0.9rem; }
    .tree-label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; flex-shrink: 0; }
    .tree-label-disabled { cursor: not-allowed; opacity: 0.45; }
    .tree-label-disabled input[type="checkbox"] { cursor: not-allowed; }
    .tree-children { padding-left: 12px; display: flex; flex-direction: column; gap: 2px; border-left: 1px dashed var(--border, #e5e7eb); margin-left: 10px; margin-top: 2px; }
    .tree-meta { font-size: 0.75rem; color: var(--muted, #6b7280); }
  `],
})
export class UserAccessComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  users = signal<User[]>([]);
  niveles = signal<NivelSegregacion[]>([]);
  nodos = signal<NodoSegregacion[]>([]);
  perfiles = signal<Perfil[]>([]);

  loading = signal(true);
  error = signal<string | null>(null);

  showDlg = false;
  isNew = false;
  editUser: User | null = null;
  selectedUserId = '';
  editForm = signal({ nodoIds: [] as string[], perfilCodigos: [] as string[] });
  expanded = signal<Set<string>>(new Set());

  // --- Diálogo búsqueda de usuario ---
  showUserSearchDlg = false;
  userSearchCodigo = '';
  userSearchNombre = '';
  userSearchApellido = '';
  userSearchCorreo = '';
  userSearchEmpresa = '';
  userSearchDepartamento = '';
  appliedUserSearchCodigo = signal('');
  appliedUserSearchNombre = signal('');
  appliedUserSearchApellido = signal('');
  appliedUserSearchCorreo = signal('');
  appliedUserSearchEmpresa = signal('');
  appliedUserSearchDepartamento = signal('');
  userSearchPage = signal(1);
  userSearchPageSize = signal(10);
  userSearchDisplayText = signal('');

  // --- Diálogo búsqueda de perfiles (multi-selección) ---
  showPerfilSearchDlg = false;
  perfilSearchCodigo = '';
  perfilSearchNombre = '';
  appliedPerfilSearchCodigo = signal('');
  appliedPerfilSearchNombre = signal('');
  perfilSearchPage = signal(1);
  perfilSearchPageSize = signal(10);
  tempSelectedPerfilCodigos = signal<string[]>([]);

  search = signal('');
  pageSize = signal(10);
  page = signal(0);

  filteredUsers = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.nodoIds.some(id => this.getNodoLabel(id).toLowerCase().includes(q)) ||
      u.perfilCodigos.some(pc => pc.toLowerCase().includes(q))
    );
  });

  paginatedUsers = computed(() => {
    const start = this.page() * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize())));

  userMap = computed(() => new Map(this.users().map(u => [u.id, u])));

  filteredUsersForSearch = computed(() => {
    const qCodigo = this.appliedUserSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedUserSearchNombre().toLowerCase().trim();
    const qApellido = this.appliedUserSearchApellido().toLowerCase().trim();
    const qCorreo = this.appliedUserSearchCorreo().toLowerCase().trim();
    const qEmpresa = this.appliedUserSearchEmpresa().toLowerCase().trim();
    const qDepartamento = this.appliedUserSearchDepartamento().toLowerCase().trim();
    return this.users().filter(u =>
      (!qCodigo || u.username.toLowerCase().includes(qCodigo)) &&
      (!qNombre || u.firstName.toLowerCase().includes(qNombre)) &&
      (!qApellido || u.lastName.toLowerCase().includes(qApellido)) &&
      (!qCorreo || u.email.toLowerCase().includes(qCorreo)) &&
      (!qEmpresa || u.company.toLowerCase().includes(qEmpresa)) &&
      (!qDepartamento || u.department.toLowerCase().includes(qDepartamento))
    );
  });

  paginatedUsersForSearch = computed(() => {
    const start = (this.userSearchPage() - 1) * this.userSearchPageSize();
    return this.filteredUsersForSearch().slice(start, start + this.userSearchPageSize());
  });

  userSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsersForSearch().length / this.userSearchPageSize())));

  filteredPerfilesForSearch = computed(() => {
    const qCodigo = this.appliedPerfilSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedPerfilSearchNombre().toLowerCase().trim();
    return this.perfiles().filter(p =>
      (!qCodigo || p.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || p.nombre.toLowerCase().includes(qNombre))
    );
  });

  paginatedPerfilesForSearch = computed(() => {
    const start = (this.perfilSearchPage() - 1) * this.perfilSearchPageSize();
    return this.filteredPerfilesForSearch().slice(start, start + this.perfilSearchPageSize());
  });

  perfilSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredPerfilesForSearch().length / this.perfilSearchPageSize())));

  selectedPerfilesDetails = computed(() => {
    return this.editForm().perfilCodigos
      .map(codigo => this.perfiles().find(p => p.codigo === codigo))
      .filter((p): p is Perfil => !!p);
  });

  nodosOrdenados = computed(() => {
    return [...this.nodos()].sort((a, b) => {
      const oa = this.getNivelOrden(a.nivelId);
      const ob = this.getNivelOrden(b.nivelId);
      if (oa !== ob) return oa - ob;
      return a.codigo.localeCompare(b.codigo);
    });
  });

  nodosRaices = computed(() => {
    return this.nodos()
      .filter(n => !n.padreId)
      .sort((a, b) => {
        const oa = this.getNivelOrden(a.nivelId);
        const ob = this.getNivelOrden(b.nivelId);
        if (oa !== ob) return oa - ob;
        return a.codigo.localeCompare(b.codigo);
      });
  });

  setPage(p: number): void {
    if (p < 0 || p >= this.totalPages()) return;
    this.page.set(p);
  }

  getPageNumbers(total: number, current: number): number[] {
    const pages: number[] = [];
    for (let i = 0; i < total; i++) pages.push(i);
    return pages;
  }

  ngOnInit(): void {
    this.loadData();
    this.events.onDataChanged(() => this.loadData());
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listUserAccess().subscribe({
      next: (data) => { this.users.set(data); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar los usuarios.'); this.loading.set(false); },
    });
    this.api.listNivelesSegregacion().subscribe({ next: (data) => this.niveles.set(data) });
    this.api.listNodosSegregacion().subscribe({ next: (data) => this.nodos.set(data) });
    this.api.listPerfiles().subscribe({ next: (data) => this.perfiles.set(data) });
  }

  openDialog(u: User): void {
    this.isNew = false;
    this.editUser = u;
    this.editForm.set({ nodoIds: [...(u.nodoIds || [])], perfilCodigos: [...(u.perfilCodigos || [])] });
    this.showDlg = true;
  }

  openNewDialog(): void {
    this.isNew = true;
    this.editUser = null;
    this.selectedUserId = '';
    this.userSearchDisplayText.set('');
    this.editForm.set({ nodoIds: [], perfilCodigos: [] });
    this.showDlg = true;
  }

  closeDialog(): void { this.showDlg = false; this.editUser = null; this.isNew = false; this.selectedUserId = ''; this.userSearchDisplayText.set(''); }

  openUserSearchDialog(): void {
    this.userSearchCodigo = '';
    this.userSearchNombre = '';
    this.userSearchApellido = '';
    this.userSearchCorreo = '';
    this.userSearchEmpresa = '';
    this.userSearchDepartamento = '';
    this.appliedUserSearchCodigo.set('');
    this.appliedUserSearchNombre.set('');
    this.appliedUserSearchApellido.set('');
    this.appliedUserSearchCorreo.set('');
    this.appliedUserSearchEmpresa.set('');
    this.appliedUserSearchDepartamento.set('');
    this.userSearchPage.set(1);
    this.showUserSearchDlg = true;
  }

  closeUserSearchDialog(): void {
    this.showUserSearchDlg = false;
  }

  applyUserFilters(): void {
    this.appliedUserSearchCodigo.set(this.userSearchCodigo);
    this.appliedUserSearchNombre.set(this.userSearchNombre);
    this.appliedUserSearchApellido.set(this.userSearchApellido);
    this.appliedUserSearchCorreo.set(this.userSearchCorreo);
    this.appliedUserSearchEmpresa.set(this.userSearchEmpresa);
    this.appliedUserSearchDepartamento.set(this.userSearchDepartamento);
    this.userSearchPage.set(1);
  }

  clearUserFilters(): void {
    this.userSearchCodigo = '';
    this.userSearchNombre = '';
    this.userSearchApellido = '';
    this.userSearchCorreo = '';
    this.userSearchEmpresa = '';
    this.userSearchDepartamento = '';
    this.applyUserFilters();
  }

  changeUserSearchPage(delta: number): void {
    this.userSearchPage.set(Math.min(Math.max(this.userSearchPage() + delta, 1), this.userSearchTotalPages()));
  }

  selectUser(u: User): void {
    this.selectedUserId = u.id;
    this.userSearchDisplayText.set(`${u.username} · ${u.firstName} ${u.lastName}`);
  }

  selectUserFromDialog(u: User): void {
    this.selectUser(u);
    this.closeUserSearchDialog();
  }

  openPerfilSearchDialog(): void {
    this.perfilSearchCodigo = '';
    this.perfilSearchNombre = '';
    this.appliedPerfilSearchCodigo.set('');
    this.appliedPerfilSearchNombre.set('');
    this.perfilSearchPage.set(1);
    this.tempSelectedPerfilCodigos.set([...this.editForm().perfilCodigos]);
    this.showPerfilSearchDlg = true;
  }

  closePerfilSearchDialog(): void {
    this.showPerfilSearchDlg = false;
  }

  cancelPerfilSearch(): void {
    this.showPerfilSearchDlg = false;
    this.tempSelectedPerfilCodigos.set([]);
  }

  applyPerfilFilters(): void {
    this.appliedPerfilSearchCodigo.set(this.perfilSearchCodigo);
    this.appliedPerfilSearchNombre.set(this.perfilSearchNombre);
    this.perfilSearchPage.set(1);
  }

  clearPerfilFilters(): void {
    this.perfilSearchCodigo = '';
    this.perfilSearchNombre = '';
    this.applyPerfilFilters();
  }

  changePerfilSearchPage(delta: number): void {
    this.perfilSearchPage.set(Math.min(Math.max(this.perfilSearchPage() + delta, 1), this.perfilSearchTotalPages()));
  }

  togglePerfilSelection(codigo: string): void {
    const selected = this.tempSelectedPerfilCodigos();
    if (selected.includes(codigo)) {
      this.tempSelectedPerfilCodigos.set(selected.filter(c => c !== codigo));
    } else {
      this.tempSelectedPerfilCodigos.set([...selected, codigo]);
    }
  }

  acceptPerfilSearch(): void {
    this.editForm.set({ ...this.editForm(), perfilCodigos: [...this.tempSelectedPerfilCodigos()] });
    this.tempSelectedPerfilCodigos.set([]);
    this.showPerfilSearchDlg = false;
  }

  getNivelOrden(nivelId: string): number {
    return this.niveles().find(n => n.id === nivelId)?.orden ?? 0;
  }

  getNivelNombre(nivelId: string): string {
    return this.niveles().find(n => n.id === nivelId)?.nombre ?? '';
  }

  getNodoLabel(nodoId: string): string {
    const nodo = this.nodos().find(n => n.id === nodoId);
    if (!nodo) return nodoId;
    const nivel = this.niveles().find(n => n.id === nodo.nivelId);
    return `${nodo.codigo} · ${nodo.nombre}${nivel ? ` (${nivel.nombre})` : ''}`;
  }

  isNodoSelected(nodoId: string): boolean {
    return this.editForm().nodoIds.includes(nodoId);
  }

  puedeSeleccionar(nodoId: string): boolean {
    const nodo = this.nodos().find(n => n.id === nodoId);
    if (!nodo) return false;
    if (!nodo.padreId) return true;
    return this.isNodoSelected(nodo.padreId);
  }

  toggleNodo(nodoId: string): void {
    if (!this.puedeSeleccionar(nodoId)) return;
    const form = this.editForm();
    const isSelected = form.nodoIds.includes(nodoId);
    const descendientes = this.descendientesDe(nodoId);
    const grupo = [nodoId, ...descendientes];

    if (isSelected) {
      this.editForm.set({ ...form, nodoIds: form.nodoIds.filter(id => !grupo.includes(id)) });
    } else {
      const nuevos = [...form.nodoIds];
      for (const id of grupo) {
        if (!nuevos.includes(id)) {
          nuevos.push(id);
        }
      }
      this.editForm.set({ ...form, nodoIds: nuevos });
      this.expandirAncestros(nodoId);
    }
  }

  descendientesDe(nodoId: string): string[] {
    const result: string[] = [];
    const stack = [nodoId];
    while (stack.length) {
      const actual = stack.pop()!;
      const hijos = this.nodos().filter(n => n.padreId === actual);
      for (const h of hijos) {
        result.push(h.id);
        stack.push(h.id);
      }
    }
    return result;
  }

  expandirAncestros(nodoId: string): void {
    const set = new Set(this.expanded());
    const nodo = this.nodos().find(n => n.id === nodoId);
    if (!nodo) return;
    let padreId = nodo.padreId;
    while (padreId) {
      set.add(padreId);
      const padre = this.nodos().find(n => n.id === padreId);
      padreId = padre?.padreId || null;
    }
    this.expanded.set(set);
  }

  isExpanded(nodoId: string): boolean {
    return this.expanded().has(nodoId);
  }

  toggleExpand(nodoId: string): void {
    const set = new Set(this.expanded());
    if (set.has(nodoId)) set.delete(nodoId);
    else set.add(nodoId);
    this.expanded.set(set);
  }

  tieneHijos(nodoId: string): boolean {
    return this.nodos().some(n => n.padreId === nodoId);
  }

  hijosDe(nodoId: string): NodoSegregacion[] {
    return this.nodos()
      .filter(n => n.padreId === nodoId)
      .sort((a, b) => {
        const oa = this.getNivelOrden(a.nivelId);
        const ob = this.getNivelOrden(b.nivelId);
        if (oa !== ob) return oa - ob;
        return a.codigo.localeCompare(b.codigo);
      });
  }

  async save(): Promise<void> {
    if (this.isNew) {
      if (!this.selectedUserId) { this.toast.error('Faltan datos', 'Debe seleccionar un usuario.'); return; }
      try {
        await this.api.updateUserAccess(this.selectedUserId, this.editForm()).toPromise();
        this.toast.success('Acceso creado');
        this.events.emitDataChanged();
        this.closeDialog();
        this.loadData();
      } catch (e: any) {
        this.toast.error('Error', e?.error?.error || 'Error inesperado.');
      }
    } else {
      if (!this.editUser) return;
      try {
        await this.api.updateUserAccess(this.editUser.id, this.editForm()).toPromise();
        this.toast.success('Acceso actualizado');
        this.events.emitDataChanged();
        this.closeDialog();
        this.loadData();
      } catch (e: any) {
        this.toast.error('Error', e?.error?.error || 'Error inesperado.');
      }
    }
  }

  exportData(): void {
    const rows = this.filteredUsers().map(u => ({
      usuario: u.username,
      nombre: `${u.firstName} ${u.lastName}`,
      email: u.email,
      nodos: u.nodoIds.map(id => this.getNodoLabel(id)).join('; '),
      perfiles: u.perfilCodigos.join(', '),
      estado: u.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'accesos-usuario');
    XLSX.writeFile(wb, 'accesos-usuario.xlsx');
  }
}
