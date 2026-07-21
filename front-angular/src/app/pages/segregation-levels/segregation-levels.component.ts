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
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconUploadComponent, IconDownloadComponent,
} from '../../shared/components/icons';
import type { NivelSegregacion, NodoSegregacion, NivelAtributo, NodoAtributoValor, Pais, Provincia, Ciudad } from '../../shared/models/types';

type TabValue = 'niveles' | 'nodos' | 'atributos';
type Estado = 'ACTIVO' | 'INACTIVO';

interface NodoView extends NodoSegregacion {
  nivelNombre?: string;
  padreNombre?: string;
  atributos: Record<string, string>; // valores formateados para visualización
  atributosRaw: Record<string, string>; // valores crudos (ids) para edición
}

@Component({
  selector: 'app-segregation-levels',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconUploadComponent, IconDownloadComponent,
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
        <p-tab value="1"><i class="pi pi-tags mr-2"></i>Atributos</p-tab>
        <p-tab value="2"><i class="pi pi-sitemap mr-2"></i>Nodos</p-tab>
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
                <app-icon-plus [width]="14" [height]="14" /> Nuevo Nivel
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
        <p-tabpanel value="2">
          @if (loadingNodos()) {
            <app-table-skeleton [rows]="5" [cols]="6" />
          } @else if (errorNodos()) {
            <app-error-state [message]="errorNodos()!" [onRetry]="loadNodos" />
          } @else {
            <div class="row between mb-4">
              <div class="search">
                <app-icon-search [width]="15" [height]="15" />
                <input type="text" placeholder="Buscar nodo en la jerarquía..."
                  [ngModel]="searchNodo()" (ngModelChange)="searchNodo.set($event)" />
              </div>
              <div class="row gap-2">
                <button class="btn btn-primary" (click)="openNodoDialog()" [disabled]="niveles().length === 0">
                  <app-icon-plus [width]="14" [height]="14" /> Nuevo Nodo
                </button>
                <button class="btn btn-primary" (click)="openBulkDialog()" [disabled]="niveles().length === 0">
                  <app-icon-upload [width]="14" [height]="14" /> Carga Masiva
                </button>
              </div>
            </div>
            @if (niveles().length === 0) {
              <div class="card muted center" style="padding: 24px;">
                Primero debe crear al menos un nivel de segregación para gestionar nodos.
              </div>
            } @else {
              <!-- Template recursivo para tablas hijas por nivel -->
              <ng-template #nodoTable let-padreId let-nivelHijosId="nivelHijosId">
                @let nivel = nivelMap().get(nivelHijosId);
                @let attrs = atributosDeNivel(nivelHijosId);
                @let hijos = hijosDe(padreId);
                @if (hijos.length > 0) {
                  <div class="tree-table">
                    <div class="tree-table-caption">{{ nivel?.nombre }}</div>
                    <table class="data">
                      <thead>
                        <tr>
                          <th class="tree-th-toggle"></th>
                          <th>Código</th>
                          <th>Nombre</th>
                          @for (attr of attrs; track attr.id) {
                            <th>{{ attr.nombre }}</th>
                          }
                          <th>Estado</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (h of hijos; track h.id) {
                          <tr>
                            <td>
                              @if (tieneHijosNodo(h.id)) {
                                <button class="tree-toggle-btn" (click)="toggleNodoExpand(h.id)">
                                  <i class="pi" [class.pi-chevron-down]="isNodoExpanded(h.id)"
                                     [class.pi-chevron-right]="!isNodoExpanded(h.id)"></i>
                                </button>
                              }
                            </td>
                            <td class="mono">{{ h.codigo }}</td>
                            <td>
                              <div class="cell-strong">{{ h.nombre }}</div>
                              <div class="tiny dim">{{ nivel?.nombre }}</div>
                            </td>
                            @for (attr of attrs; track attr.id) {
                              <td class="small">{{ h.atributos[attr.id] || '—' }}</td>
                            }
                            <td>
                              <span class="badge" [class.badge-green]="h.estado === 'ACTIVO'" [class.badge-gray]="h.estado !== 'ACTIVO'">
                                {{ h.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                              </span>
                            </td>
                            <td>
                              <div class="cell-actions">
                                <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openNodoDialog(h)">
                                  <app-icon-edit [width]="15" [height]="15" />
                                </button>
                                <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeleteNodo(h)">
                                  <app-icon-trash [width]="15" [height]="15" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          @if (isNodoExpanded(h.id)) {
                            <tr>
                              <td [attr.colspan]="3 + attrs.length + 2" class="tree-child-cell">
                                <ng-container *ngTemplateOutlet="nodoTable; context: { $implicit: h.id, nivelHijosId: siguienteNivelId(h.nivelId) }"></ng-container>
                              </td>
                            </tr>
                          }
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </ng-template>

              @let raices = nodosRaices();
              @if (raices.length === 0) {
                <div class="card muted center" style="padding: 24px;">Sin nodos configurados.</div>
              } @else {
                <ng-container *ngTemplateOutlet="nodoTable; context: { $implicit: null, nivelHijosId: primerNivelId() }"></ng-container>
              }
            }
          }
        </p-tabpanel>

        <!-- ============ ATRIBUTOS ============ -->
        <p-tabpanel value="1">
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
                <app-icon-plus [width]="14" [height]="14" /> Nuevo Atributo
              </button>
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
              <label [class.error-text]="nodoFormSubmitted() && attr.obligatorio && !nodoForm.atributos[attr.id]">
                {{ attr.nombre }} {{ attr.obligatorio ? '*' : '' }}
              </label>
              @if (attr.tipo === 'select') {
                <select class="select"
                  [(ngModel)]="nodoForm.atributos[attr.id]"
                  [class.input-error]="nodoFormSubmitted() && attr.obligatorio && !nodoForm.atributos[attr.id]">
                  <option value="">— Seleccione —</option>
                  @switch (attr.config?.fuente) {
                    @case ('paises') {
                      @for (p of paises(); track p.id) {
                        <option [value]="p.id">{{ p.descripcion }}</option>
                      }
                    }
                    @case ('provincias') {
                      @for (p of provincias(); track p.id) {
                        <option [value]="p.id">{{ p.descripcion }}</option>
                      }
                    }
                    @case ('ciudades') {
                      @for (c of ciudades(); track c.id) {
                        <option [value]="c.id">{{ c.descripcion }}</option>
                      }
                    }
                  }
                </select>
              } @else {
                <input class="input"
                  [type]="attr.tipo === 'numero' ? 'number' : attr.tipo === 'email' ? 'email' : 'text'"
                  [(ngModel)]="nodoForm.atributos[attr.id]"
                  [placeholder]="attr.nombre"
                  [class.input-error]="nodoFormSubmitted() && attr.obligatorio && !nodoForm.atributos[attr.id]" />
              }
              @if (nodoFormSubmitted() && attr.obligatorio && !nodoForm.atributos[attr.id]) {
                <div class="error-text">Este campo es obligatorio.</div>
              }
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

    <!-- ============ DIÁLOGO CARGA MASIVA NODOS ============ -->
    <p-dialog
      [(visible)]="showBulkDlg"
      header="Carga masiva de nodos"
      [modal]="true" [style]="{ width: '560px' }" [closable]="true"
      (onHide)="closeBulkDialog()"
    >
      <p class="mb-3 muted small">
        El archivo debe tener las columnas: <b>NIVEL</b>, <b>CODIGO</b>, <b>NOMBRE</b>, <b>PADRE</b> y <b>ESTADO</b>.
        Los niveles deben coincidir con los configurados y el padre debe ser el código del nivel inmediatamente anterior.
      </p>

      <div class="row gap-2 mb-3">
        <button class="btn btn-ghost" (click)="downloadBulkTemplate()">
          <app-icon-download [width]="14" [height]="14" /> Descargar Plantilla
        </button>
      </div>

      <div class="field">
        <label>Archivo Excel</label>
        <input type="file" accept=".xlsx,.xls" (change)="onBulkFileSelected($event)" />
        @if (bulkFileName()) {
          <div class="small mt-1">{{ bulkFileName() }}</div>
        }
      </div>

      @if (bulkSuccess()) {
        <div class="alert alert-success mb-3">{{ bulkSuccess() }}</div>
      }

      @if (bulkErrors().length > 0) {
        <div class="alert alert-error mb-3">
          <ul class="mb-0">
            @for (e of bulkErrors(); track e.row + e.message) {
              <li>Fila {{ e.row }}: {{ e.message }}</li>
            }
          </ul>
        </div>
      }

      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeBulkDialog()">Cerrar</button>
        <button class="btn btn-primary" (click)="processBulkFile()" [disabled]="!bulkFile || bulkLoading()">
          @if (bulkLoading()) {
            <span>Procesando...</span>
          } @else {
            <span>Procesar</span>
          }
        </button>
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
        <select class="select" [(ngModel)]="atributoForm.nivelId" [disabled]="!!editAtributoId" (ngModelChange)="onAtributoNivelChange()">
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
            <option value="select">Selección</option>
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
      @if (atributoForm.tipo === 'select') {
        <div class="field">
          <label>Fuente de opciones</label>
          <select class="select" [(ngModel)]="atributoForm.configFuente">
            <option value="">— Seleccione —</option>
            <option value="paises">Países</option>
            <option value="provincias">Provincias</option>
            <option value="ciudades">Ciudades</option>
          </select>
        </div>
      }
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
  styles: [`
    .tree-table { width: 100%; margin-bottom: 8px; }
    .tree-table > .data { width: 100%; }
    .tree-table-caption { font-size: 0.75rem; font-weight: 700; color: var(--muted, #6b7280); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
    .tree-th-toggle { width: 32px; text-align: center; }
    .tree-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--muted, #6b7280);
      border-radius: 4px;
      padding: 0;
    }
    .tree-toggle-btn:hover { background: var(--surface-2, #f3f4f6); color: var(--primary, #2563eb); }
    .tree-child-cell {
      padding: 0 !important;
      border-top: none !important;
      background: var(--surface-2, #f9fafb);
    }
    .tree-child-cell .tree-table { padding-left: 20px; }
    .tree-child-cell .tree-table .data { margin: 4px 0; }
    .tiny { font-size: 0.72rem; }
    .dim { color: var(--text-3, #9ca3af); }
  `],
})
export class SegregationLevelsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  niveles = signal<NivelSegregacion[]>([]);
  nodos = signal<NodoSegregacion[]>([]);
  atributos = signal<NivelAtributo[]>([]);
  valoresAtributos = signal<NodoAtributoValor[]>([]);
  paises = signal<Pais[]>([]);
  provincias = signal<Provincia[]>([]);
  ciudades = signal<Ciudad[]>([]);

  loadingNiveles = signal(true);
  loadingNodos = signal(true);
  loadingAtributos = signal(true);
  errorNiveles = signal<string | null>(null);
  errorNodos = signal<string | null>(null);
  errorAtributos = signal<string | null>(null);

  searchNivel = signal('');
  searchNodo = signal('');
  searchAtributo = signal('');

  showNivelDlg = false;
  editNivelId: string | null = null;
  nivelForm: any = {};

  showNodoDlg = false;
  editNodoId: string | null = null;
  nodoForm: any = {};
  nivelFormId = signal('');
  nodoFormSubmitted = signal(false);

  showAtributoDlg = false;
  editAtributoId: string | null = null;
  atributoForm: any = {};

  showBulkDlg = false;
  bulkFile: File | null = null;
  bulkFileName = signal('');
  bulkErrors = signal<{ row: number; message: string }[]>([]);
  bulkSuccess = signal('');
  bulkLoading = signal(false);

  nivelesOrdenados = computed(() => [...this.niveles()].sort((a, b) => a.orden - b.orden));

  nivelMap = computed(() => new Map(this.niveles().map(n => [n.id, n])));
  nodoMap = computed(() => new Map(this.nodos().map(n => [n.id, n])));
  atributoMap = computed(() => new Map(this.atributos().map(a => [a.id, a])));
  paisMap = computed(() => new Map(this.paises().map(p => [p.id, p])));
  provinciaMap = computed(() => new Map(this.provincias().map(p => [p.id, p])));
  ciudadMap = computed(() => new Map(this.ciudades().map(c => [c.id, c])));

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
      const attrsRaw: Record<string, string> = {};
      const attrsDisplay: Record<string, string> = {};
      for (const v of valores) {
        const attr = this.atributoMap().get(v.atributoId);
        if (!attr) continue;
        attrsRaw[attr.id] = v.valor;
        if (attr.tipo === 'select') {
          if (attr.config?.fuente === 'paises') {
            attrsDisplay[attr.id] = this.paisMap().get(v.valor)?.descripcion || v.valor;
          } else if (attr.config?.fuente === 'provincias') {
            attrsDisplay[attr.id] = this.provinciaMap().get(v.valor)?.descripcion || v.valor;
          } else if (attr.config?.fuente === 'ciudades') {
            attrsDisplay[attr.id] = this.ciudadMap().get(v.valor)?.descripcion || v.valor;
          } else {
            attrsDisplay[attr.id] = v.valor;
          }
        } else {
          attrsDisplay[attr.id] = v.valor;
        }
      }
      return {
        ...n,
        nivelNombre: this.nivelMap().get(n.nivelId)?.nombre || n.nivelId,
        padreNombre: n.padreId ? (this.nodoMap().get(n.padreId)?.nombre || n.padreId) : undefined,
        atributos: attrsDisplay,
        atributosRaw: attrsRaw,
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

  expandedNodosTree = signal<Set<string>>(new Set());

  nodosRaices = computed<NodoView[]>(() => {
    const q = this.searchNodo().toLowerCase().trim();
    let raices = this.nodosView().filter(n => !n.padreId);
    if (q) {
      const matchIds = new Set(this.filteredNodos().map(n => n.id));
      const visibleIds = new Set<string>();
      for (const id of matchIds) {
        let currentId: string | null = id;
        let node = this.nodoMap().get(currentId);
        while (currentId && node) {
          visibleIds.add(currentId);
          currentId = node.padreId;
          if (currentId) node = this.nodoMap().get(currentId);
        }
      }
      raices = raices.filter(r => visibleIds.has(r.id) || this.tieneDescendienteEnSet(r.id, visibleIds));
    }
    return raices.sort((a, b) => a.codigo.localeCompare(b.codigo));
  });

  tieneDescendienteEnSet(nodoId: string, ids: Set<string>): boolean {
    const hijos = this.nodos().filter(n => n.padreId === nodoId);
    for (const h of hijos) {
      if (ids.has(h.id)) return true;
      if (this.tieneDescendienteEnSet(h.id, ids)) return true;
    }
    return false;
  }

  hijosDe(padreId: string | null): NodoView[] {
    const q = this.searchNodo().toLowerCase().trim();
    let hijos = this.nodosView().filter(n => n.padreId === padreId);
    if (q) {
      const matchIds = new Set(this.filteredNodos().map(n => n.id));
      const visibleIds = new Set<string>();
      for (const id of matchIds) {
        let currentId: string | null = id;
        let node = this.nodoMap().get(currentId);
        while (currentId && node) {
          visibleIds.add(currentId);
          currentId = node.padreId;
          if (currentId) node = this.nodoMap().get(currentId);
        }
      }
      hijos = hijos.filter(h => visibleIds.has(h.id) || this.tieneDescendienteEnSet(h.id, visibleIds));
    }
    return hijos.sort((a, b) => a.codigo.localeCompare(b.codigo));
  }

  tieneHijosNodo(nodoId: string): boolean {
    return this.nodos().some(n => n.padreId === nodoId);
  }

  isNodoExpanded(nodoId: string): boolean {
    if (this.searchNodo().trim()) return true;
    return this.expandedNodosTree().has(nodoId);
  }

  toggleNodoExpand(nodoId: string): void {
    const set = new Set(this.expandedNodosTree());
    if (set.has(nodoId)) set.delete(nodoId);
    else set.add(nodoId);
    this.expandedNodosTree.set(set);
  }

  atributosDeNivel(nivelId: string | null | undefined): NivelAtributo[] {
    if (!nivelId) return [];
    return this.atributos()
      .filter(a => a.nivelId === nivelId && a.estado === 'ACTIVO')
      .sort((a, b) => a.orden - b.orden || a.createdAt.localeCompare(b.createdAt));
  }

  primerNivelId(): string | null {
    const sorted = [...this.niveles()].sort((a, b) => a.orden - b.orden);
    return sorted.length > 0 ? sorted[0].id : null;
  }

  siguienteNivelId(nivelId: string): string | null {
    const sorted = [...this.niveles()].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex(n => n.id === nivelId);
    if (idx >= 0 && idx < sorted.length - 1) return sorted[idx + 1].id;
    return null;
  }

  filteredAtributos = computed(() => {
    let list = this.atributos().slice().sort((a, b) => {
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
    this.loadPaises();
    this.loadProvincias();
    this.loadCiudades();
    this.events.onDataChanged(() => {
      this.loadNiveles();
      this.loadNodos();
      this.loadAtributos();
      this.loadPaises();
      this.loadProvincias();
      this.loadCiudades();
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

  loadPaises = (): void => {
    this.api.listPaises().subscribe({
      next: (data) => { this.paises.set(data); },
      error: () => { /* no crítico */ },
    });
  };

  loadProvincias = (): void => {
    this.api.listProvincias().subscribe({
      next: (data) => { this.provincias.set(data); },
      error: () => { /* no crítico */ },
    });
  };

  loadCiudades = (): void => {
    this.api.listCiudades().subscribe({
      next: (data) => { this.ciudades.set(data); },
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
      for (const [atributoId, valor] of Object.entries(n.atributosRaw)) {
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
    this.nodoFormSubmitted.set(false);
    this.showNodoDlg = true;
  }

  closeNodoDialog(): void { this.showNodoDlg = false; this.editNodoId = null; this.nivelFormId.set(''); this.nodoFormSubmitted.set(false); }

  onNodoNivelChange(): void {
    this.nivelFormId.set(this.nodoForm.nivelId || '');
    this.nodoForm.padreId = null;
    this.nodoForm.atributos = {};
  }

  async saveNodo(): Promise<void> {
    this.nodoFormSubmitted.set(true);
    if (!this.nodoForm.codigo || !this.nodoForm.nombre || !this.nodoForm.nivelId) {
      this.toast.error('Faltan datos', 'Código, nombre y nivel son obligatorios.');
      return;
    }
    const faltantes = this.atributosDelNivelEnEdicion().filter(a => a.obligatorio && !this.nodoForm.atributos?.[a.id]);
    if (faltantes.length > 0) {
      this.toast.error('Faltan datos', `Complete los atributos obligatorios: ${faltantes.map(a => a.nombre).join(', ')}.`);
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
      nivelId: '',
      codigo: '',
      nombre: '',
      tipo: 'texto',
      configFuente: '',
      obligatorio: false,
      orden: 0,
      estado: 'ACTIVO' as Estado,
    };
  }

  siguienteOrdenAtributo(nivelId: string): number {
    const base = this.atributos().filter(a => a.nivelId === nivelId);
    if (base.length === 0) return 0;
    return Math.max(...base.map(a => a.orden)) + 1;
  }

  onAtributoNivelChange(): void {
    if (!this.editAtributoId && this.atributoForm.nivelId) {
      this.atributoForm.orden = this.siguienteOrdenAtributo(this.atributoForm.nivelId);
    }
  }

  openAtributoDialog(a?: NivelAtributo): void {
    if (a) {
      this.atributoForm = {
        ...a,
        obligatorio: a.obligatorio ? 'true' : 'false',
        configFuente: a.config?.fuente || '',
      };
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
    const config = this.atributoForm.tipo === 'select' && this.atributoForm.configFuente
      ? { fuente: this.atributoForm.configFuente }
      : undefined;
    const body = {
      ...this.atributoForm,
      config,
      orden: Number(this.atributoForm.orden ?? 0),
      obligatorio: this.atributoForm.obligatorio === true || this.atributoForm.obligatorio === 'true',
    };
    delete (body as any).configFuente;
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
    const niveles = this.nivelesOrdenados();
    const headers = ['NIVEL', 'CODIGO', 'NOMBRE', 'PADRE', 'ESTADO'];
    const rows: any[] = [headers];

    const nodosActivos = this.nodos().filter(n => n.estado === 'ACTIVO');

    if (nodosActivos.length > 0) {
      // Mostrar todos los nodos activos ordenados por nivel (padres antes que hijos) y luego por código.
      const nodosOrdenados = [...nodosActivos].sort((a, b) => {
        const nivelA = this.nivelMap().get(a.nivelId)?.orden ?? 0;
        const nivelB = this.nivelMap().get(b.nivelId)?.orden ?? 0;
        if (nivelA !== nivelB) return nivelA - nivelB;
        return a.codigo.localeCompare(b.codigo);
      });
      for (const n of nodosOrdenados) {
        const nivel = this.nivelMap().get(n.nivelId);
        const padre = n.padreId ? this.nodoMap().get(n.padreId) : null;
        rows.push([nivel?.nombre ?? n.nivelId, n.codigo, n.nombre, padre?.codigo ?? '', n.estado]);
      }
    } else {
      // Si no hay nodos, generar un pequeño árbol de ejemplo con múltiples ramas.
      for (const nivel of niveles) {
        const nivelPadre = this.nivelesOrdenados().filter(n => n.orden < nivel.orden).sort((a, b) => b.orden - a.orden)[0];
        const padreEjemplo = nivelPadre ? this.nodos().find(n => n.nivelId === nivelPadre.id && n.estado === 'ACTIVO') : null;
        const padreCodigo = padreEjemplo?.codigo ?? '';
        if (nivel.orden === 1) {
          rows.push([nivel.nombre, `${nivel.codigo}-001`, `Nueva ${nivel.nombre}`, '', 'ACTIVO']);
        } else {
          // Ejemplo con dos hijos por nivel para mostrar la estructura de árbol.
          rows.push([nivel.nombre, `${nivel.codigo}-001`, `${nivel.nombre} 1`, padreCodigo || `${niveles[0].codigo}-001`, 'ACTIVO']);
          rows.push([nivel.nombre, `${nivel.codigo}-002`, `${nivel.nombre} 2`, padreCodigo || `${niveles[0].codigo}-001`, 'ACTIVO']);
        }
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'plantilla-nodos');
    XLSX.writeFile(wb, 'plantilla-nodos-segregacion.xlsx');
  }

  onBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.bulkFile = file;
    this.bulkFileName.set(file ? file.name : '');
    this.bulkErrors.set([]);
    this.bulkSuccess.set('');
  }

  private parseBulkCell(cell: string | number | undefined): string {
    if (cell === undefined || cell === null) return '';
    return String(cell).trim();
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
      const expected = ['NIVEL', 'CODIGO', 'NOMBRE', 'PADRE', 'ESTADO'];
      const missing = expected.filter(h => !headerRow.includes(h));
      if (missing.length > 0) {
        this.bulkErrors.set([{ row: 1, message: `Formato incorrecto. Faltan columnas: ${missing.join(', ')}.` }]);
        this.bulkLoading.set(false);
        return;
      }

      const idx = (h: string) => headerRow.indexOf(h);
      const rows: { row: number; nivel: string; codigo: string; nombre: string; padre: string; estado: string }[] = [];
      for (let i = 1; i < rawRows.length; i++) {
        const raw = rawRows[i];
        if (raw.every((v: any) => !v || String(v).trim() === '')) continue;
        rows.push({
          row: i + 1,
          nivel: this.parseBulkCell(raw[idx('NIVEL')]),
          codigo: this.parseBulkCell(raw[idx('CODIGO')]),
          nombre: this.parseBulkCell(raw[idx('NOMBRE')]),
          padre: this.parseBulkCell(raw[idx('PADRE')]),
          estado: this.parseBulkCell(raw[idx('ESTADO')]),
        });
      }

      if (!rows.length) {
        this.bulkErrors.set([{ row: 0, message: 'No se encontraron filas con datos válidos.' }]);
        this.bulkLoading.set(false);
        return;
      }

      this.api.bulkCreateNodos(rows).subscribe({
        next: (res) => {
          if (res.ok) {
            this.bulkSuccess.set(`Se procesaron ${res.processed} nodos: ${res.created} creados, ${res.updated} actualizados.`);
            this.bulkFile = null;
            this.bulkFileName.set('');
            this.events.emitDataChanged();
            this.loadNodos();
          } else {
            this.bulkErrors.set(res.errors || [{ row: 0, message: 'Error desconocido.' }]);
          }
          this.bulkLoading.set(false);
        },
        error: (e) => {
          console.error('bulkCreateNodos error', e);
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
