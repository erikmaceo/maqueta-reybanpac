import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule, moveItemInArray, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import { IconPlusComponent, IconTrashComponent, IconSearchComponent } from '../../shared/components/icons';
import type { Aplicacion, Modulo, Programa, TipoPrograma, TipoControl, Control } from '../../shared/models/types';

type Estado = 'ACTIVO' | 'INACTIVO';

const TIPOS_PROGRAMA: TipoPrograma[] = ['Menú', 'Submenú', 'Tapview', 'Maestro', 'Transacción', 'Proceso', 'Consulta', 'Reporte', 'Objeto'];

const TIPOS_CONTROL: TipoControl[] = ['Caja de Texto', 'Botón', 'Check', 'Combo', 'Grid', 'Filtro', 'Option', 'Otros'];

interface ControlRow {
  codigo: string;
  tipoControl: TipoControl | '';
  descripcion: string;
  estado: 'ACTIVO' | 'INACTIVO';
  log: 'ACTIVO' | 'INACTIVO';
  orden?: number;
}

interface PrgForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  appCodigo: string;
  modCodigo: string;
  tipo: TipoPrograma | '';
  estado: Estado;
}

@Component({
  selector: 'app-programa-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DragDropModule, DialogModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconSearchComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ editPrgId ? 'Editar Programa' : 'Nuevo Programa' }}</h1>
        <p>Configure los datos del programa y sus controles.</p>
      </div>
      <button class="btn btn-ghost btn-sm" (click)="volver()">
        <i class="pi pi-arrow-left mr-1"></i> Volver
      </button>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="5" [cols]="1" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="loadData" />
    } @else {
      <div class="card programa-form-card">
        <div class="form-grid">
          <div class="field">
            <label>Código <span class="required">*</span></label>
            <input class="input" [class.invalid]="prgTouched && !prgForm.codigo" [(ngModel)]="prgForm.codigo" placeholder="PRG-FI-DOCS" />
          </div>
          <div class="field">
            <label>Nombre <span class="required">*</span></label>
            <input class="input" [class.invalid]="prgTouched && !prgForm.nombre" [(ngModel)]="prgForm.nombre" placeholder="Documentos contables" />
          </div>
        </div>
        <div class="field">
          <label>Aplicación <span class="required">*</span></label>
          <div class="search-field">
            <input class="select" type="text" [ngModel]="prgAppSearchText()" readonly placeholder="Seleccione una aplicación..." [class.invalid]="prgTouched && !prgForm.appCodigo" />
            <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openPrgAppSearchDialog()" title="Buscar aplicación">
              <app-icon-search [width]="16" [height]="16" />
            </button>
          </div>
        </div>
        <div class="field">
          <label>Módulo <span class="required">*</span></label>
          <div class="search-field">
            <input class="select" type="text" [ngModel]="prgModSearchText()" readonly placeholder="Seleccione un módulo..." [class.invalid]="prgTouched && !prgForm.modCodigo" />
            <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openPrgModSearchDialog()" [disabled]="!prgForm.appCodigo" [attr.title]="!prgForm.appCodigo ? 'Seleccione una aplicación primero' : 'Buscar módulo'">
              <app-icon-search [width]="16" [height]="16" />
            </button>
          </div>
        </div>
        <div class="field">
          <label>Tipo de Programa <span class="required">*</span></label>
          <select class="select" [class.invalid]="prgTouched && !prgForm.tipo" [(ngModel)]="prgForm.tipo">
            <option value="">— Seleccione —</option>
            @for (tipo of tiposPrograma; track tipo) {
              <option [value]="tipo">{{ tipo }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Descripción</label>
          <textarea class="input" [(ngModel)]="prgForm.descripcion" rows="2" maxlength="250"></textarea>
          <div class="muted small" style="margin-top:2px;">{{ (prgForm.descripcion || '').length }}/250 caracteres máximos.</div>
        </div>
        <div class="field">
          <label>Estado</label>
          <select class="select" [(ngModel)]="prgForm.estado">
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
        @if (prgForm.tipo && prgForm.tipo !== 'Menú' && prgForm.tipo !== 'Submenú') {
          <div class="field">
            <label>Controles del Programa</label>
            <div class="controles-list" cdkDropList (cdkDropListDropped)="dropControl($event)">
              @for (c of prgControles; track $index) {
                <div class="control-row" cdkDrag cdkDragLockAxis="y">
                  <div class="drag-handle small" title="Arrastrar para reordenar" (click)="$event.stopPropagation()"></div>
                  <button class="btn btn-danger btn-sm btn-icon control-delete" title="Quitar control" (click)="removeControl($index)">
                    <app-icon-trash [width]="14" [height]="14" />
                  </button>
                  <div class="control-row-content">
                    <div class="control-row-top">
                      <input class="input control-codigo" [class.invalid]="prgTouched && !c.codigo" [(ngModel)]="c.codigo" placeholder="Código *" />
                      <select class="select control-tipo" [class.invalid]="prgTouched && !c.tipoControl" [(ngModel)]="c.tipoControl">
                        <option value="">— Seleccione —</option>
                        @for (t of tiposControl; track t) {
                          <option [value]="t">{{ t }}</option>
                        }
                      </select>
                      <label class="control-check">
                        <input type="checkbox" [checked]="c.estado === 'ACTIVO'"
                          (change)="c.estado = $any($event.target).checked ? 'ACTIVO' : 'INACTIVO'" />
                        <span>{{ c.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}</span>
                      </label>
                      <label class="control-check">
                        <input type="checkbox" [checked]="c.log === 'ACTIVO'"
                          (change)="c.log = $any($event.target).checked ? 'ACTIVO' : 'INACTIVO'" />
                        <span>Log</span>
                      </label>
                    </div>
                    <input class="input control-desc-full" [class.invalid]="prgTouched && !c.descripcion" [(ngModel)]="c.descripcion" placeholder="Descripción del control *" />
                  </div>
                </div>
              }
            </div>
            <button class="btn btn-ghost btn-sm mt-2" (click)="addControl()">
              <app-icon-plus [width]="14" [height]="14" /> Agregar Control
            </button>
          </div>
        }

        <div class="form-actions">
          <button class="btn btn-ghost" (click)="volver()">Cancelar</button>
          <button class="btn btn-primary" (click)="savePrg()">{{ editPrgId ? 'Guardar' : 'Crear' }}</button>
        </div>
      </div>
    }

    <!-- ============ DIÁLOGO BÚSQUEDA APLICACIÓN PARA PROGRAMA ============ -->
    <p-dialog
      [(visible)]="showPrgAppSearchDlg"
      header="Buscar aplicación"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="closePrgAppSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="prgAppSearchCodigo" placeholder="Código de aplicación" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="prgAppSearchNombre" placeholder="Nombre de aplicación" />
        </div>
        <div class="field">
          <label>Estado</label>
          <select class="select" [(ngModel)]="prgAppSearchEstado">
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyPrgAppFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearPrgAppFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap">
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
            @for (a of paginatedAppsForPrgSearch(); track a.id) {
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
                  <button class="btn btn-primary btn-sm" (click)="selectPrgAppFromDialog(a)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="prgAppSearchPage() === 1" (click)="changePrgAppSearchPage(-1)">Anterior</button>
        <span>Página {{ prgAppSearchPage() }} de {{ prgAppSearchTotalPages() }} ({{ filteredAppsForPrgSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="prgAppSearchPage() === prgAppSearchTotalPages()" (click)="changePrgAppSearchPage(1)">Siguiente</button>
      </div>
    </p-dialog>

    <!-- ============ DIÁLOGO BÚSQUEDA MÓDULO PARA PROGRAMA ============ -->
    <p-dialog
      [(visible)]="showPrgModSearchDlg"
      header="Buscar módulo"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="closePrgModSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="prgModSearchCodigo" placeholder="Código de módulo" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="prgModSearchNombre" placeholder="Nombre de módulo" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyPrgModFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearPrgModFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap">
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
            @for (m of paginatedModsForPrgSearch(); track m.id) {
              <tr>
                <td class="mono">{{ m.codigo }}</td>
                <td><div class="cell-strong">{{ m.nombre }}</div></td>
                <td><span class="badge badge-blue">{{ m.appCodigo }}</span></td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectPrgModFromDialog(m)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="prgModSearchPage() === 1" (click)="changePrgModSearchPage(-1)">Anterior</button>
        <span>Página {{ prgModSearchPage() }} de {{ prgModSearchTotalPages() }} ({{ filteredModsForPrgSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="prgModSearchPage() === prgModSearchTotalPages()" (click)="changePrgModSearchPage(1)">Siguiente</button>
      </div>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .programa-form-card {
      width: 100%;
      max-width: none;
      box-sizing: border-box;
      padding: 10px;
    }
    .control-row {
      position: relative;
      padding-left: 28px;
      padding-right: 28px;
      display: flex;
      flex-direction: column;
    }
    .control-delete {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 1;
    }
    .control-row-content {
      width: 100%;
    }
    .drag-handle {
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 12px;
      height: 18px;
      cursor: grab;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      opacity: 0.35;
      transition: opacity .15s;
    }
    .drag-handle::before,
    .drag-handle::after {
      content: '';
      display: block;
      height: 2px;
      background: currentColor;
      border-radius: 1px;
      box-shadow: 0 4px 0 currentColor, 0 8px 0 currentColor;
    }
    .drag-handle::after {
      box-shadow: none;
    }
    .control-row:hover .drag-handle {
      opacity: 0.65;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
    .drag-handle.small {
      left: 8px;
      width: 10px;
      height: 14px;
    }
    .control-row.cdk-drag-preview {
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      background: var(--surface);
      border-radius: 8px;
    }
    .control-row.cdk-drag-placeholder {
      opacity: 0.35;
      border-style: dashed;
    }
    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drag-animating {
      transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
    }
    .required {
      color: var(--red-600, #c8102e);
      font-weight: bold;
    }
    .input.invalid,
    .select.invalid {
      border-color: var(--red-600, #c8102e);
      background-color: var(--red-50, #fef2f2);
    }
    .control-tipo.invalid,
    .control-desc-full.invalid,
    .control-codigo.invalid {
      border-color: var(--red-600, #c8102e);
      background-color: var(--red-50, #fef2f2);
    }
    .control-codigo {
      width: 140px;
      flex-shrink: 0;
    }
    .control-row-top {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .control-desc-full {
      width: calc(100% - 32px);
      margin-top: 6px;
      box-sizing: border-box;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 5px;
      margin-top: 24px;
    }
  `],
})
export class ProgramaFormComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);
  private confirmationService = inject(ConfirmationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  editPrgId: string | null = null;
  prgTouched = false;
  prgForm: PrgForm = { codigo: '', nombre: '', descripcion: '', appCodigo: '', modCodigo: '', tipo: '', estado: 'ACTIVO' };
  prgAppCodigo = signal('');
  tiposPrograma = TIPOS_PROGRAMA;
  tiposControl = TIPOS_CONTROL;
  prgControles: ControlRow[] = [];
  controlesMap = signal<Map<string, Control[]>>(new Map());

  loading = signal(true);
  error = signal<string | null>(null);

  aplicaciones = signal<Aplicacion[]>([]);
  modulos = signal<Modulo[]>([]);

  // --- Diálogo búsqueda de aplicación ---
  showPrgAppSearchDlg = false;
  prgAppSearchCodigo = '';
  prgAppSearchNombre = '';
  prgAppSearchEstado = '';
  appliedPrgAppSearchCodigo = signal('');
  appliedPrgAppSearchNombre = signal('');
  appliedPrgAppSearchEstado = signal('');
  prgAppSearchPage = signal(1);
  prgAppSearchPageSize = signal(5);
  prgAppSearchText = signal('');

  // --- Diálogo búsqueda de módulo ---
  showPrgModSearchDlg = false;
  prgModSearchCodigo = '';
  prgModSearchNombre = '';
  appliedPrgModSearchCodigo = signal('');
  appliedPrgModSearchNombre = signal('');
  prgModSearchPage = signal(1);
  prgModSearchPageSize = signal(5);
  prgModSearchText = signal('');

  aplicacionMap = computed(() => new Map(this.aplicaciones().map(a => [a.codigo, a])));

  filteredAppsForPrgSearch = computed(() => {
    const qCodigo = this.appliedPrgAppSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedPrgAppSearchNombre().toLowerCase().trim();
    const qEstado = this.appliedPrgAppSearchEstado().trim();
    return this.aplicaciones().filter(a =>
      (!qCodigo || a.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || a.nombre.toLowerCase().includes(qNombre)) &&
      (!qEstado || a.estado === qEstado)
    );
  });

  paginatedAppsForPrgSearch = computed(() => {
    const start = (this.prgAppSearchPage() - 1) * this.prgAppSearchPageSize();
    return this.filteredAppsForPrgSearch().slice(start, start + this.prgAppSearchPageSize());
  });

  prgAppSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredAppsForPrgSearch().length / this.prgAppSearchPageSize())));

  filteredModsForPrgSearch = computed(() => {
    const appCod = this.prgAppCodigo();
    const qCodigo = this.appliedPrgModSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedPrgModSearchNombre().toLowerCase().trim();
    let mods = appCod ? this.modulos().filter(m => m.appCodigo === appCod) : this.modulos();
    return mods.filter(m =>
      (!qCodigo || m.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || m.nombre.toLowerCase().includes(qNombre))
    );
  });

  paginatedModsForPrgSearch = computed(() => {
    const start = (this.prgModSearchPage() - 1) * this.prgModSearchPageSize();
    return this.filteredModsForPrgSearch().slice(start, start + this.prgModSearchPageSize());
  });

  prgModSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredModsForPrgSearch().length / this.prgModSearchPageSize())));

  loadData = () => this._load();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.editPrgId = id;
    this.prgForm = { codigo: '', nombre: '', descripcion: '', appCodigo: '', modCodigo: '', tipo: '', estado: 'ACTIVO' };
    this.prgAppCodigo.set('');
    this.prgControles = [];
    this.prgAppSearchText.set('');
    this.prgModSearchText.set('');
    this.prgTouched = false;
    this._load();
  }

  private _load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listAplicaciones().subscribe({
      next: (d) => this.aplicaciones.set(d),
      error: () => {},
    });
    this.api.listModulos().subscribe({
      next: (d) => {
        this.modulos.set(d);
        this.applyProgramaFromPending();
      },
      error: () => {},
    });
    this.api.listProgramas().subscribe({
      next: (d) => {
        if (this.editPrgId) {
          const p = d.find(x => x.id === this.editPrgId);
          if (!p) { this.error.set('No se encontró el programa solicitado.'); this.loading.set(false); return; }
          this.pendingProgram = p;
          this.applyProgramaFromPending();
        }
      },
      error: (e) => this.error.set(e?.error?.error || e?.message || 'Error al cargar el programa.'),
      complete: () => this.loading.set(false),
    });
    this.api.listControles().subscribe({
      next: (d) => {
        const map = new Map<string, Control[]>();
        for (const c of d) {
          const arr = map.get(c.prgCodigo) || [];
          arr.push(c);
          map.set(c.prgCodigo, arr);
        }
        this.controlesMap.set(map);
        this.applyProgramaFromPending();
      },
      error: () => {},
    });
  }

  private pendingProgram: Programa | null = null;

  private applyProgramaFromPending(): void {
    const p = this.pendingProgram;
    if (!p || !this.editPrgId) return;
    const mod = this.modulos().find(m => m.codigo === p.modCodigo);
    const appCod = mod?.appCodigo || '';
    this.prgForm = { codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion, appCodigo: appCod, modCodigo: p.modCodigo, tipo: p.tipo, estado: p.estado };
    this.prgAppCodigo.set(appCod);
    const a = this.aplicacionMap().get(appCod);
    this.prgAppSearchText.set(a ? `${a.codigo} · ${a.nombre}` : `${appCod}`);
    this.prgModSearchText.set(mod ? `${mod.codigo} · ${mod.nombre}` : `${p.modCodigo}`);
    const ctrls = (this.controlesMap().get(p.codigo) || []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    this.prgControles = ctrls.map(c => ({
      codigo: c.codigo,
      tipoControl: c.tipoControl,
      descripcion: c.descripcion,
      estado: c.estado,
      log: c.log === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO',
      orden: c.orden
    }));
  }

  volver(): void {
    this.router.navigate(['/seguridades'], { queryParams: { tab: '2' } });
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

  changePrgApp(): void {
    const a = this.aplicacionMap().get(this.prgForm.appCodigo);
    this.prgAppSearchText.set(a ? `${a.codigo} · ${a.nombre}` : '');
    this.prgAppCodigo.set(this.prgForm.appCodigo);
    this.prgForm.modCodigo = '';
    this.prgModSearchText.set('');
  }
  addControl(): void {
    this.prgControles.push({ codigo: '', tipoControl: '', descripcion: '', estado: 'ACTIVO', log: 'ACTIVO', orden: this.prgControles.length });
  }
  removeControl(idx: number): void {
    this.prgControles.splice(idx, 1);
  }
  dropControl(event: CdkDragDrop<ControlRow[]>): void {
    moveItemInArray(this.prgControles, event.previousIndex, event.currentIndex);
  }

  savePrg(): void {
    this.prgTouched = true;
    if (!this.prgForm.codigo || !this.prgForm.nombre || !this.prgForm.appCodigo || !this.prgForm.modCodigo) { this.toast.error('Faltan datos', 'Código, nombre, aplicación y módulo son obligatorios.'); return; }
    const controles = this.prgForm.tipo !== 'Menú' && this.prgForm.tipo !== 'Submenú'
      ? this.prgControles.filter(c => c.codigo.trim() !== '' && c.descripcion.trim() !== '' && c.tipoControl)
      : [];
    if (this.prgForm.tipo !== 'Menú' && this.prgForm.tipo !== 'Submenú' && this.prgControles.length > 0 && controles.length !== this.prgControles.length) {
      this.toast.error('Faltan datos', 'Todos los controles deben tener código, tipo y descripción.'); return;
    }
    const body: any = { ...this.prgForm, controles };

    const executeSave = async () => {
      try {
        if (this.editPrgId) { await this.api.updatePrograma(this.editPrgId, body).toPromise(); this.toast.success('Programa actualizado'); }
        else { await this.api.createPrograma(body).toPromise(); this.toast.success('Programa creado'); }
        this.events.emitDataChanged();
        this.volver();
      } catch (e: any) {
        const msg = e?.error?.error || e?.message || 'Error inesperado.';
        this.toast.error('Error', msg);
      }
    };

    if (this.editPrgId) {
      this.confirmAction(`Se va a proceder con la edición del programa "${this.prgForm.nombre}", ¿desea continuar?`, executeSave);
    } else {
      executeSave();
    }
  }

  // --- Búsqueda de aplicación para programa ---
  openPrgAppSearchDialog(): void {
    this.prgAppSearchCodigo = '';
    this.prgAppSearchNombre = '';
    this.prgAppSearchEstado = '';
    this.appliedPrgAppSearchCodigo.set('');
    this.appliedPrgAppSearchNombre.set('');
    this.appliedPrgAppSearchEstado.set('');
    this.prgAppSearchPage.set(1);
    this.showPrgAppSearchDlg = true;
  }

  closePrgAppSearchDialog(): void {
    this.showPrgAppSearchDlg = false;
  }

  applyPrgAppFilters(): void {
    this.appliedPrgAppSearchCodigo.set(this.prgAppSearchCodigo);
    this.appliedPrgAppSearchNombre.set(this.prgAppSearchNombre);
    this.appliedPrgAppSearchEstado.set(this.prgAppSearchEstado);
    this.prgAppSearchPage.set(1);
  }

  clearPrgAppFilters(): void {
    this.prgAppSearchCodigo = '';
    this.prgAppSearchNombre = '';
    this.prgAppSearchEstado = '';
    this.applyPrgAppFilters();
  }

  changePrgAppSearchPage(delta: number): void {
    this.prgAppSearchPage.set(Math.min(Math.max(this.prgAppSearchPage() + delta, 1), this.prgAppSearchTotalPages()));
  }

  selectPrgApp(a: Aplicacion): void {
    this.prgForm.appCodigo = a.codigo;
    this.prgAppSearchText.set(`${a.codigo} · ${a.nombre}`);
    this.prgAppCodigo.set(a.codigo);
    this.prgForm.modCodigo = '';
    this.prgModSearchText.set('');
  }

  selectPrgAppFromDialog(a: Aplicacion): void {
    this.selectPrgApp(a);
    this.closePrgAppSearchDialog();
  }

  // --- Búsqueda de módulo para programa ---
  openPrgModSearchDialog(): void {
    this.prgModSearchCodigo = '';
    this.prgModSearchNombre = '';
    this.appliedPrgModSearchCodigo.set('');
    this.appliedPrgModSearchNombre.set('');
    this.prgModSearchPage.set(1);
    this.showPrgModSearchDlg = true;
  }

  closePrgModSearchDialog(): void {
    this.showPrgModSearchDlg = false;
  }

  applyPrgModFilters(): void {
    this.appliedPrgModSearchCodigo.set(this.prgModSearchCodigo);
    this.appliedPrgModSearchNombre.set(this.prgModSearchNombre);
    this.prgModSearchPage.set(1);
  }

  clearPrgModFilters(): void {
    this.prgModSearchCodigo = '';
    this.prgModSearchNombre = '';
    this.applyPrgModFilters();
  }

  changePrgModSearchPage(delta: number): void {
    this.prgModSearchPage.set(Math.min(Math.max(this.prgModSearchPage() + delta, 1), this.prgModSearchTotalPages()));
  }

  selectPrgMod(m: Modulo): void {
    this.prgForm.modCodigo = m.codigo;
    this.prgModSearchText.set(`${m.codigo} · ${m.nombre}`);
  }

  selectPrgModFromDialog(m: Modulo): void {
    this.selectPrgMod(m);
    this.closePrgModSearchDialog();
  }
}