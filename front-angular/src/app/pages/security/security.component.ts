import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DragDropModule, moveItemInArray, type CdkDragDrop } from '@angular/cdk/drag-drop';
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
  IconCheckComponent, IconCloseComponent, IconUploadComponent,
} from '../../shared/components/icons';
import type { Aplicacion, Modulo, Programa, Perfil, PerfilPrograma, TipoPrograma, TipoControl, Control } from '../../shared/models/types';

type Estado = 'ACTIVO' | 'INACTIVO';

const TIPOS_PROGRAMA: TipoPrograma[] = ['Menú', 'Submenú', 'Maestro', 'Transacción', 'Proceso', 'Consulta', 'Reporte', 'Objeto'];

const TIPOS_CONTROL: TipoControl[] = ['Caja de Texto', 'Botón', 'Check', 'Combo', 'Grid', 'Option', 'Otros'];

interface ControlRow {
  codigo: string;
  tipoControl: TipoControl | '';
  descripcion: string;
  estado: 'ACTIVO' | 'INACTIVO';
  log: 'ACTIVO' | 'INACTIVO';
  orden?: number;
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
    CommonModule, FormsModule, DragDropModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSecurityComponent, IconSearchComponent, IconDownloadComponent,
    IconCheckComponent, IconCloseComponent, IconUploadComponent,
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
                <app-icon-plus [width]="14" [height]="14" /> Nueva Aplicación
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
                <app-icon-plus [width]="14" [height]="14" /> Nuevo Módulo
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
                <app-icon-plus [width]="14" [height]="14" /> Nuevo Programa
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
        } @else if (selectedPerfil(); as perf) {
          <div class="perfil-detail">
            <div class="perfil-detail-header">
              <div>
                <h2 style="margin:8px 0 2px;">{{ perf.nombre }}</h2>
                <span class="muted small">{{ perf.codigo }} · {{ perf.descripcion }}</span>
              </div>
              <button class="btn btn-ghost btn-sm" (click)="backToPerfiles()">
                <i class="pi pi-arrow-left mr-1"></i> Volver a Perfiles
              </button>
            </div>
            <p-tabs value="0">
              <p-tablist>
                <p-tab value="0"><i class="pi pi-th-large mr-2"></i>Programas por perfil</p-tab>
                <p-tab value="1"><i class="pi pi-lock mr-2"></i>Controles por perfil</p-tab>
              </p-tablist>
              <p-tabpanels>
                <p-tabpanel value="0">
                  <div class="card table-wrap">
                    <table class="data">
                      <thead>
                        <tr>
                          <th>Código de Programa</th>
                          <th>Nombre</th>
                          <th>Tipo de Programa</th>
                          <th style="text-align:center;">Nuevo</th>
                          <th style="text-align:center;">Modificar</th>
                          <th style="text-align:center;">Eliminar</th>
                          <th style="text-align:center;">Imprimir</th>
                          <th style="text-align:center;">Consultar</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (pp of perfilDetalleProgramas(); track pp.prgCodigo) {
                          <tr>
                            <td class="mono">{{ pp.prgCodigo }}</td>
                            <td><div class="cell-strong">{{ pp.prgNombre }}</div></td>
                            <td><span class="badge badge-blue">{{ pp.tipo }}</span></td>
                            <td style="text-align:center;">
                              @if (pp.nuevo) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                              @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                            </td>
                            <td style="text-align:center;">
                              @if (pp.modificar) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                              @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                            </td>
                            <td style="text-align:center;">
                              @if (pp.anular) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                              @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                            </td>
                            <td style="text-align:center;">
                              @if (pp.imprimir) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                              @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                            </td>
                            <td style="text-align:center;">
                              @if (pp.consultar) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                              @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                            </td>
                            <td>
                              <div class="cell-actions">
                                <button class="btn btn-ghost btn-sm btn-icon" title="Editar permisos" (click)="openPermDialog(pp.prgCodigo)">
                                  <app-icon-edit [width]="15" [height]="15" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        } @empty {
                          <tr><td colspan="9" class="muted center" style="padding: 24px;">Este perfil no tiene programas asociados.</td></tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </p-tabpanel>
                <p-tabpanel value="1">
                  <div class="card table-wrap">
                    <table class="data">
                      <thead>
                        <tr>
                          <th>Código de Programa</th>
                          <th>Código</th>
                          <th>Tipo de Control</th>
                          <th>Descripción del Control</th>
                          <th style="text-align:center;width:90px;">Visualizar</th>
                          <th style="text-align:center;width:90px;">Modificar</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (c of perfilDetalleControles(); track $index) {
                          <tr>
                            <td class="mono">{{ c.prgCodigo }}</td>
                            <td class="mono">{{ c.codigo }}</td>
                            <td><span class="badge badge-blue">{{ c.tipoControl }}</span></td>
                            <td>{{ c.descripcion }}</td>
                            <td style="text-align:center;">
                              @if (c.visualizar) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                              @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                            </td>
                            <td style="text-align:center;">
                              @if (c.modificar) { <span class="perm-icon-yes"><app-icon-check [width]="16" [height]="16" /></span> }
                              @else { <span class="perm-icon-no"><app-icon-close [width]="16" [height]="16" /></span> }
                            </td>
                          </tr>
                        } @empty {
                          <tr><td colspan="6" class="muted center" style="padding: 24px;">No hay controles asociados a los programas de este perfil.</td></tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </p-tabpanel>
              </p-tabpanels>
            </p-tabs>
          </div>
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (p of paginatedPerfs(); track p.id) {
                  <tr>
                    <td class="mono">{{ p.codigo }}</td>
                    <td>
                      <a class="perfil-link" (click)="openPerfilDetail(p)">{{ p.nombre }}</a>
                    </td>
                    <td class="desc-col">{{ p.descripcion }}</td>
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
      [header]="editAppId ? 'Editar Aplicación' : 'Nueva Aplicación'"
      [modal]="true" [style]="{ width: '480px' }" [closable]="true"
      (onHide)="closeAppDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código <span class="required">*</span></label>
          <input class="input" [class.invalid]="appTouched && !appForm.codigo" [(ngModel)]="appForm.codigo" placeholder="APP-SAP" />
        </div>
        <div class="field">
          <label>Nombre <span class="required">*</span></label>
          <input class="input" [class.invalid]="appTouched && !appForm.nombre" [(ngModel)]="appForm.nombre" placeholder="SAP ERP" />
        </div>
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea class="input" [(ngModel)]="appForm.descripcion" rows="2" maxlength="250"></textarea>
        <div class="muted small" style="margin-top:2px;">{{ (appForm.descripcion || '').length }}/250 caracteres máximos.</div>
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
      [header]="editModId ? 'Editar Módulo' : 'Nuevo Módulo'"
      [modal]="true" [style]="{ width: '480px' }" [closable]="true"
      (onHide)="closeModDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código <span class="required">*</span></label>
          <input class="input" [class.invalid]="modTouched && !modForm.codigo" [(ngModel)]="modForm.codigo" placeholder="MOD-FI" />
        </div>
        <div class="field">
          <label>Nombre <span class="required">*</span></label>
          <input class="input" [class.invalid]="modTouched && !modForm.nombre" [(ngModel)]="modForm.nombre" placeholder="Finanzas (FI)" />
        </div>
      </div>
      <div class="field">
        <label>Aplicación <span class="required">*</span></label>
        <div class="search-field">
          <input class="select" type="text" [ngModel]="modAppSearchText()" readonly placeholder="Seleccione una aplicación..." [class.invalid]="modTouched && !modForm.appCodigo" />
          <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openAppSearchDialog()" title="Buscar aplicación">
            <app-icon-search [width]="16" [height]="16" />
          </button>
        </div>
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea class="input" [(ngModel)]="modForm.descripcion" rows="2" maxlength="250"></textarea>
        <div class="muted small" style="margin-top:2px;">{{ (modForm.descripcion || '').length }}/250 caracteres máximos.</div>
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

    <!-- ============ DIÁLOGO BÚSQUEDA APLICACIÓN ============ -->
    <p-dialog
      [(visible)]="showAppSearchDlg"
      header="Buscar aplicación"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="closeAppSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="appSearchCodigo" placeholder="Código de aplicación" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="appSearchNombre" placeholder="Nombre de aplicación" />
        </div>
        <div class="field">
          <label>Estado</label>
          <select class="select" [(ngModel)]="appSearchEstado">
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyAppFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearAppFilters()">Limpiar</button>
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
            @for (a of paginatedAppsForSearch(); track a.id) {
              <tr>
                <td class="mono">{{ a.codigo }}</td>
                <td><div class="cell-strong">{{ a.nombre }}</div></td>
                <td>{{ a.descripcion }}</td>
                <td>
                  <span class="badge" [class.badge-green]="a.estado === 'ACTIVO'" [class.badge-gray]="a.estado !== 'ACTIVO'">
                    {{ a.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectAppFromDialog(a)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="appSearchPage() === 1" (click)="changeAppSearchPage(-1)">Anterior</button>
        <span>Página {{ appSearchPage() }} de {{ appSearchTotalPages() }} ({{ filteredAppsForSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="appSearchPage() === appSearchTotalPages()" (click)="changeAppSearchPage(1)">Siguiente</button>
      </div>
    </p-dialog>

    <!-- ============ DIÁLOGO PROGRAMA ============ -->
    <p-dialog
      [(visible)]="showPrgDlg"
      [header]="editPrgId ? 'Editar Programa' : 'Nuevo Programa'"
      [modal]="true" [style]="{ width: '640px' }" [closable]="true"
      (onHide)="closePrgDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código <span class="required">*</span></label>
          <input class="input" [class.invalid]="prgTouched && !prgForm.codigo" [(ngModel)]="prgForm.codigo" placeholder="PRG-FI-DOCS" />
        </div>
        <div class="field">
          <label>Nombre <span class="required">*</span></label>
          <input class="input" [class.invalid]="prgTouched && !prgForm.nombre" [(ngModel)]="prgForm.nombre" placeholder="Documentos contables" />
        </div>
      </div>
      <div class="field">
        <label>Aplicación <span class="required">*</span></label>
        <div class="search-field">
          <input class="select" type="text" [ngModel]="prgAppSearchText()" readonly placeholder="Seleccione una aplicación..." [class.invalid]="prgTouched && !prgForm.appCodigo" />
          <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openPrgAppSearchDialog()" title="Buscar aplicación">
            <app-icon-search [width]="16" [height]="16" />
          </button>
        </div>
      </div>
      <div class="field">
        <label>Módulo <span class="required">*</span></label>
        <div class="search-field">
          <input class="select" type="text" [ngModel]="prgModSearchText()" readonly placeholder="Seleccione un módulo..." [class.invalid]="prgTouched && !prgForm.modCodigo" />
          <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openPrgModSearchDialog()" [disabled]="!prgForm.appCodigo" title="Buscar módulo" [attr.title]="!prgForm.appCodigo ? 'Seleccione una aplicación primero' : 'Buscar módulo'">
            <app-icon-search [width]="16" [height]="16" />
          </button>
        </div>
      </div>
      <div class="field">
        <label>Tipo de Programa <span class="required">*</span></label>
        <select class="select" [class.invalid]="prgTouched && !prgForm.tipo" [(ngModel)]="prgForm.tipo">
          <option value="">— Seleccione —</option>
          @for (tipo of tiposPrograma; track tipo) {
            <option [value]="tipo">{{ tipo }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea class="input" [(ngModel)]="prgForm.descripcion" rows="2" maxlength="250"></textarea>
        <div class="muted small" style="margin-top:2px;">{{ (prgForm.descripcion || '').length }}/250 caracteres máximos.</div>
      </div>
      <div class="field">
        <label>Estado</label>
        <select class="select" [(ngModel)]="prgForm.estado">
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>
      @if (prgForm.tipo && prgForm.tipo !== 'Menú' && prgForm.tipo !== 'Submenú') {
        <div class="field">
          <label>Controles del Programa</label>
          <div class="controles-list" cdkDropList (cdkDropListDropped)="dropControl($event)">
            @for (c of prgControles; track $index) {
              <div class="control-row" cdkDrag cdkDragLockAxis="y">
                <div class="drag-handle small" title="Arrastrar para reordenar" (click)="$event.stopPropagation()"></div>
                <button class="btn btn-danger btn-sm btn-icon control-delete" title="Quitar control" (click)="removeControl($index)">
                  <app-icon-trash [width]="14" [height]="14" />
                </button>
                <div class="control-row-content">
                  <div class="control-row-top">
                    <input class="input control-codigo" [class.invalid]="prgTouched && !c.codigo" [(ngModel)]="c.codigo" placeholder="Código *" />
                    <select class="select control-tipo" [class.invalid]="prgTouched && !c.tipoControl" [(ngModel)]="c.tipoControl">
                      <option value="">— Seleccione —</option>
                      @for (t of tiposControl; track t) {
                        <option [value]="t">{{ t }}</option>
                      }
                    </select>
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
                  </div>
                  <input class="input control-desc-full" [class.invalid]="prgTouched && !c.descripcion" [(ngModel)]="c.descripcion" placeholder="Descripción del control *" />
                </div>
              </div>
            }
          </div>
          <button class="btn btn-ghost btn-sm mt-2" (click)="addControl()">
            <app-icon-plus [width]="14" [height]="14" /> Agregar Control
          </button>
        </div>
      }
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closePrgDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="savePrg()">{{ editPrgId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO BÚSQUEDA APLICACIÓN PARA PROGRAMA ============ -->
    <p-dialog
      [(visible)]="showPrgAppSearchDlg"
      header="Buscar aplicación"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="closePrgAppSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="prgAppSearchCodigo" placeholder="Código de aplicación" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="prgAppSearchNombre" placeholder="Nombre de aplicación" />
        </div>
        <div class="field">
          <label>Estado</label>
          <select class="select" [(ngModel)]="prgAppSearchEstado">
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyPrgAppFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearPrgAppFilters()">Limpiar</button>
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
            @for (a of paginatedAppsForPrgSearch(); track a.id) {
              <tr>
                <td class="mono">{{ a.codigo }}</td>
                <td><div class="cell-strong">{{ a.nombre }}</div></td>
                <td>{{ a.descripcion }}</td>
                <td>
                  <span class="badge" [class.badge-green]="a.estado === 'ACTIVO'" [class.badge-gray]="a.estado !== 'ACTIVO'">
                    {{ a.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectPrgAppFromDialog(a)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="prgAppSearchPage() === 1" (click)="changePrgAppSearchPage(-1)">Anterior</button>
        <span>Página {{ prgAppSearchPage() }} de {{ prgAppSearchTotalPages() }} ({{ filteredAppsForPrgSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="prgAppSearchPage() === prgAppSearchTotalPages()" (click)="changePrgAppSearchPage(1)">Siguiente</button>
      </div>
    </p-dialog>

    <!-- ============ DIÁLOGO BÚSQUEDA MÓDULO PARA PROGRAMA ============ -->
    <p-dialog
      [(visible)]="showPrgModSearchDlg"
      header="Buscar módulo"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="closePrgModSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="prgModSearchCodigo" placeholder="Código de módulo" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="prgModSearchNombre" placeholder="Nombre de módulo" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyPrgModFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearPrgModFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Aplicación</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (m of paginatedModsForPrgSearch(); track m.id) {
              <tr>
                <td class="mono">{{ m.codigo }}</td>
                <td><div class="cell-strong">{{ m.nombre }}</div></td>
                <td><span class="badge badge-blue">{{ m.appCodigo }}</span></td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectPrgModFromDialog(m)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="prgModSearchPage() === 1" (click)="changePrgModSearchPage(-1)">Anterior</button>
        <span>Página {{ prgModSearchPage() }} de {{ prgModSearchTotalPages() }} ({{ filteredModsForPrgSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="prgModSearchPage() === prgModSearchTotalPages()" (click)="changePrgModSearchPage(1)">Siguiente</button>
      </div>
    </p-dialog>

    <!-- ============ DIÁLOGO PERFIL ============ -->
    <p-dialog
      [(visible)]="showPerfDlg"
      [header]="editPerfId ? 'Editar Perfil' : 'Nuevo Perfil'"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="closePerfDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código <span class="required">*</span></label>
          <input class="input" [class.invalid]="perfTouched && !perfForm.codigo" [(ngModel)]="perfForm.codigo" placeholder="PERF-FI-VIS" />
        </div>
        <div class="field">
          <label>Nombre <span class="required">*</span></label>
          <input class="input" [class.invalid]="perfTouched && !perfForm.nombre" [(ngModel)]="perfForm.nombre" placeholder="FI Visualizador" />
        </div>
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea class="input" [(ngModel)]="perfForm.descripcion" rows="2" maxlength="250"></textarea>
        <div class="muted small" style="margin-top:2px;">{{ (perfForm.descripcion || '').length }}/250 caracteres máximos.</div>
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
                  <div class="search-field" style="width:200px;">
                    <input class="select control-tipo" type="text" [ngModel]="perfAppSearchTexts()[$index]" readonly placeholder="Seleccionar..." style="width:100%;" />
                    <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openPerfAppSearchDialog($index)" title="Buscar aplicación">
                      <app-icon-search [width]="14" [height]="14" />
                    </button>
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;">
                  <label class="small muted">Módulo</label>
                  <div class="search-field" style="width:200px;">
                    <input class="select control-tipo" type="text" [ngModel]="perfModSearchTexts()[$index]" readonly placeholder="Seleccionar..." style="width:100%;" [disabled]="!pp.appCodigo" />
                    <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openPerfModSearchDialog($index)" [disabled]="!pp.appCodigo" title="Buscar módulo">
                      <app-icon-search [width]="14" [height]="14" />
                    </button>
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;">
                  <label class="small muted">Programa</label>
                  <div class="search-field" style="width:200px;">
                    <input class="select control-tipo" type="text" [ngModel]="perfPrgSearchTexts()[$index]" readonly placeholder="Seleccionar..." style="width:100%;" [disabled]="!pp.modCodigo" />
                    <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openPerfPrgSearchDialog($index)" [disabled]="!pp.modCodigo" title="Buscar programa">
                      <app-icon-search [width]="14" [height]="14" />
                    </button>
                  </div>
                </div>
              </div>
              <div class="table-wrap mt-2">
                <table class="data" style="width:100%;">
                  <thead>
                    <tr>
                      <th>Tipo Programa</th>
                      <th>Nuevo</th>
                      <th>Modificar</th>
                      <th>Eliminar</th>
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
              <hr style="border:none;border-top:1px solid var(--border);margin:8px 0;" />
            </div>
          }
        </div>
        <button class="btn btn-ghost btn-sm mt-2" (click)="addPerfPrograma()">
          <app-icon-plus [width]="14" [height]="14" /> Agregar Programa
        </button>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closePerfDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="savePerf()">{{ editPerfId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO BÚSQUEDA APLICACIÓN PARA PERFIL ============ -->
    <p-dialog
      [(visible)]="showPerfAppSearchDlg"
      header="Buscar aplicación"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="closePerfAppSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="perfAppSearchCodigo" placeholder="Código de aplicación" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="perfAppSearchNombre" placeholder="Nombre de aplicación" />
        </div>
        <div class="field">
          <label>Estado</label>
          <select class="select" [(ngModel)]="perfAppSearchEstado">
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyPerfAppFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearPerfAppFilters()">Limpiar</button>
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
            @for (a of paginatedAppsForPerfSearch(); track a.id) {
              <tr>
                <td class="mono">{{ a.codigo }}</td>
                <td><div class="cell-strong">{{ a.nombre }}</div></td>
                <td>{{ a.descripcion }}</td>
                <td>
                  <span class="badge" [class.badge-green]="a.estado === 'ACTIVO'" [class.badge-gray]="a.estado !== 'ACTIVO'">
                    {{ a.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectPerfAppFromDialog(a)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="perfAppSearchPage() === 1" (click)="changePerfAppSearchPage(-1)">Anterior</button>
        <span>Página {{ perfAppSearchPage() }} de {{ perfAppSearchTotalPages() }} ({{ filteredAppsForPerfSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="perfAppSearchPage() === perfAppSearchTotalPages()" (click)="changePerfAppSearchPage(1)">Siguiente</button>
      </div>
    </p-dialog>

    <!-- ============ DIÁLOGO BÚSQUEDA MÓDULO PARA PERFIL ============ -->
    <p-dialog
      [(visible)]="showPerfModSearchDlg"
      header="Buscar módulo"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="closePerfModSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="perfModSearchCodigo" placeholder="Código de módulo" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="perfModSearchNombre" placeholder="Nombre de módulo" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyPerfModFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearPerfModFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Aplicación</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (m of paginatedModsForPerfSearch(); track m.id) {
              <tr>
                <td class="mono">{{ m.codigo }}</td>
                <td><div class="cell-strong">{{ m.nombre }}</div></td>
                <td><span class="badge badge-blue">{{ m.appCodigo }}</span></td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectPerfModFromDialog(m)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="perfModSearchPage() === 1" (click)="changePerfModSearchPage(-1)">Anterior</button>
        <span>Página {{ perfModSearchPage() }} de {{ perfModSearchTotalPages() }} ({{ filteredModsForPerfSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="perfModSearchPage() === perfModSearchTotalPages()" (click)="changePerfModSearchPage(1)">Siguiente</button>
      </div>
    </p-dialog>

    <!-- ============ DIÁLOGO BÚSQUEDA PROGRAMA PARA PERFIL ============ -->
    <p-dialog
      [(visible)]="showPerfPrgSearchDlg"
      header="Buscar programa"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="closePerfPrgSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="perfPrgSearchCodigo" placeholder="Código de programa" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="perfPrgSearchNombre" placeholder="Nombre de programa" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyPerfPrgFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearPerfPrgFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (p of paginatedPrgsForPerfSearch(); track p.id) {
              <tr>
                <td class="mono">{{ p.codigo }}</td>
                <td><div class="cell-strong">{{ p.nombre }}</div></td>
                <td><span class="badge badge-amber">{{ p.tipo }}</span></td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectPerfPrgFromDialog(p)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="perfPrgSearchPage() === 1" (click)="changePerfPrgSearchPage(-1)">Anterior</button>
        <span>Página {{ perfPrgSearchPage() }} de {{ perfPrgSearchTotalPages() }} ({{ filteredPrgsForPerfSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="perfPrgSearchPage() === perfPrgSearchTotalPages()" (click)="changePerfPrgSearchPage(1)">Siguiente</button>
      </div>
    </p-dialog>

    <!-- ============ DIÁLOGO PERMISOS POR PROGRAMA ============ -->
    <p-dialog
      [(visible)]="showPermDlg"
      [header]="'Permisos del Programa'"
      [modal]="true" [style]="{ width: '640px' }" [closable]="true"
      (onHide)="closePermDialog()"
    >
      <!-- Info general -->
      <div class="perm-info-grid">
        <div class="perm-info-item">
          <span class="perm-info-label">Cod. Perfil</span>
          <span class="perm-info-value mono">{{ selectedPerfil()?.codigo }}</span>
        </div>
        <div class="perm-info-item">
          <span class="perm-info-label">Nombre del Perfil</span>
          <span class="perm-info-value">{{ selectedPerfil()?.nombre }}</span>
        </div>
        <div class="perm-info-item">
          <span class="perm-info-label">Cod. Programa</span>
          <span class="perm-info-value mono">{{ editingPrgCodigo }}</span>
        </div>
        <div class="perm-info-item">
          <span class="perm-info-label">Nombre del Programa</span>
          <span class="perm-info-value">{{ editingPrgNombre }}</span>
        </div>
      </div>

      <hr class="perm-divider" />

      <!-- Permisos del programa -->
      <div class="perm-section-title">Permisos del Programa</div>
      <div class="perm-grid">
        <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.nuevo" /><span>Nuevo</span></label>
        <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.modificar" /><span>Modificar</span></label>
        <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.anular" /><span>Eliminar</span></label>
        <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.imprimir" /><span>Imprimir</span></label>
        <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.consultar" /><span>Consultar</span></label>
      </div>

      <hr class="perm-divider" />

      <!-- Controles del programa -->
      <div class="perm-section-title">Controles del Programa</div>
      @if (permControles.length) {
        <div class="card table-wrap" style="margin-top:8px;">
          <table class="data" style="width:100%;">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo de Control</th>
                <th>Descripción</th>
                <th style="text-align:center;width:90px;">Visualizar</th>
                <th style="text-align:center;width:90px;">Modificar</th>
              </tr>
            </thead>
            <tbody>
              @for (c of permControles; track $index) {
                <tr>
                  <td class="mono">{{ c.codigo }}</td>
                  <td><span class="badge badge-blue">{{ c.tipoControl }}</span></td>
                  <td>{{ c.descripcion }}</td>
                  <td style="text-align:center;"><input type="checkbox" [(ngModel)]="c.visualizar" style="width:16px;height:16px;cursor:pointer;" /></td>
                  <td style="text-align:center;"><input type="checkbox" [(ngModel)]="c.modificar" style="width:16px;height:16px;cursor:pointer;" /></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="muted small" style="margin-top:8px;">Este programa no tiene controles registrados.</p>
      }

      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closePermDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="savePermDialog()">Guardar</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO CARGA MASIVA APLICACIONES/MÓDULOS/PROGRAMAS ============ -->
    <p-dialog
      [(visible)]="showBulkDlg"
      header="Carga masiva de aplicaciones"
      [modal]="true" [style]="{ width: '620px' }" [closable]="true"
      (onHide)="closeBulkDialog()"
    >
      <p class="mb-3 muted small">
        El archivo debe tener las columnas: <b>TIPO</b>, <b>CODIGO</b>, <b>NOMBRE</b>, <b>DESCRIPCION</b>, <b>APP_CODIGO</b>, <b>MOD_CODIGO</b>, <b>PRG_TIPO</b> y <b>ESTADO</b>.
        TIPOS válidos: <b>APLICACION</b>, <b>MODULO</b>, <b>PROGRAMA</b>.
      </p>

      <div class="row gap-2 mb-3">
        <button class="btn btn-ghost" (click)="downloadBulkTemplate()">
          <app-icon-download [width]="14" [height]="14" /> Descargar Plantilla
        </button>
      </div>

      <div class="field">
        <label>Archivo Excel</label>
        <input type="file" accept=".xlsx,.xls" (change)="onBulkFileSelected($event)" />
        @if (bulkFileName()) {
          <div class="small mt-1">{{ bulkFileName() }}</div>
        }
      </div>

      @if (bulkSuccess()) {
        <div class="alert alert-success mb-3">{{ bulkSuccess() }}</div>
      }

      @if (bulkErrors().length > 0) {
        <div class="alert alert-error mb-3">
          <ul class="mb-0">
            @for (e of bulkErrors(); track e.row + e.message) {
              <li>Fila {{ e.row }}: {{ e.message }}</li>
            }
          </ul>
        </div>
      }

      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeBulkDialog()">Cerrar</button>
        <button class="btn btn-primary" (click)="processBulkFile()" [disabled]="!bulkFile || bulkLoading()">
          @if (bulkLoading()) {
            <span>Procesando...</span>
          } @else {
            <span>Procesar</span>
          }
        </button>
      </ng-template>
    </p-dialog>

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
        <div class="alert alert-error mb-3">
          <ul class="mb-0">
            @for (e of perfilBulkErrors(); track e.row + e.message) {
              <li>Fila {{ e.row }}: {{ e.message }}</li>
            }
          </ul>
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
    .control-row {
      position: relative;
      padding-left: 28px;
      padding-right: 28px;
      display: flex;
      flex-direction: column;
    }
    .control-delete {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 1;
    }
    .control-row-content {
      width: 100%;
    }
    .drag-handle {
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 12px;
      height: 18px;
      cursor: grab;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      opacity: 0.35;
      transition: opacity .15s;
    }
    .drag-handle::before,
    .drag-handle::after {
      content: '';
      display: block;
      height: 2px;
      background: currentColor;
      border-radius: 1px;
      box-shadow: 0 4px 0 currentColor, 0 8px 0 currentColor;
    }
    .drag-handle::after {
      box-shadow: none;
    }
    .control-row:hover .drag-handle {
      opacity: 0.65;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
    .drag-handle.small {
      left: 8px;
      width: 10px;
      height: 14px;
    }
    .control-row.cdk-drag-preview {
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      background: var(--surface);
      border-radius: 8px;
    }
    .control-row.cdk-drag-placeholder {
      opacity: 0.35;
      border-style: dashed;
    }
    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drag-animating {
      transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
    }
    .required {
      color: var(--red-600, #c8102e);
      font-weight: bold;
    }
    .input.invalid {
      border-color: var(--red-600, #c8102e);
      background-color: var(--red-50, #fef2f2);
    }
    .select.invalid {
      border-color: var(--red-600, #c8102e);
      background-color: var(--red-50, #fef2f2);
    }
    .control-tipo.invalid,
    .control-desc-full.invalid,
    .control-codigo.invalid {
      border-color: var(--red-600, #c8102e);
      background-color: var(--red-50, #fef2f2);
    }
    .control-codigo {
      width: 140px;
      flex-shrink: 0;
    }
    .control-row-top {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .control-desc-full {
      width: calc(100% - 32px);
      margin-top: 6px;
      box-sizing: border-box;
    }
    .perfil-link {
      color: var(--primary, #2563eb);
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
    }
    .perfil-link:hover {
      text-decoration: underline;
    }
    .perfil-detail {
      padding: 0;
    }
    .perfil-detail-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }
    .perfil-detail-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
    }
    .perm-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .perm-info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .perm-info-label {
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      color: var(--muted, #6b7280);
      font-weight: 600;
    }
    .perm-info-value {
      font-size: 0.9rem;
      font-weight: 500;
    }
    .perm-divider {
      border: none;
      border-top: 1px solid var(--border, #e5e7eb);
      margin: 16px 0;
    }
    .perm-section-title {
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--muted, #6b7280);
      margin-bottom: 10px;
    }
    .perm-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }
    .perm-check {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .perm-check input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    .check-yes { color: #22c55e; font-weight: 700; }
    .check-no { color: #d1d5db; }
    .perm-icon-yes { color: #22c55e; display: inline-flex; align-items: center; justify-content: center; }
    .perm-icon-no { color: #ef4444; display: inline-flex; align-items: center; justify-content: center; }
  `],
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
  selectedPerfil = signal<Perfil | null>(null);

  perfilDetalleProgramas = computed(() => {
    const perf = this.selectedPerfil();
    if (!perf) return [];
    return perf.programas.map(pp => {
      const prg = this.programas().find(p => p.codigo === pp.prgCodigo);
      return {
        prgCodigo: pp.prgCodigo,
        prgNombre: prg?.nombre || '',
        tipo: prg?.tipo || '',
        nuevo: pp.nuevo,
        modificar: pp.modificar,
        anular: pp.anular,
        procesar: pp.procesar,
        imprimir: pp.imprimir,
        consultar: pp.consultar,
      };
    });
  });

  perfilDetalleControles = computed(() => {
    const perf = this.selectedPerfil();
    if (!perf) return [];
    const result: { prgCodigo: string; codigo: string; tipoControl: string; descripcion: string; visualizar: boolean; modificar: boolean }[] = [];
    for (const pp of perf.programas) {
      const ctrls = this.controlesMap().get(pp.prgCodigo) || [];
      for (const c of ctrls) {
        const ctrlIndex = ctrls.indexOf(c);
        const perfilCtrl = pp.controles?.find(pc => pc.ctrlIndex === ctrlIndex);
        result.push({
          prgCodigo: pp.prgCodigo,
          codigo: c.codigo,
          tipoControl: c.tipoControl,
          descripcion: c.descripcion,
          visualizar: perfilCtrl?.visualizar ?? false,
          modificar: perfilCtrl?.modificar ?? false,
        });
      }
    }
    return result;
  });

  loadingApp = signal(true);
  loadingMod = signal(true);
  loadingPrg = signal(true);
  loadingPerf = signal(true);
  errorApp = signal<string | null>(null);
  errorMod = signal<string | null>(null);
  errorPrg = signal<string | null>(null);
  errorPerf = signal<string | null>(null);

  // --- Diálogos ---
  showAppDlg = false; editAppId: string | null = null; appTouched = false;
  showModDlg = false; editModId: string | null = null; modTouched = false;
  showPrgDlg = false; editPrgId: string | null = null; prgTouched = false;
  showPerfDlg = false; editPerfId: string | null = null; perfTouched = false;

  showBulkDlg = false;
  bulkFile: File | null = null;
  bulkFileName = signal('');
  bulkErrors = signal<{ row: number; message: string }[]>([]);
  bulkSuccess = signal('');
  bulkLoading = signal(false);

  showPerfilBulkDlg = false;
  perfilBulkFile: File | null = null;
  perfilBulkFileName = signal('');
  perfilBulkErrors = signal<{ row: number; message: string }[]>([]);
  perfilBulkSuccess = signal('');
  perfilBulkLoading = signal(false);

  // --- Diálogo búsqueda de aplicación (para módulo) ---
  showAppSearchDlg = false;
  appSearchCodigo = '';
  appSearchNombre = '';
  appSearchEstado = '';
  appliedAppSearchCodigo = signal('');
  appliedAppSearchNombre = signal('');
  appliedAppSearchEstado = signal('');
  appSearchPage = signal(1);
  appSearchPageSize = signal(10);
  modAppSearchText = signal('');

  // --- Diálogo búsqueda de aplicación (para programa) ---
  showPrgAppSearchDlg = false;
  prgAppSearchCodigo = '';
  prgAppSearchNombre = '';
  prgAppSearchEstado = '';
  appliedPrgAppSearchCodigo = signal('');
  appliedPrgAppSearchNombre = signal('');
  appliedPrgAppSearchEstado = signal('');
  prgAppSearchPage = signal(1);
  prgAppSearchPageSize = signal(10);
  prgAppSearchText = signal('');

  // --- Diálogo búsqueda de módulo (para programa) ---
  showPrgModSearchDlg = false;
  prgModSearchCodigo = '';
  prgModSearchNombre = '';
  appliedPrgModSearchCodigo = signal('');
  appliedPrgModSearchNombre = signal('');
  prgModSearchPage = signal(1);
  prgModSearchPageSize = signal(10);
  prgModSearchText = signal('');

  // --- Diálogos búsqueda para perfil (app / módulo / programa) ---
  activePerfRowIdx = signal<number>(-1);
  perfAppSearchTexts = signal<string[]>([]);
  perfModSearchTexts = signal<string[]>([]);
  perfPrgSearchTexts = signal<string[]>([]);

  showPerfAppSearchDlg = false;
  perfAppSearchCodigo = '';
  perfAppSearchNombre = '';
  perfAppSearchEstado = '';
  appliedPerfAppSearchCodigo = signal('');
  appliedPerfAppSearchNombre = signal('');
  appliedPerfAppSearchEstado = signal('');
  perfAppSearchPage = signal(1);
  perfAppSearchPageSize = signal(10);

  showPerfModSearchDlg = false;
  perfModSearchCodigo = '';
  perfModSearchNombre = '';
  appliedPerfModSearchCodigo = signal('');
  appliedPerfModSearchNombre = signal('');
  perfModSearchPage = signal(1);
  perfModSearchPageSize = signal(10);

  showPerfPrgSearchDlg = false;
  perfPrgSearchCodigo = '';
  perfPrgSearchNombre = '';
  appliedPerfPrgSearchCodigo = signal('');
  appliedPerfPrgSearchNombre = signal('');
  perfPrgSearchPage = signal(1);
  perfPrgSearchPageSize = signal(10);

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

  // --- Computed para búsqueda de aplicación en diálogo de módulo ---
  aplicacionMap = computed(() => new Map(this.aplicaciones().map(a => [a.codigo, a])));

  filteredAppsForSearch = computed(() => {
    const qCodigo = this.appliedAppSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedAppSearchNombre().toLowerCase().trim();
    const qEstado = this.appliedAppSearchEstado().trim();
    return this.aplicaciones().filter(a =>
      (!qCodigo || a.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || a.nombre.toLowerCase().includes(qNombre)) &&
      (!qEstado || a.estado === qEstado)
    );
  });

  paginatedAppsForSearch = computed(() => {
    const start = (this.appSearchPage() - 1) * this.appSearchPageSize();
    return this.filteredAppsForSearch().slice(start, start + this.appSearchPageSize());
  });

  appSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredAppsForSearch().length / this.appSearchPageSize())));

  // --- Computed para búsqueda de aplicación en diálogo de programa ---
  filteredAppsForPrgSearch = computed(() => {
    const qCodigo = this.appliedPrgAppSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedPrgAppSearchNombre().toLowerCase().trim();
    const qEstado = this.appliedPrgAppSearchEstado().trim();
    return this.aplicaciones().filter(a =>
      (!qCodigo || a.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || a.nombre.toLowerCase().includes(qNombre)) &&
      (!qEstado || a.estado === qEstado)
    );
  });

  paginatedAppsForPrgSearch = computed(() => {
    const start = (this.prgAppSearchPage() - 1) * this.prgAppSearchPageSize();
    return this.filteredAppsForPrgSearch().slice(start, start + this.prgAppSearchPageSize());
  });

  prgAppSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredAppsForPrgSearch().length / this.prgAppSearchPageSize())));

  // --- Computed para búsqueda de módulo en diálogo de programa ---
  filteredModsForPrgSearch = computed(() => {
    const appCod = this.prgAppCodigo();
    const qCodigo = this.appliedPrgModSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedPrgModSearchNombre().toLowerCase().trim();
    let mods = appCod ? this.modulos().filter(m => m.appCodigo === appCod) : this.modulos();
    return mods.filter(m =>
      (!qCodigo || m.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || m.nombre.toLowerCase().includes(qNombre))
    );
  });

  paginatedModsForPrgSearch = computed(() => {
    const start = (this.prgModSearchPage() - 1) * this.prgModSearchPageSize();
    return this.filteredModsForPrgSearch().slice(start, start + this.prgModSearchPageSize());
  });

  prgModSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredModsForPrgSearch().length / this.prgModSearchPageSize())));

  // --- Computed para búsqueda de aplicación en diálogo de perfil ---
  filteredAppsForPerfSearch = computed(() => {
    const qCodigo = this.appliedPerfAppSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedPerfAppSearchNombre().toLowerCase().trim();
    const qEstado = this.appliedPerfAppSearchEstado().trim();
    return this.aplicaciones().filter(a =>
      (!qCodigo || a.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || a.nombre.toLowerCase().includes(qNombre)) &&
      (!qEstado || a.estado === qEstado)
    );
  });

  paginatedAppsForPerfSearch = computed(() => {
    const start = (this.perfAppSearchPage() - 1) * this.perfAppSearchPageSize();
    return this.filteredAppsForPerfSearch().slice(start, start + this.perfAppSearchPageSize());
  });

  perfAppSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredAppsForPerfSearch().length / this.perfAppSearchPageSize())));

  // --- Computed para búsqueda de módulo en diálogo de perfil ---
  filteredModsForPerfSearch = computed(() => {
    const idx = this.activePerfRowIdx();
    const appCod = idx >= 0 ? this.perfProgramas[idx]?.appCodigo || '' : '';
    const qCodigo = this.appliedPerfModSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedPerfModSearchNombre().toLowerCase().trim();
    let mods = appCod ? this.modulos().filter(m => m.appCodigo === appCod) : this.modulos();
    return mods.filter(m =>
      (!qCodigo || m.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || m.nombre.toLowerCase().includes(qNombre))
    );
  });

  paginatedModsForPerfSearch = computed(() => {
    const start = (this.perfModSearchPage() - 1) * this.perfModSearchPageSize();
    return this.filteredModsForPerfSearch().slice(start, start + this.perfModSearchPageSize());
  });

  perfModSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredModsForPerfSearch().length / this.perfModSearchPageSize())));

  // --- Computed para búsqueda de programa en diálogo de perfil ---
  filteredPrgsForPerfSearch = computed(() => {
    const idx = this.activePerfRowIdx();
    const modCod = idx >= 0 ? this.perfProgramas[idx]?.modCodigo || '' : '';
    const qCodigo = this.appliedPerfPrgSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedPerfPrgSearchNombre().toLowerCase().trim();
    let prgs = modCod ? this.programas().filter(p => p.modCodigo === modCod) : this.programas();
    return prgs.filter(p =>
      (!qCodigo || p.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || p.nombre.toLowerCase().includes(qNombre))
    );
  });

  paginatedPrgsForPerfSearch = computed(() => {
    const start = (this.perfPrgSearchPage() - 1) * this.perfPrgSearchPageSize();
    return this.filteredPrgsForPerfSearch().slice(start, start + this.perfPrgSearchPageSize());
  });

  perfPrgSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredPrgsForPerfSearch().length / this.perfPrgSearchPageSize())));

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

  appForm = this.blankApp();
  modForm = this.blankMod();
  prgForm = this.blankPrg();
  prgAppCodigo = signal('');
  perfForm = this.blankPerf();
  tiposPrograma = TIPOS_PROGRAMA;
  tiposControl = TIPOS_CONTROL;
  prgControles: ControlRow[] = [];
  controlesMap = signal<Map<string, Control[]>>(new Map());

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
        this.controlesMap.set(map);
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
  blankPrg() { return { codigo: '', nombre: '', descripcion: '', appCodigo: '', modCodigo: '', tipo: '' as TipoPrograma, estado: 'ACTIVO' as Estado }; }
  blankPerf() { return { codigo: '', nombre: '', descripcion: '', estado: 'ACTIVO' as Estado }; }
  perfProgramas: PerfilProgramaRow[] = [];

  // ============ APLICACIÓN CRUD ============
  openAppDialog(a?: Aplicacion): void {
    if (a) { this.appForm = { codigo: a.codigo, nombre: a.nombre, descripcion: a.descripcion, estado: a.estado }; this.editAppId = a.id; }
    else { this.appForm = this.blankApp(); this.editAppId = null; }
    this.appTouched = false;
    this.showAppDlg = true;
  }
  closeAppDialog(): void { this.showAppDlg = false; this.editAppId = null; this.appTouched = false; }
  async saveApp(): Promise<void> {
    this.appTouched = true;
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

  // --- Búsqueda de aplicación para diálogo de módulo ---
  openAppSearchDialog(): void {
    this.appSearchCodigo = '';
    this.appSearchNombre = '';
    this.appSearchEstado = '';
    this.appliedAppSearchCodigo.set('');
    this.appliedAppSearchNombre.set('');
    this.appliedAppSearchEstado.set('');
    this.appSearchPage.set(1);
    this.showAppSearchDlg = true;
  }

  closeAppSearchDialog(): void {
    this.showAppSearchDlg = false;
  }

  applyAppFilters(): void {
    this.appliedAppSearchCodigo.set(this.appSearchCodigo);
    this.appliedAppSearchNombre.set(this.appSearchNombre);
    this.appliedAppSearchEstado.set(this.appSearchEstado);
    this.appSearchPage.set(1);
  }

  clearAppFilters(): void {
    this.appSearchCodigo = '';
    this.appSearchNombre = '';
    this.appSearchEstado = '';
    this.applyAppFilters();
  }

  changeAppSearchPage(delta: number): void {
    this.appSearchPage.set(Math.min(Math.max(this.appSearchPage() + delta, 1), this.appSearchTotalPages()));
  }

  selectApp(a: Aplicacion): void {
    this.modForm.appCodigo = a.codigo;
    this.modAppSearchText.set(`${a.codigo} · ${a.nombre}`);
  }

  selectAppFromDialog(a: Aplicacion): void {
    this.selectApp(a);
    this.closeAppSearchDialog();
  }

  // ============ MÓDULO CRUD ============
  openModDialog(m?: Modulo): void {
    if (m) {
      this.modForm = { codigo: m.codigo, nombre: m.nombre, descripcion: m.descripcion, appCodigo: m.appCodigo, estado: m.estado };
      this.editModId = m.id;
      const a = this.aplicacionMap().get(m.appCodigo);
      this.modAppSearchText.set(a ? `${a.codigo} · ${a.nombre}` : '');
    } else {
      this.modForm = this.blankMod();
      this.editModId = null;
      this.modAppSearchText.set('');
    }
    this.modTouched = false;
    this.showModDlg = true;
  }

  closeModDialog(): void {
    this.showModDlg = false;
    this.editModId = null;
    this.modTouched = false;
    this.modAppSearchText.set('');
  }
  async saveMod(): Promise<void> {
    this.modTouched = true;
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

  // --- Búsqueda de aplicación para diálogo de programa ---
  openPrgAppSearchDialog(): void {
    this.prgAppSearchCodigo = '';
    this.prgAppSearchNombre = '';
    this.prgAppSearchEstado = '';
    this.appliedPrgAppSearchCodigo.set('');
    this.appliedPrgAppSearchNombre.set('');
    this.appliedPrgAppSearchEstado.set('');
    this.prgAppSearchPage.set(1);
    this.showPrgAppSearchDlg = true;
  }

  closePrgAppSearchDialog(): void {
    this.showPrgAppSearchDlg = false;
  }

  applyPrgAppFilters(): void {
    this.appliedPrgAppSearchCodigo.set(this.prgAppSearchCodigo);
    this.appliedPrgAppSearchNombre.set(this.prgAppSearchNombre);
    this.appliedPrgAppSearchEstado.set(this.prgAppSearchEstado);
    this.prgAppSearchPage.set(1);
  }

  clearPrgAppFilters(): void {
    this.prgAppSearchCodigo = '';
    this.prgAppSearchNombre = '';
    this.prgAppSearchEstado = '';
    this.applyPrgAppFilters();
  }

  changePrgAppSearchPage(delta: number): void {
    this.prgAppSearchPage.set(Math.min(Math.max(this.prgAppSearchPage() + delta, 1), this.prgAppSearchTotalPages()));
  }

  selectPrgApp(a: Aplicacion): void {
    this.prgForm.appCodigo = a.codigo;
    this.prgAppSearchText.set(`${a.codigo} · ${a.nombre}`);
    this.prgAppCodigo.set(a.codigo);
    this.prgForm.modCodigo = '';
    this.prgModSearchText.set('');
  }

  selectPrgAppFromDialog(a: Aplicacion): void {
    this.selectPrgApp(a);
    this.closePrgAppSearchDialog();
  }

  // --- Búsqueda de módulo para diálogo de programa ---
  openPrgModSearchDialog(): void {
    this.prgModSearchCodigo = '';
    this.prgModSearchNombre = '';
    this.appliedPrgModSearchCodigo.set('');
    this.appliedPrgModSearchNombre.set('');
    this.prgModSearchPage.set(1);
    this.showPrgModSearchDlg = true;
  }

  closePrgModSearchDialog(): void {
    this.showPrgModSearchDlg = false;
  }

  applyPrgModFilters(): void {
    this.appliedPrgModSearchCodigo.set(this.prgModSearchCodigo);
    this.appliedPrgModSearchNombre.set(this.prgModSearchNombre);
    this.prgModSearchPage.set(1);
  }

  clearPrgModFilters(): void {
    this.prgModSearchCodigo = '';
    this.prgModSearchNombre = '';
    this.applyPrgModFilters();
  }

  changePrgModSearchPage(delta: number): void {
    this.prgModSearchPage.set(Math.min(Math.max(this.prgModSearchPage() + delta, 1), this.prgModSearchTotalPages()));
  }

  selectPrgMod(m: Modulo): void {
    this.prgForm.modCodigo = m.codigo;
    this.prgModSearchText.set(`${m.codigo} · ${m.nombre}`);
  }

  selectPrgModFromDialog(m: Modulo): void {
    this.selectPrgMod(m);
    this.closePrgModSearchDialog();
  }

  // ============ PROGRAMA CRUD ============
  openPrgDialog(p?: Programa): void {
    if (p) {
      const mod = this.modulos().find(m => m.codigo === p.modCodigo);
      const appCod = mod?.appCodigo || '';
      this.prgForm = { codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion, appCodigo: appCod, modCodigo: p.modCodigo, tipo: p.tipo, estado: p.estado };
      this.prgAppCodigo.set(appCod);
      this.editPrgId = p.id;
      const a = this.aplicacionMap().get(appCod);
      this.prgAppSearchText.set(a ? `${a.codigo} · ${a.nombre}` : '');
      this.prgModSearchText.set(mod ? `${mod.codigo} · ${mod.nombre}` : '');
      const ctrls = (this.controlesMap().get(p.codigo) || []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      this.prgControles = ctrls.map(c => ({
        codigo: c.codigo,
        tipoControl: c.tipoControl,
        descripcion: c.descripcion,
        estado: c.estado,
        log: c.log === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO',
        orden: c.orden
      }));
    } else {
      this.prgForm = this.blankPrg();
      this.prgAppCodigo.set('');
      this.editPrgId = null;
      this.prgControles = [];
      this.prgAppSearchText.set('');
      this.prgModSearchText.set('');
    }
    this.prgTouched = false;
    this.showPrgDlg = true;
  }

  closePrgDialog(): void {
    this.showPrgDlg = false;
    this.editPrgId = null;
    this.prgControles = [];
    this.prgAppCodigo.set('');
    this.prgTouched = false;
    this.prgAppSearchText.set('');
    this.prgModSearchText.set('');
  }

  changePrgApp(): void {
    const a = this.aplicacionMap().get(this.prgForm.appCodigo);
    this.prgAppSearchText.set(a ? `${a.codigo} · ${a.nombre}` : '');
    this.prgAppCodigo.set(this.prgForm.appCodigo);
    this.prgForm.modCodigo = '';
    this.prgModSearchText.set('');
  }
  addControl(): void {
    this.prgControles.push({ codigo: '', tipoControl: '', descripcion: '', estado: 'ACTIVO', log: 'ACTIVO', orden: this.prgControles.length });
  }
  removeControl(idx: number): void {
    this.prgControles.splice(idx, 1);
  }
  dropControl(event: CdkDragDrop<ControlRow[]>): void {
    moveItemInArray(this.prgControles, event.previousIndex, event.currentIndex);
  }
  async savePrg(): Promise<void> {
    this.prgTouched = true;
    if (!this.prgForm.codigo || !this.prgForm.nombre || !this.prgForm.appCodigo || !this.prgForm.modCodigo) { this.toast.error('Faltan datos', 'Código, nombre, aplicación y módulo son obligatorios.'); return; }
    const controles = this.prgForm.tipo !== 'Menú' && this.prgForm.tipo !== 'Submenú'
      ? this.prgControles.filter(c => c.codigo.trim() !== '' && c.descripcion.trim() !== '' && c.tipoControl)
      : [];
    if (this.prgForm.tipo !== 'Menú' && this.prgForm.tipo !== 'Submenú' && this.prgControles.length > 0 && controles.length !== this.prgControles.length) {
      this.toast.error('Faltan datos', 'Todos los controles deben tener código, tipo y descripción.'); return;
    }
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

  // ============ PERFIL DETAIL ============
  openPerfilDetail(p: Perfil): void {
    this.selectedPerfil.set(p);
  }
  backToPerfiles(): void {
    this.selectedPerfil.set(null);
  }

  // --- Diálogo permisos por programa ---
  showPermDlg = false;
  editingPrgCodigo = '';
  editingPrgNombre = '';
  permForm = { nuevo: false, modificar: false, anular: false, procesar: false, imprimir: false, consultar: false };
  permControles: { codigo: string; tipoControl: string; descripcion: string; visualizar: boolean; modificar: boolean }[] = [];

  openPermDialog(prgCodigo: string): void {
    const perf = this.selectedPerfil();
    if (!perf) return;
    const pp = perf.programas.find(p => p.prgCodigo === prgCodigo);
    if (!pp) return;
    const prg = this.programas().find(p => p.codigo === prgCodigo);
    this.editingPrgCodigo = prgCodigo;
    this.editingPrgNombre = prg?.nombre || '';
    this.permForm = { nuevo: pp.nuevo, modificar: pp.modificar, anular: pp.anular, procesar: pp.procesar, imprimir: pp.imprimir, consultar: pp.consultar };
    const ctrls = (this.controlesMap().get(prgCodigo) || []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    this.permControles = ctrls.map((c, i) => {
      const existing = (pp.controles || []).find(x => x.ctrlIndex === i);
      return { codigo: c.codigo, tipoControl: c.tipoControl, descripcion: c.descripcion, visualizar: existing?.visualizar ?? false, modificar: existing?.modificar ?? false };
    });
    this.showPermDlg = true;
  }
  closePermDialog(): void { this.showPermDlg = false; this.editingPrgCodigo = ''; this.editingPrgNombre = ''; this.permControles = []; }
  async savePermDialog(): Promise<void> {
    const perf = this.selectedPerfil();
    if (!perf) return;
    const idx = perf.programas.findIndex(p => p.prgCodigo === this.editingPrgCodigo);
    if (idx === -1) return;
    const controles = this.permControles.map((c, i) => ({ ctrlIndex: i, visualizar: c.visualizar, modificar: c.modificar }));
    perf.programas[idx] = { ...perf.programas[idx], ...this.permForm, procesar: false, controles };
    try {
      await this.api.updatePerfil(perf.id, { programas: perf.programas }).toPromise();
      this.toast.success('Permisos actualizados');
      this.events.emitDataChanged();
      this.selectedPerfil.set({ ...perf });
      this._loadPerf();
      this.closePermDialog();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'Error inesperado.';
      this.toast.error('Error', msg);
    }
  }

  // --- Helpers para textos de búsqueda en filas de perfil ---
  private refreshPerfSearchTexts(): void {
    const appTexts: string[] = [];
    const modTexts: string[] = [];
    const prgTexts: string[] = [];
    for (const pp of this.perfProgramas) {
      const a = this.aplicacionMap().get(pp.appCodigo);
      const m = this.modulos().find(x => x.codigo === pp.modCodigo);
      const p = this.programas().find(x => x.codigo === pp.prgCodigo);
      appTexts.push(a ? `${a.codigo} · ${a.nombre}` : '');
      modTexts.push(m ? `${m.codigo} · ${m.nombre}` : '');
      prgTexts.push(p ? `${p.codigo} · ${p.nombre}` : '');
    }
    this.perfAppSearchTexts.set(appTexts);
    this.perfModSearchTexts.set(modTexts);
    this.perfPrgSearchTexts.set(prgTexts);
  }

  private updatePerfAppText(idx: number, a?: Aplicacion): void {
    const texts = this.perfAppSearchTexts().slice();
    texts[idx] = a ? `${a.codigo} · ${a.nombre}` : '';
    this.perfAppSearchTexts.set(texts);
  }

  private updatePerfModText(idx: number, m?: Modulo): void {
    const texts = this.perfModSearchTexts().slice();
    texts[idx] = m ? `${m.codigo} · ${m.nombre}` : '';
    this.perfModSearchTexts.set(texts);
  }

  private updatePerfPrgText(idx: number, p?: Programa): void {
    const texts = this.perfPrgSearchTexts().slice();
    texts[idx] = p ? `${p.codigo} · ${p.nombre}` : '';
    this.perfPrgSearchTexts.set(texts);
  }

  // --- Búsqueda de aplicación para diálogo de perfil ---
  openPerfAppSearchDialog(idx: number): void {
    this.activePerfRowIdx.set(idx);
    this.perfAppSearchCodigo = '';
    this.perfAppSearchNombre = '';
    this.perfAppSearchEstado = '';
    this.appliedPerfAppSearchCodigo.set('');
    this.appliedPerfAppSearchNombre.set('');
    this.appliedPerfAppSearchEstado.set('');
    this.perfAppSearchPage.set(1);
    this.showPerfAppSearchDlg = true;
  }

  closePerfAppSearchDialog(): void {
    this.showPerfAppSearchDlg = false;
    this.activePerfRowIdx.set(-1);
  }

  applyPerfAppFilters(): void {
    this.appliedPerfAppSearchCodigo.set(this.perfAppSearchCodigo);
    this.appliedPerfAppSearchNombre.set(this.perfAppSearchNombre);
    this.appliedPerfAppSearchEstado.set(this.perfAppSearchEstado);
    this.perfAppSearchPage.set(1);
  }

  clearPerfAppFilters(): void {
    this.perfAppSearchCodigo = '';
    this.perfAppSearchNombre = '';
    this.perfAppSearchEstado = '';
    this.applyPerfAppFilters();
  }

  changePerfAppSearchPage(delta: number): void {
    this.perfAppSearchPage.set(Math.min(Math.max(this.perfAppSearchPage() + delta, 1), this.perfAppSearchTotalPages()));
  }

  selectPerfApp(a: Aplicacion): void {
    const idx = this.activePerfRowIdx();
    if (idx < 0) return;
    this.perfProgramas[idx].appCodigo = a.codigo;
    this.perfProgramas[idx].modCodigo = '';
    this.perfProgramas[idx].prgCodigo = '';
    this.updatePerfAppText(idx, a);
    this.updatePerfModText(idx);
    this.updatePerfPrgText(idx);
  }

  selectPerfAppFromDialog(a: Aplicacion): void {
    this.selectPerfApp(a);
    this.closePerfAppSearchDialog();
  }

  // --- Búsqueda de módulo para diálogo de perfil ---
  openPerfModSearchDialog(idx: number): void {
    this.activePerfRowIdx.set(idx);
    this.perfModSearchCodigo = '';
    this.perfModSearchNombre = '';
    this.appliedPerfModSearchCodigo.set('');
    this.appliedPerfModSearchNombre.set('');
    this.perfModSearchPage.set(1);
    this.showPerfModSearchDlg = true;
  }

  closePerfModSearchDialog(): void {
    this.showPerfModSearchDlg = false;
    this.activePerfRowIdx.set(-1);
  }

  applyPerfModFilters(): void {
    this.appliedPerfModSearchCodigo.set(this.perfModSearchCodigo);
    this.appliedPerfModSearchNombre.set(this.perfModSearchNombre);
    this.perfModSearchPage.set(1);
  }

  clearPerfModFilters(): void {
    this.perfModSearchCodigo = '';
    this.perfModSearchNombre = '';
    this.applyPerfModFilters();
  }

  changePerfModSearchPage(delta: number): void {
    this.perfModSearchPage.set(Math.min(Math.max(this.perfModSearchPage() + delta, 1), this.perfModSearchTotalPages()));
  }

  selectPerfMod(m: Modulo): void {
    const idx = this.activePerfRowIdx();
    if (idx < 0) return;
    this.perfProgramas[idx].modCodigo = m.codigo;
    this.perfProgramas[idx].prgCodigo = '';
    this.updatePerfModText(idx, m);
    this.updatePerfPrgText(idx);
  }

  selectPerfModFromDialog(m: Modulo): void {
    this.selectPerfMod(m);
    this.closePerfModSearchDialog();
  }

  // --- Búsqueda de programa para diálogo de perfil ---
  openPerfPrgSearchDialog(idx: number): void {
    this.activePerfRowIdx.set(idx);
    this.perfPrgSearchCodigo = '';
    this.perfPrgSearchNombre = '';
    this.appliedPerfPrgSearchCodigo.set('');
    this.appliedPerfPrgSearchNombre.set('');
    this.perfPrgSearchPage.set(1);
    this.showPerfPrgSearchDlg = true;
  }

  closePerfPrgSearchDialog(): void {
    this.showPerfPrgSearchDlg = false;
    this.activePerfRowIdx.set(-1);
  }

  applyPerfPrgFilters(): void {
    this.appliedPerfPrgSearchCodigo.set(this.perfPrgSearchCodigo);
    this.appliedPerfPrgSearchNombre.set(this.perfPrgSearchNombre);
    this.perfPrgSearchPage.set(1);
  }

  clearPerfPrgFilters(): void {
    this.perfPrgSearchCodigo = '';
    this.perfPrgSearchNombre = '';
    this.applyPerfPrgFilters();
  }

  changePerfPrgSearchPage(delta: number): void {
    this.perfPrgSearchPage.set(Math.min(Math.max(this.perfPrgSearchPage() + delta, 1), this.perfPrgSearchTotalPages()));
  }

  selectPerfPrg(p: Programa): void {
    const idx = this.activePerfRowIdx();
    if (idx < 0) return;
    this.perfProgramas[idx].prgCodigo = p.codigo;
    this.updatePerfPrgText(idx, p);
  }

  selectPerfPrgFromDialog(p: Programa): void {
    this.selectPerfPrg(p);
    this.closePerfPrgSearchDialog();
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
    this.refreshPerfSearchTexts();
    this.perfTouched = false;
    this.showPerfDlg = true;
  }

  closePerfDialog(): void {
    this.showPerfDlg = false;
    this.editPerfId = null;
    this.perfProgramas = [];
    this.perfAppSearchTexts.set([]);
    this.perfModSearchTexts.set([]);
    this.perfPrgSearchTexts.set([]);
    this.perfTouched = false;
  }

  addPerfPrograma(): void {
    this.perfProgramas.push({ appCodigo: '', modCodigo: '', prgCodigo: '', nuevo: false, modificar: false, anular: false, procesar: false, imprimir: false, consultar: false });
    this.perfAppSearchTexts.set([...this.perfAppSearchTexts(), '']);
    this.perfModSearchTexts.set([...this.perfModSearchTexts(), '']);
    this.perfPrgSearchTexts.set([...this.perfPrgSearchTexts(), '']);
  }

  removePerfPrograma(idx: number): void {
    this.perfProgramas.splice(idx, 1);
    this.perfAppSearchTexts.set(this.perfAppSearchTexts().filter((_, i) => i !== idx));
    this.perfModSearchTexts.set(this.perfModSearchTexts().filter((_, i) => i !== idx));
    this.perfPrgSearchTexts.set(this.perfPrgSearchTexts().filter((_, i) => i !== idx));
  }

  getProgramaTipo(codigo: string): string {
    return this.programas().find(p => p.codigo === codigo)?.tipo || '';
  }

  changePerfApp(idx: number): void {
    this.perfProgramas[idx].modCodigo = '';
    this.perfProgramas[idx].prgCodigo = '';
    this.updatePerfModText(idx);
    this.updatePerfPrgText(idx);
  }

  changePerfMod(idx: number): void {
    this.perfProgramas[idx].prgCodigo = '';
    this.updatePerfPrgText(idx);
  }
  async savePerf(): Promise<void> {
    this.perfTouched = true;
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
    this.bulkSuccess.set('');
    this.bulkLoading.set(false);
  }

  downloadBulkTemplate(): void {
    const headers = ['TIPO', 'CODIGO', 'NOMBRE', 'DESCRIPCION', 'APP_CODIGO', 'MOD_CODIGO', 'PRG_TIPO', 'ESTADO'];
    const rows: any[] = [headers];

    const apps = this.aplicaciones().filter(a => a.estado === 'ACTIVO');
    const mods = this.modulos().filter(m => m.estado === 'ACTIVO');
    const prgs = this.programas().filter(p => p.estado === 'ACTIVO');

    if (apps.length || mods.length || prgs.length) {
      for (const a of apps.sort((x, y) => x.codigo.localeCompare(y.codigo))) {
        rows.push(['APLICACION', a.codigo, a.nombre, a.descripcion, '', '', '', a.estado]);
      }
      for (const m of mods.sort((x, y) => x.codigo.localeCompare(y.codigo))) {
        const app = apps.find(a => a.codigo === m.appCodigo);
        rows.push(['MODULO', m.codigo, m.nombre, m.descripcion, app?.codigo ?? m.appCodigo, '', '', m.estado]);
      }
      for (const p of prgs.sort((x, y) => x.codigo.localeCompare(y.codigo))) {
        const mod = mods.find(m => m.codigo === p.modCodigo);
        const app = mod ? apps.find(a => a.codigo === mod.appCodigo) : null;
        rows.push(['PROGRAMA', p.codigo, p.nombre, p.descripcion, app?.codigo ?? '', mod?.codigo ?? p.modCodigo, p.tipo, p.estado]);
      }
    } else {
      // Ejemplo con una pequeña jerarquía
      rows.push(['APLICACION', 'APP-ERP', 'ERP Corporativo', 'Sistema ERP corporativo', '', '', '', 'ACTIVO']);
      rows.push(['MODULO', 'MOD-FI', 'Finanzas', 'Módulo financiero', 'APP-ERP', '', '', 'ACTIVO']);
      rows.push(['MODULO', 'MOD-MM', 'Materiales', 'Módulo de gestión de materiales', 'APP-ERP', '', '', 'ACTIVO']);
      rows.push(['PROGRAMA', 'PRG-FI-001', 'Documentos contables', 'Consulta de documentos', 'APP-ERP', 'MOD-FI', 'Transacción', 'ACTIVO']);
      rows.push(['PROGRAMA', 'PRG-FI-002', 'Reporte de balances', 'Reportes financieros', 'APP-ERP', 'MOD-FI', 'Reporte', 'ACTIVO']);
      rows.push(['PROGRAMA', 'PRG-MM-001', 'Stock de materiales', 'Consulta de stock', 'APP-ERP', 'MOD-MM', 'Consulta', 'ACTIVO']);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'plantilla-aplicaciones');
    XLSX.writeFile(wb, 'plantilla-aplicaciones-modulos-programas.xlsx');
  }

  onBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.bulkFile = file;
    this.bulkFileName.set(file ? file.name : '');
    this.bulkErrors.set([]);
    this.bulkSuccess.set('');
  }

  private parseBulkCell(cell: string | number | undefined): string {
    if (cell === undefined || cell === null) return '';
    return String(cell).trim();
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
        this.bulkErrors.set([{ row: 0, message: 'El archivo no contiene filas de datos.' }]);
        this.bulkLoading.set(false);
        return;
      }

      const headerRow = rawRows[0].map((h: any) => String(h).trim().toUpperCase());
      const expected = ['TIPO', 'CODIGO', 'NOMBRE', 'DESCRIPCION', 'APP_CODIGO', 'MOD_CODIGO', 'PRG_TIPO', 'ESTADO'];
      const missing = expected.filter(h => !headerRow.includes(h));
      if (missing.length > 0) {
        this.bulkErrors.set([{ row: 1, message: `Formato incorrecto. Faltan columnas: ${missing.join(', ')}.` }]);
        this.bulkLoading.set(false);
        return;
      }

      const idx = (h: string) => headerRow.indexOf(h);
      const rows: { row: number; tipo: string; codigo: string; nombre: string; descripcion: string; appCodigo: string; modCodigo: string; prgTipo: string; estado: string }[] = [];
      for (let i = 1; i < rawRows.length; i++) {
        const raw = rawRows[i];
        if (raw.every((v: any) => !v || String(v).trim() === '')) continue;
        rows.push({
          row: i + 1,
          tipo: this.parseBulkCell(raw[idx('TIPO')]),
          codigo: this.parseBulkCell(raw[idx('CODIGO')]),
          nombre: this.parseBulkCell(raw[idx('NOMBRE')]),
          descripcion: this.parseBulkCell(raw[idx('DESCRIPCION')]),
          appCodigo: this.parseBulkCell(raw[idx('APP_CODIGO')]),
          modCodigo: this.parseBulkCell(raw[idx('MOD_CODIGO')]),
          prgTipo: this.parseBulkCell(raw[idx('PRG_TIPO')]),
          estado: this.parseBulkCell(raw[idx('ESTADO')]),
        });
      }

      if (!rows.length) {
        this.bulkErrors.set([{ row: 0, message: 'No se encontraron filas con datos válidos.' }]);
        this.bulkLoading.set(false);
        return;
      }

      this.api.bulkCreateAplicaciones(rows).subscribe({
        next: (res) => {
          if (res.ok) {
            this.bulkSuccess.set(`Se procesaron ${res.processed} registros: ${res.created.apps} apps, ${res.created.mods} módulos, ${res.created.prgs} programas creados; ${res.updated.apps} apps, ${res.updated.mods} módulos, ${res.updated.prgs} programas actualizados.`);
            this.bulkFile = null;
            this.bulkFileName.set('');
            this.events.emitDataChanged();
          } else {
            this.bulkErrors.set(res.errors || [{ row: 0, message: 'Error desconocido.' }]);
          }
          this.bulkLoading.set(false);
        },
        error: (e) => {
          console.error('bulkCreateAplicaciones error', e);
          let message = 'Error al procesar el archivo.';
          if (e instanceof HttpErrorResponse) {
            if (e.status === 0) {
              message = 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
            } else if (e.status >= 500) {
              message = `Error interno del servidor (${e.status}). Revise la consola del backend.`;
            } else if (e.error?.error) {
              message = e.error.error;
            } else if (Array.isArray(e.error?.errors)) {
              this.bulkErrors.set(e.error.errors);
              this.bulkLoading.set(false);
              return;
            } else if (e.message) {
              message = e.message;
            }
          } else if (e?.error?.errors) {
            this.bulkErrors.set(e.error.errors);
            this.bulkLoading.set(false);
            return;
          } else if (e?.error?.error) {
            message = e.error.error;
          }
          this.bulkErrors.set([{ row: 0, message }]);
          this.bulkLoading.set(false);
        },
      });
    } catch (e: any) {
      this.bulkErrors.set([{ row: 0, message: 'No se pudo leer el archivo Excel. Verifique el formato.' }]);
      this.bulkLoading.set(false);
    }
  }

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
    this.perfilBulkSuccess.set('');
    this.perfilBulkLoading.set(false);
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
      // Ejemplo con dos perfiles y algunos programas
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
        this.perfilBulkErrors.set([{ row: 0, message: 'El archivo no contiene filas de datos.' }]);
        this.perfilBulkLoading.set(false);
        return;
      }

      const headerRow = rawRows[0].map((h: any) => String(h).trim().toUpperCase());
      const expected = ['PERFIL_CODIGO', 'PERFIL_NOMBRE', 'PERFIL_DESCRIPCION', 'PRG_CODIGO', 'NUEVO', 'MODIFICAR', 'ANULAR', 'IMPRIMIR', 'CONSULTAR', 'ESTADO'];
      const missing = expected.filter(h => !headerRow.includes(h));
      if (missing.length > 0) {
        this.perfilBulkErrors.set([{ row: 1, message: `Formato incorrecto. Faltan columnas: ${missing.join(', ')}.` }]);
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
          perfilCodigo: this.parseBulkCell(raw[idx('PERFIL_CODIGO')]),
          perfilNombre: this.parseBulkCell(raw[idx('PERFIL_NOMBRE')]),
          perfilDescripcion: this.parseBulkCell(raw[idx('PERFIL_DESCRIPCION')]),
          prgCodigo: this.parseBulkCell(raw[idx('PRG_CODIGO')]),
          nuevo: this.parseBulkCell(raw[idx('NUEVO')]),
          modificar: this.parseBulkCell(raw[idx('MODIFICAR')]),
          anular: this.parseBulkCell(raw[idx('ANULAR')]),
          imprimir: this.parseBulkCell(raw[idx('IMPRIMIR')]),
          consultar: this.parseBulkCell(raw[idx('CONSULTAR')]),
          estado: this.parseBulkCell(raw[idx('ESTADO')]),
        });
      }

      if (!rows.length) {
        this.perfilBulkErrors.set([{ row: 0, message: 'No se encontraron filas con datos válidos.' }]);
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
            this.perfilBulkErrors.set(res.errors || [{ row: 0, message: 'Error desconocido.' }]);
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
              this.perfilBulkErrors.set(e.error.errors);
              this.perfilBulkLoading.set(false);
              return;
            } else if (e.message) {
              message = e.message;
            }
          } else if (e?.error?.errors) {
            this.perfilBulkErrors.set(e.error.errors);
            this.perfilBulkLoading.set(false);
            return;
          } else if (e?.error?.error) {
            message = e.error.error;
          }
          this.perfilBulkErrors.set([{ row: 0, message }]);
          this.perfilBulkLoading.set(false);
        },
      });
    } catch (e: any) {
      this.perfilBulkErrors.set([{ row: 0, message: 'No se pudo leer el archivo Excel. Verifique el formato.' }]);
      this.perfilBulkLoading.set(false);
    }
  }
}