import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import {
  TableSkeletonComponent,
  ErrorStateComponent,
  EmptyStateComponent,
} from '../../shared/components/ui';
import { IconSecurityComponent, IconArrowLeftComponent } from '../../shared/components/icons';
import type { Aplicacion } from '../../shared/models/types';

const COLORS = ['#2563eb', '#7c3aed', '#0d9488', '#d97706', '#dc2626', '#0891b2', '#db2777'];

@Component({
  selector: 'app-aplicaciones',
  standalone: true,
  imports: [
    CommonModule,
    TableSkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    IconSecurityComponent,
    IconArrowLeftComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Aplicaciones</h1>
        <p>Catálogo de aplicaciones registradas en el sistema de seguridades.</p>
      </div>
      <button class="btn btn-ghost" (click)="goBack()">
        <app-icon-arrow-left /> Volver
      </button>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="6" [cols]="3" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="load" />
    } @else if (aplicaciones().length === 0) {
      <div class="card">
        <div class="empty">
          <div class="empty-icon"><app-icon-security /></div>
          <h4>Aún no hay aplicaciones</h4>
          <p class="muted small">Las aplicaciones se gestionan desde la pantalla de Seguridades.</p>
          <div class="mt-4">
            <button class="btn btn-primary" (click)="goBack()">
              <app-icon-arrow-left /> Volver
            </button>
          </div>
        </div>
      </div>
    } @else {
      <div class="grid cols-3">
        @for (app of aplicaciones(); track app.id; let i = $index) {
          <div class="card pad" style="display: flex; flex-direction: column; gap: 12px;">
            <div class="row between">
              <div class="icon-tile" [style.background]="getColor(i)" [style.width.px]="40" [style.height.px]="40" [style.fontSize.px]="14">
                {{ app.codigo.slice(0, 2).toUpperCase() }}
              </div>
              <span class="badge" [class.badge-green]="app.estado === 'ACTIVO'" [class.badge-red]="app.estado === 'INACTIVO'">
                {{ app.estado }}
              </span>
            </div>
            <div>
              <h3 style="font-size: 16px; margin: 0;">{{ app.nombre }}</h3>
              <div class="mono tiny dim">{{ app.codigo }}</div>
            </div>
            <p class="muted small" style="flex: 1; margin: 0;">{{ app.descripcion || 'Sin descripción' }}</p>
            <div class="row gap-3 small muted">
              <span class="row gap-2">
                {{ app.nodoIds.length }} {{ app.nodoIds.length === 1 ? 'nodo' : 'nodos' }} asignados
              </span>
            </div>
            @if (app.createdAt) {
              <div class="tiny dim">Creada: {{ app.createdAt | date:'shortDate' }}</div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class AplicacionesComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  aplicaciones = signal<Aplicacion[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  load = () => this.loadData();

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listAplicaciones().subscribe({
      next: (apps) => {
        this.aplicaciones.set(apps);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  getColor(index: number): string {
    return COLORS[index % COLORS.length];
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
