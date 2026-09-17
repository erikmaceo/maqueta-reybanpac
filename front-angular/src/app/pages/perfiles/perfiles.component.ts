import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconDownloadComponent,
  IconUploadComponent,
} from '../../shared/components/icons';
import type { Perfil } from '../../shared/models/types';
import { validateBulkFileSize } from '../../shared/utils/file-validation';

@Component({
  selector: 'app-perfiles',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconDownloadComponent,
    IconUploadComponent,
  ],
  template: `
    @if (loadingPerf()) {
      <app-table-skeleton [rows]="5" [cols]="5" />
    } @else if (errorPerf()) {
      <app-error-state [message]="errorPerf()!" [onRetry]="loadPerfiles" />
    } @else {
      <div class="row between mb-4">
        <div class="search">
          <app-icon-search [width]="15" [height]="15" />
          <input type="text" placeholder="Buscar por código, nombre o programa..."
            [ngModel]="searchPerf()" (ngModelChange)="searchPerf.set($event)" />
        </div>
        <div class="row gap-2">
          <button class="btn btn-ghost" (click)="exportPerfs()">
            <app-icon-download [width]="14" [height]="14" /> Exportar
          </button>
          <button class="btn btn-primary" (click)="goToNuevoPerfil()">
            <app-icon-plus [width]="14" [height]="14" /> Nuevo Perfil
          </button>
          <button class="btn btn-primary" (click)="openPerfilBulkDialog()">
            <app-icon-upload [width]="14" [height]="14" /> Carga Masiva
          </button>
        </div>
      </div>
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Descripcion del perfil</th>
              <th>Estado</th>
              <th style="text-align:center;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (p of paginatedPerfs(); track p.id) {
              <tr>
                <td class="mono">{{ p.codigo }}</td>
                <td>
                  <a class="perfil-link" [routerLink]="p.id ? ['/perfiles', p.id] : null" [class.disabled]="!p.id">{{ p.nombre }}</a>
                </td>
                <td class="desc-col">{{ p.descripcion }}</td>
                <td>
                  <span class="badge" [class.badge-green]="p.estado === 'ACTIVO'" [class.badge-gray]="p.estado !== 'ACTIVO'">
                    {{ p.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <div class="cell-actions">
                    <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="goToEditarPerfil(p)">
                      <app-icon-edit [width]="15" [height]="15" />
                    </button>
                    <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeletePerf(p)">
                      <app-icon-trash [width]="15" [height]="15" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin perfiles registrados.</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (filteredPerfs().length > 0) {
        <div class="pagination">
          <div class="page-controls">
            <button class="btn btn-ghost btn-sm" [disabled]="pagePerf() === 0" (click)="setPage(pagePerf() - 1)">Anterior</button>
          </div>
          <span>Página {{ pagePerf() + 1 }} de {{ totalPagesPerf() }} ({{ filteredPerfs().length }} registros)</span>
          <div class="page-size-selector">
            <label class="small muted">Registros por página</label>
            <select class="select" style="width: auto; min-width: 60px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
              <option [value]="5">5</option>
              <option [value]="10">10</option>
              <option [value]="15">15</option>
              <option [value]="20">20</option>
            </select>
            <button class="btn btn-ghost btn-sm" [disabled]="pagePerf() === totalPagesPerf() - 1" (click)="setPage(pagePerf() + 1)">Siguiente</button>
          </div>
        </div>
      }
    }

    <!-- ============ DIÁLOGO CARGA MASIVA PERFILES ============ -->
    <p-dialog
      [(visible)]="showPerfilBulkDlg"
      header="Carga masiva de perfiles"
      [modal]="true" [style]="{ width: '620px' }" [closable]="true"
      (onHide)="closePerfilBulkDialog()"
    >
      <p class="mb-3 muted small">
        El archivo debe tener las columnas: <b>PERFIL_CODIGO</b>, <b>PERFIL_NOMBRE</b>, <b>PERFIL_DESCRIPCION</b>, <b>PRG_CODIGO</b>, <b>NUEVO</b>, <b>MODIFICAR</b>, <b>ANULAR</b>, <b>IMPRIMIR</b>, <b>CONSULTAR</b> y <b>ESTADO</b>.
        Una fila por cada programa asignado al perfil. Permisos: TRUE/FALSE.
      </p>

      <div class="row gap-2 mb-3">
        <button class="btn btn-ghost" (click)="downloadPerfilBulkTemplate()">
          <app-icon-download [width]="14" [height]="14" /> Descargar Plantilla
        </button>
      </div>

      <div class="field">
        <label>Archivo Excel</label>
        <input type="file" accept=".xlsx,.xls" (change)="onPerfilBulkFileSelected($event)" />
        @if (perfilBulkFileName()) {
          <div class="small mt-1">{{ perfilBulkFileName() }}</div>
        }
      </div>

      @if (perfilBulkSuccess()) {
        <div class="alert alert-success mb-3">{{ perfilBulkSuccess() }}</div>
      }

      @if (perfilBulkErrors().length > 0) {
        <div class="alert alert-error">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <span><b>Errores detectados:</b> {{ perfilBulkErrorsSummary() }}</span>
            <button class="btn btn-ghost btn-sm" (click)="downloadPerfilBulkErrors()" style="color:var(--red-700);font-weight:600;">
              <app-icon-download [width]="14" [height]="14" /> Descargar detalle
            </button>
          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closePerfilBulkDialog()">Cerrar</button>
        <button class="btn btn-primary" (click)="processPerfilBulkFile()" [disabled]="!perfilBulkFile || perfilBulkLoading()">
          @if (perfilBulkLoading()) {
            <span>Procesando...</span>
          } @else {
            <span>Procesar</span>
          }
        </button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .perfil-link {
      color: var(--primary, #2563eb);
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
    }
    .perfil-link:hover {
      text-decoration: underline;
    }
    ::ng-deep .p-confirmdialog-icon {
      font-size: 2.25rem !important;
      color: #ef4444 !important;
      margin-right: 1rem !important;
    }
  `],
})
export class PerfilesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);

  // --- Data signals ---
  perfiles = signal<Perfil[]>([]);

  loadingPerf = signal(true);
  errorPerf = signal<string | null>(null);

  // --- Dialogs ---
  showPerfilBulkDlg = false;
  perfilBulkFile: File | null = null;
  perfilBulkFileName = signal('');
  perfilBulkErrors = signal<{ row: number; message: string }[]>([]);
  perfilBulkErrorsSummary = signal('');
  perfilBulkSuccess = signal('');
  perfilBulkLoading = signal(false);

  // --- Filter & pagination ---
  searchPerf = signal('');
  pageSize = signal(5);
  pagePerf = signal(0);

  filteredPerfs = computed(() => {
    const q = this.searchPerf().toLowerCase().trim();
    if (!q) return this.perfiles();
    return this.perfiles().filter(p =>
      p.codigo.toLowerCase().includes(q) ||
      p.nombre.toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q) ||
      p.programas.some(pp => pp.prgCodigo.toLowerCase().includes(q) ||
        (pp.nuevo ? 'nuevo' : '').includes(q) ||
        (pp.modificar ? 'modificar' : '').includes(q) ||
        (pp.anular ? 'eliminar' : '').includes(q) ||
        (pp.imprimir ? 'imprimir' : '').includes(q) ||
        (pp.consultar ? 'consultar' : '').includes(q))
    );
  });

  paginatedPerfs = computed(() => {
    const start = this.pagePerf() * this.pageSize();
    return this.filteredPerfs().slice(start, start + this.pageSize());
  });

  totalPagesPerf = computed(() => Math.max(1, Math.ceil(this.filteredPerfs().length / this.pageSize())));

  // --- Refs ---
  loadPerfiles = () => this._loadPerf();

  ngOnInit(): void {
    this._loadPerf();
    this.events.onDataChanged(() => {
      this._loadPerf();
    });
  }

  // ============ LOADERS ============
  private _loadPerf(): void {
    this.loadingPerf.set(true); this.errorPerf.set(null);
    this.api.listPerfiles().subscribe({
      next: (d) => this.perfiles.set(d),
      error: (e) => this.errorPerf.set(e?.error?.error || e?.message || 'Error al cargar perfiles.'),
      complete: () => this.loadingPerf.set(false),
    });
  }

  // ============ PERFIL NAVIGATION ============
  goToNuevoPerfil(): void {
    this.router.navigate(['/perfiles/nuevo']);
  }

  goToEditarPerfil(p: Perfil): void {
    this.router.navigate(['/perfiles', p.id, 'editar']);
  }

  confirmDeletePerf(p: Perfil): void {
    this.confirmAction(`Se va a proceder con la eliminación del perfil "${p.nombre}", ¿desea continuar?`, () => {
      this.api.deletePerfil(p.id).subscribe({
        next: () => { this.toast.success('Perfil eliminado'); this.events.emitDataChanged(); this._loadPerf(); },
        error: (e) => { const msg = e?.error?.error || e?.message || 'Error inesperado.'; this.toast.error('Error', msg); },
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

  // ============ PAGINATION ============

  setPage(page: number): void {
    if (page < 0 || page >= this.totalPagesPerf()) return;
    this.pagePerf.set(page);
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.pagePerf.set(0);
  }

  // ============ EXPORT ============

  private exportXlsx(data: any[], headers: string[], cols: string[], filename: string): void {
    const aoa = [headers, ...data.map(row => cols.map(c => row[c] ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = cols.map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  exportPerfs(): void {
    const rows = this.filteredPerfs().flatMap(p =>
      p.programas.map(pp => ({
        codigo: p.codigo,
        nombre: p.nombre,
        descripcion: p.descripcion,
        programa: pp.prgCodigo,
        nuevo: pp.nuevo ? 'Sí' : 'No',
        modificar: pp.modificar ? 'Sí' : 'No',
        anular: pp.anular ? 'Sí' : 'No',
        imprimir: pp.imprimir ? 'Sí' : 'No',
        consultar: pp.consultar ? 'Sí' : 'No',
        estado: p.estado,
      }))
    );
    this.exportXlsx(
      rows,
      ['Código', 'Nombre', 'Descripción', 'Programa', 'Nuevo', 'Modificar', 'Eliminar', 'Imprimir', 'Consultar', 'Estado'],
      ['codigo', 'nombre', 'descripcion', 'programa', 'nuevo', 'modificar', 'anular', 'imprimir', 'consultar', 'estado'],
      'perfiles'
    );
  }

  // ============ BULK UPLOAD ============

  openPerfilBulkDialog(): void {
    this.showPerfilBulkDlg = true;
    this.perfilBulkFile = null;
    this.perfilBulkFileName.set('');
    this.perfilBulkErrors.set([]);
    this.perfilBulkSuccess.set('');
    this.perfilBulkLoading.set(false);
  }

  closePerfilBulkDialog(): void {
    this.showPerfilBulkDlg = false;
    this.perfilBulkFile = null;
    this.perfilBulkFileName.set('');
    this.perfilBulkErrors.set([]);
    this.perfilBulkErrorsSummary.set('');
    this.perfilBulkSuccess.set('');
    this.perfilBulkLoading.set(false);
  }

  setPerfilBulkErrors(errors: { row: number; message: string }[]): void {
    this.perfilBulkErrors.set(errors);
    const count = errors.length;
    this.perfilBulkErrorsSummary.set(`Se detectaron ${count} error${count !== 1 ? 'es' : ''}`);
  }

  downloadPerfilBulkErrors(): void {
    if (this.perfilBulkErrors().length === 0) return;
    const errors = this.perfilBulkErrors();
    const lines = [
      'DETALLE DE ERRORES - CARGA MASIVA DE PERFILES',
      '================================================',
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
    a.download = `errores_perfiles_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadPerfilBulkTemplate(): void {
    const headers = ['PERFIL_CODIGO', 'PERFIL_NOMBRE', 'PERFIL_DESCRIPCION', 'PRG_CODIGO', 'NUEVO', 'MODIFICAR', 'ANULAR', 'IMPRIMIR', 'CONSULTAR', 'ESTADO'];
    const rows: any[] = [headers];

    const perfilesActivos = this.perfiles().filter(p => p.estado === 'ACTIVO');

    if (perfilesActivos.length > 0) {
      for (const p of perfilesActivos.sort((x, y) => x.codigo.localeCompare(y.codigo))) {
        for (const pp of p.programas) {
          rows.push([
            p.codigo, p.nombre, p.descripcion, pp.prgCodigo,
            pp.nuevo ? 'TRUE' : 'FALSE',
            pp.modificar ? 'TRUE' : 'FALSE',
            pp.anular ? 'TRUE' : 'FALSE',
            pp.imprimir ? 'TRUE' : 'FALSE',
            pp.consultar ? 'TRUE' : 'FALSE',
            p.estado,
          ]);
        }
      }
    } else {
      rows.push(['PERF-FI-VIS', 'FI Visualizador', 'Visualización de documentos contables', 'PRG-FI-001', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'TRUE', 'ACTIVO']);
      rows.push(['PERF-FI-VIS', 'FI Visualizador', 'Visualización de documentos contables', 'PRG-FI-002', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'TRUE', 'ACTIVO']);
      rows.push(['PERF-FI-ADM', 'FI Administrador', 'Administración de documentos contables', 'PRG-FI-001', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'ACTIVO']);
      rows.push(['PERF-FI-ADM', 'FI Administrador', 'Administración de documentos contables', 'PRG-FI-002', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'ACTIVO']);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'plantilla-perfiles');
    XLSX.writeFile(wb, 'plantilla-perfiles.xlsx');
  }

  onPerfilBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.perfilBulkFile = file;
    this.perfilBulkFileName.set(file ? file.name : '');
    this.perfilBulkErrors.set([]);
    this.perfilBulkSuccess.set('');
  }

  private registerPerfilBulkFormatError(errors: { row: number; message: string }[]): void {
    this.api.registerBulkUploadError('PERFILES', errors).subscribe({ error: () => {} });
  }

  async processPerfilBulkFile(): Promise<void> {
    if (!this.perfilBulkFile) return;
    this.perfilBulkLoading.set(true);
    this.perfilBulkErrors.set([]);
    this.perfilBulkSuccess.set('');

    try {
      const data = await this.perfilBulkFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rawRows.length < 2) {
        const message = 'El archivo no contiene filas de datos.';
        this.setPerfilBulkErrors([{ row: 0, message }]);
        this.registerPerfilBulkFormatError([{ row: 0, message }]);
        this.perfilBulkLoading.set(false);
        return;
      }

      const headerRow = rawRows[0].map((h: any) => String(h).trim().toUpperCase());
      const expected = ['PERFIL_CODIGO', 'PERFIL_NOMBRE', 'PERFIL_DESCRIPCION', 'PRG_CODIGO', 'NUEVO', 'MODIFICAR', 'ANULAR', 'IMPRIMIR', 'CONSULTAR', 'ESTADO'];
      const missing = expected.filter(h => !headerRow.includes(h));
      if (missing.length > 0) {
        const message = `Formato incorrecto. Faltan columnas: ${missing.join(', ')}.`;
        this.setPerfilBulkErrors([{ row: 1, message }]);
        this.registerPerfilBulkFormatError([{ row: 1, message }]);
        this.perfilBulkLoading.set(false);
        return;
      }

      const idx = (h: string) => headerRow.indexOf(h);
      const rows: { row: number; perfilCodigo: string; perfilNombre: string; perfilDescripcion: string; prgCodigo: string; nuevo: string; modificar: string; anular: string; imprimir: string; consultar: string; estado: string }[] = [];
      for (let i = 1; i < rawRows.length; i++) {
        const raw = rawRows[i];
        if (raw.every((v: any) => !v || String(v).trim() === '')) continue;
        rows.push({
          row: i + 1,
          perfilCodigo: String(raw[idx('PERFIL_CODIGO')] ?? '').trim(),
          perfilNombre: String(raw[idx('PERFIL_NOMBRE')] ?? '').trim(),
          perfilDescripcion: String(raw[idx('PERFIL_DESCRIPCION')] ?? '').trim(),
          prgCodigo: String(raw[idx('PRG_CODIGO')] ?? '').trim(),
          nuevo: String(raw[idx('NUEVO')] ?? '').trim(),
          modificar: String(raw[idx('MODIFICAR')] ?? '').trim(),
          anular: String(raw[idx('ANULAR')] ?? '').trim(),
          imprimir: String(raw[idx('IMPRIMIR')] ?? '').trim(),
          consultar: String(raw[idx('CONSULTAR')] ?? '').trim(),
          estado: String(raw[idx('ESTADO')] ?? '').trim(),
        });
      }

      if (!rows.length) {
        const message = 'No se encontraron filas con datos válidos.';
        this.setPerfilBulkErrors([{ row: 0, message }]);
        this.registerPerfilBulkFormatError([{ row: 0, message }]);
        this.perfilBulkLoading.set(false);
        return;
      }

      this.api.bulkCreatePerfiles(rows).subscribe({
        next: (res) => {
          if (res.ok) {
            this.perfilBulkSuccess.set(`Se procesaron ${res.processed} perfiles: ${res.created} creados, ${res.updated} actualizados.`);
            this.perfilBulkFile = null;
            this.perfilBulkFileName.set('');
            this.events.emitDataChanged();
          } else {
            this.setPerfilBulkErrors(res.errors || [{ row: 0, message: 'Error desconocido.' }]);
          }
          this.perfilBulkLoading.set(false);
        },
        error: (e) => {
          console.error('bulkCreatePerfiles error', e);
          let message = 'Error al procesar el archivo.';
          if (e instanceof HttpErrorResponse) {
            if (e.status === 0) {
              message = 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
            } else if (e.status >= 500) {
              message = `Error interno del servidor (${e.status}). Revise la consola del backend.`;
            } else if (e.error?.error) {
              message = e.error.error;
            } else if (Array.isArray(e.error?.errors)) {
              this.setPerfilBulkErrors(e.error.errors);
              this.perfilBulkLoading.set(false);
              return;
            } else if (e.message) {
              message = e.message;
            }
          } else if (e?.error?.errors) {
            this.setPerfilBulkErrors(e.error.errors);
            this.perfilBulkLoading.set(false);
            return;
          } else if (e?.error?.error) {
            message = e.error.error;
          }
          this.setPerfilBulkErrors([{ row: 0, message }]);
          this.perfilBulkLoading.set(false);
        },
      });
    } catch (e: any) {
      const message = 'No se pudo leer el archivo Excel. Verifique el formato.';
      this.setPerfilBulkErrors([{ row: 0, message }]);
      this.registerPerfilBulkFormatError([{ row: 0, message }]);
      this.perfilBulkLoading.set(false);
    }
  }
}

