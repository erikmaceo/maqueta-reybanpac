import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import {
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent,
} from '../../shared/components/icons';
import type { Pais, Provincia, Ciudad } from '../../shared/models/types';

type Estado = 'ACTIVO' | 'INACTIVO';

const MOCK_PAISES: Pais[] = [
  { id: '1', codigo: 'ECU', descripcion: 'Ecuador', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '2', codigo: 'PER', descripcion: 'Perú', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '3', codigo: 'COL', descripcion: 'Colombia', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '4', codigo: 'CHL', descripcion: 'Chile', estado: 'INACTIVO', createdAt: new Date().toISOString() },
];

const MOCK_PROVINCIAS: Provincia[] = [
  { id: '1', codigo: 'GYE', descripcion: 'Guayas', paisId: '1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '2', codigo: 'UIO', descripcion: 'Pichincha', paisId: '1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '3', codigo: 'CUE', descripcion: 'Azuay', paisId: '1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '4', codigo: 'LIM', descripcion: 'Lima', paisId: '2', paisDescripcion: 'Perú', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '5', codigo: 'CAL', descripcion: 'Cali', paisId: '3', paisDescripcion: 'Colombia', estado: 'ACTIVO', createdAt: new Date().toISOString() },
];

const MOCK_CIUDADES: Ciudad[] = [
  { id: '1', codigo: 'GYE-C', descripcion: 'Guayaquil Centro', provinciaId: '1', provinciaDescripcion: 'Guayas', paisId: '1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '2', codigo: 'GYE-N', descripcion: 'Guayaquil Norte', provinciaId: '1', provinciaDescripcion: 'Guayas', paisId: '1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '3', codigo: 'UIO-C', descripcion: 'Quito Centro', provinciaId: '2', provinciaDescripcion: 'Pichincha', paisId: '1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '4', codigo: 'CUE-C', descripcion: 'Cuenca', provinciaId: '3', provinciaDescripcion: 'Azuay', paisId: '1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: '5', codigo: 'LIM-C', descripcion: 'Lima Centro', provinciaId: '4', provinciaDescripcion: 'Lima', paisId: '2', paisDescripcion: 'Perú', estado: 'ACTIVO', createdAt: new Date().toISOString() },
];

@Component({
  selector: 'app-parameters-configuration',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    DialogModule, ButtonModule, InputTextModule, SelectModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Parámetros y Configuración</h1>
        <p>Gestión jerárquica de Países, Provincias y Ciudades.</p>
      </div>
    </div>

    <p-tabs value="0">
      <p-tablist>
        <p-tab value="0"><i class="pi pi-globe mr-2"></i>Países</p-tab>
        <p-tab value="1"><i class="pi pi-map mr-2"></i>Provincias</p-tab>
        <p-tab value="2"><i class="pi pi-building mr-2"></i>Ciudades</p-tab>
      </p-tablist>
      <p-tabpanels>

      <!-- ============ PAÍSES ============ -->
      <p-tabpanel value="0">
        @if (loadingPais()) {
          <app-table-skeleton [rows]="5" [cols]="4" />
        } @else {
          <div class="row between mb-4">
            <div class="search">
              <app-icon-search [width]="15" [height]="15" />
              <input type="text" placeholder="Buscar por código o descripción..."
                [ngModel]="searchPais()" (ngModelChange)="searchPais.set($event)" />
            </div>
            <button class="btn btn-primary" (click)="openPaisDialog()">
              <app-icon-plus [width]="14" [height]="14" /> Nuevo país
            </button>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (p of paginatedPaises(); track p.id) {
                  <tr>
                    <td class="mono">{{ p.codigo }}</td>
                    <td><div class="cell-strong">{{ p.descripcion }}</div></td>
                    <td>
                      <span class="badge" [class.badge-green]="p.estado === 'ACTIVO'" [class.badge-gray]="p.estado !== 'ACTIVO'">
                        {{ p.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="cell-actions">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openPaisDialog(p)">
                          <app-icon-edit [width]="15" [height]="15" />
                        </button>
                        <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeletePais(p)">
                          <app-icon-trash [width]="15" [height]="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="muted center" style="padding: 24px;">Sin países registrados.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (totalPagesPais() > 1) {
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pagePais() === 0" (click)="setPage('pais', pagePais() - 1)">‹</button>
                @for (p of getPageNumbers(totalPagesPais(), pagePais()); track p) {
                  <button class="btn btn-sm" [class.btn-primary]="p === pagePais()" [class.btn-ghost]="p !== pagePais()" (click)="setPage('pais', p)">{{ p + 1 }}</button>
                }
                <button class="btn btn-ghost btn-sm" [disabled]="pagePais() === totalPagesPais() - 1" (click)="setPage('pais', pagePais() + 1)">›</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>

      <!-- ============ PROVINCIAS ============ -->
      <p-tabpanel value="1">
        @if (loadingProv()) {
          <app-table-skeleton [rows]="5" [cols]="5" />
        } @else {
          <div class="row between mb-4">
            <div class="search">
              <app-icon-search [width]="15" [height]="15" />
              <input type="text" placeholder="Buscar por código o descripción..."
                [ngModel]="searchProv()" (ngModelChange)="searchProv.set($event)" />
            </div>
            <button class="btn btn-primary" (click)="openProvDialog()">
              <app-icon-plus [width]="14" [height]="14" /> Nueva provincia
            </button>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>País</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (p of paginatedProvincias(); track p.id) {
                  <tr>
                    <td class="mono">{{ p.codigo }}</td>
                    <td><div class="cell-strong">{{ p.descripcion }}</div></td>
                    <td><span class="badge badge-blue">{{ p.paisDescripcion || p.paisId }}</span></td>
                    <td>
                      <span class="badge" [class.badge-green]="p.estado === 'ACTIVO'" [class.badge-gray]="p.estado !== 'ACTIVO'">
                        {{ p.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="cell-actions">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openProvDialog(p)">
                          <app-icon-edit [width]="15" [height]="15" />
                        </button>
                        <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeleteProv(p)">
                          <app-icon-trash [width]="15" [height]="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin provincias registradas.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (totalPagesProv() > 1) {
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pageProv() === 0" (click)="setPage('prov', pageProv() - 1)">‹</button>
                @for (p of getPageNumbers(totalPagesProv(), pageProv()); track p) {
                  <button class="btn btn-sm" [class.btn-primary]="p === pageProv()" [class.btn-ghost]="p !== pageProv()" (click)="setPage('prov', p)">{{ p + 1 }}</button>
                }
                <button class="btn btn-ghost btn-sm" [disabled]="pageProv() === totalPagesProv() - 1" (click)="setPage('prov', pageProv() + 1)">›</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>

      <!-- ============ CIUDADES ============ -->
      <p-tabpanel value="2">
        @if (loadingCiu()) {
          <app-table-skeleton [rows]="5" [cols]="5" />
        } @else {
          <div class="row between mb-4">
            <div class="search">
              <app-icon-search [width]="15" [height]="15" />
              <input type="text" placeholder="Buscar por código o descripción..."
                [ngModel]="searchCiu()" (ngModelChange)="searchCiu.set($event)" />
            </div>
            <button class="btn btn-primary" (click)="openCiuDialog()">
              <app-icon-plus [width]="14" [height]="14" /> Nueva ciudad
            </button>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Provincia</th>
                  <th>País</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (c of paginatedCiudades(); track c.id) {
                  <tr>
                    <td class="mono">{{ c.codigo }}</td>
                    <td><div class="cell-strong">{{ c.descripcion }}</div></td>
                    <td><span class="badge badge-blue">{{ c.provinciaDescripcion || c.provinciaId }}</span></td>
                    <td><span class="muted small">{{ c.paisDescripcion || c.paisId }}</span></td>
                    <td>
                      <span class="badge" [class.badge-green]="c.estado === 'ACTIVO'" [class.badge-gray]="c.estado !== 'ACTIVO'">
                        {{ c.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="cell-actions">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openCiuDialog(c)">
                          <app-icon-edit [width]="15" [height]="15" />
                        </button>
                        <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeleteCiu(c)">
                          <app-icon-trash [width]="15" [height]="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin ciudades registradas.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (totalPagesCiu() > 1) {
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pageCiu() === 0" (click)="setPage('ciu', pageCiu() - 1)">‹</button>
                @for (p of getPageNumbers(totalPagesCiu(), pageCiu()); track p) {
                  <button class="btn btn-sm" [class.btn-primary]="p === pageCiu()" [class.btn-ghost]="p !== pageCiu()" (click)="setPage('ciu', p)">{{ p + 1 }}</button>
                }
                <button class="btn btn-ghost btn-sm" [disabled]="pageCiu() === totalPagesCiu() - 1" (click)="setPage('ciu', pageCiu() + 1)">›</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>

      </p-tabpanels>
    </p-tabs>

    <!-- ============ DIÁLOGO PAÍS ============ -->
    <p-dialog
      [(visible)]="showPaisDlg"
      [header]="editPaisId ? 'Editar País' : 'Nuevo País'"
      [modal]="true" [style]="{ width: '480px' }" [closable]="true"
      (onHide)="closePaisDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="paisForm.codigo" placeholder="ECU" />
        </div>
        <div class="field">
          <label>Descripción</label>
          <input class="input" [(ngModel)]="paisForm.descripcion" placeholder="Ecuador" />
        </div>
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="paisForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closePaisDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="savePais()">{{ editPaisId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO PROVINCIA ============ -->
    <p-dialog
      [(visible)]="showProvDlg"
      [header]="editProvId ? 'Editar Provincia' : 'Nueva Provincia'"
      [modal]="true" [style]="{ width: '480px' }" [closable]="true"
      (onHide)="closeProvDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="provForm.codigo" placeholder="GYE" />
        </div>
        <div class="field">
          <label>Descripción</label>
          <input class="input" [(ngModel)]="provForm.descripcion" placeholder="Guayas" />
        </div>
      </div>
      <div class="field">
        <label>País</label>
        <select class="select" [(ngModel)]="provForm.paisId">
          <option value="">— Seleccione —</option>
          @for (p of paises(); track p.id) {
            <option [value]="p.id">{{ p.codigo }} · {{ p.descripcion }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="provForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeProvDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="saveProv()">{{ editProvId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO CIUDAD ============ -->
    <p-dialog
      [(visible)]="showCiuDlg"
      [header]="editCiuId ? 'Editar Ciudad' : 'Nueva Ciudad'"
      [modal]="true" [style]="{ width: '480px' }" [closable]="true"
      (onHide)="closeCiuDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [ngModel]="ciuForm().codigo" (ngModelChange)="ciuForm.update(v => ({ ...v, codigo: $event }))" placeholder="GYE-CENTRO" />
        </div>
        <div class="field">
          <label>Descripción</label>
          <input class="input" [ngModel]="ciuForm().descripcion" (ngModelChange)="ciuForm.update(v => ({ ...v, descripcion: $event }))" placeholder="Guayaquil Centro" />
        </div>
      </div>
      <div class="field">
        <label>País</label>
        <select class="select" [ngModel]="ciuForm().paisId" (ngModelChange)="onPaisChange($event)">
          <option value="">— Seleccione —</option>
          @for (p of paises(); track p.id) {
            <option [value]="p.id">{{ p.codigo }} · {{ p.descripcion }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>Provincia</label>
        <select class="select" [ngModel]="ciuForm().provinciaId" (ngModelChange)="ciuForm.update(v => ({ ...v, provinciaId: $event }))">
          <option value="">— Seleccione —</option>
          @for (pr of filteredProvinciasForCiu(); track pr.id) {
            <option [value]="pr.id">{{ pr.codigo }} · {{ pr.descripcion }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [ngModel]="ciuForm().estado" (ngModelChange)="ciuForm.update(v => ({ ...v, estado: $event }))">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeCiuDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="saveCiu()">{{ editCiuId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
})
export class ParametersConfigurationComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  private useMockData = true;

  paises = signal<Pais[]>([]);
  provincias = signal<Provincia[]>([]);
  ciudades = signal<Ciudad[]>([]);

  loadingPais = signal(true);
  loadingProv = signal(true);
  loadingCiu = signal(true);

  showPaisDlg = false; editPaisId: string | null = null;
  showProvDlg = false; editProvId: string | null = null;
  showCiuDlg = false; editCiuId: string | null = null;

  searchPais = signal('');
  searchProv = signal('');
  searchCiu = signal('');

  pageSize = signal(10);
  pagePais = signal(0);
  pageProv = signal(0);
  pageCiu = signal(0);

  paisForm: any = {};
  provForm: any = {};
  ciuForm = signal<any>({});

  filteredPaises = computed(() => {
    const q = this.searchPais().toLowerCase().trim();
    if (!q) return this.paises();
    return this.paises().filter(p =>
      p.codigo.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q)
    );
  });
  filteredProvincias = computed(() => {
    const q = this.searchProv().toLowerCase().trim();
    if (!q) return this.provincias();
    return this.provincias().filter(p =>
      p.codigo.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q) ||
      (p.paisDescripcion || '').toLowerCase().includes(q)
    );
  });
  filteredProvinciasForCiu = computed(() => {
    const paisId = this.ciuForm().paisId || '';
    if (!paisId) return this.provincias();
    return this.provincias().filter(p => p.paisId === paisId);
  });
  filteredCiudades = computed(() => {
    const q = this.searchCiu().toLowerCase().trim();
    if (!q) return this.ciudades();
    return this.ciudades().filter(c =>
      c.codigo.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q) ||
      (c.provinciaDescripcion || '').toLowerCase().includes(q)
    );
  });

  paginatedPaises = computed(() => {
    const start = this.pagePais() * this.pageSize();
    return this.filteredPaises().slice(start, start + this.pageSize());
  });
  totalPagesPais = computed(() => Math.max(1, Math.ceil(this.filteredPaises().length / this.pageSize())));

  paginatedProvincias = computed(() => {
    const start = this.pageProv() * this.pageSize();
    return this.filteredProvincias().slice(start, start + this.pageSize());
  });
  totalPagesProv = computed(() => Math.max(1, Math.ceil(this.filteredProvincias().length / this.pageSize())));

  paginatedCiudades = computed(() => {
    const start = this.pageCiu() * this.pageSize();
    return this.filteredCiudades().slice(start, start + this.pageSize());
  });
  totalPagesCiu = computed(() => Math.max(1, Math.ceil(this.filteredCiudades().length / this.pageSize())));

  setPage(entity: 'pais' | 'prov' | 'ciu', page: number): void {
    const total = entity === 'pais' ? this.totalPagesPais() : entity === 'prov' ? this.totalPagesProv() : this.totalPagesCiu();
    if (page < 0 || page >= total) return;
    if (entity === 'pais') this.pagePais.set(page);
    else if (entity === 'prov') this.pageProv.set(page);
    else this.pageCiu.set(page);
  }

  getPageNumbers(total: number, current: number): number[] {
    const pages: number[] = [];
    for (let i = 0; i < total; i++) pages.push(i);
    return pages;
  }

  ngOnInit(): void {
    if (this.useMockData) {
      this.paises.set([...MOCK_PAISES]);
      this.provincias.set([...MOCK_PROVINCIAS]);
      this.ciudades.set([...MOCK_CIUDADES]);
      this.loadingPais.set(false);
      this.loadingProv.set(false);
      this.loadingCiu.set(false);
    } else {
      this.loadPaises();
      this.loadProvincias();
      this.loadCiudades();
    }
    this.events.onDataChanged(() => {
      if (!this.useMockData) {
        this.loadPaises();
        this.loadProvincias();
        this.loadCiudades();
      }
    });
  }

  // ============ PAÍSES ============
  loadPaises(): void {
    this.loadingPais.set(true);
    this.api.listPaises().subscribe({
      next: (data) => { this.paises.set(data); this.loadingPais.set(false); },
      error: () => { this.paises.set([...MOCK_PAISES]); this.loadingPais.set(false); },
    });
  }
  blankPais() { return { codigo: '', descripcion: '', estado: 'ACTIVO' as Estado }; }
  openPaisDialog(p?: Pais): void {
    if (p) { this.paisForm = { ...p }; this.editPaisId = p.id; }
    else { this.paisForm = this.blankPais(); this.editPaisId = null; }
    this.showPaisDlg = true;
  }
  closePaisDialog(): void { this.showPaisDlg = false; this.editPaisId = null; }
  savePais(): void {
    if (!this.paisForm.codigo || !this.paisForm.descripcion) { this.toast.error('Faltan datos', 'Código y descripción son obligatorios.'); return; }
    if (this.editPaisId) {
      const idx = this.paises().findIndex(p => p.id === this.editPaisId);
      if (idx >= 0) {
        const updated = [...this.paises()];
        updated[idx] = { ...this.paisForm, id: this.editPaisId, createdAt: updated[idx].createdAt };
        this.paises.set(updated);
        this.toast.success('País actualizado');
      }
    } else {
      const newPais: Pais = { ...this.paisForm, id: Date.now().toString(), createdAt: new Date().toISOString() };
      this.paises.set([...this.paises(), newPais]);
      this.toast.success('País creado');
    }
    this.closePaisDialog();
  }
  confirmDeletePais(p: Pais): void {
    if (confirm(`¿Eliminar el país "${p.descripcion}"?`)) {
      this.paises.set(this.paises().filter(x => x.id !== p.id));
      this.toast.success('País eliminado');
    }
  }

  // ============ PROVINCIAS ============
  loadProvincias(): void {
    this.loadingProv.set(true);
    this.api.listProvincias().subscribe({
      next: (data) => { this.provincias.set(data); this.loadingProv.set(false); },
      error: () => { this.provincias.set([...MOCK_PROVINCIAS]); this.loadingProv.set(false); },
    });
  }
  blankProv() { return { codigo: '', descripcion: '', paisId: '', estado: 'ACTIVO' as Estado }; }
  openProvDialog(pr?: Provincia): void {
    if (pr) { this.provForm = { ...pr }; this.editProvId = pr.id; }
    else { this.provForm = this.blankProv(); this.editProvId = null; }
    this.showProvDlg = true;
  }
  closeProvDialog(): void { this.showProvDlg = false; this.editProvId = null; }
  saveProv(): void {
    if (!this.provForm.codigo || !this.provForm.descripcion || !this.provForm.paisId) { this.toast.error('Faltan datos', 'Código, descripción y país son obligatorios.'); return; }
    const pais = this.paises().find(p => p.id === this.provForm.paisId);
    if (this.editProvId) {
      const idx = this.provincias().findIndex(p => p.id === this.editProvId);
      if (idx >= 0) {
        const updated = [...this.provincias()];
        updated[idx] = { ...this.provForm, id: this.editProvId, paisDescripcion: pais?.descripcion || '', createdAt: updated[idx].createdAt };
        this.provincias.set(updated);
        this.toast.success('Provincia actualizada');
      }
    } else {
      const newProv: Provincia = { ...this.provForm, id: Date.now().toString(), paisDescripcion: pais?.descripcion || '', createdAt: new Date().toISOString() };
      this.provincias.set([...this.provincias(), newProv]);
      this.toast.success('Provincia creada');
    }
    this.closeProvDialog();
  }
  confirmDeleteProv(pr: Provincia): void {
    if (confirm(`¿Eliminar la provincia "${pr.descripcion}"?`)) {
      this.provincias.set(this.provincias().filter(x => x.id !== pr.id));
      this.toast.success('Provincia eliminada');
    }
  }

  // ============ CIUDADES ============
  loadCiudades(): void {
    this.loadingCiu.set(true);
    this.api.listCiudades().subscribe({
      next: (data) => { this.ciudades.set(data); this.loadingCiu.set(false); },
      error: () => { this.ciudades.set([...MOCK_CIUDADES]); this.loadingCiu.set(false); },
    });
  }
  blankCiu() { return { codigo: '', descripcion: '', paisId: '', provinciaId: '', estado: 'ACTIVO' as Estado }; }
  openCiuDialog(c?: Ciudad): void {
    if (c) {
      const prov = this.provincias().find(p => p.id === c.provinciaId);
      this.ciuForm.set({ ...c, paisId: prov?.paisId || c.paisId || '' });
      this.editCiuId = c.id;
    } else {
      this.ciuForm.set(this.blankCiu());
      this.editCiuId = null;
    }
    this.showCiuDlg = true;
  }
  closeCiuDialog(): void { this.showCiuDlg = false; this.editCiuId = null; }
  onPaisChange(paisId: string): void {
    this.ciuForm.update(v => ({ ...v, paisId, provinciaId: '' }));
  }
  saveCiu(): void {
    const form = this.ciuForm();
    if (!form.codigo || !form.descripcion || !form.provinciaId) { this.toast.error('Faltan datos', 'Código, descripción y provincia son obligatorios.'); return; }
    const prov = this.provincias().find(p => p.id === form.provinciaId);
    const pais = this.paises().find(p => p.id === form.paisId);
    if (this.editCiuId) {
      const idx = this.ciudades().findIndex(c => c.id === this.editCiuId);
      if (idx >= 0) {
        const updated = [...this.ciudades()];
        updated[idx] = { ...form, id: this.editCiuId, provinciaDescripcion: prov?.descripcion || '', paisDescripcion: pais?.descripcion || '', createdAt: updated[idx].createdAt };
        this.ciudades.set(updated);
        this.toast.success('Ciudad actualizada');
      }
    } else {
      const newCiu: Ciudad = { ...form, id: Date.now().toString(), provinciaDescripcion: prov?.descripcion || '', paisDescripcion: pais?.descripcion || '', createdAt: new Date().toISOString() };
      this.ciudades.set([...this.ciudades(), newCiu]);
      this.toast.success('Ciudad creada');
    }
    this.closeCiuDialog();
  }
  confirmDeleteCiu(c: Ciudad): void {
    if (confirm(`¿Eliminar la ciudad "${c.descripcion}"?`)) {
      this.ciudades.set(this.ciudades().filter(x => x.id !== c.id));
      this.toast.success('Ciudad eliminada');
    }
  }
}
