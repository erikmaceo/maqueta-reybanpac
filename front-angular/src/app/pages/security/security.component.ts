import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
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
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSecurityComponent, IconSearchComponent, IconDownloadComponent,
} from '../../shared/components/icons';
import type { Aplicacion, Modulo, Programa, Perfil, PerfilPrograma, TipoPrograma, TipoControl, Control } from '../../shared/models/types';

type Estado = 'ACTIVO' | 'INACTIVO';

const TIPOS_PROGRAMA: TipoPrograma[] = ['Menú', 'Submenú', 'Maestro', 'Transacción', 'Proceso', 'Consulta', 'Reporte', 'Objeto'];

const TIPOS_CONTROL: TipoControl[] = ['Caja de Texto', 'Botón', 'Check', 'Combo', 'Grid', 'Option', 'Otros'];

interface ControlRow {
  tipoControl: TipoControl;
  descripcion: string;
  estado: 'ACTIVO' | 'INACTIVO';
  log: 'ACTIVO' | 'INACTIVO';
}

interface PerfilProgramaRow {
  appCodigo: string;
  modCodigo: string;
  prgCodigo: string;
  nuevo: boolean;
  modificar: boolean;
  anular: boolean;
  procesar: boolean;
  imprimir: boolean;
  consultar: boolean;
}

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSecurityComponent, IconSearchComponent, IconDownloadComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Seguridades</h1>
        <p>Administración jerárquica de Aplicaciones, Módulos, Programas y Perfiles.</p>
      </div>
    </div>

    <p-tabs value="0">
      <p-tablist>
        <p-tab value="0"><i class="pi pi-server mr-2"></i>Aplicaciones</p-tab>
        <p-tab value="1"><i class="pi pi-list mr-2"></i>Módulos</p-tab>
        <p-tab value="2"><i class="pi pi-th-large mr-2"></i>Programas</p-tab>
        <p-tab value="3"><i class="pi pi-id-card mr-2"></i>Perfiles</p-tab>
      </p-tablist>
      <p-tabpanels>
      <!-- ============ APLICACIONES ============ -->
      <p-tabpanel value="0">
        @if (loadingApp()) {
          <app-table-skeleton [rows]="5" [cols]="4" />
        } @else if (errorApp()) {
          <app-error-state [message]="errorApp()!" [onRetry]="loadAplicaciones" />
        } @else {
          <div class="row between mb-4">
            <div class="search">
              <app-icon-search [width]="15" [height]="15" />
              <input type="text" placeholder="Buscar por código, nombre o descripción..."
                [ngModel]="searchApp()" (ngModelChange)="searchApp.set($event)" />
            </div>
            <div class="row gap-2">
              <button class="btn btn-ghost" (click)="exportApps()">
                <app-icon-download [width]="14" [height]="14" /> Exportar
              </button>
              <button class="btn btn-primary" (click)="openAppDialog()">
                <app-icon-plus [width]="14" [height]="14" /> Nueva aplicación
              </button>
            </div>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (a of paginatedApps(); track a.id) {
                  <tr>
                    <td class="mono">{{ a.codigo }}</td>
                    <td><div class="cell-strong">{{ a.nombre }}</div></td>
                    <td class="muted small">{{ a.descripcion || '—' }}</td>
                    <td>
                      <span class="badge" [class.badge-green]="a.estado === 'ACTIVO'" [class.badge-gray]="a.estado !== 'ACTIVO'">
                        {{ a.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="cell-actions">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openAppDialog(a)">
                          <app-icon-edit [width]="15" [height]="15" />
                        </button>
                        <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeleteApp(a)">
                          <app-icon-trash [width]="15" [height]="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin aplicaciones registradas.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (totalPagesApp() > 1) {
            <div class="pagination">
              <div class="page-size-selector">
                <span class="muted small">Mostrar</span>
                <select class="select" style="width:auto;padding:5px 10px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="15">15</option>
                  <option [value]="20">20</option>
                </select>
                <span class="muted small">registros</span>
              </div>
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pageApp() === 0" (click)="setPage('app', pageApp() - 1)">‹</button>
                @for (p of getPageNumbers(totalPagesApp(), pageApp()); track p) {
                  <button class="btn btn-sm" [class.btn-primary]="p === pageApp()" [class.btn-ghost]="p !== pageApp()" (click)="setPage('app', p)">{{ p + 1 }}</button>
                }
                <button class="btn btn-ghost btn-sm" [disabled]="pageApp() === totalPagesApp() - 1" (click)="setPage('app', pageApp() + 1)">›</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>

      <!-- ============ MODULOS ============ -->
      <p-tabpanel value="1">
        @if (loadingMod()) {
          <app-table-skeleton [rows]="5" [cols]="5" />
        } @else if (errorMod()) {
          <app-error-state [message]="errorMod()!" [onRetry]="loadModulos" />
        } @else {
          <div class="row between mb-4">
            <div class="search">
              <app-icon-search [width]="15" [height]="15" />
              <input type="text" placeholder="Buscar por código, nombre o aplicación..."
                [ngModel]="searchMod()" (ngModelChange)="searchMod.set($event)" />
            </div>
            <div class="row gap-2">
              <button class="btn btn-ghost" (click)="exportMods()">
                <app-icon-download [width]="14" [height]="14" /> Exportar
              </button>
              <button class="btn btn-primary" (click)="openModDialog()">
                <app-icon-plus [width]="14" [height]="14" /> Nuevo módulo
              </button>
            </div>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Aplicación</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
@for (m of paginatedMods(); track m.id) {
                  <tr>
                    <td class="mono">{{ m.codigo }}</td>
                    <td><div class="cell-strong">{{ m.nombre }}</div><div class="tiny dim">{{ m.descripcion }}</div></td>
                    <td><span class="badge badge-blue">{{ m.appCodigo }}</span></td>
                    <td>
                      <span class="badge" [class.badge-green]="m.estado === 'ACTIVO'" [class.badge-gray]="m.estado !== 'ACTIVO'">
                        {{ m.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="cell-actions">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openModDialog(m)">
                          <app-icon-edit [width]="15" [height]="15" />
                        </button>
                        <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeleteMod(m)">
                          <app-icon-trash [width]="15" [height]="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin módulos registrados.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (totalPagesMod() > 1) {
            <div class="pagination">
              <div class="page-size-selector">
                <span class="muted small">Mostrar</span>
                <select class="select" style="width:auto;padding:5px 10px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="15">15</option>
                  <option [value]="20">20</option>
                </select>
                <span class="muted small">registros</span>
              </div>
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pageMod() === 0" (click)="setPage('mod', pageMod() - 1)">‹</button>
                @for (p of getPageNumbers(totalPagesMod(), pageMod()); track p) {
                  <button class="btn btn-sm" [class.btn-primary]="p === pageMod()" [class.btn-ghost]="p !== pageMod()" (click)="setPage('mod', p)">{{ p + 1 }}</button>
                }
                <button class="btn btn-ghost btn-sm" [disabled]="pageMod() === totalPagesMod() - 1" (click)="setPage('mod', pageMod() + 1)">›</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>

      <!-- ============ PROGRAMAS ============ -->
      <p-tabpanel value="2">
        @if (loadingPrg()) {
          <app-table-skeleton [rows]="5" [cols]="5" />
        } @else if (errorPrg()) {
          <app-error-state [message]="errorPrg()!" [onRetry]="loadProgramas" />
        } @else {
          <div class="row between mb-4">
            <div class="search">
              <app-icon-search [width]="15" [height]="15" />
              <input type="text" placeholder="Buscar por código, nombre o módulo..."
                [ngModel]="searchPrg()" (ngModelChange)="searchPrg.set($event)" />
            </div>
            <div class="row gap-2">
              <button class="btn btn-ghost" (click)="exportPrgs()">
                <app-icon-download [width]="14" [height]="14" /> Exportar
              </button>
              <button class="btn btn-primary" (click)="openPrgDialog()">
                <app-icon-plus [width]="14" [height]="14" /> Nuevo programa
              </button>
            </div>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Módulo</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
@for (p of paginatedPrgs(); track p.id) {
                  <tr>
                    <td class="mono">{{ p.codigo }}</td>
                    <td><div class="cell-strong">{{ p.nombre }}</div><div class="tiny dim">{{ p.descripcion }}</div></td>
                    <td><span class="badge badge-blue">{{ p.modCodigo }}</span></td>
                    <td><span class="badge badge-blue">{{ p.tipo }}</span></td>
                    <td>
                      <span class="badge" [class.badge-green]="p.estado === 'ACTIVO'" [class.badge-gray]="p.estado !== 'ACTIVO'">
                        {{ p.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="cell-actions">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openPrgDialog(p)">
                          <app-icon-edit [width]="15" [height]="15" />
                        </button>
                        <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDeletePrg(p)">
                          <app-icon-trash [width]="15" [height]="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin programas registrados.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (totalPagesPrg() > 1) {
            <div class="pagination">
              <div class="page-size-selector">
                <span class="muted small">Mostrar</span>
                <select class="select" style="width:auto;padding:5px 10px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="15">15</option>
                  <option [value]="20">20</option>
                </select>
                <span class="muted small">registros</span>
              </div>
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pagePrg() === 0" (click)="setPage('prg', pagePrg() - 1)">‹</button>
                @for (p of getPageNumbers(totalPagesPrg(), pagePrg()); track p) {
                  <button class="btn btn-sm" [class.btn-primary]="p === pagePrg()" [class.btn-ghost]="p !== pagePrg()" (click)="setPage('prg', p)">{{ p + 1 }}</button>
                }
                <button class="btn btn-ghost btn-sm" [disabled]="pagePrg() === totalPagesPrg() - 1" (click)="setPage('prg', pagePrg() + 1)">›</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>

      <!-- ============ PERFILES ============ -->
      <p-tabpanel value="3">
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
              <button class="btn btn-primary" (click)="openPerfDialog()">
                <app-icon-plus [width]="14" [height]="14" /> Nuevo perfil
              </button>
            </div>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Programa</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (p of paginatedPerfs(); track p.id) {
                  <tr>
                    <td class="mono">{{ p.codigo }}</td>
                    <td><div class="cell-strong">{{ p.nombre }}</div><div class="tiny dim">{{ p.descripcion }}</div></td>
                    <td>
                      <div class="perf-prgs">
                        @for (pp of p.programas; track pp.prgCodigo) {
                          <span class="badge badge-blue">{{ pp.prgCodigo }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="badge" [class.badge-green]="p.estado === 'ACTIVO'" [class.badge-gray]="p.estado !== 'ACTIVO'">
                        {{ p.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="cell-actions">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openPerfDialog(p)">
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
          @if (totalPagesPerf() > 1) {
            <div class="pagination">
              <div class="page-size-selector">
                <span class="muted small">Mostrar</span>
                <select class="select" style="width:auto;padding:5px 10px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="15">15</option>
                  <option [value]="20">20</option>
                </select>
                <span class="muted small">registros</span>
              </div>
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pagePerf() === 0" (click)="setPage('perf', pagePerf() - 1)">‹</button>
                @for (p of getPageNumbers(totalPagesPerf(), pagePerf()); track p) {
                  <button class="btn btn-sm" [class.btn-primary]="p === pagePerf()" [class.btn-ghost]="p !== pagePerf()" (click)="setPage('perf', p)">{{ p + 1 }}</button>
                }
                <button class="btn btn-ghost btn-sm" [disabled]="pagePerf() === totalPagesPerf() - 1" (click)="setPage('perf', pagePerf() + 1)">›</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>
      </p-tabpanels>
    </p-tabs>

    <!-- ============ DIÁLOGO APLICACIÓN ============ -->
    <p-dialog
      [(visible)]="showAppDlg"
      [header]="editAppId ? 'Editar aplicación' : 'Nueva aplicación'"
      [modal]="true" [style]="{ width: '480px' }" [closable]="true"
      (onHide)="closeAppDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="appForm.codigo" placeholder="APP-SAP" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input class="input" [(ngModel)]="appForm.nombre" placeholder="SAP ERP" />
        </div>
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea class="input" [(ngModel)]="appForm.descripcion" rows="2"></textarea>
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="appForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeAppDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="saveApp()">{{ editAppId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO MÓDULO ============ -->
    <p-dialog
      [(visible)]="showModDlg"
      [header]="editModId ? 'Editar módulo' : 'Nuevo módulo'"
      [modal]="true" [style]="{ width: '480px' }" [closable]="true"
      (onHide)="closeModDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="modForm.codigo" placeholder="MOD-FI" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input class="input" [(ngModel)]="modForm.nombre" placeholder="Finanzas (FI)" />
        </div>
      </div>
      <div class="field">
        <label>Aplicación</label>
        <select class="select" [(ngModel)]="modForm.appCodigo">
          <option value="">— Seleccione —</option>
          @for (a of aplicaciones(); track a.id) {
            <option [value]="a.codigo">{{ a.codigo }} · {{ a.nombre }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea class="input" [(ngModel)]="modForm.descripcion" rows="2"></textarea>
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="modForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeModDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="saveMod()">{{ editModId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO PROGRAMA ============ -->
    <p-dialog
      [(visible)]="showPrgDlg"
      [header]="editPrgId ? 'Editar programa' : 'Nuevo programa'"
      [modal]="true" [style]="{ width: '640px' }" [closable]="true"
      (onHide)="closePrgDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="prgForm.codigo" placeholder="PRG-FI-DOCS" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input class="input" [(ngModel)]="prgForm.nombre" placeholder="Documentos contables" />
        </div>
      </div>
      <div class="field">
        <label>Aplicación</label>
        <select class="select" [(ngModel)]="prgForm.appCodigo" (ngModelChange)="changePrgApp()">
          <option value="">— Seleccione —</option>
          @for (a of aplicaciones(); track a.id) {
            <option [value]="a.codigo">{{ a.codigo }} · {{ a.nombre }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>Módulo</label>
        <select class="select" [(ngModel)]="prgForm.modCodigo">
          <option value="">— Seleccione —</option>
          @for (m of filteredModsForPrg(); track m.id) {
            <option [value]="m.codigo">{{ m.codigo }} · {{ m.nombre }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>Tipo de Programa</label>
        <select class="select" [(ngModel)]="prgForm.tipo">
          @for (tipo of tiposPrograma; track tipo) {
            <option [value]="tipo">{{ tipo }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea class="input" [(ngModel)]="prgForm.descripcion" rows="2"></textarea>
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="prgForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      @if (prgForm.tipo !== 'Menú' && prgForm.tipo !== 'Submenú') {
        <div class="field">
          <label>Controles del Programa</label>
          <div class="controles-list">
            @for (c of prgControles; track $index) {
              <div class="control-row">
                <select class="select control-tipo" [(ngModel)]="c.tipoControl">
                  @for (t of tiposControl; track t) {
                    <option [value]="t">{{ t }}</option>
                  }
                </select>
                <input class="input control-desc" [(ngModel)]="c.descripcion" placeholder="Descripción del control" />
                <label class="control-check">
                  <input type="checkbox" [checked]="c.estado === 'ACTIVO'"
                    (change)="c.estado = $any($event.target).checked ? 'ACTIVO' : 'INACTIVO'" />
                  <span>{{ c.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}</span>
                </label>
                <label class="control-check">
                  <input type="checkbox" [checked]="c.log === 'ACTIVO'"
                    (change)="c.log = $any($event.target).checked ? 'ACTIVO' : 'INACTIVO'" />
                  <span>Log</span>
                </label>
                <button class="btn btn-danger btn-sm btn-icon" title="Quitar control" (click)="removeControl($index)">
                  <app-icon-trash [width]="14" [height]="14" />
                </button>
              </div>
            }
          </div>
          <button class="btn btn-ghost btn-sm mt-2" (click)="addControl()">
            <app-icon-plus [width]="14" [height]="14" /> Agregar control
          </button>
        </div>
      }
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closePrgDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="savePrg()">{{ editPrgId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO PERFIL ============ -->
    <p-dialog
      [(visible)]="showPerfDlg"
      [header]="editPerfId ? 'Editar perfil' : 'Nuevo perfil'"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="closePerfDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="perfForm.codigo" placeholder="PERF-FI-VIS" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input class="input" [(ngModel)]="perfForm.nombre" placeholder="FI Visualizador" />
        </div>
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea class="input" [(ngModel)]="perfForm.descripcion" rows="2"></textarea>
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="perfForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;" />
      <div class="field">
        <label>Programas del Perfil</label>
        <div class="controles-list">
          @for (pp of perfProgramas; track $index) {
            <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px;">
              <div style="display:flex;gap:8px;align-items:flex-end;">
                <div style="display:flex;flex-direction:column;gap:2px;">
                  <label class="small muted">Aplicación</label>
                  <select class="select control-tipo" style="width:200px;" [(ngModel)]="pp.appCodigo" (ngModelChange)="changePerfApp($index)">
                    <option value="">— Seleccionar —</option>
                    @for (a of aplicaciones(); track a.id) {
                      <option [value]="a.codigo">{{ a.codigo }} · {{ a.nombre }}</option>
                    }
                  </select>
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;">
                  <label class="small muted">Módulo</label>
                  <select class="select control-tipo" style="width:200px;" [(ngModel)]="pp.modCodigo" (ngModelChange)="changePerfMod($index)">
                    <option value="">— Seleccionar —</option>
                    @for (m of getModsForPerfRow($index); track m.id) {
                      <option [value]="m.codigo">{{ m.codigo }} · {{ m.nombre }}</option>
                    }
                  </select>
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;">
                  <label class="small muted">Programa</label>
                  <select class="select control-tipo" style="width:200px;" [(ngModel)]="pp.prgCodigo">
                    <option value="">— Seleccionar —</option>
                    @for (p of getPrgsForPerfRow($index); track p.id) {
                      <option [value]="p.codigo">{{ p.codigo }} · {{ p.nombre }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="table-wrap mt-2">
                <table class="data" style="width:100%;">
                  <thead>
                    <tr>
                      <th>Tipo Programa</th>
                      <th>Nuevo</th>
                      <th>Modificar</th>
                      <th>Anular</th>
                      <th>Procesar</th>
                      <th>Imprimir</th>
                      <th>Consultar</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        @if (pp.prgCodigo) {
                          <span class="badge badge-amber">{{ getProgramaTipo(pp.prgCodigo) }}</span>
                        } @else {
                          <span class="muted small">—</span>
                        }
                      </td>
                      <td><input type="checkbox" [(ngModel)]="pp.nuevo" style="width:16px;height:16px;cursor:pointer;" /></td>
                      <td><input type="checkbox" [(ngModel)]="pp.modificar" style="width:16px;height:16px;cursor:pointer;" /></td>
                      <td><input type="checkbox" [(ngModel)]="pp.anular" style="width:16px;height:16px;cursor:pointer;" /></td>
                      <td><input type="checkbox" [(ngModel)]="pp.procesar" style="width:16px;height:16px;cursor:pointer;" /></td>
                      <td><input type="checkbox" [(ngModel)]="pp.imprimir" style="width:16px;height:16px;cursor:pointer;" /></td>
                      <td><input type="checkbox" [(ngModel)]="pp.consultar" style="width:16px;height:16px;cursor:pointer;" /></td>
                      <td>
                        <button class="btn btn-danger btn-sm btn-icon" title="Quitar" (click)="removePerfPrograma($index)">
                          <app-icon-trash [width]="14" [height]="14" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
        <button class="btn btn-ghost btn-sm mt-2" (click)="addPerfPrograma()">
          <app-icon-plus [width]="14" [height]="14" /> Agregar programa
        </button>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closePerfDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="savePerf()">{{ editPerfId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
})
export class SecurityComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  // --- Signals de datos ---
  aplicaciones = signal<Aplicacion[]>([]);
  modulos = signal<Modulo[]>([]);
  programas = signal<Programa[]>([]);
  perfiles = signal<Perfil[]>([]);

  loadingApp = signal(true);
  loadingMod = signal(true);
  loadingPrg = signal(true);
  loadingPerf = signal(true);
  errorApp = signal<string | null>(null);
  errorMod = signal<string | null>(null);
  errorPrg = signal<string | null>(null);
  errorPerf = signal<string | null>(null);

  // --- Diálogos ---
  showAppDlg = false; editAppId: string | null = null;
  showModDlg = false; editModId: string | null = null;
  showPrgDlg = false; editPrgId: string | null = null;
  showPerfDlg = false; editPerfId: string | null = null;

  // --- Filtros de búsqueda ---
  searchApp = signal('');
  searchMod = signal('');
  searchPrg = signal('');
  searchPerf = signal('');

  // --- Paginación ---
  pageSize = signal(10);
  pageApp = signal(0);
  pageMod = signal(0);
  pagePrg = signal(0);
  pagePerf = signal(0);

  filteredApps = computed(() => {
    const q = this.searchApp().toLowerCase().trim();
    if (!q) return this.aplicaciones();
    return this.aplicaciones().filter(a =>
      a.codigo.toLowerCase().includes(q) ||
      a.nombre.toLowerCase().includes(q) ||
      (a.descripcion || '').toLowerCase().includes(q)
    );
  });
  filteredMods = computed(() => {
    const q = this.searchMod().toLowerCase().trim();
    if (!q) return this.modulos();
    return this.modulos().filter(m =>
      m.codigo.toLowerCase().includes(q) ||
      m.nombre.toLowerCase().includes(q) ||
      m.appCodigo.toLowerCase().includes(q) ||
      (m.descripcion || '').toLowerCase().includes(q)
    );
  });
  filteredPrgs = computed(() => {
    const q = this.searchPrg().toLowerCase().trim();
    if (!q) return this.programas();
    return this.programas().filter(p =>
      p.codigo.toLowerCase().includes(q) ||
      p.nombre.toLowerCase().includes(q) ||
      p.modCodigo.toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q)
    );
  });
  filteredModsForPrg = computed(() => {
    const appCod = this.prgAppCodigo();
    if (!appCod) return this.modulos();
    return this.modulos().filter(m => m.appCodigo === appCod);
  });
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
        (pp.anular ? 'anular' : '').includes(q) ||
        (pp.procesar ? 'procesar' : '').includes(q) ||
        (pp.imprimir ? 'imprimir' : '').includes(q) ||
        (pp.consultar ? 'consultar' : '').includes(q))
    );
  });

  paginatedApps = computed(() => {
    const start = this.pageApp() * this.pageSize();
    return this.filteredApps().slice(start, start + this.pageSize());
  });
  totalPagesApp = computed(() => Math.max(1, Math.ceil(this.filteredApps().length / this.pageSize())));

  paginatedMods = computed(() => {
    const start = this.pageMod() * this.pageSize();
    return this.filteredMods().slice(start, start + this.pageSize());
  });
  totalPagesMod = computed(() => Math.max(1, Math.ceil(this.filteredMods().length / this.pageSize())));

  paginatedPrgs = computed(() => {
    const start = this.pagePrg() * this.pageSize();
    return this.filteredPrgs().slice(start, start + this.pageSize());
  });
  totalPagesPrg = computed(() => Math.max(1, Math.ceil(this.filteredPrgs().length / this.pageSize())));

  paginatedPerfs = computed(() => {
    const start = this.pagePerf() * this.pageSize();
    return this.filteredPerfs().slice(start, start + this.pageSize());
  });
  totalPagesPerf = computed(() => Math.max(1, Math.ceil(this.filteredPerfs().length / this.pageSize())));

  setPage(entity: 'app' | 'mod' | 'prg' | 'perf', page: number): void {
    const total = entity === 'app' ? this.totalPagesApp() : entity === 'mod' ? this.totalPagesMod() : entity === 'prg' ? this.totalPagesPrg() : this.totalPagesPerf();
    const current = entity === 'app' ? this.pageApp() : entity === 'mod' ? this.pageMod() : entity === 'prg' ? this.pagePrg() : this.pagePerf();
    if (page < 0 || page >= total) return;
    if (entity === 'app') this.pageApp.set(page);
    else if (entity === 'mod') this.pageMod.set(page);
    else if (entity === 'prg') this.pagePrg.set(page);
    else this.pagePerf.set(page);
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.pageApp.set(0);
    this.pageMod.set(0);
    this.pagePrg.set(0);
    this.pagePerf.set(0);
  }

  getPageNumbers(total: number, current: number): number[] {
    const pages: number[] = [];
    for (let i = 0; i < total; i++) pages.push(i);
    return pages;
  }

  private exportXlsx(data: any[], headers: string[], cols: string[], filename: string): void {
    const aoa = [headers, ...data.map(row => cols.map(c => row[c] ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = cols.map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  exportApps(): void {
    this.exportXlsx(
      this.filteredApps(),
      ['Código', 'Nombre', 'Descripción', 'Estado'],
      ['codigo', 'nombre', 'descripcion', 'estado'],
      'aplicaciones'
    );
  }

  exportMods(): void {
    this.exportXlsx(
      this.filteredMods(),
      ['Código', 'Nombre', 'Aplicación', 'Descripción', 'Estado'],
      ['codigo', 'nombre', 'appCodigo', 'descripcion', 'estado'],
      'modulos'
    );
  }

  exportPrgs(): void {
    this.exportXlsx(
      this.filteredPrgs(),
      ['Código', 'Nombre', 'Módulo', 'Tipo', 'Descripción', 'Estado'],
      ['codigo', 'nombre', 'modCodigo', 'tipo', 'descripcion', 'estado'],
      'programas'
    );
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
        procesar: pp.procesar ? 'Sí' : 'No',
        imprimir: pp.imprimir ? 'Sí' : 'No',
        consultar: pp.consultar ? 'Sí' : 'No',
        estado: p.estado,
      }))
    );
    this.exportXlsx(
      rows,
      ['Código', 'Nombre', 'Descripción', 'Programa', 'Nuevo', 'Modificar', 'Anular', 'Procesar', 'Imprimir', 'Consultar', 'Estado'],
      ['codigo', 'nombre', 'descripcion', 'programa', 'nuevo', 'modificar', 'anular', 'procesar', 'imprimir', 'consultar', 'estado'],
      'perfiles'
    );
  }

  appForm = this.blankApp();
  modForm = this.blankMod();
  prgForm = this.blankPrg();
  prgAppCodigo = signal('');
  perfForm = this.blankPerf();
  tiposPrograma = TIPOS_PROGRAMA;
  tiposControl = TIPOS_CONTROL;
  prgControles: ControlRow[] = [];
  controlesMap: Map<string, Control[]> = new Map();

  // --- Refs para retry ---
  loadAplicaciones = () => this._loadApp();
  loadModulos = () => this._loadMod();
  loadProgramas = () => this._loadPrg();
  loadPerfiles = () => this._loadPerf();

  ngOnInit(): void {
    this._loadApp();
    this._loadMod();
    this._loadPrg();
    this._loadPerf();
    this.events.onDataChanged(() => {
      this._loadApp(); this._loadMod(); this._loadPrg(); this._loadPerf();
    });
    effect(() => { this.searchApp(); this.pageApp.set(0); }, { allowSignalWrites: true });
    effect(() => { this.searchMod(); this.pageMod.set(0); }, { allowSignalWrites: true });
    effect(() => { this.searchPrg(); this.pagePrg.set(0); }, { allowSignalWrites: true });
    effect(() => { this.searchPerf(); this.pagePerf.set(0); }, { allowSignalWrites: true });
    effect(() => { this.pageSize(); this.pageApp.set(0); this.pageMod.set(0); this.pagePrg.set(0); this.pagePerf.set(0); }, { allowSignalWrites: true });
  }

  // ============ LOADERS ============
  private _loadApp(): void {
    this.loadingApp.set(true); this.errorApp.set(null);
    this.api.listAplicaciones().subscribe({
      next: (d) => this.aplicaciones.set(d),
      error: (e) => this.errorApp.set(e?.error?.error || e?.message || 'Error al cargar aplicaciones.'),
      complete: () => this.loadingApp.set(false),
    });
  }
  private _loadMod(): void {
    this.loadingMod.set(true); this.errorMod.set(null);
    this.api.listModulos().subscribe({
      next: (d) => this.modulos.set(d),
      error: (e) => this.errorMod.set(e?.error?.error || e?.message || 'Error al cargar módulos.'),
      complete: () => this.loadingMod.set(false),
    });
  }
  private _loadPrg(): void {
    this.loadingPrg.set(true); this.errorPrg.set(null);
    this.api.listProgramas().subscribe({
      next: (d) => this.programas.set(d),
      error: (e) => this.errorPrg.set(e?.error?.error || e?.message || 'Error al cargar programas.'),
      complete: () => this.loadingPrg.set(false),
    });
    this.api.listControles().subscribe({
      next: (d) => {
        const map = new Map<string, Control[]>();
        for (const c of d) {
          const arr = map.get(c.prgCodigo) || [];
          arr.push(c);
          map.set(c.prgCodigo, arr);
        }
        this.controlesMap = map;
      },
      error: () => {},
    });
  }
  private _loadPerf(): void {
    this.loadingPerf.set(true); this.errorPerf.set(null);
    this.api.listPerfiles().subscribe({
      next: (d) => this.perfiles.set(d),
      error: (e) => this.errorPerf.set(e?.error?.error || e?.message || 'Error al cargar perfiles.'),
      complete: () => this.loadingPerf.set(false),
    });
  }

  // ============ FORMS BLANK ============
  blankApp() { return { codigo: '', nombre: '', descripcion: '', estado: 'ACTIVO' as Estado }; }
  blankMod() { return { codigo: '', nombre: '', descripcion: '', appCodigo: '', estado: 'ACTIVO' as Estado }; }
  blankPrg() { return { codigo: '', nombre: '', descripcion: '', appCodigo: '', modCodigo: '', tipo: 'Transacción' as TipoPrograma, estado: 'ACTIVO' as Estado }; }
  blankPerf() { return { codigo: '', nombre: '', descripcion: '', estado: 'ACTIVO' as Estado }; }
  perfProgramas: PerfilProgramaRow[] = [];

  // ============ APLICACIÓN CRUD ============
  openAppDialog(a?: Aplicacion): void {
    if (a) { this.appForm = { codigo: a.codigo, nombre: a.nombre, descripcion: a.descripcion, estado: a.estado }; this.editAppId = a.id; }
    else { this.appForm = this.blankApp(); this.editAppId = null; }
    this.showAppDlg = true;
  }
  closeAppDialog(): void { this.showAppDlg = false; this.editAppId = null; }
  async saveApp(): Promise<void> {
    if (!this.appForm.codigo || !this.appForm.nombre) { this.toast.error('Faltan datos', 'Código y nombre son obligatorios.'); return; }
    try {
      if (this.editAppId) { await this.api.updateAplicacion(this.editAppId, this.appForm).toPromise(); this.toast.success('Aplicación actualizada'); }
      else { await this.api.createAplicacion(this.appForm).toPromise(); this.toast.success('Aplicación creada'); }
      this.events.emitDataChanged(); this.closeAppDialog(); this._loadApp();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'Error inesperado.';
      this.toast.error('Error', msg);
    }
  }
  confirmDeleteApp(a: Aplicacion): void {
    if (confirm(`¿Eliminar la aplicación "${a.nombre}"? Se eliminarán también sus módulos, programas y perfiles asociados.`)) {
      this.api.deleteAplicacion(a.id).subscribe({
        next: () => { this.toast.success('Aplicación eliminada'); this.events.emitDataChanged(); this._loadApp(); this._loadMod(); this._loadPrg(); this._loadPerf(); },
        error: (e) => { const msg = e?.error?.error || e?.message || 'Error inesperado.'; this.toast.error('Error', msg); },
      });
    }
  }

  // ============ MÓDULO CRUD ============
  openModDialog(m?: Modulo): void {
    if (m) { this.modForm = { codigo: m.codigo, nombre: m.nombre, descripcion: m.descripcion, appCodigo: m.appCodigo, estado: m.estado }; this.editModId = m.id; }
    else { this.modForm = this.blankMod(); this.editModId = null; }
    this.showModDlg = true;
  }
  closeModDialog(): void { this.showModDlg = false; this.editModId = null; }
  async saveMod(): Promise<void> {
    if (!this.modForm.codigo || !this.modForm.nombre || !this.modForm.appCodigo) { this.toast.error('Faltan datos', 'Código, nombre y aplicación son obligatorios.'); return; }
    try {
      if (this.editModId) { await this.api.updateModulo(this.editModId, this.modForm).toPromise(); this.toast.success('Módulo actualizado'); }
      else { await this.api.createModulo(this.modForm).toPromise(); this.toast.success('Módulo creado'); }
      this.events.emitDataChanged(); this.closeModDialog(); this._loadMod();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'Error inesperado.';
      this.toast.error('Error', msg);
    }
  }
  confirmDeleteMod(m: Modulo): void {
    if (confirm(`¿Eliminar el módulo "${m.nombre}"? Se eliminarán también sus programas y perfiles asociados.`)) {
      this.api.deleteModulo(m.id).subscribe({
        next: () => { this.toast.success('Módulo eliminado'); this.events.emitDataChanged(); this._loadMod(); this._loadPrg(); this._loadPerf(); },
        error: (e) => { const msg = e?.error?.error || e?.message || 'Error inesperado.'; this.toast.error('Error', msg); },
      });
    }
  }

  // ============ PROGRAMA CRUD ============
  openPrgDialog(p?: Programa): void {
    if (p) {
      const mod = this.modulos().find(m => m.codigo === p.modCodigo);
      const appCod = mod?.appCodigo || '';
      this.prgForm = { codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion, appCodigo: appCod, modCodigo: p.modCodigo, tipo: p.tipo, estado: p.estado };
      this.prgAppCodigo.set(appCod);
      this.editPrgId = p.id;
      const ctrls = this.controlesMap.get(p.codigo) || [];
      this.prgControles = ctrls.map(c => ({
        tipoControl: c.tipoControl,
        descripcion: c.descripcion,
        estado: c.estado,
        log: c.log === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO'
      }));
    } else {
      this.prgForm = this.blankPrg();
      this.prgAppCodigo.set('');
      this.editPrgId = null;
      this.prgControles = [];
    }
    this.showPrgDlg = true;
  }
  closePrgDialog(): void { this.showPrgDlg = false; this.editPrgId = null; this.prgControles = []; this.prgAppCodigo.set(''); }
  changePrgApp(): void { this.prgAppCodigo.set(this.prgForm.appCodigo); this.prgForm.modCodigo = ''; }
  addControl(): void {
    this.prgControles.push({ tipoControl: 'Caja de Texto', descripcion: '', estado: 'ACTIVO', log: 'ACTIVO' });
  }
  removeControl(idx: number): void {
    this.prgControles.splice(idx, 1);
  }
  async savePrg(): Promise<void> {
    if (!this.prgForm.codigo || !this.prgForm.nombre || !this.prgForm.appCodigo || !this.prgForm.modCodigo) { this.toast.error('Faltan datos', 'Código, nombre, aplicación y módulo son obligatorios.'); return; }
    const controles = this.prgForm.tipo !== 'Menú' && this.prgForm.tipo !== 'Submenú'
      ? this.prgControles.filter(c => c.descripcion.trim() !== '')
      : [];
    try {
      const body: any = { ...this.prgForm, controles };
      if (this.editPrgId) { await this.api.updatePrograma(this.editPrgId, body).toPromise(); this.toast.success('Programa actualizado'); }
      else { await this.api.createPrograma(body).toPromise(); this.toast.success('Programa creado'); }
      this.events.emitDataChanged(); this.closePrgDialog(); this._loadPrg();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'Error inesperado.';
      this.toast.error('Error', msg);
    }
  }
  confirmDeletePrg(p: Programa): void {
    if (confirm(`¿Eliminar el programa "${p.nombre}"? Se eliminarán también sus perfiles y controles asociados.`)) {
      this.api.deletePrograma(p.id).subscribe({
        next: () => { this.toast.success('Programa eliminado'); this.events.emitDataChanged(); this._loadPrg(); this._loadPerf(); },
        error: (e) => { const msg = e?.error?.error || e?.message || 'Error inesperado.'; this.toast.error('Error', msg); },
      });
    }
  }

  // ============ PERFIL CRUD ============
  openPerfDialog(p?: Perfil): void {
    if (p) {
      this.perfForm = { codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion, estado: p.estado };
      this.editPerfId = p.id;
      this.perfProgramas = p.programas.map(pp => {
        const prg = this.programas().find(x => x.codigo === pp.prgCodigo);
        const mod = prg ? this.modulos().find(m => m.codigo === prg.modCodigo) : undefined;
        return { appCodigo: mod?.appCodigo || '', modCodigo: prg?.modCodigo || '', ...pp };
      });
    } else {
      this.perfForm = this.blankPerf();
      this.editPerfId = null;
      this.perfProgramas = [];
    }
    this.showPerfDlg = true;
  }
  closePerfDialog(): void { this.showPerfDlg = false; this.editPerfId = null; this.perfProgramas = []; }
  addPerfPrograma(): void {
    this.perfProgramas.push({ appCodigo: '', modCodigo: '', prgCodigo: '', nuevo: false, modificar: false, anular: false, procesar: false, imprimir: false, consultar: false });
  }
  removePerfPrograma(idx: number): void {
    this.perfProgramas.splice(idx, 1);
  }
  getProgramaTipo(codigo: string): string {
    return this.programas().find(p => p.codigo === codigo)?.tipo || '';
  }
  getModsForPerfRow(idx: number): Modulo[] {
    const appCod = this.perfProgramas[idx]?.appCodigo || '';
    if (!appCod) return this.modulos();
    return this.modulos().filter(m => m.appCodigo === appCod);
  }
  getPrgsForPerfRow(idx: number): Programa[] {
    const modCod = this.perfProgramas[idx]?.modCodigo || '';
    if (!modCod) return this.programas();
    return this.programas().filter(p => p.modCodigo === modCod);
  }
  changePerfApp(idx: number): void {
    this.perfProgramas[idx].modCodigo = '';
    this.perfProgramas[idx].prgCodigo = '';
  }
  changePerfMod(idx: number): void {
    this.perfProgramas[idx].prgCodigo = '';
  }
  async savePerf(): Promise<void> {
    const programasValidos = this.perfProgramas.filter(pp => pp.prgCodigo.trim() !== '');
    if (!this.perfForm.codigo || !this.perfForm.nombre) { this.toast.error('Faltan datos', 'Código y nombre son obligatorios.'); return; }
    if (!programasValidos.length) { this.toast.error('Faltan datos', 'Debe agregar al menos un programa.'); return; }
    try {
      const body: any = { ...this.perfForm, programas: programasValidos };
      if (this.editPerfId) { await this.api.updatePerfil(this.editPerfId, body).toPromise(); this.toast.success('Perfil actualizado'); }
      else { await this.api.createPerfil(body).toPromise(); this.toast.success('Perfil creado'); }
      this.events.emitDataChanged(); this.closePerfDialog(); this._loadPerf();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'Error inesperado.';
      this.toast.error('Error', msg);
    }
  }
  confirmDeletePerf(p: Perfil): void {
    if (confirm(`¿Eliminar el perfil "${p.nombre}"?`)) {
      this.api.deletePerfil(p.id).subscribe({
        next: () => { this.toast.success('Perfil eliminado'); this.events.emitDataChanged(); this._loadPerf(); },
        error: (e) => { const msg = e?.error?.error || e?.message || 'Error inesperado.'; this.toast.error('Error', msg); },
      });
    }
  }
}