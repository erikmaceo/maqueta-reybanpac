import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
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
    CommonModule, FormsModule, DialogModule, ConfirmDialogModule,
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
              <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openAppSearchDialog()" title="Buscar aplicación">
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

    <!-- ============ DIÁLOGO BÚSQUEDA APLICACIÓN ============ -->
    <p-dialog
      [(visible)]="showAppSearchDlg"
      header="Buscar aplicación"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="closeAppSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="appSearchCodigo" placeholder="Código de aplicación" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="appSearchNombre" placeholder="Nombre de aplicación" />
        </div>
        <div class="field">
          <label>Estado</label>
          <select class="select" [(ngModel)]="appSearchEstado">
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyAppFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearAppFilters()">Limpiar</button>
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
            @for (a of paginatedAppsForSearch(); track a.id) {
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
                  <button class="btn btn-primary btn-sm" (click)="selectAppFromDialog(a)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="appSearchPage() === 1" (click)="changeAppSearchPage(-1)">Anterior</button>
        <span>Página {{ appSearchPage() }} de {{ appSearchTotalPages() }} ({{ filteredAppsForSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="appSearchPage() === appSearchTotalPages()" (click)="changeAppSearchPage(1)">Siguiente</button>
      </div>
    </p-dialog>

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
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  editModId: string | null = null;
  modTouched = false;
  modForm: ModForm = { codigo: '', nombre: '', descripcion: '', appCodigo: '', estado: 'ACTIVO' };

  loading = signal(true);
  error = signal<string | null>(null);

  aplicaciones = signal<Aplicacion[]>([]);

  // --- Diálogo búsqueda de aplicación ---
  showAppSearchDlg = false;
  appSearchCodigo = '';
  appSearchNombre = '';
  appSearchEstado = '';
  appliedAppSearchCodigo = signal('');
  appliedAppSearchNombre = signal('');
  appliedAppSearchEstado = signal('');
  appSearchPage = signal(1);
  appSearchPageSize = signal(5);
  modAppSearchText = signal('');

  aplicacionMap = computed(() => new Map(this.aplicaciones().map(a => [a.codigo, a])));

  filteredAppsForSearch = computed(() => {
    const qCodigo = this.appliedAppSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedAppSearchNombre().toLowerCase().trim();
    const qEstado = this.appliedAppSearchEstado().trim();
    return this.aplicaciones().filter(a =>
      (!qCodigo || a.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || a.nombre.toLowerCase().includes(qNombre)) &&
      (!qEstado || a.estado === qEstado)
    );
  });

  paginatedAppsForSearch = computed(() => {
    const start = (this.appSearchPage() - 1) * this.appSearchPageSize();
    return this.filteredAppsForSearch().slice(start, start + this.appSearchPageSize());
  });

  appSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredAppsForSearch().length / this.appSearchPageSize())));

  loadData = () => this._load();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.editModId = id;
    this.modForm = { codigo: '', nombre: '', descripcion: '', appCodigo: '', estado: 'ACTIVO' };
    this.modTouched = false;
    this.modAppSearchText.set('');
    this._load();
  }

  private _load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listAplicaciones().subscribe({
      next: (d) => {
        this.aplicaciones.set(d);
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
      },
      error: (e) => this.error.set(e?.error?.error || e?.message || 'Error al cargar el módulo.'),
      complete: () => this.loading.set(false),
    });
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
  openAppSearchDialog(): void {
    this.appSearchCodigo = '';
    this.appSearchNombre = '';
    this.appSearchEstado = '';
    this.appliedAppSearchCodigo.set('');
    this.appliedAppSearchNombre.set('');
    this.appliedAppSearchEstado.set('');
    this.appSearchPage.set(1);
    this.showAppSearchDlg = true;
  }

  closeAppSearchDialog(): void {
    this.showAppSearchDlg = false;
  }

  applyAppFilters(): void {
    this.appliedAppSearchCodigo.set(this.appSearchCodigo);
    this.appliedAppSearchNombre.set(this.appSearchNombre);
    this.appliedAppSearchEstado.set(this.appSearchEstado);
    this.appSearchPage.set(1);
  }

  clearAppFilters(): void {
    this.appSearchCodigo = '';
    this.appSearchNombre = '';
    this.appSearchEstado = '';
    this.applyAppFilters();
  }

  changeAppSearchPage(delta: number): void {
    this.appSearchPage.set(Math.min(Math.max(this.appSearchPage() + delta, 1), this.appSearchTotalPages()));
  }

  selectApp(a: Aplicacion): void {
    this.modForm.appCodigo = a.codigo;
    this.modAppSearchText.set(`${a.codigo} · ${a.nombre}`);
  }

  selectAppFromDialog(a: Aplicacion): void {
    this.selectApp(a);
    this.closeAppSearchDialog();
  }
}