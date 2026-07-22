import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
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
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconDownloadComponent, IconUploadComponent,
} from '../../shared/components/icons';
import type { User, NivelSegregacion, NodoSegregacion, Perfil } from '../../shared/models/types';
import { validateBulkFileSize } from '../../shared/utils/file-validation';

@Component({
  selector: 'app-user-access',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconDownloadComponent, IconUploadComponent,
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
            <app-icon-plus [width]="14" [height]="14" /> Nuevo Acceso
          </button>
          <button class="btn btn-primary" (click)="openBulkDialog()">
            <app-icon-upload [width]="14" [height]="14" /> Carga Masiva
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
        <div style="display:flex;flex-direction:column;gap:12px;">
          @for (nivel of niveles(); track nivel.id) {
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span class="small muted"><b>{{ nivel.nombre }}</b></span>
                <button class="btn btn-ghost btn-sm" type="button" (click)="openNodoSearchDialog(nivel.id, nivel.nombre)" [disabled]="!puedeBuscarNivel(nivel.id)" [title]="puedeBuscarNivel(nivel.id) ? 'Buscar ' + nivel.nombre : 'Seleccione primero un ' + getNivelNombre(getNivelPadreId(nivel.id)!)" >
                  <app-icon-search [width]="14" [height]="14" /> Buscar {{ nivel.nombre }}
                </button>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;max-height:120px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:10px;background:var(--surface-2);">
                @for (nodo of selectedNodosByNivelId(nivel.id); track nodo.id) {
                  <label style="display:flex;align-items:center;gap:8px;cursor:default;opacity:0.85;">
                    <input type="checkbox" checked disabled style="width:16px;height:16px;cursor:default;" />
                    <span><b>{{ nodo.codigo }}</b> · {{ nodo.nombre }}</span>
                  </label>
                } @empty {
                  <span class="muted small">Ningún nodo seleccionado.</span>
                }
              </div>
            </div>
          } @empty {
            <span class="muted small">No hay niveles configurados.</span>
          }
        </div>
      </div>
      <div class="field">
        <label>Perfiles</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;">
          <button class="btn btn-ghost btn-sm" type="button" (click)="openPerfilSearchDialog()" title="Buscar perfiles">
            <app-icon-search [width]="14" [height]="14" /> Buscar Perfiles
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
          <label>Usuario</label>
          <input type="text" class="select" [(ngModel)]="userSearchCodigo" placeholder="Usuario" />
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
              <th>Usuario</th>
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

    <!-- ============ DIÁLOGO BÚSQUEDA NODOS (MULTI-SELECCIÓN POR NIVEL) ============ -->
    <p-dialog
      [(visible)]="showNodoSearchDlg"
      [header]="'Buscar ' + nodoSearchNivelNombre()"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="cancelNodoSearch()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="nodoSearchCodigo" placeholder="Código de nodo" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="nodoSearchNombre" placeholder="Nombre de nodo" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyNodoFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearNodoFilters()">Limpiar</button>
      </div>

      @if (getSelectedParentIds(nodoSearchNivelId()).length > 0) {
        <div class="muted small" style="margin-bottom: 8px;">
          Mostrando {{ nodoSearchNivelNombre() }} del {{ getNivelNombre(getNivelPadreId(nodoSearchNivelId())!) }} seleccionado.
        </div>
      }

      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th style="width:40px;"></th>
              <th>Código</th>
              <th>Nombre</th>
              <th>Padre</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (n of paginatedNodosForSearch(); track n.id) {
              <tr>
                <td class="center">
                  <input type="checkbox" [checked]="tempSelectedNodoIds().includes(n.id)"
                    (change)="toggleNodoSelection(n.id)" style="width:16px;height:16px;cursor:pointer;" />
                </td>
                <td class="mono">{{ n.codigo }}</td>
                <td><div class="cell-strong">{{ n.nombre }}</div></td>
                <td>
                  @if (n.padreId) {
                    {{ getNodoPadreLabel(n.padreId) }}
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
                <td>
                  <span class="badge" [class.badge-green]="n.estado === 'ACTIVO'" [class.badge-gray]="n.estado !== 'ACTIVO'">
                    {{ n.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="nodoSearchPage() === 1" (click)="changeNodoSearchPage(-1)">Anterior</button>
        <span>Página {{ nodoSearchPage() }} de {{ nodoSearchTotalPages() }} ({{ filteredNodosForSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="nodoSearchPage() === nodoSearchTotalPages()" (click)="changeNodoSearchPage(1)">Siguiente</button>
      </div>

      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="cancelNodoSearch()">Cancelar</button>
        <button class="btn btn-primary" (click)="acceptNodoSearch()">Aceptar ({{ tempSelectedNodoIds().length }})</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO CARGA MASIVA ============ -->
    <p-dialog
      [(visible)]="showBulkDlg"
      header="Carga masiva de accesos"
      [modal]="true" [style]="{ width: '600px' }" [closable]="true"
      (onHide)="closeBulkDialog()"
    >
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <p class="small">Descargue la plantilla de ejemplo con la estructura actual de niveles de segregación. Complete una fila por usuario y suba el archivo Excel procesado.</p>
          <button class="btn btn-ghost btn-sm" (click)="downloadBulkTemplate()">
            <app-icon-download [width]="14" [height]="14" /> Descargar Plantilla de ejemplo
          </button>
        </div>

        <div class="field">
          <label>Archivo Excel (.xlsx)</label>
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" (change)="onBulkFileSelected($event)" />
          @if (bulkFileName()) {
            <small class="meta">Archivo seleccionado: {{ bulkFileName() }}</small>
          }
        </div>

        @if (bulkErrors().length > 0) {
          <div style="max-height:180px;overflow-y:auto;border:1px solid var(--red-600);border-radius:8px;padding:10px;background:#fef2f2;">
            <div class="small" style="color:var(--red-600);font-weight:600;margin-bottom:6px;">Errores detectados:</div>
            @for (e of bulkErrors(); track e.row + e.message) {
              <div class="small" style="color:var(--red-600);">• Fila {{ e.row }}: {{ e.message }}</div>
            }
          </div>
        }

        @if (bulkSuccess()) {
          <div class="small" style="color:var(--green-600);font-weight:600;">{{ bulkSuccess() }}</div>
        }
      </div>

      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeBulkDialog()" [disabled]="bulkLoading()">Cerrar</button>
        <button class="btn btn-primary" (click)="processBulkFile()" [disabled]="!bulkFile || bulkLoading()">
          @if (bulkLoading()) { Procesando... } @else { Procesar }
        </button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .center { text-align: center; }
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

  // --- Diálogo búsqueda de nodos de segregación (multi-selección por nivel) ---
  showNodoSearchDlg = false;
  nodoSearchNivelId = signal('');

  // --- Diálogo carga masiva ---
  showBulkDlg = false;
  bulkFile: File | null = null;
  bulkFileName = signal('');
  bulkLoading = signal(false);
  bulkErrors = signal<{ row: number; message: string }[]>([]);
  bulkSuccess = signal('');
  nodoSearchNivelNombre = signal('');
  nodoSearchCodigo = '';
  nodoSearchNombre = '';
  appliedNodoSearchCodigo = signal('');
  appliedNodoSearchNombre = signal('');
  nodoSearchPage = signal(1);
  nodoSearchPageSize = signal(10);
  tempSelectedNodoIds = signal<string[]>([]);

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

  // --- Computed para búsqueda de nodos por nivel ---
  getNivelPadreId(nivelId: string): string | null {
    const sorted = [...this.niveles()].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex(n => n.id === nivelId);
    return idx > 0 ? sorted[idx - 1].id : null;
  }

  getSelectedParentIds(nivelId: string): string[] {
    const parentNivelId = this.getNivelPadreId(nivelId);
    if (!parentNivelId) return [];
    return this.editForm().nodoIds
      .map(id => this.nodos().find(n => n.id === id))
      .filter((n): n is NodoSegregacion => !!n && n.nivelId === parentNivelId)
      .map(n => n.id);
  }

  puedeBuscarNivel(nivelId: string): boolean {
    const parentNivelId = this.getNivelPadreId(nivelId);
    if (!parentNivelId) return true;
    return this.getSelectedParentIds(nivelId).length > 0;
  }

  filteredNodosForSearch = computed(() => {
    const nivelId = this.nodoSearchNivelId();
    const parentNivelId = this.getNivelPadreId(nivelId);
    const selectedParentIds = parentNivelId ? this.getSelectedParentIds(nivelId) : [];
    const hasParentFilter = parentNivelId && selectedParentIds.length > 0;
    const qCodigo = this.appliedNodoSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedNodoSearchNombre().toLowerCase().trim();
    return this.nodos().filter(n => {
      if (n.nivelId !== nivelId || n.estado !== 'ACTIVO') return false;
      if (hasParentFilter && n.padreId && !selectedParentIds.includes(n.padreId)) return false;
      return (!qCodigo || n.codigo.toLowerCase().includes(qCodigo)) &&
             (!qNombre || n.nombre.toLowerCase().includes(qNombre));
    });
  });

  paginatedNodosForSearch = computed(() => {
    const start = (this.nodoSearchPage() - 1) * this.nodoSearchPageSize();
    return this.filteredNodosForSearch().slice(start, start + this.nodoSearchPageSize());
  });

  nodoSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredNodosForSearch().length / this.nodoSearchPageSize())));

  selectedNodosByNivelId = (nivelId: string) => {
    return this.editForm().nodoIds
      .map(id => this.nodos().find(n => n.id === id))
      .filter((n): n is NodoSegregacion => !!n && n.nivelId === nivelId);
  };

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

  openNodoSearchDialog(nivelId: string, nivelNombre: string): void {
    this.nodoSearchNivelId.set(nivelId);
    this.nodoSearchNivelNombre.set(nivelNombre);
    this.nodoSearchCodigo = '';
    this.nodoSearchNombre = '';
    this.appliedNodoSearchCodigo.set('');
    this.appliedNodoSearchNombre.set('');
    this.nodoSearchPage.set(1);
    this.tempSelectedNodoIds.set(this.editForm().nodoIds.filter(id => {
      const n = this.nodos().find(x => x.id === id);
      return n?.nivelId === nivelId;
    }));
    this.showNodoSearchDlg = true;
  }

  closeNodoSearchDialog(): void {
    this.showNodoSearchDlg = false;
    this.nodoSearchNivelId.set('');
    this.nodoSearchNivelNombre.set('');
  }

  cancelNodoSearch(): void {
    this.showNodoSearchDlg = false;
    this.nodoSearchNivelId.set('');
    this.nodoSearchNivelNombre.set('');
    this.tempSelectedNodoIds.set([]);
  }

  applyNodoFilters(): void {
    this.appliedNodoSearchCodigo.set(this.nodoSearchCodigo);
    this.appliedNodoSearchNombre.set(this.nodoSearchNombre);
    this.nodoSearchPage.set(1);
  }

  clearNodoFilters(): void {
    this.nodoSearchCodigo = '';
    this.nodoSearchNombre = '';
    this.applyNodoFilters();
  }

  changeNodoSearchPage(delta: number): void {
    this.nodoSearchPage.set(Math.min(Math.max(this.nodoSearchPage() + delta, 1), this.nodoSearchTotalPages()));
  }

  toggleNodoSelection(nodoId: string): void {
    const selected = this.tempSelectedNodoIds();
    if (selected.includes(nodoId)) {
      this.tempSelectedNodoIds.set(selected.filter(id => id !== nodoId));
    } else {
      this.tempSelectedNodoIds.set([...selected, nodoId]);
    }
  }

  acceptNodoSearch(): void {
    const form = this.editForm();
    const nivelId = this.nodoSearchNivelId();
    const newSelected = this.tempSelectedNodoIds();

    const prevSelected = form.nodoIds.filter(id => this.nodos().find(n => n.id === id)?.nivelId === nivelId);
    const deselected = prevSelected.filter(id => !newSelected.includes(id));

    const idsToRemove = new Set<string>();
    for (const id of deselected) {
      idsToRemove.add(id);
      for (const desc of this.descendientesDe(id)) {
        idsToRemove.add(desc);
      }
    }

    const otherNodes = form.nodoIds.filter(id => {
      if (idsToRemove.has(id)) return false;
      const n = this.nodos().find(x => x.id === id);
      return n?.nivelId !== nivelId;
    });

    this.editForm.set({ ...form, nodoIds: [...otherNodes, ...newSelected] });
    this.tempSelectedNodoIds.set([]);
    this.showNodoSearchDlg = false;
    this.nodoSearchNivelId.set('');
    this.nodoSearchNivelNombre.set('');
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

  getNodoPadreLabel(padreId: string): string {
    const padre = this.nodos().find(n => n.id === padreId);
    return padre ? `${padre.codigo} · ${padre.nombre}` : padreId;
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

  openBulkDialog(): void {
    this.showBulkDlg = true;
    this.bulkFile = null;
    this.bulkFileName.set('');
    this.bulkErrors.set([]);
    this.bulkSuccess.set('');
    this.bulkLoading.set(false);
  }

  closeBulkDialog(): void {
    this.showBulkDlg = false;
    this.bulkFile = null;
    this.bulkFileName.set('');
    this.bulkErrors.set([]);
    this.bulkSuccess.set('');
    this.bulkLoading.set(false);
  }

  downloadBulkTemplate(): void {
    const nivelesActivos = [...this.niveles()]
      .filter(n => n.estado === 'ACTIVO')
      .sort((a, b) => a.orden - b.orden);
    const nivelHeaders = nivelesActivos.map(n => n.nombre.toUpperCase());

    const headers = ['USUARIO', 'PERFILES', ...nivelHeaders];

    const ejemploUsername = this.users().find(u => u.status === 'ACTIVE')?.username ?? 'usuario1';
    const ejemploPerfil = this.perfiles().find(p => p.estado === 'ACTIVO')?.codigo ?? 'PERF-FI-VIS';

    const exampleRow: Record<string, string> = {
      USUARIO: ejemploUsername,
      PERFILES: ejemploPerfil,
    };

    for (const nivel of nivelesActivos) {
      const header = nivel.nombre.toUpperCase();
      const ejemploNodo = this.nodos().find(n => n.nivelId === nivel.id && n.estado === 'ACTIVO');
      exampleRow[header] = ejemploNodo?.codigo ?? '';
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, Object.values(exampleRow)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'plantilla-accesos');
    XLSX.writeFile(wb, 'plantilla-accesos-usuario.xlsx');
  }

  onBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    const validation = validateBulkFileSize(file);
    if (!validation.valid) {
      this.toast.error('Archivo demasiado grande', validation.message || 'El archivo excede el tamaño permitido.');
      this.bulkFile = null;
      this.bulkFileName.set('');
      this.bulkErrors.set([]);
      this.bulkSuccess.set('');
      input.value = '';
      return;
    }
    this.bulkFile = file;
    this.bulkFileName.set(file ? file.name : '');
    this.bulkErrors.set([]);
    this.bulkSuccess.set('');
  }

  private parseBulkCell(cell: string | number | undefined): string[] {
    if (cell === undefined || cell === null) return [];
    const str = String(cell).trim();
    if (!str) return [];
    return str.split(/[;,]/).map(s => s.trim()).filter(s => s);
  }

  async processBulkFile(): Promise<void> {
    if (!this.bulkFile) return;
    this.bulkLoading.set(true);
    this.bulkErrors.set([]);
    this.bulkSuccess.set('');

    try {
      const data = await this.bulkFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rawRows.length < 2) {
        this.bulkErrors.set([{ row: 0, message: 'El archivo no contiene filas de datos.' }]);
        this.bulkLoading.set(false);
        return;
      }

      const headerRow = rawRows[0].map((h: any) => String(h).trim().toUpperCase());
      const expectedHeaders = ['USUARIO', 'PERFILES', ...this.niveles()
        .filter(n => n.estado === 'ACTIVO')
        .sort((a, b) => a.orden - b.orden)
        .map(n => n.nombre.toUpperCase())];

      const missing = expectedHeaders.filter(h => !headerRow.includes(h));
      if (missing.length > 0) {
        this.bulkErrors.set([{ row: 1, message: `Formato incorrecto. Faltan columnas: ${missing.join(', ')}.` }]);
        this.bulkLoading.set(false);
        return;
      }

      const nivelByHeader = new Map<string, NivelSegregacion>();
      for (const nivel of this.niveles()) {
        if (nivel.estado === 'ACTIVO') {
          nivelByHeader.set(nivel.nombre.toUpperCase(), nivel);
        }
      }

      const rows: { row: number; username: string; perfilCodigos: string[]; nodoCodigosPorNivelId: Record<string, string[]> }[] = [];
      for (let i = 1; i < rawRows.length; i++) {
        const raw = rawRows[i];
        if (raw.every((v: any) => !v || String(v).trim() === '')) continue;

        const rowNum = i + 1;
        const username = String(raw[headerRow.indexOf('USUARIO')] || '').trim();
        const perfilCodigos = this.parseBulkCell(raw[headerRow.indexOf('PERFILES')]);
        const nodoCodigosPorNivelId: Record<string, string[]> = {};

        for (const [header, nivel] of nivelByHeader) {
          const idx = headerRow.indexOf(header);
          nodoCodigosPorNivelId[nivel.id] = idx >= 0 ? this.parseBulkCell(raw[idx]) : [];
        }

        rows.push({ row: rowNum, username, perfilCodigos, nodoCodigosPorNivelId });
      }

      if (!rows.length) {
        this.bulkErrors.set([{ row: 0, message: 'No se encontraron filas con datos válidos.' }]);
        this.bulkLoading.set(false);
        return;
      }

      this.api.bulkUpdateUserAccess(rows).subscribe({
        next: (res) => {
          if (res.ok) {
            this.bulkSuccess.set(`Se procesaron ${res.processed} accesos correctamente.`);
            this.bulkFile = null;
            this.bulkFileName.set('');
            this.events.emitDataChanged();
            this.loadData();
          } else {
            this.bulkErrors.set(res.errors || [{ row: 0, message: 'Error desconocido.' }]);
          }
          this.bulkLoading.set(false);
        },
        error: (e) => {
          console.error('bulkUpdateUserAccess error', e);
          let message = 'Error al procesar el archivo.';
          if (e instanceof HttpErrorResponse) {
            if (e.status === 0) {
              message = 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
            } else if (e.status >= 500) {
              message = `Error interno del servidor (${e.status}). Revise la consola del backend.`;
            } else if (e.error?.error) {
              message = e.error.error;
            } else if (Array.isArray(e.error?.errors)) {
              this.bulkErrors.set(e.error.errors);
              this.bulkLoading.set(false);
              return;
            } else if (e.message) {
              message = e.message;
            }
          } else if (e?.error?.errors) {
            this.bulkErrors.set(e.error.errors);
            this.bulkLoading.set(false);
            return;
          } else if (e?.error?.error) {
            message = e.error.error;
          }
          this.bulkErrors.set([{ row: 0, message }]);
          this.bulkLoading.set(false);
        },
      });
    } catch (e: any) {
      this.bulkErrors.set([{ row: 0, message: 'No se pudo leer el archivo Excel. Verifique el formato.' }]);
      this.bulkLoading.set(false);
    }
  }
}
