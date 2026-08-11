import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import type { User } from '../../shared/models/types';

@Component({
  selector: 'app-user-select',
  standalone: true,
  imports: [CommonModule, FormsModule, TableSkeletonComponent, ErrorStateComponent],
  template: `
    <div class="row" style="justify-content: flex-end; margin-bottom: 16px;">
      <button class="btn btn-ghost" (click)="goBack()">
        <i class="pi pi-arrow-left" style="margin-right: 6px;"></i> Volver
      </button>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="8" [cols]="6" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="loadData" />
    } @else {
      <div class="card mb-4" style="padding: 28px;">
        <div class="row gap-4 wrap" style="align-items: flex-end;">
          <div class="field" style="margin:0; gap:2px;">
            <label class="small muted">Usuario</label>
            <input type="text" class="select" placeholder="Usuario"
              [ngModel]="userSearchCodigo()" (ngModelChange)="userSearchCodigo.set($event); userSearchPage.set(1)" />
          </div>
          <div class="field" style="margin:0; gap:2px;">
            <label class="small muted">Nombre</label>
            <input type="text" class="select" placeholder="Nombre"
              [ngModel]="userSearchNombre()" (ngModelChange)="userSearchNombre.set($event); userSearchPage.set(1)" />
          </div>
          <div class="field" style="margin:0; gap:2px;">
            <label class="small muted">Apellido</label>
            <input type="text" class="select" placeholder="Apellido"
              [ngModel]="userSearchApellido()" (ngModelChange)="userSearchApellido.set($event); userSearchPage.set(1)" />
          </div>
          <div class="field" style="margin:0; gap:2px;">
            <label class="small muted">Correo</label>
            <input type="text" class="select" placeholder="Correo"
              [ngModel]="userSearchCorreo()" (ngModelChange)="userSearchCorreo.set($event); userSearchPage.set(1)" />
          </div>
          <div class="field" style="margin:0; gap:2px;">
            <label class="small muted">Empresa</label>
            <input type="text" class="select" placeholder="Empresa"
              [ngModel]="userSearchEmpresa()" (ngModelChange)="userSearchEmpresa.set($event); userSearchPage.set(1)" />
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
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Correo</th>
              <th>Empresa</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (u of paginatedUsers(); track u.id) {
              <tr>
                <td class="mono">{{ u.username }}</td>
                <td><div class="cell-strong">{{ u.firstName }}</div></td>
                <td><div class="cell-strong">{{ u.lastName }}</div></td>
                <td>{{ u.email }}</td>
                <td>{{ u.company }}</td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectUser(u)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <div class="page-controls">
          <button class="btn btn-ghost btn-sm" [disabled]="userSearchPage() === 1" (click)="changePage(-1)">Anterior</button>
        </div>
        <span>Página {{ userSearchPage() }} de {{ userSearchTotalPages() }} ({{ filteredUsers().length }} registros)</span>
        <div class="page-size-selector">
          <label class="small muted">Registros por página</label>
          <select class="select" style="width: auto; min-width: 60px;" [ngModel]="userSearchPageSize()" (ngModelChange)="changePageSize($event)">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="15">15</option>
            <option [value]="20">20</option>
          </select>
          <button class="btn btn-ghost btn-sm" [disabled]="userSearchPage() === userSearchTotalPages()" (click)="changePage(1)">Siguiente</button>
        </div>
      </div>
    }
  `,
})
export class UserSelectComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);

  users = signal<User[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  userSearchCodigo = signal('');
  userSearchNombre = signal('');
  userSearchApellido = signal('');
  userSearchCorreo = signal('');
  userSearchEmpresa = signal('');
  userSearchPage = signal(1);
  userSearchPageSize = signal(5);

  filteredUsers = computed(() => {
    const qCodigo = this.userSearchCodigo().toLowerCase().trim();
    const qNombre = this.userSearchNombre().toLowerCase().trim();
    const qApellido = this.userSearchApellido().toLowerCase().trim();
    const qCorreo = this.userSearchCorreo().toLowerCase().trim();
    const qEmpresa = this.userSearchEmpresa().toLowerCase().trim();
    return this.users().filter(u =>
      (!qCodigo || u.username.toLowerCase().includes(qCodigo)) &&
      (!qNombre || u.firstName.toLowerCase().includes(qNombre)) &&
      (!qApellido || u.lastName.toLowerCase().includes(qApellido)) &&
      (!qCorreo || u.email.toLowerCase().includes(qCorreo)) &&
      (!qEmpresa || u.company.toLowerCase().includes(qEmpresa))
    );
  });

  paginatedUsers = computed(() => {
    const start = (this.userSearchPage() - 1) * this.userSearchPageSize();
    return this.filteredUsers().slice(start, start + this.userSearchPageSize());
  });

  userSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / this.userSearchPageSize())));

  ngOnInit(): void {
    this.loadData();
  }

  loadData = (): void => {
    this.loading.set(true);
    this.error.set(null);
    this.api.listUserAccess().subscribe({
      next: (data) => {
        this.users.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los usuarios.');
        this.loading.set(false);
      },
    });
  };

  clearFilters(): void {
    this.userSearchCodigo.set('');
    this.userSearchNombre.set('');
    this.userSearchApellido.set('');
    this.userSearchCorreo.set('');
    this.userSearchEmpresa.set('');
    this.userSearchPage.set(1);
  }

  changePage(delta: number): void {
    this.userSearchPage.set(Math.min(Math.max(this.userSearchPage() + delta, 1), this.userSearchTotalPages()));
  }

  changePageSize(value: any): void {
    this.userSearchPageSize.set(Number(value));
    this.userSearchPage.set(1);
  }

  selectUser(u: User): void {
    this.router.navigate(['/nuevo-acceso'], { queryParams: { selectedUserId: u.id } });
  }

  goBack(): void {
    this.router.navigate(['/nuevo-acceso']);
  }
}
