import { Component, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { IconUploadComponent, IconDownloadComponent, IconMatrixComponent } from '../../shared/components/icons';

@Component({
  selector: 'app-matrix-access',
  standalone: true,
  imports: [CommonModule, IconUploadComponent, IconDownloadComponent, IconMatrixComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Matriz de Acceso</h1>
        <p>Carga masiva de Aplicaciones, Módulos, Programas y Perfiles desde un archivo Excel.</p>
      </div>
      <div class="row gap-2">
        <button class="btn btn-ghost" (click)="downloadTemplate()">
          <app-icon-download [width]="15" [height]="15" /> Descargar plantilla
        </button>
        <button class="btn btn-primary" (click)="triggerFileInput()" [disabled]="uploading()">
          <app-icon-upload [width]="15" [height]="15" />
          {{ uploading() ? 'Cargando...' : 'Cargar Excel' }}
        </button>
        <input
          #fileInput
          type="file"
          accept=".xlsx,.xls"
          style="display:none"
          (change)="onFileSelected($event)"
        />
      </div>
    </div>

    <!-- Card resumen del resultado -->
    @if (resultSummary()) {
      <div class="card mb-4" style="border-left: 4px solid var(--green-600);">
        <div class="row between">
          <div>
            <div class="cell-strong" style="margin-bottom:6px;">Carga completada</div>
            <div class="muted small">{{ resultSummary() }}</div>
          </div>
          <button class="btn btn-ghost btn-sm" (click)="resultSummary.set(null)">Cerrar</button>
        </div>
      </div>
    }

    <!-- Zona de drag-drop visual -->
    <div class="card" style="padding: 40px; text-align: center;">
      <div style="width:64px;height:64px;border-radius:16px;background:var(--surface-2);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <app-icon-matrix [width]="28" [height]="28" />
      </div>
      <h2 style="font-size:18px;font-weight:700;margin-bottom:8px;">Importar matriz de seguridades</h2>
      <p class="muted" style="max-width:520px;margin:0 auto 20px;">
        Seleccione un archivo Excel (.xlsx) con la estructura de columnas indicada abajo.
        El sistema creará automáticamente las Aplicaciones, Módulos, Programas y Perfiles
        que no existan. Los que ya existan (por código) se mantendrán sin duplicar.
      </p>
      <button class="btn btn-primary" (click)="triggerFileInput()" [disabled]="uploading()">
        <app-icon-upload [width]="15" [height]="15" />
        {{ uploading() ? 'Procesando...' : 'Seleccionar archivo' }}
      </button>
    </div>

    <!-- Estructura del Excel -->
    <div class="card mt-4">
      <h2 style="font-size:15px;font-weight:700;margin-bottom:14px;">Estructura del archivo Excel</h2>
      <p class="muted small mb-4">
        Cada fila representa un Perfil. La jerarquía (Aplicación → Módulo → Programa → Perfil)
        se construye a partir de las columnas. Si un código ya existe, no se duplica.
      </p>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Columna</th>
              <th>Campo</th>
              <th>Obligatorio</th>
              <th>Descripción</th>
              <th>Ejemplo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="mono">A</td>
              <td><b>app_codigo</b></td>
              <td><span class="badge badge-green">Sí</span></td>
              <td class="muted small">Código único de la Aplicación.</td>
              <td class="mono">APP-SAP</td>
            </tr>
            <tr>
              <td class="mono">B</td>
              <td><b>app_nombre</b></td>
              <td><span class="badge badge-green">Sí</span></td>
              <td class="muted small">Nombre descriptivo de la Aplicación.</td>
              <td>SAP ERP</td>
            </tr>
            <tr>
              <td class="mono">C</td>
              <td><b>app_descripcion</b></td>
              <td><span class="badge badge-gray">No</span></td>
              <td class="muted small">Descripción de la Aplicación.</td>
              <td>Sistema ERP corporativo</td>
            </tr>
            <tr>
              <td class="mono">D</td>
              <td><b>mod_codigo</b></td>
              <td><span class="badge badge-green">Sí</span></td>
              <td class="muted small">Código único del Módulo.</td>
              <td class="mono">MOD-FI</td>
            </tr>
            <tr>
              <td class="mono">E</td>
              <td><b>mod_nombre</b></td>
              <td><span class="badge badge-green">Sí</span></td>
              <td class="muted small">Nombre del Módulo.</td>
              <td>Finanzas (FI)</td>
            </tr>
            <tr>
              <td class="mono">F</td>
              <td><b>mod_descripcion</b></td>
              <td><span class="badge badge-gray">No</span></td>
              <td class="muted small">Descripción del Módulo.</td>
              <td>Módulo de Finanzas</td>
            </tr>
            <tr>
              <td class="mono">G</td>
              <td><b>prg_codigo</b></td>
              <td><span class="badge badge-green">Sí</span></td>
              <td class="muted small">Código único del Programa.</td>
              <td class="mono">PRG-FI-DOCS</td>
            </tr>
            <tr>
              <td class="mono">H</td>
              <td><b>prg_nombre</b></td>
              <td><span class="badge badge-green">Sí</span></td>
              <td class="muted small">Nombre del Programa.</td>
              <td>Documentos contables</td>
            </tr>
            <tr>
              <td class="mono">I</td>
              <td><b>prg_descripcion</b></td>
              <td><span class="badge badge-gray">No</span></td>
              <td class="muted small">Descripción del Programa.</td>
              <td>Gestión de documentos</td>
            </tr>
            <tr>
              <td class="mono">J</td>
              <td><b>perf_codigo</b></td>
              <td><span class="badge badge-green">Sí</span></td>
              <td class="muted small">Código único del Perfil.</td>
              <td class="mono">PERF-FI-VIS</td>
            </tr>
            <tr>
              <td class="mono">K</td>
              <td><b>perf_nombre</b></td>
              <td><span class="badge badge-green">Sí</span></td>
              <td class="muted small">Nombre del Perfil.</td>
              <td>FI Visualizador</td>
            </tr>
            <tr>
              <td class="mono">L</td>
              <td><b>perf_descripcion</b></td>
              <td><span class="badge badge-gray">No</span></td>
              <td class="muted small">Descripción del Perfil.</td>
              <td>Solo consulta</td>
            </tr>
            <tr>
              <td class="mono">M</td>
              <td><b>estado</b></td>
              <td><span class="badge badge-gray">No</span></td>
              <td class="muted small">ACTIVO o INACTIVO. Default: ACTIVO.</td>
              <td>ACTIVO</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Ejemplo -->
    <div class="card mt-4">
      <h2 style="font-size:15px;font-weight:700;margin-bottom:14px;">Ejemplo de contenido</h2>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>app_codigo</th>
              <th>app_nombre</th>
              <th>mod_codigo</th>
              <th>mod_nombre</th>
              <th>prg_codigo</th>
              <th>prg_nombre</th>
              <th>perf_codigo</th>
              <th>perf_nombre</th>
              <th>estado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="mono">APP-SAP</td>
              <td>SAP ERP</td>
              <td class="mono">MOD-FI</td>
              <td>Finanzas</td>
              <td class="mono">PRG-FI-DOCS</td>
              <td>Documentos contables</td>
              <td class="mono">PERF-FI-VIS</td>
              <td>FI Visualizador</td>
              <td><span class="badge badge-green">Activo</span></td>
            </tr>
            <tr>
              <td class="mono">APP-SAP</td>
              <td>SAP ERP</td>
              <td class="mono">MOD-FI</td>
              <td>Finanzas</td>
              <td class="mono">PRG-FI-DOCS</td>
              <td>Documentos contables</td>
              <td class="mono">PERF-FI-EDT</td>
              <td>FI Editor</td>
              <td><span class="badge badge-green">Activo</span></td>
            </tr>
            <tr>
              <td class="mono">APP-SAP</td>
              <td>SAP ERP</td>
              <td class="mono">MOD-MM</td>
              <td>Materiales</td>
              <td class="mono">PRG-MM-PO</td>
              <td>Órdenes de compra</td>
              <td class="mono">PERF-MM-COMPR</td>
              <td>MM Comprador</td>
              <td><span class="badge badge-green">Activo</span></td>
            </tr>
            <tr>
              <td class="mono">APP-CRM</td>
              <td>Salesforce CRM</td>
              <td class="mono">MOD-VE</td>
              <td>Ventas</td>
              <td class="mono">PRG-VE-LEAD</td>
              <td>Gestión de leads</td>
              <td class="mono">PERF-VE-VEND</td>
              <td>Vendedor</td>
              <td><span class="badge badge-green">Activo</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class MatrixAccessComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  uploading = signal(false);
  resultSummary = signal<string | null>(null);

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadFile(file);
    input.value = '';
  }

  private uploadFile(file: File): void {
    this.uploading.set(true);
    this.resultSummary.set(null);
    this.api.uploadMatriz(file).subscribe({
      next: (resp) => {
        this.uploading.set(false);
        this.resultSummary.set(resp.summary);
        this.toast.success('Carga exitosa', resp.summary);
        this.events.emitDataChanged();
      },
      error: (err) => {
        this.uploading.set(false);
        const msg = err?.error?.error || err?.message || 'Error al procesar el archivo.';
        this.toast.error('Error', msg);
      },
    });
  }

  downloadTemplate(): void {
    const headers = [
      'app_codigo','app_nombre','app_descripcion',
      'mod_codigo','mod_nombre','mod_descripcion',
      'prg_codigo','prg_nombre','prg_descripcion',
      'perf_codigo','perf_nombre','perf_descripcion',
      'estado',
    ];
    const rows = [
      ['APP-SAP','SAP ERP','Sistema ERP corporativo','MOD-FI','Finanzas (FI)','Módulo de Finanzas','PRG-FI-DOCS','Documentos contables','Gestión de documentos','PERF-FI-VIS','FI Visualizador','Solo consulta','ACTIVO'],
      ['APP-SAP','SAP ERP','Sistema ERP corporativo','MOD-FI','Finanzas (FI)','Módulo de Finanzas','PRG-FI-DOCS','Documentos contables','Gestión de documentos','PERF-FI-EDT','FI Editor','Edición completa','ACTIVO'],
      ['APP-SAP','SAP ERP','Sistema ERP corporativo','MOD-MM','Materiales (MM)','Gestión de materiales','PRG-MM-PO','Órdenes de compra','PO y recepciones','PERF-MM-COMPR','MM Comprador','Crea y aprueba PO','ACTIVO'],
      ['APP-CRM','Salesforce CRM','CRM de ventas','MOD-VE','Ventas','Gestión comercial','PRG-VE-LEAD','Gestión de leads','Leads y oportunidades','PERF-VE-VEND','Vendedor','Gestiona sus leads','ACTIVO'],
    ];
    const aoa = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz');
    XLSX.writeFile(wb, 'plantilla_matriz_acceso.xlsx');
  }
}