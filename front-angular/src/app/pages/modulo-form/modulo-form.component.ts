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
import { IconSearchComponent } from '../../shared/components/icons';
import type { Aplicacion, Modulo } from '../../shared/models/types';

type Estado = 'ACTIVO' | 'INACTIVO';

interface ModForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  appCodigo: string;
  estado: Estado;
}

@Component({
  selector: 'app-modulo-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconSearchComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ editModId ? 'Editar Módulo' : 'Nuevo Módulo' }}</h1>
        <p>Configure los datos del módulo y su aplicación.</p>
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
      <div class="card modulo-form-card">
        <div class="form-grid">
          <div class="field">
            <label>Código <span class="required">*</span></label>
            <input class="input" [class.invalid]="modTouched && !modForm.codigo" [(ngModel)]="modForm.codigo" placeholder="MOD-FI" />
          </div>
          <div class="field">
            <label>Nombre <span class="required">*</span></label>
            <input class="input" [class.invalid]="modTouched && !modForm.nombre" [(ngModel)]="modForm.nombre" placeholder="Finanzas (FI)" />
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Aplicación <span class="required">*</span></label>
            <div class="search-field">
              <input class="select" type="text" [ngModel]="modAppSearchText()" readonly placeholder="Seleccione una aplicación..." [class.invalid]="modTouched && !modForm.appCodigo" />
              <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="goToAppSelect()" title="Buscar aplicación">
                <app-icon-search [width]="16" [height]="16" />
              </button>
            </div>
          </div>
          <div class="field">
            <label>Estado</label>
            <select class="select" [(ngModel)]="modForm.estado">
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>Descripción</label>
          <textarea class="input" [(ngModel)]="modForm.descripcion" rows="2" maxlength="250"></textarea>
          <div class="muted small" style="margin-top:2px;">{{ (modForm.descripcion || '').length }}/250 caracteres máximos.</div>
        </div>

        <div class="form-actions">
          <button class="btn btn-ghost" (click)="volver()">Cancelar</button>
          <button class="btn btn-primary" (click)="saveMod()">{{ editModId ? 'Guardar' : 'Crear' }}</button>
        </div>
      </div>
    }

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .modulo-form-card {
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
export class ModuloFormComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);
  private confirmationService = inject(ConfirmationService);
  private draftService = inject(SeguridadDraftService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  editModId: string | null = null;
  modTouched = false;
  modForm: ModForm = { codigo: '', nombre: '', descripcion: '', appCodigo: '', estado: 'ACTIVO' };

  loading = signal(true);
  error = signal<string | null>(null);

  aplicaciones = signal<Aplicacion[]>([]);

  // --- Búsqueda de aplicación ---
  modAppSearchText = signal('');

  private recoveredDraft: { form?: ModForm; touched?: boolean } | null = null;
  private recoveredAppCodigo = '';

  aplicacionMap = computed(() => new Map(this.aplicaciones().map(a => [a.codigo, a])));

  loadData = () => this._load();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.editModId = id;
    this.modForm = { codigo: '', nombre: '', descripcion: '', appCodigo: '', estado: 'ACTIVO' };
    this.modTouched = false;
    this.modAppSearchText.set('');
    this.recoveredDraft = this.draftService.consume() as { form?: ModForm; touched?: boolean } | null;
    this.recoveredAppCodigo = this.route.snapshot.queryParamMap.get('appCodigo') || '';
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
        if (this.editModId) {
          const m = d.find(x => x.id === this.editModId);
          if (!m) { this.error.set('No se encontró el módulo solicitado.'); this.loading.set(false); return; }
          this.modForm = { codigo: m.codigo, nombre: m.nombre, descripcion: m.descripcion, appCodigo: m.appCodigo, estado: m.estado };
          const a = this.aplicacionMap().get(m.appCodigo);
          this.modAppSearchText.set(a ? `${a.codigo} · ${a.nombre}` : `${m.appCodigo}`);
        }
        this.applyRecovered();
      },
      error: (e) => this.error.set(e?.error?.error || e?.message || 'Error al cargar el módulo.'),
      complete: () => this.loading.set(false),
    });
  }

  private applyRecovered(): void {
    const draft = this.recoveredDraft;
    if (draft?.form) {
      this.modForm = { ...draft.form };
      if (typeof draft.touched === 'boolean') this.modTouched = draft.touched;
    }
    if (this.recoveredAppCodigo) {
      this.modForm.appCodigo = this.recoveredAppCodigo;
      const a = this.aplicacionMap().get(this.recoveredAppCodigo);
      this.modAppSearchText.set(a ? `${a.codigo} · ${a.nombre}` : this.recoveredAppCodigo);
    } else if (this.modForm.appCodigo) {
      const a = this.aplicacionMap().get(this.modForm.appCodigo);
      this.modAppSearchText.set(a ? `${a.codigo} · ${a.nombre}` : this.modForm.appCodigo);
    }
  }

  volver(): void {
    this.router.navigate(['/seguridades'], { queryParams: { tab: '1' } });
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

  saveMod(): void {
    this.modTouched = true;
    if (!this.modForm.codigo || !this.modForm.nombre || !this.modForm.appCodigo) { this.toast.error('Faltan datos', 'Código, nombre y aplicación son obligatorios.'); return; }

    const executeSave = async () => {
      try {
        if (this.editModId) { await this.api.updateModulo(this.editModId, this.modForm).toPromise(); this.toast.success('Módulo actualizado'); }
        else { await this.api.createModulo(this.modForm).toPromise(); this.toast.success('Módulo creado'); }
        this.events.emitDataChanged();
        this.volver();
      } catch (e: any) {
        const msg = e?.error?.error || e?.message || 'Error inesperado.';
        this.toast.error('Error', msg);
      }
    };

    if (this.editModId) {
      this.confirmAction(`Se va a proceder con la edición del módulo "${this.modForm.nombre}", ¿desea continuar?`, executeSave);
    } else {
      executeSave();
    }
  }

  // --- Búsqueda de aplicación ---
  goToAppSelect(): void {
    this.draftService.save({ form: this.modForm, touched: this.modTouched });
    const path = this.editModId ? `/seguridades/modulos/${this.editModId}/editar` : '/seguridades/modulos/nuevo';
    this.router.navigate(['/seguridades/seleccionar-aplicacion'], { queryParams: { returnTo: path } });
  }

  selectApp(a: Aplicacion): void {
    this.modForm.appCodigo = a.codigo;
    this.modAppSearchText.set(`${a.codigo} · ${a.nombre}`);
  }
}