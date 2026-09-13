import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { ApiService } from '../../core/services/api.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import {
  IconEditComponent, IconCheckComponent, IconCloseComponent,
} from '../../shared/components/icons';
import type { Control, Perfil, Programa } from '../../shared/models/types';

@Component({
  selector: 'app-perfil-detail',
  standalone: true,
  imports: [
    CommonModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    TableSkeletonComponent, ErrorStateComponent,
    IconEditComponent, IconCheckComponent, IconCloseComponent,
  ],
  template: `
    @if (loading()) {
      <app-table-skeleton [rows]="5" [cols]="5" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="loadData" />
    } @else if (perfil(); as perf) {
      <div class="perfil-detail">
        <div class="perfil-detail-header">
          <div>
            <h1 style="margin:8px 0 2px;">{{ perf.nombre }}</h1>
            <span class="muted small">{{ perf.codigo }} · {{ perf.descripcion }}</span>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" (click)="backToPerfiles()">
            <i class="pi pi-arrow-left mr-1"></i> Volver a Perfiles
          </button>
        </div>

        <p-tabs value="0">
          <p-tablist>
            <p-tab value="0"><i class="pi pi-th-large mr-2"></i>Programas por perfil</p-tab>
            <p-tab value="1"><i class="pi pi-lock mr-2"></i>Controles por perfil</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="0">
              <div class="card table-wrap">
                <table class="data">
                  <thead>
                    <tr>
                      <th>Código de Programa</th>
                      <th>Nombre</th>
                      <th>Tipo de Programa</th>
                      <th style="text-align:center;">Nuevo</th>
                      <th style="text-align:center;">Modificar</th>
                      <th style="text-align:center;">Eliminar</th>
                      <th style="text-align:center;">Imprimir</th>
                      <th style="text-align:center;">Consultar</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (pp of perfilDetalleProgramas(); track pp.prgCodigo) {
                      <tr>
                        <td class="mono">{{ pp.prgCodigo }}</td>
                        <td><div class="cell-strong">{{ pp.prgNombre }}</div></td>
                        <td><span class="badge badge-blue">{{ pp.tipo }}</span></td>
                        <td style="text-align:center;">
                          @if (pp.nuevo) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                          @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                        </td>
                        <td style="text-align:center;">
                          @if (pp.modificar) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                          @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                        </td>
                        <td style="text-align:center;">
                          @if (pp.anular) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                          @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                        </td>
                        <td style="text-align:center;">
                          @if (pp.imprimir) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                          @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                        </td>
                        <td style="text-align:center;">
                          @if (pp.consultar) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                          @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                        </td>
                        <td>
                          <div class="cell-actions">
                            <button
                              class="btn btn-ghost btn-sm btn-icon"
                              type="button"
                              title="Editar permisos"
                              [attr.aria-label]="'Editar permisos de ' + pp.prgCodigo"
                              (click)="openPermissions(pp.prgCodigo)"
                            >
                              <app-icon-edit [width]="15" [height]="15" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr><td colspan="9" class="muted center" style="padding: 24px;">Este perfil no tiene programas asociados.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </p-tabpanel>
            <p-tabpanel value="1">
              <div class="card table-wrap">
                <table class="data">
                  <thead>
                    <tr>
                      <th>Código de Programa</th>
                      <th>Código</th>
                      <th>Tipo de Control</th>
                      <th>Descripción del Control</th>
                      <th style="text-align:center;width:90px;">Visualizar</th>
                      <th style="text-align:center;width:90px;">Modificar</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of perfilDetalleControles(); track $index) {
                      <tr>
                        <td class="mono">{{ c.prgCodigo }}</td>
                        <td class="mono">{{ c.codigo }}</td>
                        <td><span class="badge badge-blue">{{ c.tipoControl }}</span></td>
                        <td>{{ c.descripcion }}</td>
                        <td style="text-align:center;">
                          @if (c.visualizar) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                          @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                        </td>
                        <td style="text-align:center;">
                          @if (c.modificar) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                          @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                        </td>
                      </tr>
                    } @empty {
                      <tr><td colspan="6" class="muted center" style="padding: 24px;">No hay controles asociados a los programas de este perfil.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </div>
    } @else {
      <app-error-state message="No se encontró el perfil solicitado." [onRetry]="loadData" />
    }
  `,
  styles: [`
    .perfil-detail {
      padding: 0;
    }
    .perfil-detail-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }
    .perfil-detail-header h1 {
      font-size: 1.25rem;
      font-weight: 700;
    }
    .perm-icon-yes {
      color: var(--green-600, #16a34a);
    }
    .perm-icon-no {
      color: var(--red-500, #ef4444);
    }
    @media (max-width: 640px) {
      .perfil-detail-header {
        flex-direction: column;
      }
    }
  `],
})
export class PerfilDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  perfilId = '';
  perfil = signal<Perfil | null>(null);
  programas = signal<Programa[]>([]);
  controlesMap = signal<Map<string, Control[]>>(new Map());
  loading = signal(true);
  error = signal<string | null>(null);

  perfilDetalleProgramas = computed(() => {
    const perf = this.perfil();
    if (!perf) return [];
    return perf.programas.map((pp) => {
      const prg = this.programas().find((p) => p.codigo === pp.prgCodigo);
      return {
        prgCodigo: pp.prgCodigo,
        prgNombre: prg?.nombre || '',
        tipo: prg?.tipo || '',
        nuevo: pp.nuevo,
        modificar: pp.modificar,
        anular: pp.anular,
        imprimir: pp.imprimir,
        consultar: pp.consultar,
      };
    });
  });

  perfilDetalleControles = computed(() => {
    const perf = this.perfil();
    if (!perf) return [];
    const result: { prgCodigo: string; codigo: string; tipoControl: string; descripcion: string; visualizar: boolean; modificar: boolean }[] = [];
    for (const pp of perf.programas) {
      const controles = this.controlesMap().get(pp.prgCodigo) || [];
      controles.forEach((control, ctrlIndex) => {
        const perfilControl = pp.controles?.find((pc) => pc.ctrlIndex === ctrlIndex);
        result.push({
          prgCodigo: pp.prgCodigo,
          codigo: control.codigo,
          tipoControl: control.tipoControl,
          descripcion: control.descripcion,
          visualizar: perfilControl?.visualizar ?? false,
          modificar: perfilControl?.modificar ?? false,
        });
      });
    }
    return result;
  });

  loadData = (): void => {
    this.loading.set(true);
    this.error.set(null);
    const perfilId = this.route.snapshot.paramMap.get('perfilId') || this.perfilId;
    this.perfilId = perfilId;

    forkJoin({
      perfiles: this.api.listPerfiles(),
      programas: this.api.listProgramas(),
      controles: this.api.listControles(),
    }).subscribe({
      next: ({ perfiles, programas, controles }) => {
        const perfil = perfiles.find((item) => item.id === perfilId);
        if (!perfil) {
          this.perfil.set(null);
          this.error.set('No se encontró el perfil solicitado.');
          this.loading.set(false);
          return;
        }

        const controlesMap = new Map<string, Control[]>();
        for (const control of controles) {
          const items = controlesMap.get(control.prgCodigo) || [];
          items.push(control);
          controlesMap.set(control.prgCodigo, items);
        }

        this.perfil.set(perfil);
        this.programas.set(programas);
        this.controlesMap.set(controlesMap);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error || err?.message || 'Error al cargar el detalle del perfil.');
        this.loading.set(false);
      },
    });
  };

  ngOnInit(): void {
    this.perfilId = this.route.snapshot.paramMap.get('perfilId') || '';
    this.loadData();
  }

  openPermissions(prgCodigo: string): void {
    this.router.navigate(['/perfiles', this.perfilId, 'programas', prgCodigo, 'permisos']);
  }

  backToPerfiles(): void {
    this.router.navigate(['/perfiles']);
  }
}
