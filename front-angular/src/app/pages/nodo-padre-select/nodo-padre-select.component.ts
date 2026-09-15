import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import type { NivelSegregacion, NodoSegregacion } from '../../shared/models/types';

@Component({
  selector: 'app-nodo-padre-select',
  standalone: true,
  imports: [CommonModule, FormsModule, TableSkeletonComponent, ErrorStateComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Seleccionar Nodo de Segregación</h1>
        <p>Seleccione el nodo padre que desea asociar.</p>
      </div>
      <button class="btn btn-ghost btn-sm" (click)="goBack()">
        <i class="pi pi-arrow-left mr-1"></i> Volver
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
            <input type="text" class="select" placeholder="Código de nodo"
              [ngModel]="searchCodigo()" (ngModelChange)="searchCodigo.set($event); searchPage.set(1)" />
          </div>
          <div class="field" style="margin:0; gap:2px;">
            <label class="small muted">Nombre</label>
            <input type="text" class="select" placeholder="Nombre de nodo"
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
              <th>Código</th>
              <th>Nombre</th>
              <th>Nivel</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (n of paginatedNodos(); track n.id) {
              <tr>
                <td class="mono">{{ n.codigo }}</td>
                <td><div class="cell-strong">{{ n.nombre }}</div></td>
                <td>{{ nivelMap().get(n.nivelId)?.nombre || n.nivelId }}</td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="select(n)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted center" style="padding: 24px;">Sin nodos padre activos.</td></tr>
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
    }
  `,
})
export class NodoPadreSelectComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  nodos = signal<NodoSegregacion[]>([]);
  niveles = signal<NivelSegregacion[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  searchCodigo = signal('');
  searchNombre = signal('');
  searchPage = signal(1);
  searchPageSize = signal(5);

  private returnTo = '';

  nivelMap = computed(() => new Map(this.niveles().map(n => [n.id, n])));

  nodosPadreActivos = computed(() => {
    return this.nodos()
      .filter(n => n.estado === 'ACTIVO' && n.padreId === null)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  });

  filteredNodos = computed(() => {
    const qCodigo = this.searchCodigo().toLowerCase().trim();
    const qNombre = this.searchNombre().toLowerCase().trim();
    return this.nodosPadreActivos().filter(n =>
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
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo') || '';
    this.loadData();
  }

  loadData = (): void => {
    this.loading.set(true);
    this.error.set(null);
    this.api.listNivelesSegregacion().subscribe({
      next: (niveles) => this.niveles.set(niveles),
      error: () => {},
    });
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

  goBack(): void {
    if (this.returnTo) {
      this.router.navigate([this.returnTo]);
    } else {
      this.router.navigate(['/seguridades']);
    }
  }

  select(n: NodoSegregacion): void {
    this.router.navigate([this.returnTo || '/seguridades'], { queryParams: { nodoId: n.id } });
  }
}