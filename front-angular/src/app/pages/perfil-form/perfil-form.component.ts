import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import {
  IconPlusComponent, IconTrashComponent, IconSearchComponent,
} from '../../shared/components/icons';
import type { Aplicacion, Modulo, Programa, Perfil, Control } from '../../shared/models/types';

type Estado = 'ACTIVO' | 'INACTIVO';

interface PerfilProgramaRow {
  appCodigo: string;
  modCodigo: string;
  prgCodigo: string;
  nuevo: boolean;
  modificar: boolean;
  anular: boolean;
  procesar: boolean;
  imprimir: boolean;
  consultar: boolean;
}

@Component({
  selector: 'app-perfil-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconSearchComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ editPerfilId ? 'Editar Perfil' : 'Nuevo Perfil' }}</h1>
        <p>Configure los datos del perfil y asigne los programas con sus permisos.</p>
      </div>
      <button class="btn btn-ghost btn-sm" (click)="cancel()">
        <i class="pi pi-arrow-left mr-1"></i> Volver a Perfiles
      </button>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="5" [cols]="1" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="loadData" />
    } @else {
      <div class="card perfil-form-card">
        <div class="form-grid three-cols">
          <div class="field">
            <label>Código <span class="required">*</span></label>
            <input class="input" [class.invalid]="perfTouched && !perfForm.codigo" [(ngModel)]="perfForm.codigo" placeholder="PERF-FI-VIS" />
          </div>
          <div class="field">
            <label>Nombre <span class="required">*</span></label>
            <input class="input" [class.invalid]="perfTouched && !perfForm.nombre" [(ngModel)]="perfForm.nombre" placeholder="FI Visualizador" />
          </div>
          <div class="field">
            <label>Estado</label>
            <select class="select" [(ngModel)]="perfForm.estado">
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label>Descripción</label>
          <textarea class="input" [(ngModel)]="perfForm.descripcion" rows="3" maxlength="250"></textarea>
          <div class="muted small" style="margin-top:2px;">{{ (perfForm.descripcion || '').length }}/250 caracteres máximos.</div>
        </div>

        <hr class="form-divider" />

        <div class="programas-section">
          <div class="section-head">
            <div class="section-title">Programas del Perfil</div>
            <button class="btn btn-ghost btn-sm" (click)="addPerfPrograma()">
              <app-icon-plus [width]="14" [height]="14" /> Agregar Programa
            </button>
          </div>

          @for (pp of perfProgramas; track $index) {
            <div class="programa-block">
              <div class="programa-pickers">
                <div class="field">
                  <label class="small muted">Aplicación</label>
                  <div class="search-field">
                    <input class="select control-tipo" type="text" [ngModel]="perfAppSearchTexts()[$index]" readonly placeholder="Seleccionar..." style="width:100%;" />
                    <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openPerfAppSearchDialog($index)" title="Buscar aplicación">
                      <app-icon-search [width]="14" [height]="14" />
                    </button>
                  </div>
                </div>
                <div class="field">
                  <label class="small muted">Módulo</label>
                  <div class="search-field">
                    <input class="select control-tipo" type="text" [ngModel]="perfModSearchTexts()[$index]" readonly placeholder="Seleccionar..." style="width:100%;" [disabled]="!pp.appCodigo" />
                    <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openPerfModSearchDialog($index)" [disabled]="!pp.appCodigo" title="Buscar módulo">
                      <app-icon-search [width]="14" [height]="14" />
                    </button>
                  </div>
                </div>
                <div class="field">
                  <label class="small muted">Programa</label>
                  <div class="search-field">
                    <input class="select control-tipo" type="text" [ngModel]="perfPrgSearchTexts()[$index]" readonly placeholder="Seleccionar..." style="width:100%;" [disabled]="!pp.modCodigo" />
                    <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openPerfPrgSearchDialog($index)" [disabled]="!pp.modCodigo" title="Buscar programa">
                      <app-icon-search [width]="14" [height]="14" />
                    </button>
                  </div>
                </div>
                <button class="btn btn-danger btn-sm btn-icon" title="Quitar" (click)="removePerfPrograma($index)">
                  <app-icon-trash [width]="14" [height]="14" />
                </button>
              </div>

              <div class="table-wrap">
                <table class="data" style="width:100%;">
                  <thead>
                    <tr>
                      <th>Tipo Programa</th>
                      <th style="text-align:center;">Nuevo</th>
                      <th style="text-align:center;">Modificar</th>
                      <th style="text-align:center;">Eliminar</th>
                      <th style="text-align:center;">Imprimir</th>
                      <th style="text-align:center;">Consultar</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        @if (pp.prgCodigo) {
                          <span class="badge badge-amber">{{ getProgramaTipo(pp.prgCodigo) }}</span>
                        } @else {
                          <span class="muted small">—</span>
                        }
                      </td>
                      <td style="text-align:center;"><input type="checkbox" [(ngModel)]="pp.nuevo" style="width:16px;height:16px;cursor:pointer;" /></td>
                      <td style="text-align:center;"><input type="checkbox" [(ngModel)]="pp.modificar" style="width:16px;height:16px;cursor:pointer;" /></td>
                      <td style="text-align:center;"><input type="checkbox" [(ngModel)]="pp.anular" style="width:16px;height:16px;cursor:pointer;" /></td>
                      <td style="text-align:center;"><input type="checkbox" [(ngModel)]="pp.imprimir" style="width:16px;height:16px;cursor:pointer;" /></td>
                      <td style="text-align:center;"><input type="checkbox" [(ngModel)]="pp.consultar" style="width:16px;height:16px;cursor:pointer;" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          } @empty {
            <p class="muted small" style="margin:16px 0;">No hay programas agregados. Haga clic en "Agregar Programa".</p>
          }
        </div>

        <div class="form-actions">
          <button class="btn btn-ghost" (click)="cancel()">Cancelar</button>
          <button class="btn btn-primary" (click)="savePerf()">{{ editPerfilId ? 'Guardar' : 'Crear' }}</button>
        </div>
      </div>
    }

    <!-- ============ DIÁLOGO BÚSQUEDA APLICACIÓN PARA PERFIL ============ -->
    <p-dialog
      [(visible)]="showPerfAppSearchDlg"
      header="Buscar aplicación"
      [modal]="true" [style]="{ width: '1000px' }" [closable]="true"
      (onHide)="closePerfAppSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" placeholder="Código de aplicación"
            [ngModel]="perfAppSearchCodigo()" (ngModelChange)="perfAppSearchCodigo.set($event); perfAppSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" placeholder="Nombre de aplicación"
            [ngModel]="perfAppSearchNombre()" (ngModelChange)="perfAppSearchNombre.set($event); perfAppSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Estado</label>
          <select class="select"
            [ngModel]="perfAppSearchEstado()" (ngModelChange)="perfAppSearchEstado.set($event); perfAppSearchPage.set(1)">
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-ghost" (click)="clearPerfAppFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap dialog-table-fixed">
        <table class="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (a of paginatedAppsForPerfSearch(); track a.id) {
              <tr>
                <td class="mono">{{ a.codigo }}</td>
                <td><div class="cell-strong">{{ a.nombre }}</div></td>
                <td>{{ a.descripcion }}</td>
                <td>
                  <span class="badge" [class.badge-green]="a.estado === 'ACTIVO'" [class.badge-gray]="a.estado !== 'ACTIVO'">
                    {{ a.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectPerfAppFromDialog(a)" [disabled]="a.estado !== 'ACTIVO'">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <div class="page-controls">
          <button class="btn btn-ghost btn-sm" [disabled]="perfAppSearchPage() === 1" (click)="changePerfAppSearchPage(-1)">Anterior</button>
        </div>
        <span>Página {{ perfAppSearchPage() }} de {{ perfAppSearchTotalPages() }} ({{ filteredAppsForPerfSearch().length }} registros)</span>
        <div class="page-size-selector">
          <label class="small muted">Registros por página</label>
          <select class="select" style="width: auto; min-width: 60px;" [ngModel]="perfAppSearchPageSize()" (ngModelChange)="changePerfAppSearchPageSize($event)">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="15">15</option>
            <option [value]="20">20</option>
          </select>
          <button class="btn btn-ghost btn-sm" [disabled]="perfAppSearchPage() === perfAppSearchTotalPages()" (click)="changePerfAppSearchPage(1)">Siguiente</button>
        </div>
      </div>
    </p-dialog>

    <!-- ============ DIÁLOGO BÚSQUEDA MÓDULO PARA PERFIL ============ -->
    <p-dialog
      [(visible)]="showPerfModSearchDlg"
      header="Buscar módulo"
      [modal]="true" [style]="{ width: '1000px' }" [closable]="true"
      (onHide)="closePerfModSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" placeholder="Código de módulo"
            [ngModel]="perfModSearchCodigo()" (ngModelChange)="perfModSearchCodigo.set($event); perfModSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" placeholder="Nombre de módulo"
            [ngModel]="perfModSearchNombre()" (ngModelChange)="perfModSearchNombre.set($event); perfModSearchPage.set(1)" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-ghost" (click)="clearPerfModFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap dialog-table-fixed">
        <table class="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Aplicación</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (m of paginatedModsForPerfSearch(); track m.id) {
              <tr>
                <td class="mono">{{ m.codigo }}</td>
                <td><div class="cell-strong">{{ m.nombre }}</div></td>
                <td><span class="badge badge-blue">{{ m.appCodigo }}</span></td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectPerfModFromDialog(m)" [disabled]="m.estado !== 'ACTIVO'">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <div class="page-controls">
          <button class="btn btn-ghost btn-sm" [disabled]="perfModSearchPage() === 1" (click)="changePerfModSearchPage(-1)">Anterior</button>
        </div>
        <span>Página {{ perfModSearchPage() }} de {{ perfModSearchTotalPages() }} ({{ filteredModsForPerfSearch().length }} registros)</span>
        <div class="page-size-selector">
          <label class="small muted">Registros por página</label>
          <select class="select" style="width: auto; min-width: 60px;" [ngModel]="perfModSearchPageSize()" (ngModelChange)="changePerfModSearchPageSize($event)">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="15">15</option>
            <option [value]="20">20</option>
          </select>
          <button class="btn btn-ghost btn-sm" [disabled]="perfModSearchPage() === perfModSearchTotalPages()" (click)="changePerfModSearchPage(1)">Siguiente</button>
        </div>
      </div>
    </p-dialog>

    <!-- ============ DIÁLOGO BÚSQUEDA PROGRAMA PARA PERFIL ============ -->
    <p-dialog
      [(visible)]="showPerfPrgSearchDlg"
      header="Buscar programa"
      [modal]="true" [style]="{ width: '1000px' }" [closable]="true"
      (onHide)="closePerfPrgSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" placeholder="Código de programa"
            [ngModel]="perfPrgSearchCodigo()" (ngModelChange)="perfPrgSearchCodigo.set($event); perfPrgSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" placeholder="Nombre de programa"
            [ngModel]="perfPrgSearchNombre()" (ngModelChange)="perfPrgSearchNombre.set($event); perfPrgSearchPage.set(1)" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-ghost" (click)="clearPerfPrgFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap dialog-table-fixed">
        <table class="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (p of paginatedPrgsForPerfSearch(); track p.id) {
              <tr>
                <td class="mono">{{ p.codigo }}</td>
                <td><div class="cell-strong">{{ p.nombre }}</div></td>
                <td><span class="badge badge-amber">{{ p.tipo }}</span></td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectPerfPrgFromDialog(p)" [disabled]="p.estado !== 'ACTIVO'">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <div class="page-controls">
          <button class="btn btn-ghost btn-sm" [disabled]="perfPrgSearchPage() === 1" (click)="changePerfPrgSearchPage(-1)">Anterior</button>
        </div>
        <span>Página {{ perfPrgSearchPage() }} de {{ perfPrgSearchTotalPages() }} ({{ filteredPrgsForPerfSearch().length }} registros)</span>
        <div class="page-size-selector">
          <label class="small muted">Registros por página</label>
          <select class="select" style="width: auto; min-width: 60px;" [ngModel]="perfPrgSearchPageSize()" (ngModelChange)="changePerfPrgSearchPageSize($event)">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="15">15</option>
            <option [value]="20">20</option>
          </select>
          <button class="btn btn-ghost btn-sm" [disabled]="perfPrgSearchPage() === perfPrgSearchTotalPages()" (click)="changePerfPrgSearchPage(1)">Siguiente</button>
        </div>
      </div>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .perfil-form-card {
      max-width: 1200px;
      padding: 32px;
    }
    .form-grid {
      display: grid;
      gap: 24px;
    }
    .form-grid.two-cols {
      grid-template-columns: repeat(2, 1fr);
    }
    .form-grid.three-cols {
      grid-template-columns: repeat(3, 1fr);
    }
    @media (max-width: 768px) {
      .form-grid.two-cols {
        grid-template-columns: 1fr;
      }
      .form-grid.three-cols {
        grid-template-columns: 1fr;
      }
    }
    .form-divider {
      border: none;
      border-top: 1px solid var(--border);
      margin: 20px 0;
    }
    .programas-section {
      margin-top: 4px;
    }
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 0.9rem;
      font-weight: 700;
    }
    .programa-block {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
      background: var(--surface-2);
    }
    .programa-pickers {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr auto;
      gap: 14px;
      align-items: flex-end;
      margin-bottom: 14px;
    }
    @media (max-width: 900px) {
      .programa-pickers {
        grid-template-columns: 1fr;
      }
    }
    .required {
      color: var(--red-600, #c8102e);
      font-weight: bold;
    }
    .input.invalid {
      border-color: var(--red-600, #c8102e);
      background-color: var(--red-50, #fef2f2);
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .dialog-table-fixed {
      height: 310px;
      overflow-y: auto;
      overflow-x: auto;
    }
    ::ng-deep .p-confirmdialog-icon {
      font-size: 2.25rem !important;
      color: #ef4444 !important;
      margin-right: 1rem !important;
    }
  `],
})
export class PerfilFormComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private confirmationService = inject(ConfirmationService);

  // --- Data signals ---
  aplicaciones = signal<Aplicacion[]>([]);
  modulos = signal<Modulo[]>([]);
  programas = signal<Programa[]>([]);
  controlesMap = signal<Map<string, Control[]>>(new Map());

  loading = signal(true);
  error = signal<string | null>(null);

  // --- Form ---
  editPerfilId: string | null = null;
  perfTouched = false;
  perfForm: { codigo: string; nombre: string; descripcion: string; estado: Estado } = this.blankPerf();
  perfProgramas: PerfilProgramaRow[] = [];

  // --- Search dialog state for perfil ---
  activePerfRowIdx = signal<number>(-1);
  perfAppSearchTexts = signal<string[]>([]);
  perfModSearchTexts = signal<string[]>([]);
  perfPrgSearchTexts = signal<string[]>([]);

  showPerfAppSearchDlg = false;
  perfAppSearchCodigo = signal('');
  perfAppSearchNombre = signal('');
  perfAppSearchEstado = signal('');
  perfAppSearchPage = signal(1);
  perfAppSearchPageSize = signal(5);

  showPerfModSearchDlg = false;
  perfModSearchCodigo = signal('');
  perfModSearchNombre = signal('');
  perfModSearchPage = signal(1);
  perfModSearchPageSize = signal(5);

  showPerfPrgSearchDlg = false;
  perfPrgSearchCodigo = signal('');
  perfPrgSearchNombre = signal('');
  perfPrgSearchPage = signal(1);
  perfPrgSearchPageSize = signal(5);

  aplicacionMap = computed(() => new Map(this.aplicaciones().map(a => [a.codigo, a])));

  // --- Search computed for perfil dialogs ---
  filteredAppsForPerfSearch = computed(() => {
    const qCodigo = this.perfAppSearchCodigo().toLowerCase().trim();
    const qNombre = this.perfAppSearchNombre().toLowerCase().trim();
    const qEstado = this.perfAppSearchEstado().trim();
    return this.aplicaciones().filter(a =>
      (!qCodigo || a.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || a.nombre.toLowerCase().includes(qNombre)) &&
      (!qEstado || a.estado === qEstado)
    );
  });

  paginatedAppsForPerfSearch = computed(() => {
    const start = (this.perfAppSearchPage() - 1) * this.perfAppSearchPageSize();
    return this.filteredAppsForPerfSearch().slice(start, start + this.perfAppSearchPageSize());
  });

  perfAppSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredAppsForPerfSearch().length / this.perfAppSearchPageSize())));

  filteredModsForPerfSearch = computed(() => {
    const idx = this.activePerfRowIdx();
    const appCod = idx >= 0 ? this.perfProgramas[idx]?.appCodigo || '' : '';
    const qCodigo = this.perfModSearchCodigo().toLowerCase().trim();
    const qNombre = this.perfModSearchNombre().toLowerCase().trim();
    let mods = appCod ? this.modulos().filter(m => m.appCodigo === appCod) : this.modulos();
    return mods.filter(m =>
      (!qCodigo || m.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || m.nombre.toLowerCase().includes(qNombre))
    );
  });

  paginatedModsForPerfSearch = computed(() => {
    const start = (this.perfModSearchPage() - 1) * this.perfModSearchPageSize();
    return this.filteredModsForPerfSearch().slice(start, start + this.perfModSearchPageSize());
  });

  perfModSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredModsForPerfSearch().length / this.perfModSearchPageSize())));

  filteredPrgsForPerfSearch = computed(() => {
    const idx = this.activePerfRowIdx();
    const modCod = idx >= 0 ? this.perfProgramas[idx]?.modCodigo || '' : '';
    const qCodigo = this.perfPrgSearchCodigo().toLowerCase().trim();
    const qNombre = this.perfPrgSearchNombre().toLowerCase().trim();
    let prgs = modCod ? this.programas().filter(p => p.modCodigo === modCod) : this.programas();
    return prgs.filter(p =>
      (!qCodigo || p.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || p.nombre.toLowerCase().includes(qNombre))
    );
  });

  paginatedPrgsForPerfSearch = computed(() => {
    const start = (this.perfPrgSearchPage() - 1) * this.perfPrgSearchPageSize();
    return this.filteredPrgsForPerfSearch().slice(start, start + this.perfPrgSearchPageSize());
  });

  perfPrgSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredPrgsForPerfSearch().length / this.perfPrgSearchPageSize())));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.editPerfilId = id;
    this.loadData();
  }

  loadData = (): void => {
    this.loading.set(true); this.error.set(null);
    this._loadAplicaciones();
    this._loadModulos();
    this._loadProgramas();
    if (this.editPerfilId) {
      this.api.listPerfiles().subscribe({
        next: (perfiles) => {
          const p = perfiles.find(x => x.id === this.editPerfilId);
          if (!p) {
            this.error.set('No se encontró el perfil solicitado.');
            this.loading.set(false);
            return;
          }
          this.perfForm = { codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion, estado: p.estado };
          this.perfProgramas = p.programas.map(pp => {
            const prg = this.programas().find(x => x.codigo === pp.prgCodigo);
            const mod = prg ? this.modulos().find(m => m.codigo === prg.modCodigo) : undefined;
            return { appCodigo: mod?.appCodigo || '', modCodigo: prg?.modCodigo || '', ...pp };
          });
          this.refreshPerfSearchTexts();
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(e?.error?.error || e?.message || 'Error al cargar el perfil.');
          this.loading.set(false);
        },
      });
    } else {
      this.perfForm = this.blankPerf();
      this.perfProgramas = [];
      this.perfAppSearchTexts.set([]);
      this.perfModSearchTexts.set([]);
      this.perfPrgSearchTexts.set([]);
      this.loading.set(false);
    }
  };

  private _loadAplicaciones(): void {
    this.api.listAplicaciones().subscribe({ next: (d) => this.aplicaciones.set(d), error: () => {} });
  }

  private _loadModulos(): void {
    this.api.listModulos().subscribe({ next: (d) => this.modulos.set(d), error: () => {} });
  }

  private _loadProgramas(): void {
    this.api.listProgramas().subscribe({ next: (d) => this.programas.set(d), error: () => {} });
    this.api.listControles().subscribe({
      next: (d) => {
        const map = new Map<string, Control[]>();
        for (const c of d) {
          const arr = map.get(c.prgCodigo) || [];
          arr.push(c);
          map.set(c.prgCodigo, arr);
        }
        this.controlesMap.set(map);
      },
      error: () => {},
    });
  }

  // ============ FORM HELPERS ============
  blankPerf() { return { codigo: '', nombre: '', descripcion: '', estado: 'ACTIVO' as Estado }; }

  addPerfPrograma(): void {
    this.perfProgramas.push({ appCodigo: '', modCodigo: '', prgCodigo: '', nuevo: false, modificar: false, anular: false, procesar: false, imprimir: false, consultar: false });
    this.perfAppSearchTexts.set([...this.perfAppSearchTexts(), '']);
    this.perfModSearchTexts.set([...this.perfModSearchTexts(), '']);
    this.perfPrgSearchTexts.set([...this.perfPrgSearchTexts(), '']);
  }

  removePerfPrograma(idx: number): void {
    this.perfProgramas.splice(idx, 1);
    this.perfAppSearchTexts.set(this.perfAppSearchTexts().filter((_, i) => i !== idx));
    this.perfModSearchTexts.set(this.perfModSearchTexts().filter((_, i) => i !== idx));
    this.perfPrgSearchTexts.set(this.perfPrgSearchTexts().filter((_, i) => i !== idx));
  }

  getProgramaTipo(codigo: string): string {
    return this.programas().find(p => p.codigo === codigo)?.tipo || '';
  }

  cancel(): void {
    this.router.navigate(['/perfiles']);
  }

  async savePerf(): Promise<void> {
    this.perfTouched = true;
    const programasValidos = this.perfProgramas.filter(pp => pp.prgCodigo.trim() !== '');
    if (!this.perfForm.codigo || !this.perfForm.nombre) { this.toast.error('Faltan datos', 'Código y nombre son obligatorios.'); return; }
    if (!programasValidos.length) { this.toast.error('Faltan datos', 'Debe agregar al menos un programa.'); return; }

    const executeSave = async () => {
      try {
        const body: any = { ...this.perfForm, programas: programasValidos };
        if (this.editPerfilId) { await this.api.updatePerfil(this.editPerfilId, body).toPromise(); this.toast.success('Perfil actualizado'); }
        else { await this.api.createPerfil(body).toPromise(); this.toast.success('Perfil creado'); }
        this.events.emitDataChanged();
        this.router.navigate(['/perfiles']);
      } catch (e: any) {
        const msg = e?.error?.error || e?.message || 'Error inesperado.';
        this.toast.error('Error', msg);
      }
    };

    if (this.editPerfilId) {
      this.confirmAction(`Se va a proceder con la edición del perfil "${this.perfForm.nombre}", ¿desea continuar?`, executeSave);
    } else {
      await executeSave();
    }
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

  // ============ SEARCH HELPERS ============
  private refreshPerfSearchTexts(): void {
    const appTexts: string[] = [];
    const modTexts: string[] = [];
    const prgTexts: string[] = [];
    for (const pp of this.perfProgramas) {
      const a = this.aplicacionMap().get(pp.appCodigo);
      const m = this.modulos().find(x => x.codigo === pp.modCodigo);
      const p = this.programas().find(x => x.codigo === pp.prgCodigo);
      appTexts.push(a ? `${a.codigo} · ${a.nombre}` : '');
      modTexts.push(m ? `${m.codigo} · ${m.nombre}` : '');
      prgTexts.push(p ? `${p.codigo} · ${p.nombre}` : '');
    }
    this.perfAppSearchTexts.set(appTexts);
    this.perfModSearchTexts.set(modTexts);
    this.perfPrgSearchTexts.set(prgTexts);
  }

  private updatePerfAppText(idx: number, a?: Aplicacion): void {
    const texts = this.perfAppSearchTexts().slice();
    texts[idx] = a ? `${a.codigo} · ${a.nombre}` : '';
    this.perfAppSearchTexts.set(texts);
  }

  private updatePerfModText(idx: number, m?: Modulo): void {
    const texts = this.perfModSearchTexts().slice();
    texts[idx] = m ? `${m.codigo} · ${m.nombre}` : '';
    this.perfModSearchTexts.set(texts);
  }

  private updatePerfPrgText(idx: number, p?: Programa): void {
    const texts = this.perfPrgSearchTexts().slice();
    texts[idx] = p ? `${p.codigo} · ${p.nombre}` : '';
    this.perfPrgSearchTexts.set(texts);
  }

  // ============ APP SEARCH DIALOG ============
  openPerfAppSearchDialog(idx: number): void {
    this.activePerfRowIdx.set(idx);
    this.perfAppSearchCodigo.set('');
    this.perfAppSearchNombre.set('');
    this.perfAppSearchEstado.set('');
    this.perfAppSearchPage.set(1);
    this.showPerfAppSearchDlg = true;
  }

  closePerfAppSearchDialog(): void {
    this.showPerfAppSearchDlg = false;
    this.activePerfRowIdx.set(-1);
  }

  clearPerfAppFilters(): void {
    this.perfAppSearchCodigo.set('');
    this.perfAppSearchNombre.set('');
    this.perfAppSearchEstado.set('');
    this.perfAppSearchPage.set(1);
  }

  changePerfAppSearchPage(delta: number): void {
    this.perfAppSearchPage.set(Math.min(Math.max(this.perfAppSearchPage() + delta, 1), this.perfAppSearchTotalPages()));
  }

  selectPerfApp(a: Aplicacion): void {
    const idx = this.activePerfRowIdx();
    if (idx < 0) return;
    this.perfProgramas[idx].appCodigo = a.codigo;
    this.perfProgramas[idx].modCodigo = '';
    this.perfProgramas[idx].prgCodigo = '';
    this.updatePerfAppText(idx, a);
    this.updatePerfModText(idx);
    this.updatePerfPrgText(idx);
  }

  selectPerfAppFromDialog(a: Aplicacion): void {
    this.selectPerfApp(a);
    this.closePerfAppSearchDialog();
  }

  // ============ MOD SEARCH DIALOG ============
  openPerfModSearchDialog(idx: number): void {
    this.activePerfRowIdx.set(idx);
    this.perfModSearchCodigo.set('');
    this.perfModSearchNombre.set('');
    this.perfModSearchPage.set(1);
    this.showPerfModSearchDlg = true;
  }

  closePerfModSearchDialog(): void {
    this.showPerfModSearchDlg = false;
    this.activePerfRowIdx.set(-1);
  }

  clearPerfModFilters(): void {
    this.perfModSearchCodigo.set('');
    this.perfModSearchNombre.set('');
    this.perfModSearchPage.set(1);
  }

  changePerfModSearchPage(delta: number): void {
    this.perfModSearchPage.set(Math.min(Math.max(this.perfModSearchPage() + delta, 1), this.perfModSearchTotalPages()));
  }

  selectPerfMod(m: Modulo): void {
    const idx = this.activePerfRowIdx();
    if (idx < 0) return;
    this.perfProgramas[idx].modCodigo = m.codigo;
    this.perfProgramas[idx].prgCodigo = '';
    this.updatePerfModText(idx, m);
    this.updatePerfPrgText(idx);
  }

  selectPerfModFromDialog(m: Modulo): void {
    this.selectPerfMod(m);
    this.closePerfModSearchDialog();
  }

  // ============ PRG SEARCH DIALOG ============
  openPerfPrgSearchDialog(idx: number): void {
    this.activePerfRowIdx.set(idx);
    this.perfPrgSearchCodigo.set('');
    this.perfPrgSearchNombre.set('');
    this.perfPrgSearchPage.set(1);
    this.showPerfPrgSearchDlg = true;
  }

  closePerfPrgSearchDialog(): void {
    this.showPerfPrgSearchDlg = false;
    this.activePerfRowIdx.set(-1);
  }

  clearPerfPrgFilters(): void {
    this.perfPrgSearchCodigo.set('');
    this.perfPrgSearchNombre.set('');
    this.perfPrgSearchPage.set(1);
  }

  changePerfPrgSearchPage(delta: number): void {
    this.perfPrgSearchPage.set(Math.min(Math.max(this.perfPrgSearchPage() + delta, 1), this.perfPrgSearchTotalPages()));
  }

  selectPerfPrg(p: Programa): void {
    const idx = this.activePerfRowIdx();
    if (idx < 0) return;
    this.perfProgramas[idx].prgCodigo = p.codigo;
    this.updatePerfPrgText(idx, p);
  }

  selectPerfPrgFromDialog(p: Programa): void {
    this.selectPerfPrg(p);
    this.closePerfPrgSearchDialog();
  }

  // ============ PAGINATION ============
  changePerfAppSearchPageSize(size: number): void {
    this.perfAppSearchPageSize.set(size);
    this.perfAppSearchPage.set(1);
  }

  changePerfModSearchPageSize(size: number): void {
    this.perfModSearchPageSize.set(size);
    this.perfModSearchPage.set(1);
  }

  changePerfPrgSearchPageSize(size: number): void {
    this.perfPrgSearchPageSize.set(size);
    this.perfPrgSearchPage.set(1);
  }
}
