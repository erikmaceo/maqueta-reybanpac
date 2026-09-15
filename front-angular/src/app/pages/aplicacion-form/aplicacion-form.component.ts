import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { SeguridadDraftService } from '../../core/services/seguridad-draft.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import { IconSearchComponent, IconTrashComponent } from '../../shared/components/icons';
import type { Aplicacion, NivelSegregacion, NodoSegregacion } from '../../shared/models/types';

type Estado = 'ACTIVO' | 'INACTIVO';

interface AppForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: Estado;
  nodoIds: string[];
}

@Component({
  selector: 'app-aplicacion-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconSearchComponent, IconTrashComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ editAppId ? 'Editar Aplicación' : 'Nueva Aplicación' }}</h1>
        <p>Configure los datos de la aplicación y su nodo de segregación.</p>
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
      <div class="card aplicacion-form-card">
        <div class="form-grid">
          <div class="field">
            <label>Código <span class="required">*</span></label>
            <input class="input" [class.invalid]="appTouched && !appForm.codigo" [(ngModel)]="appForm.codigo" placeholder="APP-SAP" />
          </div>
          <div class="field">
            <label>Nombre <span class="required">*</span></label>
            <input class="input" [class.invalid]="appTouched && !appForm.nombre" [(ngModel)]="appForm.nombre" placeholder="SAP ERP" />
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Estado</label>
            <select class="select" [(ngModel)]="appForm.estado">
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
          <div class="field">
            <label>Nodo de Segregación <span class="required">*</span></label>
            <div class="search-field">
              <input class="select" [class.invalid]="appTouched && !appForm.nodoIds.length" type="text" [ngModel]="appNodoSearchText()" readonly placeholder="Seleccione un nodo padre..." />
              <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="goToNodoSelect()" title="Buscar nodo">
                <app-icon-search [width]="16" [height]="16" />
              </button>
              @if (appForm.nodoIds.length) {
                <button class="btn btn-danger btn-sm btn-icon" type="button" (click)="clearAppNodo()" title="Quitar nodo">
                  <app-icon-trash [width]="16" [height]="16" />
                </button>
              }
            </div>
          </div>
        </div>
        <div class="field">
          <label>Descripción</label>
          <textarea class="input" [(ngModel)]="appForm.descripcion" rows="2" maxlength="250"></textarea>
          <div class="muted small" style="margin-top:2px;">{{ (appForm.descripcion || '').length }}/250 caracteres máximos.</div>
        </div>

        <div class="form-actions">
          <button class="btn btn-ghost" (click)="volver()">Cancelar</button>
          <button class="btn btn-primary" (click)="saveApp()">{{ editAppId ? 'Guardar' : 'Crear' }}</button>
        </div>
      </div>
    }

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .aplicacion-form-card {
      width: 100%;
      max-width: none;
      box-sizing: border-box;
      padding: 10px;
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
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 5px;
      margin-top: 24px;
    }
  `],
})
export class AplicacionFormComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);
  private confirmationService = inject(ConfirmationService);
  private draftService = inject(SeguridadDraftService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  editAppId: string | null = null;
  appTouched = false;
  appForm: AppForm = { codigo: '', nombre: '', descripcion: '', estado: 'ACTIVO', nodoIds: [] };

  loading = signal(true);
  error = signal<string | null>(null);

  aplicaciones = signal<Aplicacion[]>([]);
  nivelesSegregacion = signal<NivelSegregacion[]>([]);
  nodosSegregacion = signal<NodoSegregacion[]>([]);

  // --- Búsqueda de nodo padre ---
  appNodoSearchText = signal('');

  private recoveredDraft: { form?: AppForm; touched?: boolean } | null = null;
  private recoveredNodoId = '';

  nivelMapSegregacion = computed(() => new Map(this.nivelesSegregacion().map(n => [n.id, n])));
  nodoMapSegregacion = computed(() => new Map(this.nodosSegregacion().map(n => [n.id, n])));
  nodosSegregacionPadresActivos = computed(() => {
    return this.nodosSegregacion()
      .filter(n => n.estado === 'ACTIVO' && n.padreId === null)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  });

  loadData = () => this._load();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.editAppId = id;
    this.appForm = { codigo: '', nombre: '', descripcion: '', estado: 'ACTIVO', nodoIds: [] };
    this.appTouched = false;
    this.appNodoSearchText.set('');
    this.recoveredDraft = this.draftService.consume() as { form?: AppForm; touched?: boolean } | null;
    this.recoveredNodoId = this.route.snapshot.queryParamMap.get('nodoId') || '';
    this._load();
  }

  private _load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listAplicaciones().subscribe({
      next: (d) => {
        this.aplicaciones.set(d);
        if (this.editAppId) {
          const a = d.find(x => x.id === this.editAppId);
          if (!a) { this.error.set('No se encontró la aplicación solicitada.'); this.loading.set(false); return; }
          const padreIds = new Set(this.nodosSegregacionPadresActivos().map(n => n.id));
          const nodoIds = (a.nodoIds || []).filter(id => padreIds.has(id)).slice(0, 1);
          this.appForm = {
            codigo: a.codigo,
            nombre: a.nombre,
            descripcion: a.descripcion,
            estado: a.estado,
            nodoIds,
          };
          const nodo = nodoIds[0] ? this.nodoMapSegregacion().get(nodoIds[0]) : undefined;
          this.appNodoSearchText.set(nodo ? `${nodo.codigo} · ${nodo.nombre}` : '');
        }
        this.applyRecovered();
      },
      error: (e) => this.error.set(e?.error?.error || e?.message || 'Error al cargar la aplicación.'),
      complete: () => this.loading.set(false),
    });
    this.api.listNivelesSegregacion().subscribe({
      next: (d) => this.nivelesSegregacion.set(d),
      error: () => {},
    });
    this.api.listNodosSegregacion().subscribe({
      next: (d) => {
        this.nodosSegregacion.set(d);
        this.applyRecovered();
      },
      error: () => {},
    });
  }

  private applyRecovered(): void {
    const draft = this.recoveredDraft;
    if (draft?.form) {
      this.appForm = { ...draft.form };
      if (typeof draft.touched === 'boolean') this.appTouched = draft.touched;
    }
    if (this.recoveredNodoId) {
      this.appForm.nodoIds = [this.recoveredNodoId];
      const nodo = this.nodoMapSegregacion().get(this.recoveredNodoId);
      if (nodo) this.appNodoSearchText.set(`${nodo.codigo} · ${nodo.nombre}`);
    } else if (this.appForm.nodoIds[0]) {
      const nodo = this.nodoMapSegregacion().get(this.appForm.nodoIds[0]);
      if (nodo) this.appNodoSearchText.set(`${nodo.codigo} · ${nodo.nombre}`);
    }
  }

  volver(): void {
    this.router.navigate(['/seguridades'], { queryParams: { tab: '0' } });
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

  saveApp(): void {
    this.appTouched = true;
    if (!this.appForm.codigo || !this.appForm.nombre) { this.toast.error('Faltan datos', 'Código y nombre son obligatorios.'); return; }
    if (!this.appForm.nodoIds?.length) { this.toast.error('Faltan datos', 'El nodo de segregación es obligatorio.'); return; }
    const padreIds = new Set(this.nodosSegregacionPadresActivos().map(n => n.id));
    const nodoIds = (this.appForm.nodoIds || []).filter(id => padreIds.has(id)).slice(0, 1);
    const payload = { ...this.appForm, nodoIds };

    const executeSave = async () => {
      try {
        if (this.editAppId) { await this.api.updateAplicacion(this.editAppId, payload).toPromise(); this.toast.success('Aplicación actualizada'); }
        else { await this.api.createAplicacion(payload).toPromise(); this.toast.success('Aplicación creada'); }
        this.events.emitDataChanged();
        this.volver();
      } catch (e: any) {
        const msg = e?.error?.error || e?.message || 'Error inesperado.';
        this.toast.error('Error', msg);
      }
    };

    if (this.editAppId) {
      this.confirmAction(`Se va a proceder con la edición de la aplicación "${this.appForm.nombre}", ¿desea continuar?`, executeSave);
    } else {
      executeSave();
    }
  }

  // --- Búsqueda de nodo padre ---
  goToNodoSelect(): void {
    this.draftService.save({ form: this.appForm, touched: this.appTouched });
    const path = this.editAppId ? `/seguridades/aplicaciones/${this.editAppId}/editar` : '/seguridades/aplicaciones/nuevo';
    this.router.navigate(['/seguridades/seleccionar-nodo'], { queryParams: { returnTo: path } });
  }

  selectAppNodo(nodo: NodoSegregacion): void {
    this.appForm.nodoIds = [nodo.id];
    this.appNodoSearchText.set(`${nodo.codigo} · ${nodo.nombre}`);
  }

  clearAppNodo(): void {
    this.appForm.nodoIds = [];
    this.appNodoSearchText.set('');
  }
}