import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, EmptyStateComponent, SearchBoxComponent } from '../../shared/components/ui';
import { IconAuditComponent, IconRefreshComponent, IconClockComponent, IconDownloadComponent } from '../../shared/components/icons';
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
    IconDownloadComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Auditoría</h1>
        <p>Trazabilidad de todas las acciones de la consola.</p>
      </div>
    </div>

    <div class="row between mb-4 wrap gap-3">
      <div class="row gap-3 wrap">
        <div class="row gap-2">
          <div class="field" style="margin:0;">
            <label class="small muted">Desde</label>
            <input type="date" class="select" [ngModel]="desde()" (ngModelChange)="onDesdeChange($event)" />
          </div>
          <div class="field" style="margin:0;">
            <label class="small muted">Hasta</label>
            <input type="date" class="select" [ngModel]="hasta()" (ngModelChange)="onHastaChange($event)" />
          </div>
        </div>
      </div>
      <button class="btn btn-ghost" (click)="exportAudit()">
        <app-icon-download [width]="16" [height]="16" /> Exportar
      </button>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="8" [cols]="4" />
    } @else if (entries().length === 0) {
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
            @for (entry of entries(); track entry.id) {
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

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="page() === 1" (click)="changePage(-1)">Anterior</button>
        <span>Página {{ page() }} de {{ totalPages() }} ({{ totalItems() }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="page() === totalPages()" (click)="changePage(1)">Siguiente</button>
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
  totalItems = signal(0);
  loading = signal(false);
  q = signal('');
  desde = signal('');
  hasta = signal('');
  page = signal(1);
  pageSize = signal(25);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const maxButtons = 5;
    let start = Math.max(1, current - Math.floor(maxButtons / 2));
    let end = Math.min(total, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  get events(): EventsService {
    return this.eventsSvc;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.api.listAudit({
      q: this.q(),
      desde: this.desde(),
      hasta: this.hasta(),
      page: this.page(),
      limit: this.pageSize(),
    }).subscribe({
      next: (res) => {
        this.entries.set(res.items);
        this.totalItems.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onSearch(value: string): void {
    this.q.set(value);
    this.page.set(1);
    this.loadData();
  }

  onDesdeChange(value: string): void {
    this.desde.set(value);
    this.page.set(1);
    this.loadData();
  }

  onHastaChange(value: string): void {
    this.hasta.set(value);
    this.page.set(1);
    this.loadData();
  }

  changePageSize(value: any): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
    this.loadData();
  }

  changePage(delta: number): void {
    this.page.set(Math.min(Math.max(this.page() + delta, 1), this.totalPages()));
    this.loadData();
  }

  setPage(p: number): void {
    this.page.set(p);
    this.loadData();
  }

  exportAudit(): void {
    this.loading.set(true);
    this.api.listAudit({ q: this.q(), desde: this.desde(), hasta: this.hasta(), page: 1, limit: 10000 }).subscribe({
      next: (res) => {
        const rows = res.items.map(e => ({
          Fecha: this.formatDateTime(e.timestamp),
          Actor: e.actor,
          Accion: e.action,
          Entidad: e.entityType,
          EntidadId: e.entityId || '',
          Detalle: e.detail,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'auditoria');
        XLSX.writeFile(wb, 'auditoria.xlsx');
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
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
