import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import {
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSecurityComponent, IconSearchComponent, IconDownloadComponent,
  IconUploadComponent,
} from '../../shared/components/icons';
import type { Aplicacion, Modulo, Programa, NodoSegregacion } from '../../shared/models/types';
import { validateBulkFileSize } from '../../shared/utils/file-validation';

type Estado = 'ACTIVO' | 'INACTIVO';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    DialogModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSecurityComponent, IconSearchComponent, IconDownloadComponent,
    IconUploadComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Seguridades</h1>
        <p>Administración jerárquica de Aplicaciones, Módulos y Programas.</p>
      </div>
    </div>

    <p-tabs [value]="activeTab">
      <p-tablist>
        <p-tab value="0" (click)="setTab(0)"><i class="pi pi-server mr-2"></i>Aplicaciones</p-tab>
        <p-tab value="1" (click)="setTab(1)"><i class="pi pi-list mr-2"></i>Módulos</p-tab>
        <p-tab value="2" (click)="setTab(2)"><i class="pi pi-th-large mr-2"></i>Programas</p-tab>
      </p-tablist>
      <p-tabpanels>
      <!-- ============ APLICACIONES ============ -->
      <p-tabpanel value="0">
        @if (loadingApp()) {
          <app-table-skeleton [rows]="5" [cols]="4" />
        } @else if (errorApp()) {
          <app-error-state [message]="errorApp()!" [onRetry]="loadAplicaciones" />
        } @else {
          <div class="row between mb-4">
            <div class="search">
              <app-icon-search [width]="15" [height]="15" />
              <input type="text" placeholder="Buscar por código, nombre o descripción..."
                [ngModel]="searchApp()" (ngModelChange)="searchApp.set($event)" />
            </div>
            <div class="row gap-2">
              <button class="btn btn-ghost" (click)="exportApps()">
                <app-icon-download [width]="14" [height]="14" /> Exportar
              </button>
              <button class="btn btn-primary" (click)="nuevaAplicacion()">
                <app-icon-plus [width]="14" [height]="14" /> Nueva Aplicación
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
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Nodos de Segregación</th>
                  <th>Estado</th>
                  <th style="text-align:center;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (a of paginatedApps(); track a.id) {
                  <tr>
                    <td class="mono">{{ a.codigo }}</td>
                    <td><div class="cell-strong">{{ a.nombre }}</div></td>
                    <td class="muted small">{{ a.descripcion || '—' }}</td>
                    <td>
                      <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        @for (nodoId of a.nodoIds || []; track nodoId) {
                          <span class="badge badge-blue" [title]="nodoMapSegregacion().get(nodoId)?.nombre || ''">
                            {{ nodoMapSegregacion().get(nodoId)?.codigo || nodoId }}
                          </span>
                        } @empty {
                          <span class="muted small">—</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="badge" [class.badge-green]="a.estado === 'ACTIVO'" [class.badge-gray]="a.estado !== 'ACTIVO'">
                        {{ a.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      @if (esAppSistema(a)) {
                        <span class="badge badge-blue" title="Aplicación del sistema: no admite edición ni eliminación">Sistema</span>
                      } @else {
                        <div class="cell-actions">
                          <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="editarAplicacion(a)">
                            <app-icon-edit [width]="15" [height]="15" />
                          </button>
                          <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeleteApp(a)">
                            <app-icon-trash [width]="15" [height]="15" />
                          </button>
                        </div>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin aplicaciones registradas.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (filteredApps().length > 0) {
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pageApp() === 0" (click)="setPage('app', pageApp() - 1)">Anterior</button>
              </div>
              <span>Página {{ pageApp() + 1 }} de {{ totalPagesApp() }} ({{ filteredApps().length }} registros)</span>
              <div class="page-size-selector">
                <label class="small muted">Registros por página</label>
                <select class="select" style="width: auto; min-width: 60px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="15">15</option>
                  <option [value]="20">20</option>
                </select>
                <button class="btn btn-ghost btn-sm" [disabled]="pageApp() === totalPagesApp() - 1" (click)="setPage('app', pageApp() + 1)">Siguiente</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>

      <!-- ============ MODULOS ============ -->
      <p-tabpanel value="1">
        @if (loadingMod()) {
          <app-table-skeleton [rows]="5" [cols]="5" />
        } @else if (errorMod()) {
          <app-error-state [message]="errorMod()!" [onRetry]="loadModulos" />
        } @else {
          <div class="row between mb-4">
            <div class="search">
              <app-icon-search [width]="15" [height]="15" />
              <input type="text" placeholder="Buscar por código, nombre o aplicación..."
                [ngModel]="searchMod()" (ngModelChange)="searchMod.set($event)" />
            </div>
            <div class="row gap-2">
              <button class="btn btn-ghost" (click)="exportMods()">
                <app-icon-download [width]="14" [height]="14" /> Exportar
              </button>
              <button class="btn btn-primary" (click)="nuevoModulo()">
                <app-icon-plus [width]="14" [height]="14" /> Nuevo Módulo
              </button>
            </div>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Aplicación</th>
                  <th>Estado</th>
                  <th style="text-align:center;">Acciones</th>
                </tr>
              </thead>
              <tbody>
@for (m of paginatedMods(); track m.id) {
                  <tr>
                    <td class="mono">{{ m.codigo }}</td>
                    <td><div class="cell-strong">{{ m.nombre }}</div><div class="tiny dim">{{ m.descripcion }}</div></td>
                    <td><span class="badge badge-blue">{{ m.appCodigo }}</span></td>
                    <td>
                      <span class="badge" [class.badge-green]="m.estado === 'ACTIVO'" [class.badge-gray]="m.estado !== 'ACTIVO'">
                        {{ m.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      @if (esModuloSistema(m)) {
                        <span class="badge badge-blue" title="Módulo del sistema: no admite edición ni eliminación">Sistema</span>
                      } @else {
                        <div class="cell-actions">
                          <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="editarModulo(m)">
                            <app-icon-edit [width]="15" [height]="15" />
                          </button>
                          <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeleteMod(m)">
                            <app-icon-trash [width]="15" [height]="15" />
                          </button>
                        </div>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin módulos registrados.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (filteredMods().length > 0) {
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pageMod() === 0" (click)="setPage('mod', pageMod() - 1)">Anterior</button>
              </div>
              <span>Página {{ pageMod() + 1 }} de {{ totalPagesMod() }} ({{ filteredMods().length }} registros)</span>
              <div class="page-size-selector">
                <label class="small muted">Registros por página</label>
                <select class="select" style="width: auto; min-width: 60px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="15">15</option>
                  <option [value]="20">20</option>
                </select>
                <button class="btn btn-ghost btn-sm" [disabled]="pageMod() === totalPagesMod() - 1" (click)="setPage('mod', pageMod() + 1)">Siguiente</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>

      <!-- ============ PROGRAMAS ============ -->
      <p-tabpanel value="2">
        @if (loadingPrg()) {
          <app-table-skeleton [rows]="5" [cols]="5" />
        } @else if (errorPrg()) {
          <app-error-state [message]="errorPrg()!" [onRetry]="loadProgramas" />
        } @else {
          <div class="row between mb-4">
            <div class="search">
              <app-icon-search [width]="15" [height]="15" />
              <input type="text" placeholder="Buscar por código, nombre o módulo..."
                [ngModel]="searchPrg()" (ngModelChange)="searchPrg.set($event)" />
            </div>
            <div class="row gap-2">
              <button class="btn btn-ghost" (click)="exportPrgs()">
                <app-icon-download [width]="14" [height]="14" /> Exportar
              </button>
              <button class="btn btn-primary" (click)="nuevoPrograma()">
                <app-icon-plus [width]="14" [height]="14" /> Nuevo Programa
              </button>
            </div>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Módulo</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th style="text-align:center;">Acciones</th>
                </tr>
              </thead>
              <tbody>
@for (p of paginatedPrgs(); track p.id) {
                  <tr>
                    <td class="mono">{{ p.codigo }}</td>
                    <td><div class="cell-strong">{{ p.nombre }}</div><div class="tiny dim">{{ p.descripcion }}</div></td>
                    <td><span class="badge badge-blue">{{ p.modCodigo }}</span></td>
                    <td><span class="badge badge-blue">{{ p.tipo }}</span></td>
                    <td>
                      <span class="badge" [class.badge-green]="p.estado === 'ACTIVO'" [class.badge-gray]="p.estado !== 'ACTIVO'">
                        {{ p.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      @if (esProgramaSistema(p)) {
                        <span class="badge badge-blue" title="Programa de la aplicación del sistema: no admite edición ni eliminación">Sistema</span>
                      } @else {
                        <div class="cell-actions">
                          <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="editarPrograma(p)">
                            <app-icon-edit [width]="15" [height]="15" />
                          </button>
                          <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeletePrg(p)">
                            <app-icon-trash [width]="15" [height]="15" />
                          </button>
                        </div>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin programas registrados.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (filteredPrgs().length > 0) {
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pagePrg() === 0" (click)="setPage('prg', pagePrg() - 1)">Anterior</button>
              </div>
              <span>Página {{ pagePrg() + 1 }} de {{ totalPagesPrg() }} ({{ filteredPrgs().length }} registros)</span>
              <div class="page-size-selector">
                <label class="small muted">Registros por página</label>
                <select class="select" style="width: auto; min-width: 60px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="15">15</option>
                  <option [value]="20">20</option>
                </select>
                <button class="btn btn-ghost btn-sm" [disabled]="pagePrg() === totalPagesPrg() - 1" (click)="setPage('prg', pagePrg() + 1)">Siguiente</button>
              </div>
            </div>
          }
        }
</p-tabpanel>

    <!-- ============ DIÁLOGO CARGA MASIVA APLICACIONES/MÓDULOS/PROGRAMAS ============ -->
    <p-dialog
      [(visible)]="showBulkDlg"
      header="Carga masiva de aplicaciones"
      [modal]="true" [style]="{ width: '620px' }" [closable]="true"
      (onHide)="closeBulkDialog()"
    >
      <p class="mb-3 muted small">
        El archivo debe tener las columnas: <b>TIPO</b>, <b>CODIGO</b>, <b>NOMBRE</b>, <b>DESCRIPCION</b>, <b>APP_CODIGO</b>, <b>MOD_CODIGO</b>, <b>PRG_TIPO</b> y <b>ESTADO</b>.
        TIPOS válidos: <b>APLICACION</b>, <b>MODULO</b>, <b>PROGRAMA</b>.
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
        <div class="alert alert-error">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <span><b>Errores detectados:</b> {{ bulkErrorsSummary() }}</span>
            <button class="btn btn-ghost btn-sm" (click)="downloadBulkErrors()" style="color:var(--red-700);font-weight:600;">
              <app-icon-download [width]="14" [height]="14" /> Descargar detalle
            </button>
          </div>
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

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    ::ng-deep .p-confirmdialog-icon {
      font-size: 2.25rem !important;
      color: #ef4444 !important;
      margin-right: 1rem !important;
    }
  `],
})
export class SecurityComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);
  private confirmationService = inject(ConfirmationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // --- Tab activo ---
  activeTab = '0';

  setTab(tab: number): void {
    this.activeTab = String(tab);
  }

  // --- Signals de datos ---
  aplicaciones = signal<Aplicacion[]>([]);
  modulos = signal<Modulo[]>([]);
  programas = signal<Programa[]>([]);
  nodosSegregacion = signal<NodoSegregacion[]>([]);

  loadingApp = signal(true);
  loadingMod = signal(true);
  loadingPrg = signal(true);
  errorApp = signal<string | null>(null);
  errorMod = signal<string | null>(null);
  errorPrg = signal<string | null>(null);

  // --- Diálogo carga masiva ---
  showBulkDlg = false;
  bulkFile: File | null = null;
  bulkFileName = signal('');
  bulkErrors = signal<{ row: number; message: string }[]>([]);
  bulkErrorsSummary = signal('');
  bulkSuccess = signal('');
  bulkLoading = signal(false);

  // --- Filtros de búsqueda ---
  searchApp = signal('');
  searchMod = signal('');
  searchPrg = signal('');

  // --- Paginación ---
  pageSize = signal(5);
  pageApp = signal(0);
  pageMod = signal(0);
  pagePrg = signal(0);

  filteredApps = computed(() => {
    const q = this.searchApp().toLowerCase().trim();
    if (!q) return this.aplicaciones();
    return this.aplicaciones().filter(a =>
      a.codigo.toLowerCase().includes(q) ||
      a.nombre.toLowerCase().includes(q) ||
      (a.descripcion || '').toLowerCase().includes(q)
    );
  });
  filteredMods = computed(() => {
    const q = this.searchMod().toLowerCase().trim();
    if (!q) return this.modulos();
    return this.modulos().filter(m =>
      m.codigo.toLowerCase().includes(q) ||
      m.nombre.toLowerCase().includes(q) ||
      m.appCodigo.toLowerCase().includes(q) ||
      (m.descripcion || '').toLowerCase().includes(q)
    );
  });
  filteredPrgs = computed(() => {
    const q = this.searchPrg().toLowerCase().trim();
    if (!q) return this.programas();
    return this.programas().filter(p =>
      p.codigo.toLowerCase().includes(q) ||
      p.nombre.toLowerCase().includes(q) ||
      p.modCodigo.toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q)
    );
  });

  paginatedApps = computed(() => {
    const start = this.pageApp() * this.pageSize();
    return this.filteredApps().slice(start, start + this.pageSize());
  });
  totalPagesApp = computed(() => Math.max(1, Math.ceil(this.filteredApps().length / this.pageSize())));

  paginatedMods = computed(() => {
    const start = this.pageMod() * this.pageSize();
    return this.filteredMods().slice(start, start + this.pageSize());
  });
  totalPagesMod = computed(() => Math.max(1, Math.ceil(this.filteredMods().length / this.pageSize())));

  paginatedPrgs = computed(() => {
    const start = this.pagePrg() * this.pageSize();
    return this.filteredPrgs().slice(start, start + this.pageSize());
  });
  totalPagesPrg = computed(() => Math.max(1, Math.ceil(this.filteredPrgs().length / this.pageSize())));

  nodoMapSegregacion = computed(() => new Map(this.nodosSegregacion().map(n => [n.id, n])));

  setPage(entity: 'app' | 'mod' | 'prg', page: number): void {
    const total = entity === 'app' ? this.totalPagesApp() : entity === 'mod' ? this.totalPagesMod() : this.totalPagesPrg();
    const current = entity === 'app' ? this.pageApp() : entity === 'mod' ? this.pageMod() : this.pagePrg();
    if (page < 0 || page >= total) return;
    if (entity === 'app') this.pageApp.set(page);
    else if (entity === 'mod') this.pageMod.set(page);
    else this.pagePrg.set(page);
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.pageApp.set(0);
    this.pageMod.set(0);
    this.pagePrg.set(0);
  }

  private exportXlsx(data: any[], headers: string[], cols: string[], filename: string): void {
    const aoa = [headers, ...data.map(row => cols.map(c => row[c] ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = cols.map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  exportApps(): void {
    const data = this.filteredApps().map(a => ({
      ...a,
      nodoCodigos: (a.nodoIds || []).map(id => this.nodoMapSegregacion().get(id)?.codigo || id).join(', '),
    }));
    this.exportXlsx(
      data,
      ['Código', 'Nombre', 'Descripción', 'Nodos', 'Estado'],
      ['codigo', 'nombre', 'descripcion', 'nodoCodigos', 'estado'],
      'aplicaciones'
    );
  }

  exportMods(): void {
    this.exportXlsx(
      this.filteredMods(),
      ['Código', 'Nombre', 'Aplicación', 'Descripción', 'Estado'],
      ['codigo', 'nombre', 'appCodigo', 'descripcion', 'estado'],
      'modulos'
    );
  }

  exportPrgs(): void {
    this.exportXlsx(
      this.filteredPrgs(),
      ['Código', 'Nombre', 'Módulo', 'Tipo', 'Descripción', 'Estado'],
      ['codigo', 'nombre', 'modCodigo', 'tipo', 'descripcion', 'estado'],
      'programas'
    );
  }

  // --- Refs para retry ---
  loadAplicaciones = () => this._loadApp();
  loadModulos = () => this._loadMod();
  loadProgramas = () => this._loadPrg();

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab');
      if (tab === '0' || tab === '1' || tab === '2') {
        this.activeTab = tab;
      }
    });
    this._loadApp();
    this._loadMod();
    this._loadPrg();
    this._loadSegregacion();
    this.events.onDataChanged(() => {
      this._loadApp(); this._loadMod(); this._loadPrg(); this._loadSegregacion();
    });
    effect(() => { this.searchApp(); this.pageApp.set(0); }, { allowSignalWrites: true });
    effect(() => { this.searchMod(); this.pageMod.set(0); }, { allowSignalWrites: true });
    effect(() => { this.searchPrg(); this.pagePrg.set(0); }, { allowSignalWrites: true });
    effect(() => { this.pageSize(); this.pageApp.set(0); this.pageMod.set(0); this.pagePrg.set(0); }, { allowSignalWrites: true });
  }

  // ============ LOADERS ============
  private _loadApp(): void {
    this.loadingApp.set(true); this.errorApp.set(null);
    this.api.listAplicaciones().subscribe({
      next: (d) => this.aplicaciones.set(d),
      error: (e) => this.errorApp.set(e?.error?.error || e?.message || 'Error al cargar aplicaciones.'),
      complete: () => this.loadingApp.set(false),
    });
  }
  private _loadMod(): void {
    this.loadingMod.set(true); this.errorMod.set(null);
    this.api.listModulos().subscribe({
      next: (d) => this.modulos.set(d),
      error: (e) => this.errorMod.set(e?.error?.error || e?.message || 'Error al cargar módulos.'),
      complete: () => this.loadingMod.set(false),
    });
  }
  private _loadPrg(): void {
    this.loadingPrg.set(true); this.errorPrg.set(null);
    this.api.listProgramas().subscribe({
      next: (d) => this.programas.set(d),
      error: (e) => this.errorPrg.set(e?.error?.error || e?.message || 'Error al cargar programas.'),
      complete: () => this.loadingPrg.set(false),
    });
  }
  private _loadSegregacion(): void {
    this.api.listNodosSegregacion().subscribe({
      next: (d) => this.nodosSegregacion.set(d),
      error: () => {},
    });
  }

  // ============ APLICACIÓN CRUD ============
  readonly APP_SISTEMA_CODIGO = 'APP-AUTHORIZER';
  readonly MODULOS_SISTEMA_CODIGOS = ['MOD-SEG', 'MOD-PERF', 'MOD-NIVSEG', 'MOD-USR'];

  esAppSistema(a: Aplicacion): boolean {
    return a.codigo === this.APP_SISTEMA_CODIGO;
  }

  esModuloSistema(m: Modulo): boolean {
    return this.MODULOS_SISTEMA_CODIGOS.includes(m.codigo);
  }

  esProgramaSistema(p: Programa): boolean {
    const mod = this.modulos().find(m => m.codigo === p.modCodigo);
    return !!mod && mod.appCodigo === this.APP_SISTEMA_CODIGO;
  }

// --- Navegación a pantallas de captura ---
  nuevaAplicacion(): void {
    this.router.navigate(['/seguridades/aplicaciones/nuevo'], { queryParams: { tab: '0' } });
  }

  editarAplicacion(a: Aplicacion): void {
    this.router.navigate([`/seguridades/aplicaciones/${a.id}/editar`], { queryParams: { tab: '0' } });
  }

  nuevoModulo(): void {
    this.router.navigate(['/seguridades/modulos/nuevo'], { queryParams: { tab: '1' } });
  }

  editarModulo(m: Modulo): void {
    this.router.navigate([`/seguridades/modulos/${m.id}/editar`], { queryParams: { tab: '1' } });
  }

  nuevoPrograma(): void {
    this.router.navigate(['/seguridades/programas/nuevo'], { queryParams: { tab: '2' } });
  }

  editarPrograma(p: Programa): void {
    this.router.navigate([`/seguridades/programas/${p.id}/editar`], { queryParams: { tab: '2' } });
  }

  private confirmAction(message: string, accept: () => void): void {
    this.confirmationService.confirm({
      message,
      header: 'Confirmación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      defaultFocus: 'none',
      accept: () => accept(),
    });
  }

confirmDeleteApp(a: Aplicacion): void {
    this.confirmAction(`Se va a proceder con la eliminación de la aplicación "${a.nombre}", ¿desea continuar?`, () => {
      this.api.deleteAplicacion(a.id).subscribe({
        next: () => { this.toast.success('Aplicación eliminada'); this.events.emitDataChanged(); this._loadApp(); this._loadMod(); this._loadPrg(); },
        error: (e) => { const msg = e?.error?.error || e?.message || 'Error inesperado.'; this.toast.error('Error', msg); },
      });
    });
  }

// ============ MÓDULO CRUD ============
  confirmDeleteMod(m: Modulo): void {
    this.confirmAction(`Se va a proceder con la eliminación del módulo "${m.nombre}", ¿desea continuar?`, () => {
      this.api.deleteModulo(m.id).subscribe({
        next: () => { this.toast.success('Módulo eliminado'); this.events.emitDataChanged(); this._loadMod(); this._loadPrg(); },
        error: (e) => { const msg = e?.error?.error || e?.message || 'Error inesperado.'; this.toast.error('Error', msg); },
      });
    });
  }

  // ============ PROGRAMA CRUD ============
  confirmDeletePrg(p: Programa): void {
    this.confirmAction(`Se va a proceder con la eliminación del programa "${p.nombre}", ¿desea continuar?`, () => {
      this.api.deletePrograma(p.id).subscribe({
        next: () => { this.toast.success('Programa eliminado'); this.events.emitDataChanged(); this._loadPrg(); },
        error: (e) => { const msg = e?.error?.error || e?.message || 'Error inesperado.'; this.toast.error('Error', msg); },
      });
    });
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
    this.bulkErrorsSummary.set('');
    this.bulkSuccess.set('');
    this.bulkLoading.set(false);
  }

  setBulkErrors(errors: { row: number; message: string }[]): void {
    this.bulkErrors.set(errors);
    const count = errors.length;
    this.bulkErrorsSummary.set(`Se detectaron ${count} error${count !== 1 ? 'es' : ''}`);
  }

  downloadBulkErrors(): void {
    if (this.bulkErrors().length === 0) return;
    const errors = this.bulkErrors();
    const lines = [
      'DETALLE DE ERRORES - CARGA MASIVA DE SEGURIDADES',
      '================================================',
      '',
      `Fecha: ${new Date().toLocaleString('es-EC')}`,
      `Total errores: ${errors.length}`,
      '',
      '----------------------------------------------------',
      'LISTADO DE ERRORES',
      '----------------------------------------------------',
      '',
      ...errors.map(e => `Fila ${e.row}: ${e.message}`),
      '',
      '----------------------------------------------------',
      'FIN DEL REPORTE',
      '----------------------------------------------------',
    ];
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errores_seguridades_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadBulkTemplate(): void {
    const headers = ['TIPO', 'CODIGO', 'NOMBRE', 'DESCRIPCION', 'APP_CODIGO', 'MOD_CODIGO', 'PRG_TIPO', 'ESTADO'];
    const rows: any[] = [headers];

    const apps = this.aplicaciones().filter(a => a.estado === 'ACTIVO');
    const mods = this.modulos().filter(m => m.estado === 'ACTIVO');
    const prgs = this.programas().filter(p => p.estado === 'ACTIVO');

    if (apps.length || mods.length || prgs.length) {
      for (const a of apps.sort((x, y) => x.codigo.localeCompare(y.codigo))) {
        rows.push(['APLICACION', a.codigo, a.nombre, a.descripcion, '', '', '', a.estado]);
      }
      for (const m of mods.sort((x, y) => x.codigo.localeCompare(y.codigo))) {
        const app = apps.find(a => a.codigo === m.appCodigo);
        rows.push(['MODULO', m.codigo, m.nombre, m.descripcion, app?.codigo ?? m.appCodigo, '', '', m.estado]);
      }
      for (const p of prgs.sort((x, y) => x.codigo.localeCompare(y.codigo))) {
        const mod = mods.find(m => m.codigo === p.modCodigo);
        const app = mod ? apps.find(a => a.codigo === mod.appCodigo) : null;
        rows.push(['PROGRAMA', p.codigo, p.nombre, p.descripcion, app?.codigo ?? '', mod?.codigo ?? p.modCodigo, p.tipo, p.estado]);
      }
    } else {
      rows.push(['APLICACION', 'APP-ERP', 'ERP Corporativo', 'Sistema ERP corporativo', '', '', '', 'ACTIVO']);
      rows.push(['MODULO', 'MOD-FI', 'Finanzas', 'Módulo financiero', 'APP-ERP', '', '', 'ACTIVO']);
      rows.push(['MODULO', 'MOD-MM', 'Materiales', 'Módulo de gestión de materiales', 'APP-ERP', '', '', 'ACTIVO']);
      rows.push(['PROGRAMA', 'PRG-FI-001', 'Documentos contables', 'Consulta de documentos', 'APP-ERP', 'MOD-FI', 'Transacción', 'ACTIVO']);
      rows.push(['PROGRAMA', 'PRG-FI-002', 'Reporte de balances', 'Reportes financieros', 'APP-ERP', 'MOD-FI', 'Reporte', 'ACTIVO']);
      rows.push(['PROGRAMA', 'PRG-MM-001', 'Stock de materiales', 'Consulta de stock', 'APP-ERP', 'MOD-MM', 'Consulta', 'ACTIVO']);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'plantilla-aplicaciones');
    XLSX.writeFile(wb, 'plantilla-aplicaciones-modulos-programas.xlsx');
  }

  onBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    const validation = validateBulkFileSize(file);
    if (!validation.valid) {
      this.toast.error('Archivo demasiado grande', validation.message || 'El archivo excede el tamaño permitido.');
      this.registerBulkFormatError([{ row: 0, message: validation.message || 'El archivo excede el tamaño permitido.' }]);
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

  private registerBulkFormatError(errors: { row: number; message: string }[]): void {
    this.api.registerBulkUploadError('APLICACIONES', errors).subscribe({ error: () => {} });
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
        const message = 'El archivo no contiene filas de datos.';
        this.setBulkErrors([{ row: 0, message }]);
        this.registerBulkFormatError([{ row: 0, message }]);
        this.bulkLoading.set(false);
        return;
      }

      const headerRow = rawRows[0].map((h: any) => String(h).trim().toUpperCase());
      const expected = ['TIPO', 'CODIGO', 'NOMBRE', 'DESCRIPCION', 'APP_CODIGO', 'MOD_CODIGO', 'PRG_TIPO', 'ESTADO'];
      const missing = expected.filter(h => !headerRow.includes(h));
      if (missing.length > 0) {
        const message = `Formato incorrecto. Faltan columnas: ${missing.join(', ')}.`;
        this.setBulkErrors([{ row: 1, message }]);
        this.registerBulkFormatError([{ row: 1, message }]);
        this.bulkLoading.set(false);
        return;
      }

      const idx = (h: string) => headerRow.indexOf(h);
      const rows: { row: number; tipo: string; codigo: string; nombre: string; descripcion: string; appCodigo: string; modCodigo: string; prgTipo: string; estado: string }[] = [];
      for (let i = 1; i < rawRows.length; i++) {
        const raw = rawRows[i];
        if (raw.every((v: any) => !v || String(v).trim() === '')) continue;
        rows.push({
          row: i + 1,
          tipo: this.parseBulkCell(raw[idx('TIPO')]),
          codigo: this.parseBulkCell(raw[idx('CODIGO')]),
          nombre: this.parseBulkCell(raw[idx('NOMBRE')]),
          descripcion: this.parseBulkCell(raw[idx('DESCRIPCION')]),
          appCodigo: this.parseBulkCell(raw[idx('APP_CODIGO')]),
          modCodigo: this.parseBulkCell(raw[idx('MOD_CODIGO')]),
          prgTipo: this.parseBulkCell(raw[idx('PRG_TIPO')]),
          estado: this.parseBulkCell(raw[idx('ESTADO')]),
        });
      }

      if (!rows.length) {
        const message = 'No se encontraron filas con datos válidos.';
        this.setBulkErrors([{ row: 0, message }]);
        this.registerBulkFormatError([{ row: 0, message }]);
        this.bulkLoading.set(false);
        return;
      }

      this.api.bulkCreateAplicaciones(rows).subscribe({
        next: (res) => {
          if (res.ok) {
            this.bulkSuccess.set(`Se procesaron ${res.processed} registros: ${res.created.apps} apps, ${res.created.mods} módulos, ${res.created.prgs} programas creados; ${res.updated.apps} apps, ${res.updated.mods} módulos, ${res.updated.prgs} programas actualizados.`);
            this.bulkFile = null;
            this.bulkFileName.set('');
            this.events.emitDataChanged();
          } else {
            this.setBulkErrors(res.errors || [{ row: 0, message: 'Error desconocido.' }]);
          }
          this.bulkLoading.set(false);
        },
        error: (e) => {
          console.error('bulkCreateAplicaciones error', e);
          let message = 'Error al procesar el archivo.';
          if (e instanceof HttpErrorResponse) {
            if (e.status === 0) {
              message = 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
            } else if (e.status >= 500) {
              message = `Error interno del servidor (${e.status}). Revise la consola del backend.`;
            } else if (e.error?.error) {
              message = e.error.error;
            } else if (Array.isArray(e.error?.errors)) {
              this.setBulkErrors(e.error.errors);
              this.bulkLoading.set(false);
              return;
            } else if (e.message) {
              message = e.message;
            }
          } else if (e?.error?.errors) {
            this.setBulkErrors(e.error.errors);
            this.bulkLoading.set(false);
            return;
          } else if (e?.error?.error) {
            message = e.error.error;
          }
          this.setBulkErrors([{ row: 0, message }]);
          this.bulkLoading.set(false);
        },
      });
    } catch (e: any) {
      const message = 'No se pudo leer el archivo Excel. Verifique el formato.';
      this.setBulkErrors([{ row: 0, message }]);
      this.registerBulkFormatError([{ row: 0, message }]);
      this.bulkLoading.set(false);
    }
  }
}
