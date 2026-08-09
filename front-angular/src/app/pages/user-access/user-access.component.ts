import { Component, inject, OnInit, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import {
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconDownloadComponent, IconUploadComponent,
} from '../../shared/components/icons';
import type { User, NivelSegregacion, NodoSegregacion, Perfil } from '../../shared/models/types';
import { validateBulkFileSize } from '../../shared/utils/file-validation';

@Component({
  selector: 'app-user-access',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconDownloadComponent, IconUploadComponent,
  ],
  template: `
    @if (!embedded()) {
      <div class="page-head">
        <div>
          <h1>Accesos por usuario</h1>
          <p>Gestión de Nodos de Segregación y Perfiles asignados a cada usuario.</p>
        </div>
      </div>
    }

    @if (loading()) {
      <app-table-skeleton [rows]="5" [cols]="5" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="loadData" />
    } @else {
      <div class="row between mb-4">
        <div class="search">
          <app-icon-search [width]="15" [height]="15" />
          <input type="text" placeholder="Buscar por nombre, usuario o empresa..."
            [ngModel]="search()" (ngModelChange)="onSearchChange($event)" />
        </div>
        <div class="row gap-2">
          <button class="btn btn-ghost" (click)="exportData()">
            <app-icon-download [width]="14" [height]="14" /> Exportar
          </button>
          <button class="btn btn-primary" (click)="router.navigate(['/nuevo-acceso'])">
            <app-icon-plus [width]="14" [height]="14" /> Nuevo Acceso
          </button>
          <button class="btn btn-primary" (click)="openBulkDialog()">
            <app-icon-upload [width]="14" [height]="14" /> Carga Masiva
          </button>
        </div>
      </div>
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Nodos de Segregación</th>
              <th>Perfiles</th>
              <th>Estado</th>
              <th style="text-align:center;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (u of paginatedUsers(); track u.id) {
              <tr>
                <td class="mono">{{ u.username }}</td>
                <td><div class="cell-strong">{{ u.firstName }} {{ u.lastName }}</div><div class="tiny dim">{{ u.email }}</div></td>
                <td>
                  <div style="display:flex;flex-wrap:wrap;gap:4px;">
                    @for (nodoId of u.nodoIds; track nodoId) {
                      <span class="badge badge-blue">{{ getNodoLabel(nodoId) }}</span>
                    } @empty {
                      <span class="muted small">—</span>
                    }
                  </div>
                </td>
                <td>
                  <div style="display:flex;flex-wrap:wrap;gap:4px;">
                    @for (pc of u.perfilCodigos; track pc) {
                      <span class="badge badge-amber">{{ pc }}</span>
                    } @empty {
                      <span class="muted small">—</span>
                    }
                  </div>
                </td>
                <td>
                  <span class="badge" [class.badge-green]="u.status === 'ACTIVE'" [class.badge-gray]="u.status !== 'ACTIVE'">
                    {{ u.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <div class="cell-actions">
                    <button class="btn btn-ghost btn-sm btn-icon" title="Editar acceso" (click)="router.navigate(['/editar-acceso', u.id])">
                      <app-icon-edit [width]="15" [height]="15" />
                    </button>
                    <button class="btn btn-danger btn-sm btn-icon" title="Eliminar acceso" (click)="confirmDeleteAccess(u)">
                      <app-icon-trash [width]="15" [height]="15" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin usuarios encontrados.</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (filteredUsers().length > 0) {
        <div class="pagination">
          <div class="page-controls">
            <button class="btn btn-ghost btn-sm" [disabled]="page() === 0" (click)="setPage(page() - 1)">Anterior</button>
          </div>
          <span>Página {{ page() + 1 }} de {{ totalPages() }} ({{ filteredUsers().length }} registros)</span>
          <div class="page-size-selector">
            <label class="small muted">Registros por página</label>
            <select class="select" style="width: auto; min-width: 60px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
              <option [value]="5">5</option>
              <option [value]="10">10</option>
              <option [value]="15">15</option>
              <option [value]="20">20</option>
            </select>
            <button class="btn btn-ghost btn-sm" [disabled]="page() === totalPages() - 1" (click)="setPage(page() + 1)">Siguiente</button>
          </div>
        </div>
      }
    }

    <!-- ============ DIÁLOGO CARGA MASIVA ============ -->
    <p-dialog
      [(visible)]="showBulkDlg"
      header="Carga masiva de accesos"
      [modal]="true" [style]="{ width: '600px' }" [closable]="true"
      (onHide)="closeBulkDialog()"
    >
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <p class="small">Descargue la plantilla de ejemplo con la estructura actual de niveles de segregación. Complete una fila por usuario y suba el archivo Excel procesado.</p>
          <button class="btn btn-ghost btn-sm" (click)="downloadBulkTemplate()">
            <app-icon-download [width]="14" [height]="14" /> Descargar Plantilla de ejemplo
          </button>
        </div>

        <div class="field">
          <label>Archivo Excel (.xlsx)</label>
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" (change)="onBulkFileSelected($event)" />
          @if (bulkFileName()) {
            <small class="meta">Archivo seleccionado: {{ bulkFileName() }}</small>
          }
        </div>

        @if (bulkErrors().length > 0) {
          <div class="alert alert-error">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
              <span><b>Errores detectados:</b> {{ bulkErrorsSummary() }}</span>
              <button class="btn btn-ghost btn-sm" (click)="downloadBulkErrors()" style="color:var(--red-700);font-weight:600;">
                <app-icon-download [width]="14" [height]="14" /> Descargar detalle
              </button>
            </div>
          </div>
        }

        @if (bulkSuccess()) {
          <div class="alert alert-success">{{ bulkSuccess() }}</div>
        }
      </div>

      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeBulkDialog()" [disabled]="bulkLoading()">Cerrar</button>
        <button class="btn btn-primary" (click)="processBulkFile()" [disabled]="!bulkFile || bulkLoading()">
          @if (bulkLoading()) { Procesando... } @else { Procesar }
        </button>
      </ng-template>
    </p-dialog>

    @if (!embedded()) {
      <p-confirmDialog></p-confirmDialog>
    }
  `,
  styles: [`
    ::ng-deep .p-confirmdialog-icon {
      font-size: 2.25rem !important;
      color: #ef4444 !important;
      margin-right: 1rem !important;
    }
  `],
})
export class UserAccessComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);
  private confirmationService = inject(ConfirmationService);
  router = inject(Router);

  users = signal<User[]>([]);
  niveles = signal<NivelSegregacion[]>([]);
  nodos = signal<NodoSegregacion[]>([]);
  perfiles = signal<Perfil[]>([]);

  embedded = input(false);

  loading = signal(true);
  error = signal<string | null>(null);

  // --- Diálogo carga masiva ---
  showBulkDlg = false;
  bulkFile: File | null = null;
  bulkFileName = signal('');
  bulkLoading = signal(false);
  bulkErrors = signal<{ row: number; message: string }[]>([]);
  bulkErrorsSummary = signal('');
  bulkSuccess = signal('');

  search = signal('');
  pageSize = signal(5);
  page = signal(0);

  filteredUsers = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.nodoIds.some(id => this.getNodoLabel(id).toLowerCase().includes(q)) ||
      u.perfilCodigos.some(pc => pc.toLowerCase().includes(q))
    );
  });

  paginatedUsers = computed(() => {
    const start = this.page() * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize())));

  setPage(p: number): void {
    if (p < 0 || p >= this.totalPages()) return;
    this.page.set(p);
  }

  changePageSize(value: any): void {
    this.pageSize.set(Number(value));
    this.page.set(0);
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(0);
  }

  ngOnInit(): void {
    this.loadData();
    this.events.onDataChanged(() => this.loadData());
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listUserAccess().subscribe({
      next: (data) => { this.users.set(data); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar los usuarios.'); this.loading.set(false); },
    });
    this.api.listNivelesSegregacion().subscribe({ next: (data) => this.niveles.set(data) });
    this.api.listNodosSegregacion().subscribe({ next: (data) => this.nodos.set(data) });
    this.api.listPerfiles().subscribe({ next: (data) => this.perfiles.set(data) });
  }

  getNodoLabel(nodoId: string): string {
    const nodo = this.nodos().find(n => n.id === nodoId);
    if (!nodo) return nodoId;
    const nivel = this.niveles().find(n => n.id === nodo.nivelId);
    return `${nodo.codigo} · ${nodo.nombre}${nivel ? ` (${nivel.nombre})` : ''}`;
  }

  confirmDeleteAccess(u: User): void {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
    this.confirmAction(`Se va a proceder con la eliminación del acceso del usuario "${name}", ¿desea continuar?`, () => {
      this.api.updateUserAccess(u.id, { nodoIds: [], perfilCodigos: [] }).subscribe({
        next: () => {
          this.toast.success('Acceso eliminado');
          this.events.emitDataChanged();
          this.loadData();
        },
        error: (e: any) => { this.toast.error('Error', e?.error?.error || 'Error inesperado.'); },
      });
    });
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

  exportData(): void {
    const rows = this.filteredUsers().map(u => ({
      usuario: u.username,
      nombre: `${u.firstName} ${u.lastName}`,
      email: u.email,
      nodos: u.nodoIds.map(id => this.getNodoLabel(id)).join('; '),
      perfiles: u.perfilCodigos.join(', '),
      estado: u.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'accesos-usuario');
    XLSX.writeFile(wb, 'accesos-usuario.xlsx');
  }

  openBulkDialog(): void {
    this.showBulkDlg = true;
    this.bulkFile = null;
    this.bulkFileName.set('');
    this.bulkErrors.set([]);
    this.bulkSuccess.set('');
    this.bulkLoading.set(false);
  }

  closeBulkDialog(): void {
    this.showBulkDlg = false;
    this.bulkFile = null;
    this.bulkFileName.set('');
    this.bulkErrors.set([]);
    this.bulkErrorsSummary.set('');
    this.bulkSuccess.set('');
    this.bulkLoading.set(false);
  }

  setBulkErrors(errors: { row: number; message: string }[]): void {
    this.bulkErrors.set(errors);
    const count = errors.length;
    this.bulkErrorsSummary.set(`Se detectaron ${count} error${count !== 1 ? 'es' : ''}`);
  }

  downloadBulkErrors(): void {
    if (this.bulkErrors().length === 0) return;
    const errors = this.bulkErrors();
    const lines = [
      'DETALLE DE ERRORES - CARGA MASIVA DE ACCESOS POR USUARIO',
      '========================================================',
      '',
      `Fecha: ${new Date().toLocaleString('es-EC')}`,
      `Total errores: ${errors.length}`,
      '',
      '----------------------------------------------------',
      'LISTADO DE ERRORES',
      '----------------------------------------------------',
      '',
      ...errors.map(e => `Fila ${e.row}: ${e.message}`),
      '',
      '----------------------------------------------------',
      'FIN DEL REPORTE',
      '----------------------------------------------------',
    ];
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errores_accesos_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadBulkTemplate(): void {
    const nivelesActivos = [...this.niveles()]
      .filter(n => n.estado === 'ACTIVO')
      .sort((a, b) => a.orden - b.orden);
    const nivelHeaders = nivelesActivos.map(n => n.nombre.toUpperCase());

    const headers = ['USUARIO', 'PERFILES', ...nivelHeaders];

    const ejemploUsername = this.users().find(u => u.status === 'ACTIVE')?.username ?? 'usuario1';
    const ejemploPerfil = this.perfiles().find(p => p.estado === 'ACTIVO')?.codigo ?? 'PERF-FI-VIS';

    const exampleRow: Record<string, string> = {
      USUARIO: ejemploUsername,
      PERFILES: ejemploPerfil,
    };

    for (const nivel of nivelesActivos) {
      const header = nivel.nombre.toUpperCase();
      const ejemploNodo = this.nodos().find(n => n.nivelId === nivel.id && n.estado === 'ACTIVO');
      exampleRow[header] = ejemploNodo?.codigo ?? '';
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, Object.values(exampleRow)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'plantilla-accesos');
    XLSX.writeFile(wb, 'plantilla-accesos-usuario.xlsx');
  }

  onBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    const validation = validateBulkFileSize(file);
    if (!validation.valid) {
      this.toast.error('Archivo demasiado grande', validation.message || 'El archivo excede el tamaño permitido.');
      this.registerBulkFormatError([{ row: 0, message: validation.message || 'El archivo excede el tamaño permitido.' }]);
      this.bulkFile = null;
      this.bulkFileName.set('');
      this.bulkErrors.set([]);
      this.bulkSuccess.set('');
      input.value = '';
      return;
    }
    this.bulkFile = file;
    this.bulkFileName.set(file ? file.name : '');
    this.bulkErrors.set([]);
    this.bulkSuccess.set('');
  }

  private registerBulkFormatError(errors: { row: number; message: string }[]): void {
    this.api.registerBulkUploadError('ACCESOS', errors).subscribe({ error: () => {} });
  }

  private parseBulkCell(cell: string | number | undefined): string[] {
    if (cell === undefined || cell === null) return [];
    const str = String(cell).trim();
    if (!str) return [];
    return str.split(/[;,]/).map(s => s.trim()).filter(s => s);
  }

  async processBulkFile(): Promise<void> {
    if (!this.bulkFile) return;
    this.bulkLoading.set(true);
    this.bulkErrors.set([]);
    this.bulkSuccess.set('');

    try {
      const data = await this.bulkFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rawRows.length < 2) {
        const message = 'El archivo no contiene filas de datos.';
        this.setBulkErrors([{ row: 0, message }]);
        this.registerBulkFormatError([{ row: 0, message }]);
        this.bulkLoading.set(false);
        return;
      }

      const headerRow = rawRows[0].map((h: any) => String(h).trim().toUpperCase());
      const expectedHeaders = ['USUARIO', 'PERFILES', ...this.niveles()
        .filter(n => n.estado === 'ACTIVO')
        .sort((a, b) => a.orden - b.orden)
        .map(n => n.nombre.toUpperCase())];

      const missing = expectedHeaders.filter(h => !headerRow.includes(h));
      if (missing.length > 0) {
        const message = `Formato incorrecto. Faltan columnas: ${missing.join(', ')}.`;
        this.setBulkErrors([{ row: 1, message }]);
        this.registerBulkFormatError([{ row: 1, message }]);
        this.bulkLoading.set(false);
        return;
      }

      const nivelByHeader = new Map<string, NivelSegregacion>();
      for (const nivel of this.niveles()) {
        if (nivel.estado === 'ACTIVO') {
          nivelByHeader.set(nivel.nombre.toUpperCase(), nivel);
        }
      }

      const rows: { row: number; username: string; perfilCodigos: string[]; nodoCodigosPorNivelId: Record<string, string[]> }[] = [];
      for (let i = 1; i < rawRows.length; i++) {
        const raw = rawRows[i];
        if (raw.every((v: any) => !v || String(v).trim() === '')) continue;

        const rowNum = i + 1;
        const username = String(raw[headerRow.indexOf('USUARIO')] || '').trim();
        const perfilCodigos = this.parseBulkCell(raw[headerRow.indexOf('PERFILES')]);
        const nodoCodigosPorNivelId: Record<string, string[]> = {};

        for (const [header, nivel] of nivelByHeader) {
          const idx = headerRow.indexOf(header);
          nodoCodigosPorNivelId[nivel.id] = idx >= 0 ? this.parseBulkCell(raw[idx]) : [];
        }

        rows.push({ row: rowNum, username, perfilCodigos, nodoCodigosPorNivelId });
      }

      if (!rows.length) {
        const message = 'No se encontraron filas con datos válidos.';
        this.setBulkErrors([{ row: 0, message }]);
        this.registerBulkFormatError([{ row: 0, message }]);
        this.bulkLoading.set(false);
        return;
      }

      this.api.bulkUpdateUserAccess(rows).subscribe({
        next: (res) => {
          if (res.ok) {
            this.bulkSuccess.set(`Se procesaron ${res.processed} accesos correctamente.`);
            this.bulkFile = null;
            this.bulkFileName.set('');
            this.events.emitDataChanged();
            this.loadData();
          } else {
            this.setBulkErrors(res.errors || [{ row: 0, message: 'Error desconocido.' }]);
          }
          this.bulkLoading.set(false);
        },
        error: (e) => {
          console.error('bulkUpdateUserAccess error', e);
          let message = 'Error al procesar el archivo.';
          if (e instanceof HttpErrorResponse) {
            if (e.status === 0) {
              message = 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
            } else if (e.status >= 500) {
              message = `Error interno del servidor (${e.status}). Revise la consola del backend.`;
            } else if (e.error?.error) {
              message = e.error.error;
            } else if (Array.isArray(e.error?.errors)) {
              this.setBulkErrors(e.error.errors);
              this.bulkLoading.set(false);
              return;
            } else if (e.message) {
              message = e.message;
            }
          } else if (e?.error?.errors) {
            this.setBulkErrors(e.error.errors);
            this.bulkLoading.set(false);
            return;
          } else if (e?.error?.error) {
            message = e.error.error;
          }
          this.setBulkErrors([{ row: 0, message }]);
          this.bulkLoading.set(false);
        },
      });
    } catch (e: any) {
      const message = 'No se pudo leer el archivo Excel. Verifique el formato.';
      this.setBulkErrors([{ row: 0, message }]);
      this.registerBulkFormatError([{ row: 0, message }]);
      this.bulkLoading.set(false);
    }
  }
}

