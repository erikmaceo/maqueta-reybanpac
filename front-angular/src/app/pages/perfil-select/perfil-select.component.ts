import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import type { Perfil } from '../../shared/models/types';

@Component({
  selector: 'app-perfil-select',
  standalone: true,
  imports: [CommonModule, FormsModule, TableSkeletonComponent, ErrorStateComponent],
  template: `
    <div class="row" style="justify-content: flex-end; margin-bottom: 16px;">
      <button class="btn btn-ghost" (click)="goBack()">
        <i class="pi pi-arrow-left" style="margin-right: 6px;"></i> Volver
      </button>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="8" [cols]="4" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="loadData" />
    } @else {
      <div class="card mb-4" style="padding: 28px;">
        <div class="row gap-4 wrap" style="align-items: flex-end;">
          <div class="field" style="margin:0; gap:2px;">
            <label class="small muted">Código</label>
            <input type="text" class="select" placeholder="Código de perfil"
              [ngModel]="perfilSearchCodigo()" (ngModelChange)="perfilSearchCodigo.set($event); perfilSearchPage.set(1)" />
          </div>
          <div class="field" style="margin:0; gap:2px;">
            <label class="small muted">Nombre</label>
            <input type="text" class="select" placeholder="Nombre de perfil"
              [ngModel]="perfilSearchNombre()" (ngModelChange)="perfilSearchNombre.set($event); perfilSearchPage.set(1)" />
          </div>
          <div class="row gap-2" style="margin-left: auto;">
            <button class="btn btn-ghost" (click)="clearFilters()">Limpiar</button>
          </div>
        </div>
      </div>

      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th style="width:40px;"></th>
              <th>Código</th>
              <th>Nombre</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            @for (p of paginatedPerfiles(); track p.id) {
              <tr>
                <td class="center">
                  <input type="checkbox" [checked]="tempSelectedPerfilCodigos().includes(p.codigo)"
                    (change)="toggleSelection(p.codigo)" style="width:16px;height:16px;cursor:pointer;" />
                </td>
                <td class="mono">{{ p.codigo }}</td>
                <td><div class="cell-strong">{{ p.nombre }}</div></td>
                <td>{{ p.descripcion }}</td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <div class="page-controls">
          <button class="btn btn-ghost btn-sm" [disabled]="perfilSearchPage() === 1" (click)="changePage(-1)">Anterior</button>
        </div>
        <span>Página {{ perfilSearchPage() }} de {{ perfilSearchTotalPages() }} ({{ filteredPerfiles().length }} registros)</span>
        <div class="page-size-selector">
          <label class="small muted">Registros por página</label>
          <select class="select" style="width: auto; min-width: 60px;" [ngModel]="perfilSearchPageSize()" (ngModelChange)="changePageSize($event)">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="15">15</option>
            <option [value]="20">20</option>
          </select>
          <button class="btn btn-ghost btn-sm" [disabled]="perfilSearchPage() === perfilSearchTotalPages()" (click)="changePage(1)">Siguiente</button>
        </div>
      </div>

      <div class="form-actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 5px;">
        <button class="btn btn-ghost" (click)="goBack()">Cancelar</button>
        <button class="btn btn-primary" (click)="accept()">Aceptar ({{ tempSelectedPerfilCodigos().length }})</button>
      </div>
    }
  `,
})
export class PerfilSelectComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  perfiles = signal<Perfil[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  perfilSearchCodigo = signal('');
  perfilSearchNombre = signal('');
  perfilSearchPage = signal(1);
  perfilSearchPageSize = signal(5);
  tempSelectedPerfilCodigos = signal<string[]>([]);

  filteredPerfiles = computed(() => {
    const qCodigo = this.perfilSearchCodigo().toLowerCase().trim();
    const qNombre = this.perfilSearchNombre().toLowerCase().trim();
    return this.perfiles().filter(p =>
      (!qCodigo || p.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || p.nombre.toLowerCase().includes(qNombre))
    );
  });

  paginatedPerfiles = computed(() => {
    const start = (this.perfilSearchPage() - 1) * this.perfilSearchPageSize();
    return this.filteredPerfiles().slice(start, start + this.perfilSearchPageSize());
  });

  perfilSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredPerfiles().length / this.perfilSearchPageSize())));

  ngOnInit(): void {
    const preselected = this.route.snapshot.queryParamMap.getAll('perfilCodigos');
    this.tempSelectedPerfilCodigos.set(preselected);
    this.loadData();
  }

  loadData = (): void => {
    this.loading.set(true);
    this.error.set(null);
    this.api.listPerfiles().subscribe({
      next: (data) => {
        this.perfiles.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los perfiles.');
        this.loading.set(false);
      },
    });
  };

  clearFilters(): void {
    this.perfilSearchCodigo.set('');
    this.perfilSearchNombre.set('');
    this.perfilSearchPage.set(1);
  }

  changePage(delta: number): void {
    this.perfilSearchPage.set(Math.min(Math.max(this.perfilSearchPage() + delta, 1), this.perfilSearchTotalPages()));
  }

  changePageSize(value: any): void {
    this.perfilSearchPageSize.set(Number(value));
    this.perfilSearchPage.set(1);
  }

  toggleSelection(codigo: string): void {
    const selected = this.tempSelectedPerfilCodigos();
    if (selected.includes(codigo)) {
      this.tempSelectedPerfilCodigos.set(selected.filter(c => c !== codigo));
    } else {
      this.tempSelectedPerfilCodigos.set([...selected, codigo]);
    }
  }

  accept(): void {
    const codigos = this.tempSelectedPerfilCodigos();
    this.router.navigate(['/nuevo-acceso'], {
      queryParams: { perfilCodigos: codigos.length ? codigos : null },
    });
  }

  goBack(): void {
    this.router.navigate(['/nuevo-acceso']);
  }
}
