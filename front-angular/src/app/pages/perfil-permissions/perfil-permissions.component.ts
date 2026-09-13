import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import type { Perfil, Programa } from '../../shared/models/types';

interface PermissionControlRow {
  codigo: string;
  tipoControl: string;
  descripcion: string;
  visualizar: boolean;
  modificar: boolean;
}

interface PermissionForm {
  nuevo: boolean;
  modificar: boolean;
  anular: boolean;
  imprimir: boolean;
  consultar: boolean;
}

@Component({
  selector: 'app-perfil-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, TableSkeletonComponent, ErrorStateComponent],
  template: `
    @if (loading()) {
      <app-table-skeleton [rows]="5" [cols]="4" />
    } @else if (error()) {
      <div class="permission-error">
        <app-error-state [message]="error()!" [onRetry]="loadData" />
        <div class="center mt-3">
          <button class="btn btn-ghost" type="button" (click)="backToPerfiles()">
            <i class="pi pi-arrow-left mr-1"></i> Volver a Perfiles
          </button>
        </div>
      </div>
    } @else if (perfil(); as perf) {
      @if (programa(); as prg) {
        <div class="page-head permission-head">
          <button class="btn btn-ghost btn-sm" type="button" (click)="backToDetail()">
            <i class="pi pi-arrow-left mr-1"></i> Volver
          </button>
        </div>

        <div class="card permission-card">
          <div class="perm-info-grid">
            <div class="perm-info-item">
              <span class="perm-info-label">Cod. Perfil</span>
              <span class="perm-info-value mono">{{ perf.codigo }}</span>
            </div>
            <div class="perm-info-item">
              <span class="perm-info-label">Nombre del Perfil</span>
              <span class="perm-info-value">{{ perf.nombre }}</span>
            </div>
            <div class="perm-info-item">
              <span class="perm-info-label">Cod. Programa</span>
              <span class="perm-info-value mono">{{ prg.codigo }}</span>
            </div>
            <div class="perm-info-item">
              <span class="perm-info-label">Nombre del Programa</span>
              <span class="perm-info-value">{{ prg.nombre }}</span>
            </div>
          </div>

          <hr class="perm-divider" />

          <div class="perm-grid">
            <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.nuevo" /><span>Nuevo</span></label>
            <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.modificar" /><span>Modificar</span></label>
            <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.anular" /><span>Eliminar</span></label>
            <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.imprimir" /><span>Imprimir</span></label>
            <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.consultar" /><span>Consultar</span></label>
          </div>

          <hr class="perm-divider" />

          <div class="perm-section-title">Controles del Programa</div>
          @if (permControles.length) {
            <div class="card table-wrap" style="margin-top:8px;">
              <table class="data" style="width:100%;">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Tipo de Control</th>
                    <th>Descripción</th>
                    <th style="text-align:center;width:90px;">Visualizar</th>
                    <th style="text-align:center;width:90px;">Modificar</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of paginatedPermControles(); track $index) {
                    <tr>
                      <td class="mono">{{ c.codigo }}</td>
                      <td><span class="badge badge-blue">{{ c.tipoControl }}</span></td>
                      <td>{{ c.descripcion }}</td>
                      <td style="text-align:center;"><input type="checkbox" [(ngModel)]="c.visualizar" aria-label="Visualizar control" /></td>
                      <td style="text-align:center;"><input type="checkbox" [(ngModel)]="c.modificar" aria-label="Modificar control" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="controlsPage() === 1" (click)="changeControlsPage(-1)">Anterior</button>
              </div>
              <span>Página {{ controlsPage() }} de {{ controlsTotalPages() }} ({{ permControles.length }} registros)</span>
              <div class="page-size-selector">
                <label class="small muted">Registros por página</label>
                <select class="select" style="width: auto; min-width: 60px;" [ngModel]="controlsPageSize()" (ngModelChange)="changeControlsPageSize($event)">
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="15">15</option>
                  <option [value]="20">20</option>
                </select>
                <button class="btn btn-ghost btn-sm" [disabled]="controlsPage() === controlsTotalPages()" (click)="changeControlsPage(1)">Siguiente</button>
              </div>
            </div>
          } @else {
            <p class="muted small" style="margin-top:8px;">Este programa no tiene controles registrados.</p>
          }

        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" type="button" (click)="backToDetail()">Volver</button>
          <button class="btn btn-primary" type="button" [disabled]="saving()" (click)="savePermissions()">
            {{ saving() ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      }
    }
  `,
  styles: [`
    .permission-head {
      align-items: flex-start;
      justify-content: flex-end;
    }
    .permission-card {
      width: 100%;
      max-width: none;
      box-sizing: border-box;
      padding: 10px;
    }
    .perm-info-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    .perm-info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .perm-info-label {
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      color: var(--muted, #6b7280);
      font-weight: 600;
    }
    .perm-info-value {
      font-size: 0.9rem;
      font-weight: 500;
    }
    .perm-divider {
      border: none;
      border-top: 1px solid var(--border, #e5e7eb);
      margin: 16px 0;
    }
    .perm-section-title {
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--muted, #6b7280);
      margin-bottom: 10px;
    }
    .perm-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
    }
    .perm-check {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .permission-error {
      max-width: 720px;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 2px;
      margin-top: 10px;
    }
    @media (max-width: 960px) {
      .perm-info-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .perm-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    @media (max-width: 640px) {
      .permission-head {
        flex-direction: column;
      }
      .perm-info-grid,
      .perm-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class PerfilPermissionsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly events = inject(EventsService);

  perfilId = '';
  prgCodigo = '';
  perfil = signal<Perfil | null>(null);
  programa = signal<Programa | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  permForm: PermissionForm = this.blankPermissionForm();
  permControles: PermissionControlRow[] = [];
  private readonly permControlesVersion = signal(0);
  controlsPage = signal(1);
  controlsPageSize = signal(5);

  controlsTotalPages = computed(() => {
    this.permControlesVersion();
    return Math.max(1, Math.ceil(this.permControles.length / this.controlsPageSize()));
  });

  paginatedPermControles = computed(() => {
    this.permControlesVersion();
    const start = (this.controlsPage() - 1) * this.controlsPageSize();
    return this.permControles.slice(start, start + this.controlsPageSize());
  });

  loadData = (): void => {
    this.loading.set(true);
    this.error.set(null);
    const perfilId = this.route.snapshot.paramMap.get('perfilId') || '';
    const prgCodigo = this.route.snapshot.paramMap.get('prgCodigo') || '';
    this.perfilId = perfilId;
    this.prgCodigo = prgCodigo;

    forkJoin({
      perfiles: this.api.listPerfiles(),
      programas: this.api.listProgramas(),
      controles: this.api.listControles(),
    }).subscribe({
      next: ({ perfiles, programas, controles }) => {
        const perfil = perfiles.find((item) => item.id === perfilId);
        if (!perfil) {
          this.setLoadError('No se encontró el perfil solicitado.');
          return;
        }

        const perfilPrograma = perfil.programas.find((item) => item.prgCodigo === prgCodigo);
        if (!perfilPrograma) {
          this.setLoadError('El programa no está asociado al perfil seleccionado.');
          return;
        }

        const programa = programas.find((item) => item.codigo === prgCodigo);
        if (!programa) {
          this.setLoadError('No se encontró el programa solicitado.');
          return;
        }

        const sortedControls = controles
          .filter((control) => control.prgCodigo === prgCodigo)
          .slice()
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

        this.perfil.set(perfil);
        this.programa.set(programa);
        this.permForm = {
          nuevo: perfilPrograma.nuevo,
          modificar: perfilPrograma.modificar,
          anular: perfilPrograma.anular,
          imprimir: perfilPrograma.imprimir,
          consultar: perfilPrograma.consultar,
        };
        this.permControles = sortedControls.map((control, ctrlIndex) => {
          const existing = (perfilPrograma.controles || []).find((item) => item.ctrlIndex === ctrlIndex);
          return {
            codigo: control.codigo,
            tipoControl: control.tipoControl,
            descripcion: control.descripcion,
            visualizar: existing?.visualizar ?? false,
            modificar: existing?.modificar ?? false,
          };
        });
        this.controlsPage.set(1);
        this.permControlesVersion.update((version) => version + 1);
        this.loading.set(false);
      },
      error: (err) => {
        this.setLoadError(err?.error?.error || err?.message || 'Error al cargar los permisos del programa.');
      },
    });
  };

  ngOnInit(): void {
    this.loadData();
  }

  private blankPermissionForm(): PermissionForm {
    return { nuevo: false, modificar: false, anular: false, imprimir: false, consultar: false };
  }

  private setLoadError(message: string): void {
    this.perfil.set(null);
    this.programa.set(null);
    this.permControles = [];
    this.controlsPage.set(1);
    this.permControlesVersion.update((version) => version + 1);
    this.error.set(message);
    this.loading.set(false);
  }

  backToDetail(): void {
    if (this.perfilId) {
      this.router.navigate(['/perfiles', this.perfilId]);
    } else {
      this.backToPerfiles();
    }
  }

  backToPerfiles(): void {
    this.router.navigate(['/perfiles']);
  }

  changeControlsPageSize(value: number | string): void {
    this.controlsPageSize.set(Number(value));
    this.controlsPage.set(1);
  }

  changeControlsPage(delta: number): void {
    this.controlsPage.set(Math.min(Math.max(this.controlsPage() + delta, 1), this.controlsTotalPages()));
  }

  async savePermissions(): Promise<void> {
    const perfil = this.perfil();
    if (!perfil) return;

    const index = perfil.programas.findIndex((item) => item.prgCodigo === this.prgCodigo);
    if (index === -1) {
      this.setLoadError('El programa ya no está asociado al perfil seleccionado.');
      return;
    }

    const controles = this.permControles.map((control, ctrlIndex) => ({
      ctrlIndex,
      visualizar: control.visualizar,
      modificar: control.modificar,
    }));
    const programas = perfil.programas.map((item, itemIndex) => itemIndex === index
      ? { ...item, ...this.permForm, procesar: false, controles }
      : { ...item, controles: item.controles ? item.controles.map((control) => ({ ...control })) : item.controles });

    this.saving.set(true);
    try {
      await firstValueFrom(this.api.updatePerfil(perfil.id, { programas }));
      this.toast.success('Permisos actualizados');
      this.events.emitDataChanged();
      await this.router.navigate(['/perfiles', perfil.id]);
    } catch (err: any) {
      const message = err?.error?.error || err?.message || 'Error inesperado.';
      this.toast.error('Error', message);
    } finally {
      this.saving.set(false);
    }
  }
}
