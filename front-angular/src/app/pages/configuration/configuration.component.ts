import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import {
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconDownloadComponent,
} from '../../shared/components/icons';
import type { Empresa, Sucursal, PuntoVenta } from '../../shared/models/types';

type Estado = 'ACTIVO' | 'INACTIVO';

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconDownloadComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Configuración</h1>
        <p>Gestión jerárquica de Empresas, Sucursales y Puntos de Venta.</p>
      </div>
    </div>

    <p-tabs value="0">
      <p-tablist>
        <p-tab value="0"><i class="pi pi-building mr-2"></i>Empresas</p-tab>
        <p-tab value="1"><i class="pi pi-map-marker mr-2"></i>Sucursales</p-tab>
        <p-tab value="2"><i class="pi pi-shopping-cart mr-2"></i>Puntos de Venta</p-tab>
      </p-tablist>
      <p-tabpanels>

      <!-- ============ EMPRESAS ============ -->
      <p-tabpanel value="0">
        @if (loadingEmp()) {
          <app-table-skeleton [rows]="5" [cols]="5" />
        } @else if (errorEmp()) {
          <app-error-state [message]="errorEmp()!" [onRetry]="loadEmpresas" />
        } @else {
          <div class="row between mb-4">
            <div class="search">
              <app-icon-search [width]="15" [height]="15" />
              <input type="text" placeholder="Buscar por código, nombre o RUC..."
                [ngModel]="searchEmp()" (ngModelChange)="searchEmp.set($event)" />
            </div>
            <div class="row gap-2">
              <button class="btn btn-ghost" (click)="exportEmpresas()">
                <app-icon-download [width]="14" [height]="14" /> Exportar
              </button>
              <button class="btn btn-primary" (click)="openEmpDialog()">
                <app-icon-plus [width]="14" [height]="14" /> Nueva empresa
              </button>
            </div>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre Comercial</th>
                  <th>Razón Social</th>
                  <th>RUC</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (e of paginatedEmps(); track e.id) {
                  <tr>
                    <td class="mono">{{ e.codigo }}</td>
                    <td><div class="cell-strong">{{ e.nombre }}</div><div class="tiny dim">{{ e.email }}</div></td>
                    <td><span class="muted small">{{ e.razonSocial }}</span></td>
                    <td class="mono">{{ e.ruc }}</td>
                    <td>
                      <span class="badge" [class.badge-green]="e.estado === 'ACTIVO'" [class.badge-gray]="e.estado !== 'ACTIVO'">
                        {{ e.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="cell-actions">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openEmpDialog(e)">
                          <app-icon-edit [width]="15" [height]="15" />
                        </button>
                        <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeleteEmp(e)">
                          <app-icon-trash [width]="15" [height]="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin empresas registradas.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (totalPagesEmp() > 1) {
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pageEmp() === 0" (click)="setPage('emp', pageEmp() - 1)">‹</button>
                @for (p of getPageNumbers(totalPagesEmp(), pageEmp()); track p) {
                  <button class="btn btn-sm" [class.btn-primary]="p === pageEmp()" [class.btn-ghost]="p !== pageEmp()" (click)="setPage('emp', p)">{{ p + 1 }}</button>
                }
                <button class="btn btn-ghost btn-sm" [disabled]="pageEmp() === totalPagesEmp() - 1" (click)="setPage('emp', pageEmp() + 1)">›</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>

      <!-- ============ SUCURSALES ============ -->
      <p-tabpanel value="1">
        @if (loadingSuc()) {
          <app-table-skeleton [rows]="5" [cols]="5" />
        } @else if (errorSuc()) {
          <app-error-state [message]="errorSuc()!" [onRetry]="loadSucursales" />
        } @else {
          <div class="row between mb-4">
            <div class="search">
              <app-icon-search [width]="15" [height]="15" />
              <input type="text" placeholder="Buscar por código o nombre..."
                [ngModel]="searchSuc()" (ngModelChange)="searchSuc.set($event)" />
            </div>
            <div class="row gap-2">
              <button class="btn btn-ghost" (click)="exportSucursales()">
                <app-icon-download [width]="14" [height]="14" /> Exportar
              </button>
              <button class="btn btn-primary" (click)="openSucDialog()">
                <app-icon-plus [width]="14" [height]="14" /> Nueva sucursal
              </button>
            </div>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Empresa</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (s of paginatedSucs(); track s.id) {
                  <tr>
                    <td class="mono">{{ s.codigo }}</td>
                    <td><div class="cell-strong">{{ s.nombre }}</div><div class="tiny dim">{{ s.telefono }}</div></td>
                    <td><span class="badge badge-blue">{{ s.empresaCodigo }}</span></td>
                    <td><span class="muted small">{{ s.direccion }}</span></td>
                    <td>
                      <span class="badge" [class.badge-green]="s.estado === 'ACTIVO'" [class.badge-gray]="s.estado !== 'ACTIVO'">
                        {{ s.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="cell-actions">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openSucDialog(s)">
                          <app-icon-edit [width]="15" [height]="15" />
                        </button>
                        <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeleteSuc(s)">
                          <app-icon-trash [width]="15" [height]="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin sucursales registradas.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (totalPagesSuc() > 1) {
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pageSuc() === 0" (click)="setPage('suc', pageSuc() - 1)">‹</button>
                @for (p of getPageNumbers(totalPagesSuc(), pageSuc()); track p) {
                  <button class="btn btn-sm" [class.btn-primary]="p === pageSuc()" [class.btn-ghost]="p !== pageSuc()" (click)="setPage('suc', p)">{{ p + 1 }}</button>
                }
                <button class="btn btn-ghost btn-sm" [disabled]="pageSuc() === totalPagesSuc() - 1" (click)="setPage('suc', pageSuc() + 1)">›</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>

      <!-- ============ PUNTOS DE VENTA ============ -->
      <p-tabpanel value="2">
        @if (loadingPv()) {
          <app-table-skeleton [rows]="5" [cols]="5" />
        } @else if (errorPv()) {
          <app-error-state [message]="errorPv()!" [onRetry]="loadPuntosVenta" />
        } @else {
          <div class="row between mb-4">
            <div class="search">
              <app-icon-search [width]="15" [height]="15" />
              <input type="text" placeholder="Buscar por código o nombre..."
                [ngModel]="searchPv()" (ngModelChange)="searchPv.set($event)" />
            </div>
            <div class="row gap-2">
              <button class="btn btn-ghost" (click)="exportPuntosVenta()">
                <app-icon-download [width]="14" [height]="14" /> Exportar
              </button>
              <button class="btn btn-primary" (click)="openPvDialog()">
                <app-icon-plus [width]="14" [height]="14" /> Nuevo punto de venta
              </button>
            </div>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Sucursal</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (pv of paginatedPvs(); track pv.id) {
                  <tr>
                    <td class="mono">{{ pv.codigo }}</td>
                    <td><div class="cell-strong">{{ pv.nombre }}</div></td>
                    <td><span class="badge badge-blue">{{ pv.sucursalCodigo }}</span></td>
                    <td><span class="muted small">{{ pv.direccion }}</span></td>
                    <td>
                      <span class="badge" [class.badge-green]="pv.estado === 'ACTIVO'" [class.badge-gray]="pv.estado !== 'ACTIVO'">
                        {{ pv.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="cell-actions">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openPvDialog(pv)">
                          <app-icon-edit [width]="15" [height]="15" />
                        </button>
                        <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeletePv(pv)">
                          <app-icon-trash [width]="15" [height]="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin puntos de venta registrados.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (totalPagesPv() > 1) {
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pagePv() === 0" (click)="setPage('pv', pagePv() - 1)">‹</button>
                @for (p of getPageNumbers(totalPagesPv(), pagePv()); track p) {
                  <button class="btn btn-sm" [class.btn-primary]="p === pagePv()" [class.btn-ghost]="p !== pagePv()" (click)="setPage('pv', p)">{{ p + 1 }}</button>
                }
                <button class="btn btn-ghost btn-sm" [disabled]="pagePv() === totalPagesPv() - 1" (click)="setPage('pv', pagePv() + 1)">›</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>

      </p-tabpanels>
    </p-tabs>

    <!-- ============ DIÁLOGO EMPRESA ============ -->
    <p-dialog
      [(visible)]="showEmpDlg"
      [header]="editEmpId ? 'Editar Empresa' : 'Nueva Empresa'"
      [modal]="true" [style]="{ width: '520px' }" [closable]="true"
      (onHide)="closeEmpDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="empForm.codigo" placeholder="EMP-001" />
        </div>
        <div class="field">
          <label>R.U.C.</label>
          <input class="input" [(ngModel)]="empForm.ruc" placeholder="0992345678001" />
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Razón Social</label>
          <input class="input" [(ngModel)]="empForm.razonSocial" placeholder="Reybanpac S.A." />
        </div>
        <div class="field">
          <label>Nombre Comercial</label>
          <input class="input" [(ngModel)]="empForm.nombre" placeholder="Reybanpac" />
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Dirección</label>
          <input class="input" [(ngModel)]="empForm.direccion" placeholder="Av. Carlos Luis Sáenz, Guayaquil" />
        </div>
        <div class="field">
          <label>Página Web</label>
          <input class="input" [(ngModel)]="empForm.paginaWeb" placeholder="www.empresa.com" />
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Teléfono</label>
          <input class="input" [(ngModel)]="empForm.telefono" placeholder="04-600-1234" />
        </div>
        <div class="field">
          <label>Email</label>
          <input class="input" [(ngModel)]="empForm.email" placeholder="info@empresa.com" />
        </div>
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="empForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      @for (cf of empForm.customFields; track $index) {
        <div class="field">
          <label>Personalizado No. {{ $index + 1 }}</label>
          <textarea class="input" [(ngModel)]="empForm.customFields[$index]" rows="2" maxlength="250"></textarea>
          <div class="muted small" style="margin-top:2px;">{{ (empForm.customFields[$index] || '').length }}/250 caracteres máximos.</div>
        </div>
      }
      <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;" (click)="addCustomField()">
        <app-icon-plus [width]="14" [height]="14" /> Agregar personalizados
      </button>
      <div class="field" style="margin-top:12px;">
        <label>Logo</label>
        <input type="file" #logoInput accept=".jpg,.jpeg,.png" style="display:none;" (change)="onLogoSelected($event)" />
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="btn btn-ghost btn-sm" (click)="logoInput.click()">
            <app-icon-plus [width]="14" [height]="14" /> Seleccionar imagen
          </button>
          @if (empForm.logo) {
            <img [src]="empForm.logo" style="height:40px;border-radius:6px;border:1px solid var(--border);" />
            <button class="btn btn-danger btn-sm btn-icon" (click)="empForm.logo = ''" title="Quitar logo">
              <app-icon-trash [width]="14" [height]="14" />
            </button>
          }
        </div>
        <div class="muted small" style="margin-top:4px;">Formatos: JPG, PNG. Tamaño máximo: 1 MB.</div>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeEmpDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="saveEmp()">{{ editEmpId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO SUCURSAL ============ -->
    <p-dialog
      [(visible)]="showSucDlg"
      [header]="editSucId ? 'Editar Sucursal' : 'Nueva Sucursal'"
      [modal]="true" [style]="{ width: '520px' }" [closable]="true"
      (onHide)="closeSucDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="sucForm.codigo" placeholder="SUC-GYE-01" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input class="input" [(ngModel)]="sucForm.nombre" placeholder="Matriz Guayaquil" />
        </div>
      </div>
      <div class="field">
        <label>Empresa</label>
        <select class="select" [(ngModel)]="sucForm.empresaCodigo">
          <option value="">— Seleccione —</option>
          @for (e of empresas(); track e.id) {
            <option [value]="e.codigo">{{ e.codigo }} · {{ e.nombre }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>Dirección</label>
        <input class="input" [(ngModel)]="sucForm.direccion" placeholder="Av. Carlos Luis Sáenz, Guayaquil" />
      </div>
      <div class="field">
        <label>Teléfono</label>
        <input class="input" [(ngModel)]="sucForm.telefono" placeholder="04-600-1234" />
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="sucForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeSucDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="saveSuc()">{{ editSucId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO PUNTO DE VENTA ============ -->
    <p-dialog
      [(visible)]="showPvDlg"
      [header]="editPvId ? 'Editar Punto De Venta' : 'Nuevo Punto De Venta'"
      [modal]="true" [style]="{ width: '520px' }" [closable]="true"
      (onHide)="closePvDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="pvForm.codigo" placeholder="PV-001" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input class="input" [(ngModel)]="pvForm.nombre" placeholder="Caja Principal" />
        </div>
      </div>
      <div class="field">
        <label>Empresa</label>
        <select class="select" [(ngModel)]="pvForm.empresaCodigo" (ngModelChange)="changePvEmpresa()">
          <option value="">— Seleccione —</option>
          @for (e of empresas(); track e.id) {
            <option [value]="e.codigo">{{ e.codigo }} · {{ e.nombre }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>Sucursal</label>
        <select class="select" [(ngModel)]="pvForm.sucursalCodigo">
          <option value="">— Seleccione —</option>
          @for (s of filteredSucsForPv(); track s.id) {
            <option [value]="s.codigo">{{ s.codigo }} · {{ s.nombre }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>Dirección</label>
        <input class="input" [(ngModel)]="pvForm.direccion" placeholder="Av. Carlos Luis Sáenz y 9 de Octubre" />
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="pvForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closePvDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="savePv()">{{ editPvId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
})
export class ConfigurationComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  empresas = signal<Empresa[]>([]);
  sucursales = signal<Sucursal[]>([]);
  puntosVenta = signal<PuntoVenta[]>([]);

  loadingEmp = signal(true);
  loadingSuc = signal(true);
  loadingPv = signal(true);
  errorEmp = signal<string | null>(null);
  errorSuc = signal<string | null>(null);
  errorPv = signal<string | null>(null);

  showEmpDlg = false; editEmpId: string | null = null;
  showSucDlg = false; editSucId: string | null = null;
  showPvDlg = false; editPvId: string | null = null;

  searchEmp = signal('');
  searchSuc = signal('');
  searchPv = signal('');

  pageSize = signal(10);
  pageEmp = signal(0);
  pageSuc = signal(0);
  pagePv = signal(0);

  empForm: any = {};
  sucForm: any = {};
  pvForm: any = {};

  filteredEmps = computed(() => {
    const q = this.searchEmp().toLowerCase().trim();
    if (!q) return this.empresas();
    return this.empresas().filter(e =>
      e.codigo.toLowerCase().includes(q) ||
      e.nombre.toLowerCase().includes(q) ||
      e.ruc.toLowerCase().includes(q) ||
      (e.direccion || '').toLowerCase().includes(q)
    );
  });
  filteredSucs = computed(() => {
    const q = this.searchSuc().toLowerCase().trim();
    if (!q) return this.sucursales();
    return this.sucursales().filter(s =>
      s.codigo.toLowerCase().includes(q) ||
      s.nombre.toLowerCase().includes(q) ||
      s.empresaCodigo.toLowerCase().includes(q) ||
      (s.direccion || '').toLowerCase().includes(q)
    );
  });
  filteredPvs = computed(() => {
    const q = this.searchPv().toLowerCase().trim();
    if (!q) return this.puntosVenta();
    return this.puntosVenta().filter(pv =>
      pv.codigo.toLowerCase().includes(q) ||
      pv.nombre.toLowerCase().includes(q) ||
      pv.sucursalCodigo.toLowerCase().includes(q) ||
      (pv.direccion || '').toLowerCase().includes(q)
    );
  });
  filteredSucsForPv = computed(() => {
    const empCod = this.pvForm?.empresaCodigo || '';
    if (!empCod) return this.sucursales();
    return this.sucursales().filter(s => s.empresaCodigo === empCod);
  });

  paginatedEmps = computed(() => {
    const start = this.pageEmp() * this.pageSize();
    return this.filteredEmps().slice(start, start + this.pageSize());
  });
  totalPagesEmp = computed(() => Math.max(1, Math.ceil(this.filteredEmps().length / this.pageSize())));

  paginatedSucs = computed(() => {
    const start = this.pageSuc() * this.pageSize();
    return this.filteredSucs().slice(start, start + this.pageSize());
  });
  totalPagesSuc = computed(() => Math.max(1, Math.ceil(this.filteredSucs().length / this.pageSize())));

  paginatedPvs = computed(() => {
    const start = this.pagePv() * this.pageSize();
    return this.filteredPvs().slice(start, start + this.pageSize());
  });
  totalPagesPv = computed(() => Math.max(1, Math.ceil(this.filteredPvs().length / this.pageSize())));

  setPage(entity: 'emp' | 'suc' | 'pv', page: number): void {
    const total = entity === 'emp' ? this.totalPagesEmp() : entity === 'suc' ? this.totalPagesSuc() : this.totalPagesPv();
    if (page < 0 || page >= total) return;
    if (entity === 'emp') this.pageEmp.set(page);
    else if (entity === 'suc') this.pageSuc.set(page);
    else this.pagePv.set(page);
  }

  getPageNumbers(total: number, current: number): number[] {
    const pages: number[] = [];
    for (let i = 0; i < total; i++) pages.push(i);
    return pages;
  }

  ngOnInit(): void {
    this.loadEmpresas();
    this.loadSucursales();
    this.loadPuntosVenta();
    this.events.onDataChanged(() => {
      this.loadEmpresas();
      this.loadSucursales();
      this.loadPuntosVenta();
    });
  }

  // ============ EMPRESAS ============
  loadEmpresas(): void {
    this.loadingEmp.set(true);
    this.errorEmp.set(null);
    this.api.listEmpresas().subscribe({
      next: (data) => { this.empresas.set(data); this.loadingEmp.set(false); },
      error: () => { this.errorEmp.set('No se pudieron cargar las empresas.'); this.loadingEmp.set(false); },
    });
  }
  blankEmp() { return { codigo: '', nombre: '', razonSocial: '', ruc: '', direccion: '', telefono: '', email: '', paginaWeb: '', estado: 'ACTIVO' as Estado, customFields: [] as string[], logo: '' }; }
  openEmpDialog(e?: Empresa): void {
    if (e) { this.empForm = { ...e, customFields: [...(e.customFields || [])] }; this.editEmpId = e.id; }
    else { this.empForm = this.blankEmp(); this.editEmpId = null; }
    this.showEmpDlg = true;
  }
  closeEmpDialog(): void { this.showEmpDlg = false; this.editEmpId = null; }
  addCustomField(): void { this.empForm.customFields.push(''); }
  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { this.toast.error('Archivo muy grande', 'El logo no puede superar 1 MB.'); return; }
    if (!['image/jpeg', 'image/png'].includes(file.type)) { this.toast.error('Formato no válido', 'Solo se permiten archivos JPG o PNG.'); return; }
    const reader = new FileReader();
    reader.onload = () => { this.empForm.logo = reader.result as string; };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }
  async saveEmp(): Promise<void> {
    if (!this.empForm.codigo || !this.empForm.nombre || !this.empForm.ruc) { this.toast.error('Faltan datos', 'Código, nombre y RUC son obligatorios.'); return; }
    try {
      if (this.editEmpId) { await this.api.updateEmpresa(this.editEmpId, this.empForm).toPromise(); this.toast.success('Empresa actualizada'); }
      else { await this.api.createEmpresa(this.empForm).toPromise(); this.toast.success('Empresa creada'); }
      this.events.emitDataChanged(); this.closeEmpDialog(); this.loadEmpresas();
    } catch (e: any) { this.toast.error('Error', e?.error?.error || e?.message || 'Error inesperado.'); }
  }
  confirmDeleteEmp(e: Empresa): void {
    if (confirm(`¿Eliminar la empresa "${e.nombre}"? Se eliminarán también sus sucursales y puntos de venta asociados.`)) {
      this.api.deleteEmpresa(e.id).subscribe({
        next: () => { this.toast.success('Empresa eliminada'); this.events.emitDataChanged(); },
        error: (e) => { this.toast.error('Error', e?.error?.error || 'Error inesperado.'); },
      });
    }
  }
  exportEmpresas(): void {
    this.exportXlsx(this.filteredEmps(), ['Código', 'Nombre Comercial', 'Razón Social', 'RUC', 'Dirección', 'Teléfono', 'Email', 'Página Web', 'Estado'], ['codigo', 'nombre', 'razonSocial', 'ruc', 'direccion', 'telefono', 'email', 'paginaWeb', 'estado'], 'empresas');
  }

  // ============ SUCURSALES ============
  loadSucursales(): void {
    this.loadingSuc.set(true);
    this.errorSuc.set(null);
    this.api.listSucursales().subscribe({
      next: (data) => { this.sucursales.set(data); this.loadingSuc.set(false); },
      error: () => { this.errorSuc.set('No se pudieron cargar las sucursales.'); this.loadingSuc.set(false); },
    });
  }
  blankSuc() { return { codigo: '', nombre: '', empresaCodigo: '', direccion: '', telefono: '', estado: 'ACTIVO' as Estado }; }
  openSucDialog(s?: Sucursal): void {
    if (s) { this.sucForm = { ...s }; this.editSucId = s.id; }
    else { this.sucForm = this.blankSuc(); this.editSucId = null; }
    this.showSucDlg = true;
  }
  closeSucDialog(): void { this.showSucDlg = false; this.editSucId = null; }
  async saveSuc(): Promise<void> {
    if (!this.sucForm.codigo || !this.sucForm.nombre || !this.sucForm.empresaCodigo) { this.toast.error('Faltan datos', 'Código, nombre y empresa son obligatorios.'); return; }
    try {
      if (this.editSucId) { await this.api.updateSucursal(this.editSucId, this.sucForm).toPromise(); this.toast.success('Sucursal actualizada'); }
      else { await this.api.createSucursal(this.sucForm).toPromise(); this.toast.success('Sucursal creada'); }
      this.events.emitDataChanged(); this.closeSucDialog(); this.loadSucursales();
    } catch (e: any) { this.toast.error('Error', e?.error?.error || e?.message || 'Error inesperado.'); }
  }
  confirmDeleteSuc(s: Sucursal): void {
    if (confirm(`¿Eliminar la sucursal "${s.nombre}"? Se eliminarán también sus puntos de venta asociados.`)) {
      this.api.deleteSucursal(s.id).subscribe({
        next: () => { this.toast.success('Sucursal eliminada'); this.events.emitDataChanged(); },
        error: (e) => { this.toast.error('Error', e?.error?.error || 'Error inesperado.'); },
      });
    }
  }
  exportSucursales(): void {
    this.exportXlsx(this.filteredSucs(), ['Código', 'Nombre', 'Empresa', 'Dirección', 'Teléfono', 'Estado'], ['codigo', 'nombre', 'empresaCodigo', 'direccion', 'telefono', 'estado'], 'sucursales');
  }

  // ============ PUNTOS DE VENTA ============
  loadPuntosVenta(): void {
    this.loadingPv.set(true);
    this.errorPv.set(null);
    this.api.listPuntosVenta().subscribe({
      next: (data) => { this.puntosVenta.set(data); this.loadingPv.set(false); },
      error: () => { this.errorPv.set('No se pudieron cargar los puntos de venta.'); this.loadingPv.set(false); },
    });
  }
  blankPv() { return { codigo: '', nombre: '', empresaCodigo: '', sucursalCodigo: '', direccion: '', estado: 'ACTIVO' as Estado }; }
  openPvDialog(pv?: PuntoVenta): void {
    if (pv) {
      const suc = this.sucursales().find(s => s.codigo === pv.sucursalCodigo);
      this.pvForm = { ...pv, empresaCodigo: suc?.empresaCodigo || '' };
      this.editPvId = pv.id;
    } else {
      this.pvForm = this.blankPv();
      this.editPvId = null;
    }
    this.showPvDlg = true;
  }
  closePvDialog(): void { this.showPvDlg = false; this.editPvId = null; }
  changePvEmpresa(): void { this.pvForm.sucursalCodigo = ''; }
  async savePv(): Promise<void> {
    if (!this.pvForm.codigo || !this.pvForm.nombre || !this.pvForm.sucursalCodigo) { this.toast.error('Faltan datos', 'Código, nombre y sucursal son obligatorios.'); return; }
    try {
      if (this.editPvId) { await this.api.updatePuntoVenta(this.editPvId, this.pvForm).toPromise(); this.toast.success('Punto de venta actualizado'); }
      else { await this.api.createPuntoVenta(this.pvForm).toPromise(); this.toast.success('Punto de venta creado'); }
      this.events.emitDataChanged(); this.closePvDialog(); this.loadPuntosVenta();
    } catch (e: any) { this.toast.error('Error', e?.error?.error || e?.message || 'Error inesperado.'); }
  }
  confirmDeletePv(pv: PuntoVenta): void {
    if (confirm(`¿Eliminar el punto de venta "${pv.nombre}"?`)) {
      this.api.deletePuntoVenta(pv.id).subscribe({
        next: () => { this.toast.success('Punto de venta eliminado'); this.events.emitDataChanged(); },
        error: (e) => { this.toast.error('Error', e?.error?.error || 'Error inesperado.'); },
      });
    }
  }
  exportPuntosVenta(): void {
    this.exportXlsx(this.filteredPvs(), ['Código', 'Nombre', 'Sucursal', 'Dirección', 'Estado'], ['codigo', 'nombre', 'sucursalCodigo', 'direccion', 'estado'], 'puntos-venta');
  }

  // ============ EXPORTAR ============
  private exportXlsx(data: any[], headers: string[], keys: string[], filename: string): void {
    const rows = data.map(row => {
      const obj: any = {};
      keys.forEach((k, i) => { obj[headers[i]] = row[k]; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, filename);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }
}
