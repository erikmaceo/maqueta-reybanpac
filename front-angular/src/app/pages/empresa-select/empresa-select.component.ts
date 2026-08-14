import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import type { NivelSegregacion, NodoSegregacion } from '../../shared/models/types';

@Component({
  selector: 'app-empresa-select',
  standalone: true,
  imports: [CommonModule, FormsModule, TableSkeletonComponent, ErrorStateComponent],
  template: `
    <div class="row" style="justify-content: flex-end; margin-bottom: 16px;">
      <button class="btn btn-ghost" (click)="goBack()">
        <i class="pi pi-arrow-left" style="margin-right: 6px;"></i> Volver
      </button>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="8" [cols]="5" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="loadData" />
    } @else {
      <div class="card mb-4" style="padding: 28px;">
        <div class="row gap-4 wrap" style="align-items: flex-end;">
          <div class="field" style="margin:0; gap:2px;">
            <label class="small muted">Código</label>
            <input type="text" class="select" placeholder="Código de empresa"
              [ngModel]="searchCodigo()" (ngModelChange)="searchCodigo.set($event); searchPage.set(1)" />
          </div>
          <div class="field" style="margin:0; gap:2px;">
            <label class="small muted">Nombre</label>
            <input type="text" class="select" placeholder="Nombre de empresa"
              [ngModel]="searchNombre()" (ngModelChange)="searchNombre.set($event); searchPage.set(1)" />
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
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (n of paginatedNodos(); track n.id) {
              <tr>
                <td class="center">
                  <input type="checkbox" [checked]="selectedIds().includes(n.id)"
                    (change)="toggleSelection(n.id)" style="width:16px;height:16px;cursor:pointer;" />
                </td>
                <td class="mono">{{ n.codigo }}</td>
                <td><div class="cell-strong">{{ n.nombre }}</div></td>
                <td>
                  <span class="badge" [class.badge-green]="n.estado === 'ACTIVO'" [class.badge-gray]="n.estado !== 'ACTIVO'">
                    {{ n.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                  </span>
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
          <button class="btn btn-ghost btn-sm" [disabled]="searchPage() === 1" (click)="changePage(-1)">Anterior</button>
        </div>
        <span>Página {{ searchPage() }} de {{ searchTotalPages() }} ({{ filteredNodos().length }} registros)</span>
        <div class="page-size-selector">
          <label class="small muted">Registros por página</label>
          <select class="select" style="width: auto; min-width: 60px;" [ngModel]="searchPageSize()" (ngModelChange)="changePageSize($event)">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="15">15</option>
            <option [value]="20">20</option>
          </select>
          <button class="btn btn-ghost btn-sm" [disabled]="searchPage() === searchTotalPages()" (click)="changePage(1)">Siguiente</button>
        </div>
      </div>

      <div class="form-actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 5px;">
        <button class="btn btn-ghost" (click)="goBack()">Cancelar</button>
        <button class="btn btn-primary" (click)="accept()">Aceptar ({{ selectedIds().length }})</button>
      </div>
    }
  `,
})
export class EmpresaSelectComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  nivelId = signal('');
  nivelNombre = signal('Empresa');
  nodos = signal<NodoSegregacion[]>([]);
  niveles = signal<NivelSegregacion[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  searchCodigo = signal('');
  searchNombre = signal('');
  searchPage = signal(1);
  searchPageSize = signal(5);
  selectedIds = signal<string[]>([]);

  filteredNodos = computed(() => {
    const nivelId = this.nivelId();
    const qCodigo = this.searchCodigo().toLowerCase().trim();
    const qNombre = this.searchNombre().toLowerCase().trim();
    return this.nodos()
      .filter(n => n.nivelId === nivelId && n.estado === 'ACTIVO' &&
        (!qCodigo || n.codigo.toLowerCase().includes(qCodigo)) &&
        (!qNombre || n.nombre.toLowerCase().includes(qNombre))
      );
  });

  paginatedNodos = computed(() => {
    const start = (this.searchPage() - 1) * this.searchPageSize();
    return this.filteredNodos().slice(start, start + this.searchPageSize());
  });

  searchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredNodos().length / this.searchPageSize())));

  ngOnInit(): void {
    const nivelId = this.route.snapshot.queryParamMap.get('nivelId') || '';
    const nivelNombre = this.route.snapshot.queryParamMap.get('nivelNombre') || 'Empresa';
    const preselected = this.route.snapshot.queryParamMap.getAll('empresaIds');
    this.nivelId.set(nivelId);
    this.nivelNombre.set(nivelNombre);
    this.selectedIds.set(preselected);
    this.loadData();
  }

  loadData = (): void => {
    this.loading.set(true);
    this.error.set(null);
    this.api.listNivelesSegregacion().subscribe({
      next: (niveles) => {
        this.niveles.set(niveles);
        if (!this.nivelId()) {
          const sorted = [...niveles].sort((a, b) => a.orden - b.orden);
          this.nivelId.set(sorted[0]?.id || '');
          this.nivelNombre.set(sorted[0]?.nombre || 'Empresa');
        }
        this.api.listNodosSegregacion().subscribe({
          next: (nodos) => {
            this.nodos.set(nodos);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('No se pudieron cargar los nodos de segregación.');
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('No se pudieron cargar los niveles de segregación.');
        this.loading.set(false);
      },
    });
  };

  clearFilters(): void {
    this.searchCodigo.set('');
    this.searchNombre.set('');
    this.searchPage.set(1);
  }

  changePage(delta: number): void {
    this.searchPage.set(Math.min(Math.max(this.searchPage() + delta, 1), this.searchTotalPages()));
  }

  changePageSize(value: any): void {
    this.searchPageSize.set(Number(value));
    this.searchPage.set(1);
  }

  toggleSelection(id: string): void {
    const selected = this.selectedIds();
    if (selected.includes(id)) {
      this.selectedIds.set(selected.filter(x => x !== id));
    } else {
      this.selectedIds.set([...selected, id]);
    }
  }

  accept(): void {
    const ids = this.selectedIds();
    const currentParams: any = {};
    const selectedUserId = this.route.snapshot.queryParamMap.get('selectedUserId');
    const perfilCodigos = this.route.snapshot.queryParamMap.getAll('perfilCodigos');
    if (selectedUserId) currentParams.selectedUserId = selectedUserId;
    if (perfilCodigos.length) currentParams.perfilCodigos = perfilCodigos;
    if (ids.length) currentParams.empresaIds = ids;
    this.router.navigate(['/nuevo-acceso'], { queryParams: currentParams });
  }

  goBack(): void {
    const currentParams: any = {};
    const selectedUserId = this.route.snapshot.queryParamMap.get('selectedUserId');
    const perfilCodigos = this.route.snapshot.queryParamMap.getAll('perfilCodigos');
    if (selectedUserId) currentParams.selectedUserId = selectedUserId;
    if (perfilCodigos.length) currentParams.perfilCodigos = perfilCodigos;
    this.router.navigate(['/nuevo-acceso'], { queryParams: currentParams });
  }
}
