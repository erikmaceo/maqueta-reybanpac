import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule, moveItemInArray, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { SeguridadDraftService } from '../../core/services/seguridad-draft.service';
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
    CommonModule, FormsModule, ConfirmDialogModule, DragDropModule,
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
        <div class="form-grid">
          <div class="field">
            <label>Aplicación <span class="required">*</span></label>
            <div class="search-field">
              <input class="select" type="text" [ngModel]="prgAppSearchText()" readonly placeholder="Seleccione una aplicación..." [class.invalid]="prgTouched && !prgForm.appCodigo" />
              <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="goToPrgAppSelect()" title="Buscar aplicación">
                <app-icon-search [width]="16" [height]="16" />
              </button>
            </div>
          </div>
          <div class="field">
            <label>Módulo <span class="required">*</span></label>
            <div class="search-field">
              <input class="select" type="text" [ngModel]="prgModSearchText()" readonly placeholder="Seleccione un módulo..." [class.invalid]="prgTouched && !prgForm.modCodigo" />
              <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="goToPrgModSelect()" [disabled]="!prgForm.appCodigo" [attr.title]="!prgForm.appCodigo ? 'Seleccione una aplicación primero' : 'Buscar módulo'">
                <app-icon-search [width]="16" [height]="16" />
              </button>
            </div>
          </div>
        </div>
        <div class="form-grid">
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
            <label>Estado</label>
            <select class="select" [(ngModel)]="prgForm.estado">
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>Descripción</label>
          <textarea class="input" [(ngModel)]="prgForm.descripcion" rows="2" maxlength="250"></textarea>
          <div class="muted small" style="margin-top:2px;">{{ (prgForm.descripcion || '').length }}/250 caracteres máximos.</div>
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
  private draftService = inject(SeguridadDraftService);
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

  // --- Búsqueda de aplicación ---
  prgAppSearchText = signal('');

  // --- Búsqueda de módulo ---
  prgModSearchText = signal('');

  private recoveredDraft: { form?: PrgForm; touched?: boolean; controles?: ControlRow[] } | null = null;
  private recoveredAppCodigo = '';
  private recoveredModCodigo = '';

  aplicacionMap = computed(() => new Map(this.aplicaciones().map(a => [a.codigo, a])));

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
    this.recoveredDraft = this.draftService.consume() as { form?: PrgForm; touched?: boolean; controles?: ControlRow[] } | null;
    this.recoveredAppCodigo = this.route.snapshot.queryParamMap.get('appCodigo') || '';
    this.recoveredModCodigo = this.route.snapshot.queryParamMap.get('modCodigo') || '';
    this._load();
  }

  private _load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listAplicaciones().subscribe({
      next: (d) => {
        this.aplicaciones.set(d);
        this.applyRecovered();
      },
      error: () => {},
    });
    this.api.listModulos().subscribe({
      next: (d) => {
        this.modulos.set(d);
        this.applyProgramaFromPending();
        this.applyRecovered();
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
          this.applyRecovered();
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
        this.applyRecovered();
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
  goToPrgAppSelect(): void {
    this.draftService.save({ form: this.prgForm, touched: this.prgTouched, controles: this.prgControles });
    const path = this.editPrgId ? `/seguridades/programas/${this.editPrgId}/editar` : '/seguridades/programas/nuevo';
    this.router.navigate(['/seguridades/seleccionar-aplicacion'], { queryParams: { returnTo: path } });
  }

  // --- Búsqueda de módulo para programa ---
  goToPrgModSelect(): void {
    this.draftService.save({ form: this.prgForm, touched: this.prgTouched, controles: this.prgControles });
    const path = this.editPrgId ? `/seguridades/programas/${this.editPrgId}/editar` : '/seguridades/programas/nuevo';
    this.router.navigate(['/seguridades/seleccionar-modulo'], { queryParams: { returnTo: path, appCodigo: this.prgAppCodigo() } });
  }

  private applyRecovered(): void {
    const draft = this.recoveredDraft;
    if (draft?.form) {
      this.prgForm = { ...draft.form };
      if (typeof draft.touched === 'boolean') this.prgTouched = draft.touched;
    }
    if (Array.isArray(draft?.controles)) {
      this.prgControles = (draft!.controles).map(c => ({ ...c }));
    }
    if (this.recoveredAppCodigo) {
      const changed = this.prgForm.appCodigo !== this.recoveredAppCodigo;
      this.prgForm.appCodigo = this.recoveredAppCodigo;
      this.prgAppCodigo.set(this.recoveredAppCodigo);
      const a = this.aplicacionMap().get(this.recoveredAppCodigo);
      this.prgAppSearchText.set(a ? `${a.codigo} · ${a.nombre}` : this.recoveredAppCodigo);
      if (changed) {
        this.prgForm.modCodigo = '';
        this.prgModSearchText.set('');
      }
    } else if (this.prgForm.appCodigo) {
      const a = this.aplicacionMap().get(this.prgForm.appCodigo);
      this.prgAppSearchText.set(a ? `${a.codigo} · ${a.nombre}` : this.prgForm.appCodigo);
      if (this.prgAppCodigo() !== this.prgForm.appCodigo) this.prgAppCodigo.set(this.prgForm.appCodigo);
    }
    if (this.recoveredModCodigo) {
      this.prgForm.modCodigo = this.recoveredModCodigo;
      const m = this.modulos().find(x => x.codigo === this.recoveredModCodigo);
      this.prgModSearchText.set(m ? `${m.codigo} · ${m.nombre}` : this.recoveredModCodigo);
    } else if (this.prgForm.modCodigo) {
      const m = this.modulos().find(x => x.codigo === this.prgForm.modCodigo);
      this.prgModSearchText.set(m ? `${m.codigo} · ${m.nombre}` : this.prgForm.modCodigo);
    }
  }
}