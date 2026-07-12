import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent,
} from '../../shared/components/icons';
import type { NivelSegregacion, NodoSegregacion } from '../../shared/models/types';

type TabValue = 'niveles' | 'nodos';
type Estado = 'ACTIVO' | 'INACTIVO';

interface NodoView extends NodoSegregacion {
  nivelNombre?: string;
  padreNombre?: string;
}

@Component({
  selector: 'app-segregation-levels',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Niveles de Segregación</h1>
        <p>Configure la jerarquía de segregación de la aplicación (Empresas, Sucursales, Puntos de Venta y niveles adicionales).</p>
      </div>
    </div>

    <p-tabs value="0">
      <p-tablist>
        <p-tab value="0"><i class="pi pi-layer-group mr-2"></i>Niveles</p-tab>
        <p-tab value="1"><i class="pi pi-sitemap mr-2"></i>Nodos</p-tab>
      </p-tablist>
      <p-tabpanels>

        <!-- ============ NIVELES ============ -->
        <p-tabpanel value="0">
          @if (loadingNiveles()) {
            <app-table-skeleton [rows]="5" [cols]="5" />
          } @else if (errorNiveles()) {
            <app-error-state [message]="errorNiveles()!" [onRetry]="loadNiveles" />
          } @else {
            <div class="row between mb-4">
              <div class="search">
                <app-icon-search [width]="15" [height]="15" />
                <input type="text" placeholder="Buscar nivel..."
                  [ngModel]="searchNivel()" (ngModelChange)="searchNivel.set($event)" />
              </div>
              <button class="btn btn-primary" (click)="openNivelDialog()">
                <app-icon-plus [width]="14" [height]="14" /> Nuevo nivel
              </button>
            </div>
            <div class="card table-wrap">
              <table class="data">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (n of filteredNiveles(); track n.id) {
                    <tr>
                      <td class="mono">{{ n.orden }}</td>
                      <td class="mono">{{ n.codigo }}</td>
                      <td><div class="cell-strong">{{ n.nombre }}</div></td>
                      <td>
                        <span class="badge" [class.badge-green]="n.estado === 'ACTIVO'" [class.badge-gray]="n.estado !== 'ACTIVO'">
                          {{ n.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td>
                        <div class="cell-actions">
                          <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openNivelDialog(n)">
                            <app-icon-edit [width]="15" [height]="15" />
                          </button>
                          <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeleteNivel(n)">
                            <app-icon-trash [width]="15" [height]="15" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin niveles configurados.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </p-tabpanel>

        <!-- ============ NODOS ============ -->
        <p-tabpanel value="1">
          @if (loadingNodos()) {
            <app-table-skeleton [rows]="5" [cols]="6" />
          } @else if (errorNodos()) {
            <app-error-state [message]="errorNodos()!" [onRetry]="loadNodos" />
          } @else {
            <div class="row between mb-4">
              <div class="search">
                <app-icon-search [width]="15" [height]="15" />
                <input type="text" placeholder="Buscar nodo..."
                  [ngModel]="searchNodo()" (ngModelChange)="searchNodo.set($event)" />
              </div>
              <button class="btn btn-primary" (click)="openNodoDialog()" [disabled]="niveles().length === 0">
                <app-icon-plus [width]="14" [height]="14" /> Nuevo nodo
              </button>
            </div>
            @if (niveles().length === 0) {
              <div class="card muted center" style="padding: 24px;">
                Primero debe crear al menos un nivel de segregación para gestionar nodos.
              </div>
            }
            <div class="card table-wrap">
              <table class="data">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Nivel</th>
                    <th>Padre</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (n of filteredNodos(); track n.id) {
                    <tr>
                      <td class="mono">{{ n.codigo }}</td>
                      <td><div class="cell-strong">{{ n.nombre }}</div></td>
                      <td><span class="badge badge-blue">{{ n.nivelNombre }}</span></td>
                      <td>
                        @if (n.padreId) {
                          <span class="muted small">{{ n.padreNombre }}</span>
                        } @else {
                          <span class="muted small">—</span>
                        }
                      </td>
                      <td>
                        <span class="badge" [class.badge-green]="n.estado === 'ACTIVO'" [class.badge-gray]="n.estado !== 'ACTIVO'">
                          {{ n.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td>
                        <div class="cell-actions">
                          <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openNodoDialog(n)">
                            <app-icon-edit [width]="15" [height]="15" />
                          </button>
                          <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeleteNodo(n)">
                            <app-icon-trash [width]="15" [height]="15" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin nodos configurados.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </p-tabpanel>

      </p-tabpanels>
    </p-tabs>

    <!-- ============ DIÁLOGO NIVEL ============ -->
    <p-dialog
      [(visible)]="showNivelDlg"
      [header]="editNivelId ? 'Editar Nivel' : 'Nuevo Nivel'"
      [modal]="true" [style]="{ width: '480px' }" [closable]="true"
      (onHide)="closeNivelDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="nivelForm.codigo" placeholder="EMP" />
        </div>
        <div class="field">
          <label>Orden</label>
          <input class="input" type="number" min="1" [(ngModel)]="nivelForm.orden" placeholder="1" />
        </div>
      </div>
      <div class="field">
        <label>Nombre</label>
        <input class="input" [(ngModel)]="nivelForm.nombre" placeholder="Empresa" />
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="nivelForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeNivelDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="saveNivel()">{{ editNivelId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO NODO ============ -->
    <p-dialog
      [(visible)]="showNodoDlg"
      [header]="editNodoId ? 'Editar Nodo' : 'Nuevo Nodo'"
      [modal]="true" [style]="{ width: '520px' }" [closable]="true"
      (onHide)="closeNodoDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="nodoForm.codigo" placeholder="EMP-001" />
        </div>
        <div class="field">
          <label>Nivel</label>
          <select class="select" [(ngModel)]="nodoForm.nivelId" (ngModelChange)="onNodoNivelChange()">
            <option value="">— Seleccione —</option>
            @for (n of nivelesOrdenados(); track n.id) {
              <option [value]="n.id">{{ n.orden }} · {{ n.nombre }}</option>
            }
          </select>
        </div>
      </div>
      <div class="field">
        <label>Nombre</label>
        <input class="input" [(ngModel)]="nodoForm.nombre" placeholder="Reybanpac" />
      </div>
      <div class="field">
        <label>Padre</label>
        <select class="select" [(ngModel)]="nodoForm.padreId" [disabled]="!nodoForm.nivelId || posiblesPadres().length === 0">
          <option [value]="null">— Sin padre (raíz) —</option>
          @for (p of posiblesPadres(); track p.id) {
            <option [value]="p.id">{{ p.codigo }} · {{ p.nombre }}</option>
          }
        </select>
        @if (nodoForm.nivelId && posiblesPadres().length === 0 && nivelSeleccionadoOrden() > 1) {
          <div class="muted small" style="margin-top: 6px;">No existen nodos del nivel anterior. Cree uno primero.</div>
        }
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="nodoForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeNodoDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="saveNodo()">{{ editNodoId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
})
export class SegregationLevelsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  niveles = signal<NivelSegregacion[]>([]);
  nodos = signal<NodoSegregacion[]>([]);

  loadingNiveles = signal(true);
  loadingNodos = signal(true);
  errorNiveles = signal<string | null>(null);
  errorNodos = signal<string | null>(null);

  searchNivel = signal('');
  searchNodo = signal('');

  showNivelDlg = false;
  editNivelId: string | null = null;
  nivelForm: any = {};

  showNodoDlg = false;
  editNodoId: string | null = null;
  nodoForm: any = {};
  nivelFormId = signal('');

  nivelesOrdenados = computed(() => [...this.niveles()].sort((a, b) => a.orden - b.orden));

  nivelMap = computed(() => new Map(this.niveles().map(n => [n.id, n])));
  nodoMap = computed(() => new Map(this.nodos().map(n => [n.id, n])));

  nivelSeleccionadoOrden = computed(() => {
    const nivel = this.nivelMap().get(this.nivelFormId());
    return nivel?.orden ?? 0;
  });

  posiblesPadres = computed(() => {
    const nivelId = this.nivelFormId();
    if (!nivelId) return [];
    const nivel = this.nivelMap().get(nivelId);
    if (!nivel || nivel.orden <= 1) return [];
    const nivelAnterior = this.nivelesOrdenados().find(n => n.orden < nivel.orden);
    if (!nivelAnterior) return [];
    return this.nodos().filter(n => n.nivelId === nivelAnterior.id).sort((a, b) => a.codigo.localeCompare(b.codigo));
  });

  filteredNiveles = computed(() => {
    const q = this.searchNivel().toLowerCase().trim();
    if (!q) return this.nivelesOrdenados();
    return this.nivelesOrdenados().filter(n =>
      n.codigo.toLowerCase().includes(q) ||
      n.nombre.toLowerCase().includes(q) ||
      String(n.orden).includes(q)
    );
  });

  nodosView = computed<NodoView[]>(() => {
    return this.nodos().map(n => ({
      ...n,
      nivelNombre: this.nivelMap().get(n.nivelId)?.nombre || n.nivelId,
      padreNombre: n.padreId ? (this.nodoMap().get(n.padreId)?.nombre || n.padreId) : undefined,
    })).sort((a, b) => {
      const oa = this.nivelMap().get(a.nivelId)?.orden ?? 0;
      const ob = this.nivelMap().get(b.nivelId)?.orden ?? 0;
      if (oa !== ob) return oa - ob;
      return a.codigo.localeCompare(b.codigo);
    });
  });

  filteredNodos = computed(() => {
    const q = this.searchNodo().toLowerCase().trim();
    if (!q) return this.nodosView();
    return this.nodosView().filter(n =>
      n.codigo.toLowerCase().includes(q) ||
      n.nombre.toLowerCase().includes(q) ||
      (n.nivelNombre || '').toLowerCase().includes(q) ||
      (n.padreNombre || '').toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.loadNiveles();
    this.loadNodos();
    this.events.onDataChanged(() => {
      this.loadNiveles();
      this.loadNodos();
    });
  }

  loadNiveles = (): void => {
    this.loadingNiveles.set(true);
    this.errorNiveles.set(null);
    this.api.listNivelesSegregacion().subscribe({
      next: (data) => { this.niveles.set(data); this.loadingNiveles.set(false); },
      error: () => { this.errorNiveles.set('No se pudieron cargar los niveles.'); this.loadingNiveles.set(false); },
    });
  };

  loadNodos = (): void => {
    this.loadingNodos.set(true);
    this.errorNodos.set(null);
    this.api.listNodosSegregacion().subscribe({
      next: (data) => { this.nodos.set(data); this.loadingNodos.set(false); },
      error: () => { this.errorNodos.set('No se pudieron cargar los nodos.'); this.loadingNodos.set(false); },
    });
  };

  blankNivel() { return { codigo: '', nombre: '', orden: this.siguienteOrdenNivel(), estado: 'ACTIVO' as Estado }; }
  siguienteOrdenNivel(): number {
    const ordenes = this.niveles().map(n => n.orden);
    return ordenes.length === 0 ? 1 : Math.max(...ordenes) + 1;
  }

  openNivelDialog(n?: NivelSegregacion): void {
    if (n) {
      this.nivelForm = { ...n };
      this.editNivelId = n.id;
    } else {
      this.nivelForm = this.blankNivel();
      this.editNivelId = null;
    }
    this.showNivelDlg = true;
  }

  closeNivelDialog(): void { this.showNivelDlg = false; this.editNivelId = null; }

  async saveNivel(): Promise<void> {
    if (!this.nivelForm.codigo || !this.nivelForm.nombre || this.nivelForm.orden === '') {
      this.toast.error('Faltan datos', 'Código, nombre y orden son obligatorios.');
      return;
    }
    const body = { ...this.nivelForm, orden: Number(this.nivelForm.orden) };
    try {
      if (this.editNivelId) {
        await this.api.updateNivelSegregacion(this.editNivelId, body).toPromise();
        this.toast.success('Nivel actualizado');
      } else {
        await this.api.createNivelSegregacion(body).toPromise();
        this.toast.success('Nivel creado');
      }
      this.events.emitDataChanged();
      this.closeNivelDialog();
      this.loadNiveles();
    } catch (e: any) {
      this.toast.error('Error', e?.error?.error || e?.message || 'Error inesperado.');
    }
  }

  confirmDeleteNivel(n: NivelSegregacion): void {
    if (confirm(`¿Eliminar el nivel "${n.nombre}"?\n\nSolo se puede eliminar si no tiene nodos asociados.`)) {
      this.api.deleteNivelSegregacion(n.id).subscribe({
        next: () => { this.toast.success('Nivel eliminado'); this.events.emitDataChanged(); },
        error: (e) => { this.toast.error('Error', e?.error?.error || 'Error inesperado.'); },
      });
    }
  }

  blankNodo() { return { codigo: '', nombre: '', nivelId: '', padreId: null as string | null, estado: 'ACTIVO' as Estado }; }

  openNodoDialog(n?: NodoView): void {
    if (n) {
      this.nodoForm = { ...n };
      this.editNodoId = n.id;
      this.nivelFormId.set(n.nivelId);
    } else {
      this.nodoForm = this.blankNodo();
      this.editNodoId = null;
      this.nivelFormId.set('');
    }
    this.showNodoDlg = true;
  }

  closeNodoDialog(): void { this.showNodoDlg = false; this.editNodoId = null; this.nivelFormId.set(''); }

  onNodoNivelChange(): void {
    this.nivelFormId.set(this.nodoForm.nivelId || '');
    this.nodoForm.padreId = null;
  }

  async saveNodo(): Promise<void> {
    if (!this.nodoForm.codigo || !this.nodoForm.nombre || !this.nodoForm.nivelId) {
      this.toast.error('Faltan datos', 'Código, nombre y nivel son obligatorios.');
      return;
    }
    const body = { ...this.nodoForm };
    try {
      if (this.editNodoId) {
        await this.api.updateNodoSegregacion(this.editNodoId, body).toPromise();
        this.toast.success('Nodo actualizado');
      } else {
        await this.api.createNodoSegregacion(body).toPromise();
        this.toast.success('Nodo creado');
      }
      this.events.emitDataChanged();
      this.closeNodoDialog();
      this.loadNodos();
    } catch (e: any) {
      this.toast.error('Error', e?.error?.error || e?.message || 'Error inesperado.');
    }
  }

  confirmDeleteNodo(n: NodoView): void {
    if (confirm(`¿Eliminar el nodo "${n.nombre}"?\n\nSe eliminarán también sus nodos descendientes.`)) {
      this.api.deleteNodoSegregacion(n.id).subscribe({
        next: () => { this.toast.success('Nodo eliminado'); this.events.emitDataChanged(); },
        error: (e) => { this.toast.error('Error', e?.error?.error || 'Error inesperado.'); },
      });
    }
  }
}
