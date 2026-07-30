import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import {
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconDownloadComponent,
  IconCheckComponent, IconCloseComponent, IconUploadComponent,
} from '../../shared/components/icons';
import type { Aplicacion, Modulo, Programa, Perfil, Control, TipoPrograma } from '../../shared/models/types';
import { validateBulkFileSize } from '../../shared/utils/file-validation';

type Estado = 'ACTIVO' | 'INACTIVO';

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
  selector: 'app-perfiles',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSearchComponent, IconDownloadComponent,
    IconCheckComponent, IconCloseComponent, IconUploadComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Perfiles</h1>
        <p>Administración de perfiles de usuario por aplicación, módulo y programa.</p>
      </div>
    </div>

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
              <th style="text-align:center;">Acciones</th>
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
          <input type="text" class="select" placeholder="Código de aplicación"
            [ngModel]="perfAppSearchCodigo()" (ngModelChange)="perfAppSearchCodigo.set($event); perfAppSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" placeholder="Nombre de aplicación"
            [ngModel]="perfAppSearchNombre()" (ngModelChange)="perfAppSearchNombre.set($event); perfAppSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Estado</label>
          <select class="select"
            [ngModel]="perfAppSearchEstado()" (ngModelChange)="perfAppSearchEstado.set($event); perfAppSearchPage.set(1)">
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>
      <div class="filter-actions">
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
                  <button class="btn btn-primary btn-sm" (click)="selectPerfAppFromDialog(a)" [disabled]="a.estado !== 'ACTIVO'">Seleccionar</button>
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
          <input type="text" class="select" placeholder="Código de módulo"
            [ngModel]="perfModSearchCodigo()" (ngModelChange)="perfModSearchCodigo.set($event); perfModSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" placeholder="Nombre de módulo"
            [ngModel]="perfModSearchNombre()" (ngModelChange)="perfModSearchNombre.set($event); perfModSearchPage.set(1)" />
        </div>
      </div>
      <div class="filter-actions">
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
                  <button class="btn btn-primary btn-sm" (click)="selectPerfModFromDialog(m)" [disabled]="m.estado !== 'ACTIVO'">Seleccionar</button>
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
          <input type="text" class="select" placeholder="Código de programa"
            [ngModel]="perfPrgSearchCodigo()" (ngModelChange)="perfPrgSearchCodigo.set($event); perfPrgSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" placeholder="Nombre de programa"
            [ngModel]="perfPrgSearchNombre()" (ngModelChange)="perfPrgSearchNombre.set($event); perfPrgSearchPage.set(1)" />
        </div>
      </div>
      <div class="filter-actions">
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
                  <button class="btn btn-primary btn-sm" (click)="selectPerfPrgFromDialog(p)" [disabled]="p.estado !== 'ACTIVO'">Seleccionar</button>
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

      <div class="perm-section-title">Permisos del Programa</div>
      <div class="perm-grid">
        <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.nuevo" /><span>Nuevo</span></label>
        <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.modificar" /><span>Modificar</span></label>
        <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.anular" /><span>Eliminar</span></label>
        <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.imprimir" /><span>Imprimir</span></label>
        <label class="perm-check"><input type="checkbox" [(ngModel)]="permForm.consultar" /><span>Consultar</span></label>
      </div>

      <hr class="perm-divider" />

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
    }
    .perm-icon-yes {
      color: var(--green-600, #16a34a);
    }
    .perm-icon-no {
      color: var(--red-500, #ef4444);
    }
    .required {
      color: var(--red-600, #c8102e);
      font-weight: bold;
    }
    .input.invalid {
      border-color: var(--red-600, #c8102e);
      background-color: var(--red-50, #fef2f2);
    }
  `],
})
export class PerfilesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  // --- Data signals ---
  perfiles = signal<Perfil[]>([]);
  aplicaciones = signal<Aplicacion[]>([]);
  modulos = signal<Modulo[]>([]);
  programas = signal<Programa[]>([]);
  controlesMap = signal<Map<string, Control[]>>(new Map());

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

  loadingPerf = signal(true);
  errorPerf = signal<string | null>(null);

  // --- Dialogs ---
  showPerfDlg = false; editPerfId: string | null = null; perfTouched = false;

  showPerfilBulkDlg = false;
  perfilBulkFile: File | null = null;
  perfilBulkFileName = signal('');
  perfilBulkErrors = signal<{ row: number; message: string }[]>([]);
  perfilBulkErrorsSummary = signal('');
  perfilBulkSuccess = signal('');
  perfilBulkLoading = signal(false);

  // --- Search dialog state for perfil ---
  activePerfRowIdx = signal<number>(-1);
  perfAppSearchTexts = signal<string[]>([]);
  perfModSearchTexts = signal<string[]>([]);
  perfPrgSearchTexts = signal<string[]>([]);

  showPerfAppSearchDlg = false;
  perfAppSearchCodigo = signal('');
  perfAppSearchNombre = signal('');
  perfAppSearchEstado = signal('');
  perfAppSearchPage = signal(1);
  perfAppSearchPageSize = signal(10);

  showPerfModSearchDlg = false;
  perfModSearchCodigo = signal('');
  perfModSearchNombre = signal('');
  perfModSearchPage = signal(1);
  perfModSearchPageSize = signal(10);

  showPerfPrgSearchDlg = false;
  perfPrgSearchCodigo = signal('');
  perfPrgSearchNombre = signal('');
  perfPrgSearchPage = signal(1);
  perfPrgSearchPageSize = signal(10);

  // --- Filter & pagination ---
  searchPerf = signal('');
  pageSize = signal(10);
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

  aplicacionMap = computed(() => new Map(this.aplicaciones().map(a => [a.codigo, a])));

  // --- Search computed for perfil dialogs ---
  filteredAppsForPerfSearch = computed(() => {
    const qCodigo = this.perfAppSearchCodigo().toLowerCase().trim();
    const qNombre = this.perfAppSearchNombre().toLowerCase().trim();
    const qEstado = this.perfAppSearchEstado().trim();
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

  filteredModsForPerfSearch = computed(() => {
    const idx = this.activePerfRowIdx();
    const appCod = idx >= 0 ? this.perfProgramas[idx]?.appCodigo || '' : '';
    const qCodigo = this.perfModSearchCodigo().toLowerCase().trim();
    const qNombre = this.perfModSearchNombre().toLowerCase().trim();
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

  filteredPrgsForPerfSearch = computed(() => {
    const idx = this.activePerfRowIdx();
    const modCod = idx >= 0 ? this.perfProgramas[idx]?.modCodigo || '' : '';
    const qCodigo = this.perfPrgSearchCodigo().toLowerCase().trim();
    const qNombre = this.perfPrgSearchNombre().toLowerCase().trim();
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

  // --- Form ---
  perfForm: { codigo: string; nombre: string; descripcion: string; estado: Estado } = this.blankPerf();
  perfProgramas: PerfilProgramaRow[] = [];

  // --- Perm dialog ---
  showPermDlg = false;
  editingPrgCodigo = '';
  editingPrgNombre = '';
  permForm = { nuevo: false, modificar: false, anular: false, procesar: false, imprimir: false, consultar: false };
  permControles: { codigo: string; tipoControl: string; descripcion: string; visualizar: boolean; modificar: boolean }[] = [];

  // --- Refs ---
  loadPerfiles = () => this._loadPerf();

  ngOnInit(): void {
    this._loadPerf();
    this._loadAplicaciones();
    this._loadModulos();
    this._loadProgramas();
    this.events.onDataChanged(() => {
      this._loadPerf();
      this._loadAplicaciones();
      this._loadModulos();
      this._loadProgramas();
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

  private _loadAplicaciones(): void {
    this.api.listAplicaciones().subscribe({
      next: (d) => this.aplicaciones.set(d),
      error: () => {},
    });
  }

  private _loadModulos(): void {
    this.api.listModulos().subscribe({
      next: (d) => this.modulos.set(d),
      error: () => {},
    });
  }

  private _loadProgramas(): void {
    this.api.listProgramas().subscribe({
      next: (d) => this.programas.set(d),
      error: () => {},
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

  // ============ PERFIL DETAIL ============
  openPerfilDetail(p: Perfil): void {
    this.selectedPerfil.set(p);
  }
  backToPerfiles(): void {
    this.selectedPerfil.set(null);
  }

  // ============ PERFIL CRUD ============
  blankPerf() { return { codigo: '', nombre: '', descripcion: '', estado: 'ACTIVO' as Estado }; }

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

  // ============ PERMISOS ============

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

  // ============ SEARCH HELPERS ============

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

  // ============ APP SEARCH DIALOG ============

  openPerfAppSearchDialog(idx: number): void {
    this.activePerfRowIdx.set(idx);
    this.perfAppSearchCodigo.set('');
    this.perfAppSearchNombre.set('');
    this.perfAppSearchEstado.set('');
    this.perfAppSearchPage.set(1);
    this.showPerfAppSearchDlg = true;
  }

  closePerfAppSearchDialog(): void {
    this.showPerfAppSearchDlg = false;
    this.activePerfRowIdx.set(-1);
  }

  clearPerfAppFilters(): void {
    this.perfAppSearchCodigo.set('');
    this.perfAppSearchNombre.set('');
    this.perfAppSearchEstado.set('');
    this.perfAppSearchPage.set(1);
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

  // ============ MOD SEARCH DIALOG ============

  openPerfModSearchDialog(idx: number): void {
    this.activePerfRowIdx.set(idx);
    this.perfModSearchCodigo.set('');
    this.perfModSearchNombre.set('');
    this.perfModSearchPage.set(1);
    this.showPerfModSearchDlg = true;
  }

  closePerfModSearchDialog(): void {
    this.showPerfModSearchDlg = false;
    this.activePerfRowIdx.set(-1);
  }

  clearPerfModFilters(): void {
    this.perfModSearchCodigo.set('');
    this.perfModSearchNombre.set('');
    this.perfModSearchPage.set(1);
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

  // ============ PRG SEARCH DIALOG ============

  openPerfPrgSearchDialog(idx: number): void {
    this.activePerfRowIdx.set(idx);
    this.perfPrgSearchCodigo.set('');
    this.perfPrgSearchNombre.set('');
    this.perfPrgSearchPage.set(1);
    this.showPerfPrgSearchDlg = true;
  }

  closePerfPrgSearchDialog(): void {
    this.showPerfPrgSearchDlg = false;
    this.activePerfRowIdx.set(-1);
  }

  clearPerfPrgFilters(): void {
    this.perfPrgSearchCodigo.set('');
    this.perfPrgSearchNombre.set('');
    this.perfPrgSearchPage.set(1);
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
        this.setPerfilBulkErrors([{ row: 0, message: 'El archivo no contiene filas de datos.' }]);
        this.perfilBulkLoading.set(false);
        return;
      }

      const headerRow = rawRows[0].map((h: any) => String(h).trim().toUpperCase());
      const expected = ['PERFIL_CODIGO', 'PERFIL_NOMBRE', 'PERFIL_DESCRIPCION', 'PRG_CODIGO', 'NUEVO', 'MODIFICAR', 'ANULAR', 'IMPRIMIR', 'CONSULTAR', 'ESTADO'];
      const missing = expected.filter(h => !headerRow.includes(h));
      if (missing.length > 0) {
        this.setPerfilBulkErrors([{ row: 1, message: `Formato incorrecto. Faltan columnas: ${missing.join(', ')}.` }]);
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
        this.setPerfilBulkErrors([{ row: 0, message: 'No se encontraron filas con datos válidos.' }]);
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
      this.setPerfilBulkErrors([{ row: 0, message: 'No se pudo leer el archivo Excel. Verifique el formato.' }]);
      this.perfilBulkLoading.set(false);
    }
  }
}
