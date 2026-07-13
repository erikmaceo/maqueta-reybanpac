import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import * as XLSX from 'xlsx';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import {
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent,
  IconDownloadComponent,
} from '../../shared/components/icons';
import type { NivelSegregacion, NodoSegregacion, NivelAtributo, NodoAtributoValor } from '../../shared/models/types';

type TabValue = 'niveles' | 'nodos' | 'atributos';
type Estado = 'ACTIVO' | 'INACTIVO';

interface NodoView extends NodoSegregacion {
  nivelNombre?: string;
  padreNombre?: string;
  atributos: Record<string, string>;
}

@Component({
  selector: 'app-segregation-levels',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent,
    IconDownloadComponent,
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
        <p-tab value="2"><i class="pi pi-tags mr-2"></i>Atributos</p-tab>
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
              <div class="row" style="gap: 8px;">
                <button class="btn btn-secondary" (click)="exportNodos()">
                  <app-icon-download [width]="14" [height]="14" /> Exportar
                </button>
                <button class="btn btn-primary" (click)="openNodoDialog()" [disabled]="niveles().length === 0">
                  <app-icon-plus [width]="14" [height]="14" /> Nuevo nodo
                </button>
              </div>
            </div>
            @if (niveles().length === 0) {
              <div class="card muted center" style="padding: 24px;">
                Primero debe crear al menos un nivel de segregación para gestionar nodos.
              </div>
            }
            <div class="card table-wrap" style="overflow-x: auto;">
              <table class="data">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Nivel</th>
                    <th>Padre</th>
                    @for (attr of atributosColumnas(); track attr.id) {
                      <th>{{ attr.displayName }}</th>
                    }
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
                      @for (attr of atributosColumnas(); track attr.id) {
                        <td class="small">{{ n.atributos[attr.id] || '—' }}</td>
                      }
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
                    <tr><td [attr.colspan]="5 + atributosColumnas().length" class="muted center" style="padding: 24px;">Sin nodos configurados.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </p-tabpanel>

        <!-- ============ ATRIBUTOS ============ -->
        <p-tabpanel value="2">
          @if (loadingAtributos()) {
            <app-table-skeleton [rows]="5" [cols]="6" />
          } @else if (errorAtributos()) {
            <app-error-state [message]="errorAtributos()!" [onRetry]="loadAtributos" />
          } @else {
            <div class="row between mb-4">
              <div class="search">
                <app-icon-search [width]="15" [height]="15" />
                <input type="text" placeholder="Buscar atributo..."
                  [ngModel]="searchAtributo()" (ngModelChange)="searchAtributo.set($event)" />
              </div>
              <button class="btn btn-primary" (click)="openAtributoDialog()" [disabled]="niveles().length === 0">
                <app-icon-plus [width]="14" [height]="14" /> Nuevo atributo
              </button>
            </div>
            <div class="field mb-4" style="max-width: 360px;">
              <label>Nivel</label>
              <select class="select" [(ngModel)]="atributosNivelFilter" (ngModelChange)="searchAtributo.set('')">
                <option value="">— Todos los niveles —</option>
                @for (n of nivelesOrdenados(); track n.id) {
                  <option [value]="n.id">{{ n.orden }} · {{ n.nombre }}</option>
                }
              </select>
            </div>
            <div class="card table-wrap">
              <table class="data">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Nivel</th>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Obligatorio</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of filteredAtributos(); track a.id) {
                    <tr>
                      <td class="mono">{{ a.orden }}</td>
                      <td><span class="badge badge-blue">{{ nivelMap().get(a.nivelId)?.nombre || a.nivelId }}</span></td>
                      <td class="mono">{{ a.codigo }}</td>
                      <td><div class="cell-strong">{{ a.nombre }}</div></td>
                      <td>{{ a.tipo }}</td>
                      <td>
                        <span class="badge" [class.badge-green]="a.obligatorio" [class.badge-gray]="!a.obligatorio">
                          {{ a.obligatorio ? 'Sí' : 'No' }}
                        </span>
                      </td>
                      <td>
                        <span class="badge" [class.badge-green]="a.estado === 'ACTIVO'" [class.badge-gray]="a.estado !== 'ACTIVO'">
                          {{ a.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td>
                        <div class="cell-actions">
                          <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openAtributoDialog(a)">
                            <app-icon-edit [width]="15" [height]="15" />
                          </button>
                          <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeleteAtributo(a)">
                            <app-icon-trash [width]="15" [height]="15" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="8" class="muted center" style="padding: 24px;">Sin atributos configurados.</td></tr>
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
      [modal]="true" [style]="{ width: '560px' }" [closable]="true"
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

      @if (atributosDelNivelEnEdicion().length > 0) {
        <div style="border-top: 1px solid var(--border); margin: 16px 0 12px; padding-top: 12px;">
          <h4 class="mb-3" style="font-size: 0.95rem;">Atributos del nivel</h4>
          @for (attr of atributosDelNivelEnEdicion(); track attr.id) {
            <div class="field">
              <label>{{ attr.nombre }} {{ attr.obligatorio ? '*' : '' }}</label>
              <input class="input"
                [type]="attr.tipo === 'numero' ? 'number' : attr.tipo === 'email' ? 'email' : 'text'"
                [(ngModel)]="nodoForm.atributos[attr.id]"
                [placeholder]="attr.nombre" />
            </div>
          }
        </div>
      }

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

    <!-- ============ DIÁLOGO ATRIBUTO ============ -->
    <p-dialog
      [(visible)]="showAtributoDlg"
      [header]="editAtributoId ? 'Editar Atributo' : 'Nuevo Atributo'"
      [modal]="true" [style]="{ width: '520px' }" [closable]="true"
      (onHide)="closeAtributoDialog()"
    >
      <div class="field">
        <label>Nivel</label>
        <select class="select" [(ngModel)]="atributoForm.nivelId" [disabled]="!!editAtributoId">
          <option value="">— Seleccione —</option>
          @for (n of nivelesOrdenados(); track n.id) {
            <option [value]="n.id">{{ n.orden }} · {{ n.nombre }}</option>
          }
        </select>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="atributoForm.codigo" placeholder="ruc" />
        </div>
        <div class="field">
          <label>Orden</label>
          <input class="input" type="number" min="0" [(ngModel)]="atributoForm.orden" placeholder="0" />
        </div>
      </div>
      <div class="field">
        <label>Nombre</label>
        <input class="input" [(ngModel)]="atributoForm.nombre" placeholder="RUC" />
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Tipo</label>
          <select class="select" [(ngModel)]="atributoForm.tipo">
            <option value="texto">Texto</option>
            <option value="numero">Número</option>
            <option value="telefono">Teléfono</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div class="field">
          <label>Obligatorio</label>
          <select class="select" [(ngModel)]="atributoForm.obligatorio">
            <option [value]="true">Sí</option>
            <option [value]="false">No</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="atributoForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeAtributoDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="saveAtributo()">{{ editAtributoId ? 'Guardar' : 'Crear' }}</button>
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
  atributos = signal<NivelAtributo[]>([]);
  valoresAtributos = signal<NodoAtributoValor[]>([]);

  loadingNiveles = signal(true);
  loadingNodos = signal(true);
  loadingAtributos = signal(true);
  errorNiveles = signal<string | null>(null);
  errorNodos = signal<string | null>(null);
  errorAtributos = signal<string | null>(null);

  searchNivel = signal('');
  searchNodo = signal('');
  searchAtributo = signal('');
  atributosNivelFilter = '';

  showNivelDlg = false;
  editNivelId: string | null = null;
  nivelForm: any = {};

  showNodoDlg = false;
  editNodoId: string | null = null;
  nodoForm: any = {};
  nivelFormId = signal('');

  showAtributoDlg = false;
  editAtributoId: string | null = null;
  atributoForm: any = {};

  nivelesOrdenados = computed(() => [...this.niveles()].sort((a, b) => a.orden - b.orden));

  nivelMap = computed(() => new Map(this.niveles().map(n => [n.id, n])));
  nodoMap = computed(() => new Map(this.nodos().map(n => [n.id, n])));
  atributoMap = computed(() => new Map(this.atributos().map(a => [a.id, a])));

  nivelSeleccionadoOrden = computed(() => {
    const nivel = this.nivelMap().get(this.nivelFormId());
    return nivel?.orden ?? 0;
  });

  posiblesPadres = computed(() => {
    const nivelId = this.nivelFormId();
    if (!nivelId) return [];
    const nivel = this.nivelMap().get(nivelId);
    if (!nivel || nivel.orden <= 1) return [];
    const nivelAnterior = this.nivelesOrdenados()
      .filter(n => n.orden < nivel.orden)
      .sort((a, b) => b.orden - a.orden)[0];
    if (!nivelAnterior) return [];
    return this.nodos().filter(n => n.nivelId === nivelAnterior.id).sort((a, b) => a.codigo.localeCompare(b.codigo));
  });

  atributosDelNivelEnEdicion = computed(() => {
    const nivelId = this.nivelFormId();
    if (!nivelId) return [];
    return this.atributos()
      .filter(a => a.nivelId === nivelId && a.estado === 'ACTIVO')
      .sort((a, b) => a.orden - b.orden || a.createdAt.localeCompare(b.createdAt));
  });

  atributosColumnas = computed(() => {
    const activos = this.atributos().filter(a => a.estado === 'ACTIVO');
    const sorted = activos.sort((a, b) => a.orden - b.orden || a.createdAt.localeCompare(b.createdAt));
    // Si el mismo nombre de atributo existe en varios niveles, se diferencia con el nombre del nivel.
    const nombreCount = new Map<string, number>();
    for (const a of sorted) {
      const key = a.nombre.toLowerCase().trim();
      nombreCount.set(key, (nombreCount.get(key) || 0) + 1);
    }
    return sorted.map(a => {
      const key = a.nombre.toLowerCase().trim();
      const duplicado = (nombreCount.get(key) || 0) > 1;
      const nivelNombre = this.nivelMap().get(a.nivelId)?.nombre || a.nivelId;
      return {
        ...a,
        displayName: duplicado ? `${nivelNombre} - ${a.nombre}` : a.nombre,
      };
    });
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
    return this.nodos().map(n => {
      const valores = this.valoresAtributos().filter(v => v.nodoId === n.id);
      const attrs: Record<string, string> = {};
      for (const v of valores) {
        const attr = this.atributoMap().get(v.atributoId);
        if (attr) attrs[attr.id] = v.valor;
      }
      return {
        ...n,
        nivelNombre: this.nivelMap().get(n.nivelId)?.nombre || n.nivelId,
        padreNombre: n.padreId ? (this.nodoMap().get(n.padreId)?.nombre || n.padreId) : undefined,
        atributos: attrs,
      };
    }).sort((a, b) => {
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
      (n.padreNombre || '').toLowerCase().includes(q) ||
      Object.values(n.atributos).some(v => v.toLowerCase().includes(q))
    );
  });

  filteredAtributos = computed(() => {
    let list = this.atributos();
    if (this.atributosNivelFilter) {
      list = list.filter(a => a.nivelId === this.atributosNivelFilter);
    }
    list = list.sort((a, b) => {
      const nivelDiff = (this.nivelMap().get(a.nivelId)?.orden ?? 0) - (this.nivelMap().get(b.nivelId)?.orden ?? 0);
      if (nivelDiff !== 0) return nivelDiff;
      return a.orden - b.orden || a.createdAt.localeCompare(b.createdAt);
    });
    const q = this.searchAtributo().toLowerCase().trim();
    if (!q) return list;
    return list.filter(a =>
      a.codigo.toLowerCase().includes(q) ||
      a.nombre.toLowerCase().includes(q) ||
      a.tipo.toLowerCase().includes(q) ||
      (this.nivelMap().get(a.nivelId)?.nombre || '').toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.loadNiveles();
    this.loadNodos();
    this.loadAtributos();
    this.events.onDataChanged(() => {
      this.loadNiveles();
      this.loadNodos();
      this.loadAtributos();
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
      next: (data) => { this.nodos.set(data); this.loadValoresAtributos(); this.loadingNodos.set(false); },
      error: () => { this.errorNodos.set('No se pudieron cargar los nodos.'); this.loadingNodos.set(false); },
    });
  };

  loadAtributos = (): void => {
    this.loadingAtributos.set(true);
    this.errorAtributos.set(null);
    this.api.listNivelesAtributos().subscribe({
      next: (data) => { this.atributos.set(data); this.loadingAtributos.set(false); },
      error: () => { this.errorAtributos.set('No se pudieron cargar los atributos.'); this.loadingAtributos.set(false); },
    });
  };

  loadValoresAtributos = (): void => {
    this.api.listNodosAtributoValores().subscribe({
      next: (data) => { this.valoresAtributos.set(data); },
      error: () => { /* no crítico */ },
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

  blankNodo() { return { codigo: '', nombre: '', nivelId: '', padreId: null as string | null, estado: 'ACTIVO' as Estado, atributos: {} as Record<string, string> }; }

  openNodoDialog(n?: NodoView): void {
    if (n) {
      const attrValues: Record<string, string> = {};
      for (const [atributoId, valor] of Object.entries(n.atributos)) {
        const attr = this.atributoMap().get(atributoId);
        if (attr && attr.nivelId === n.nivelId) attrValues[attr.id] = valor;
      }
      this.nodoForm = { ...n, atributos: attrValues };
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
    this.nodoForm.atributos = {};
  }

  async saveNodo(): Promise<void> {
    if (!this.nodoForm.codigo || !this.nodoForm.nombre || !this.nodoForm.nivelId) {
      this.toast.error('Faltan datos', 'Código, nombre y nivel son obligatorios.');
      return;
    }
    const atributosPayload = Object.entries(this.nodoForm.atributos || {})
      .filter(([_, v]) => v !== undefined && v !== '')
      .map(([atributoId, valor]) => ({ atributoId, valor: String(valor) }));
    const body = { ...this.nodoForm, atributos: atributosPayload };
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

  blankAtributo() {
    return {
      nivelId: this.atributosNivelFilter || '',
      codigo: '',
      nombre: '',
      tipo: 'texto',
      obligatorio: false,
      orden: this.siguienteOrdenAtributo(),
      estado: 'ACTIVO' as Estado,
    };
  }

  siguienteOrdenAtributo(): number {
    const base = this.atributosNivelFilter
      ? this.atributos().filter(a => a.nivelId === this.atributosNivelFilter)
      : this.atributos();
    if (base.length === 0) return 0;
    return Math.max(...base.map(a => a.orden)) + 1;
  }

  openAtributoDialog(a?: NivelAtributo): void {
    if (a) {
      this.atributoForm = { ...a, obligatorio: a.obligatorio ? 'true' : 'false' };
      this.editAtributoId = a.id;
    } else {
      this.atributoForm = this.blankAtributo();
      this.editAtributoId = null;
    }
    this.showAtributoDlg = true;
  }

  closeAtributoDialog(): void { this.showAtributoDlg = false; this.editAtributoId = null; }

  async saveAtributo(): Promise<void> {
    if (!this.atributoForm.nivelId || !this.atributoForm.codigo || !this.atributoForm.nombre) {
      this.toast.error('Faltan datos', 'Nivel, código y nombre son obligatorios.');
      return;
    }
    const body = {
      ...this.atributoForm,
      orden: Number(this.atributoForm.orden ?? 0),
      obligatorio: this.atributoForm.obligatorio === true || this.atributoForm.obligatorio === 'true',
    };
    try {
      if (this.editAtributoId) {
        await this.api.updateNivelAtributo(this.editAtributoId, body).toPromise();
        this.toast.success('Atributo actualizado');
      } else {
        await this.api.createNivelAtributo(body).toPromise();
        this.toast.success('Atributo creado');
      }
      this.events.emitDataChanged();
      this.closeAtributoDialog();
      this.loadAtributos();
    } catch (e: any) {
      this.toast.error('Error', e?.error?.error || e?.message || 'Error inesperado.');
    }
  }

  confirmDeleteAtributo(a: NivelAtributo): void {
    if (confirm(`¿Eliminar el atributo "${a.nombre}"?\n\nSe eliminarán también los valores asociados a los nodos.`)) {
      this.api.deleteNivelAtributo(a.id).subscribe({
        next: () => { this.toast.success('Atributo eliminado'); this.events.emitDataChanged(); },
        error: (e) => { this.toast.error('Error', e?.error?.error || 'Error inesperado.'); },
      });
    }
  }

  exportNodos(): void {
    const attrCols = this.atributosColumnas();
    const rows = this.filteredNodos().map(n => {
      const base: Record<string, any> = {
        codigo: n.codigo,
        nombre: n.nombre,
        nivel: n.nivelNombre,
        padre: n.padreNombre || '—',
        estado: n.estado === 'ACTIVO' ? 'Activo' : 'Inactivo',
      };
      for (const attr of attrCols) {
        base[attr.displayName] = n.atributos[attr.id] || '';
      }
      return base;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'nodos');
    XLSX.writeFile(wb, 'nodos-segregacion.xlsx');
  }
}
