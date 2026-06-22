import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, EmptyStateComponent, SearchBoxComponent } from '../../shared/components/ui';
import { IconAuditComponent, IconRefreshComponent, IconClockComponent } from '../../shared/components/icons';
import type { AuditEntry } from '../../shared/models/types';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    ConfirmDialogModule,
    TableSkeletonComponent,
    EmptyStateComponent,
    SearchBoxComponent,
    IconAuditComponent,
    IconRefreshComponent,
    IconClockComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Auditoría</h1>
        <p>Trazabilidad de todas las acciones de la consola.</p>
      </div>
      <div class="row gap-3">
        <button class="btn btn-ghost" (click)="loadData()">
          <app-icon-refresh [width]="16" [height]="16" /> Actualizar
        </button>
        <button class="btn btn-danger" (click)="confirmReset()">
          Reiniciar datos
        </button>
      </div>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="8" [cols]="4" />
    } @else if (filtered().length === 0) {
      <div class="card">
        <div class="empty">
          <div class="empty-icon"><app-icon-audit /></div>
          <h4>Sin actividad registrada</h4>
          <p class="muted small">Las acciones de la consola aparecerán aquí.</p>
        </div>
      </div>
    } @else {
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Actor</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of filtered(); track entry.id) {
              <tr>
                <td>
                  <div class="row gap-2">
                    <app-icon-clock [width]="14" [height]="14" style="color: var(--text-3);" />
                    <div>
                      <div class="small">{{ formatDateTime(entry.timestamp) }}</div>
                      <div class="tiny dim">{{ events.relativeTime(entry.timestamp) }}</div>
                    </div>
                  </div>
                </td>
                <td><b>{{ entry.actor }}</b></td>
                <td>
                  <span class="badge" [class]="getActionBadgeClass(entry.action)">
                    {{ entry.action }}
                  </span>
                </td>
                <td>
                  <span class="mono tiny">{{ entry.entityType }}</span>
                  @if (entry.entityId) {
                    <span class="muted tiny"> · {{ entry.entityId }}</span>
                  }
                </td>
                <td class="muted small">{{ entry.detail }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <p-confirmDialog></p-confirmDialog>
  `,
})
export class AuditComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private eventsSvc = inject(EventsService);

  entries = signal<AuditEntry[]>([]);
  loading = signal(false);
  q = signal('');

  get events(): EventsService {
    return this.eventsSvc;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.api.listAudit().subscribe({
      next: (e) => {
        this.entries.set(e);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  filtered(): AuditEntry[] {
    const query = this.q().toLowerCase();
    if (!query) return this.entries();
    return this.entries().filter(
      (e) =>
        `${e.actor} ${e.action} ${e.entityType} ${e.detail}`.toLowerCase().includes(query)
    );
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getActionBadgeClass(action: string): string {
    if (action.includes('CREAT') || action.includes('CREATE') || action.includes('AGREG')) return 'badge-green';
    if (action.includes('DELET') || action.includes('DELETE') || action.includes('ELIMIN')) return 'badge-red';
    if (action.includes('UPDAT') || action.includes('UPDATE') || action.includes('EDIT')) return 'badge-blue';
    if (action.includes('APPROV') || action.includes('APRUEB')) return 'badge-green';
    if (action.includes('REJECT') || action.includes('RECHAZ')) return 'badge-red';
    if (action.includes('LOGIN') || action.includes('INGRES')) return 'badge-violet';
    if (action.includes('LOGOUT') || action.includes('SALIR')) return 'badge-gray';
    return 'badge-gray';
  }

  confirmReset(): void {
    if (confirm('¿Reiniciar todos los datos? Esta acción no se puede deshacer.')) {
      this.reset();
    }
  }

  reset(): void {
    this.api.reset().subscribe({
      next: () => {
        this.toast.success('Datos reiniciados', 'Todos los datos fueron borrados.');
        this.eventsSvc.emitDataChanged();
        this.loadData();
      },
      error: (e) => this.toast.error('Error', e.message),
    });
  }
}
