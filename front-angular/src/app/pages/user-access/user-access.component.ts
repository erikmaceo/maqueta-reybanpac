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
          <label>Usuario</label>
          <select class="select" [(ngModel)]="selectedUserId">
            <option value="">— Seleccione usuario —</option>
            @for (u of users(); track u.id) {
              <option [value]="u.id">{{ u.username }} · {{ u.firstName }} {{ u.lastName }}</option>
            }
          </select>
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
        <div style="display:flex;flex-direction:column;gap:8px;">
          @for (p of perfiles(); track p.id) {
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" [checked]="editForm.perfilCodigos.includes(p.codigo)"
                (change)="togglePerfil(p.codigo)" style="width:16px;height:16px;cursor:pointer;" />
              <span><b>{{ p.codigo }}</b> · {{ p.nombre }}</span>
            </label>
          }
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="save()">{{ isNew ? 'Crear' : 'Guardar' }}</button>
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
  editForm = { nodoIds: [] as string[], perfilCodigos: [] as string[] };
  expanded = signal<Set<string>>(new Set());

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
    this.editForm = { nodoIds: [...(u.nodoIds || [])], perfilCodigos: [...(u.perfilCodigos || [])] };
    this.showDlg = true;
  }

  openNewDialog(): void {
    this.isNew = true;
    this.editUser = null;
    this.selectedUserId = '';
    this.editForm = { nodoIds: [], perfilCodigos: [] };
    this.showDlg = true;
  }

  closeDialog(): void { this.showDlg = false; this.editUser = null; this.isNew = false; }

  togglePerfil(codigo: string): void {
    const idx = this.editForm.perfilCodigos.indexOf(codigo);
    if (idx >= 0) this.editForm.perfilCodigos.splice(idx, 1);
    else this.editForm.perfilCodigos.push(codigo);
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
    return this.editForm.nodoIds.includes(nodoId);
  }

  puedeSeleccionar(nodoId: string): boolean {
    const nodo = this.nodos().find(n => n.id === nodoId);
    if (!nodo) return false;
    if (!nodo.padreId) return true;
    return this.isNodoSelected(nodo.padreId);
  }

  toggleNodo(nodoId: string): void {
    if (!this.puedeSeleccionar(nodoId)) return;
    const isSelected = this.editForm.nodoIds.includes(nodoId);
    const descendientes = this.descendientesDe(nodoId);
    const grupo = [nodoId, ...descendientes];

    if (isSelected) {
      this.editForm.nodoIds = this.editForm.nodoIds.filter(id => !grupo.includes(id));
    } else {
      for (const id of grupo) {
        if (!this.editForm.nodoIds.includes(id)) {
          this.editForm.nodoIds.push(id);
        }
      }
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
        await this.api.updateUserAccess(this.selectedUserId, this.editForm).toPromise();
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
        await this.api.updateUserAccess(this.editUser.id, this.editForm).toPromise();
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
