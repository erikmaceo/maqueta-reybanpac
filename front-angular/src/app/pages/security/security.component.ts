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
import type { Aplicacion, Modulo, Programa, TipoPrograma, TipoControl, Control, NivelSegregacion, NodoSegregacion } from '../../shared/models/types';
import { validateBulkFileSize } from '../../shared/utils/file-validation';

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
        <p>Administración jerárquica de Aplicaciones, Módulos y Programas.</p>
      </div>
    </div>

    <p-tabs value="0">
      <p-tablist>
        <p-tab value="0"><i class="pi pi-server mr-2"></i>Aplicaciones</p-tab>
        <p-tab value="1"><i class="pi pi-list mr-2"></i>Módulos</p-tab>
        <p-tab value="2"><i class="pi pi-th-large mr-2"></i>Programas</p-tab>
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
                  <th>Nodos de Segregación</th>
                  <th>Estado</th>
                  <th style="text-align:center;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (a of paginatedApps(); track a.id) {
                  <tr>
                    <td class="mono">{{ a.codigo }}</td>
                    <td><div class="cell-strong">{{ a.nombre }}</div></td>
                    <td class="muted small">{{ a.descripcion || '—' }}</td>
                    <td>
                      <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        @for (nodoId of a.nodoIds || []; track nodoId) {
                          <span class="badge badge-blue" [title]="nodoMapSegregacion().get(nodoId)?.nombre || ''">
                            {{ nodoMapSegregacion().get(nodoId)?.codigo || nodoId }}
                          </span>
                        } @empty {
                          <span class="muted small">—</span>
                        }
                      </div>
                    </td>
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
                  <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin aplicaciones registradas.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (filteredApps().length > 0) {
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pageApp() === 0" (click)="setPage('app', pageApp() - 1)">Anterior</button>
              </div>
              <span>Página {{ pageApp() + 1 }} de {{ totalPagesApp() }} ({{ filteredApps().length }} registros)</span>
              <div class="page-size-selector">
                <label class="small muted">Registros por página</label>
                <select class="select" style="width: auto; min-width: 60px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="15">15</option>
                  <option [value]="20">20</option>
                </select>
                <button class="btn btn-ghost btn-sm" [disabled]="pageApp() === totalPagesApp() - 1" (click)="setPage('app', pageApp() + 1)">Siguiente</button>
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
                  <th style="text-align:center;">Acciones</th>
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
          @if (filteredMods().length > 0) {
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pageMod() === 0" (click)="setPage('mod', pageMod() - 1)">Anterior</button>
              </div>
              <span>Página {{ pageMod() + 1 }} de {{ totalPagesMod() }} ({{ filteredMods().length }} registros)</span>
              <div class="page-size-selector">
                <label class="small muted">Registros por página</label>
                <select class="select" style="width: auto; min-width: 60px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="15">15</option>
                  <option [value]="20">20</option>
                </select>
                <button class="btn btn-ghost btn-sm" [disabled]="pageMod() === totalPagesMod() - 1" (click)="setPage('mod', pageMod() + 1)">Siguiente</button>
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
                  <th style="text-align:center;">Acciones</th>
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
          @if (filteredPrgs().length > 0) {
            <div class="pagination">
              <div class="page-controls">
                <button class="btn btn-ghost btn-sm" [disabled]="pagePrg() === 0" (click)="setPage('prg', pagePrg() - 1)">Anterior</button>
              </div>
              <span>Página {{ pagePrg() + 1 }} de {{ totalPagesPrg() }} ({{ filteredPrgs().length }} registros)</span>
              <div class="page-size-selector">
                <label class="small muted">Registros por página</label>
                <select class="select" style="width: auto; min-width: 60px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="15">15</option>
                  <option [value]="20">20</option>
                </select>
                <button class="btn btn-ghost btn-sm" [disabled]="pagePrg() === totalPagesPrg() - 1" (click)="setPage('prg', pagePrg() + 1)">Siguiente</button>
              </div>
            </div>
          }
        }
      </p-tabpanel>

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
      <div class="field">
        <label>Nodo de Segregación</label>
        <div class="search-field">
          <input class="select" type="text" [ngModel]="appNodoSearchText()" readonly placeholder="Seleccione un nodo padre..." />
          <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openAppNodoSearchDialog()" title="Buscar nodo">
            <app-icon-search [width]="16" [height]="16" />
          </button>
          @if (appForm.nodoIds?.length) {
            <button class="btn btn-danger btn-sm btn-icon" type="button" (click)="clearAppNodo()" title="Quitar nodo">
              <app-icon-trash [width]="16" [height]="16" />
            </button>
          }
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeAppDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="saveApp()">{{ editAppId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO BÚSQUEDA NODO PADRE ============ -->
    <p-dialog
      [(visible)]="showAppNodoSearchDlg"
      header="Buscar nodo de segregación"
      [modal]="true" [style]="{ width: '800px' }" [closable]="true"
      (onHide)="closeAppNodoSearchDialog()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" [(ngModel)]="appNodoSearchCodigo" placeholder="Código de nodo" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" [(ngModel)]="appNodoSearchNombre" placeholder="Nombre de nodo" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" (click)="applyAppNodoFilters()">Buscar</button>
        <button class="btn btn-ghost" (click)="clearAppNodoFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Nivel</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (n of paginatedAppNodosForSearch(); track n.id) {
              <tr>
                <td class="mono">{{ n.codigo }}</td>
                <td><div class="cell-strong">{{ n.nombre }}</div></td>
                <td>{{ nivelMapSegregacion().get(n.nivelId)?.nombre || n.nivelId }}</td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectAppNodoFromDialog(n)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted center" style="padding: 24px;">Sin nodos padre activos.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn btn-ghost btn-sm" [disabled]="appNodoSearchPage() === 1" (click)="changeAppNodoSearchPage(-1)">Anterior</button>
        <span>Página {{ appNodoSearchPage() }} de {{ appNodoSearchTotalPages() }} ({{ filteredAppNodosForSearch().length }} registros)</span>
        <button class="btn btn-ghost btn-sm" [disabled]="appNodoSearchPage() === appNodoSearchTotalPages()" (click)="changeAppNodoSearchPage(1)">Siguiente</button>
      </div>
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
        <div class="alert alert-error">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <span><b>Errores detectados:</b> {{ bulkErrorsSummary() }}</span>
            <button class="btn btn-ghost btn-sm" (click)="downloadBulkErrors()" style="color:var(--red-700);font-weight:600;">
              <app-icon-download [width]="14" [height]="14" /> Descargar detalle
            </button>
          </div>
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
    .check-yes { color: #22c55e; font-weight: 700; }
    .check-no { color: #d1d5db; }
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
  nivelesSegregacion = signal<NivelSegregacion[]>([]);
  nodosSegregacion = signal<NodoSegregacion[]>([]);

  loadingApp = signal(true);
  loadingMod = signal(true);
  loadingPrg = signal(true);
  errorApp = signal<string | null>(null);
  errorMod = signal<string | null>(null);
  errorPrg = signal<string | null>(null);

  // --- Diálogos ---
  showAppDlg = false; editAppId: string | null = null; appTouched = false;
  showModDlg = false; editModId: string | null = null; modTouched = false;
  showPrgDlg = false; editPrgId: string | null = null; prgTouched = false;

  showBulkDlg = false;
  bulkFile: File | null = null;
  bulkFileName = signal('');
  bulkErrors = signal<{ row: number; message: string }[]>([]);
  bulkErrorsSummary = signal('');
  bulkSuccess = signal('');
  bulkLoading = signal(false);

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

  // --- Diálogo búsqueda de nodo padre (para aplicación) ---
  showAppNodoSearchDlg = false;
  appNodoSearchCodigo = '';
  appNodoSearchNombre = '';
  appliedAppNodoSearchCodigo = signal('');
  appliedAppNodoSearchNombre = signal('');
  appNodoSearchPage = signal(1);
  appNodoSearchPageSize = signal(10);
  appNodoSearchText = signal('');

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

  // --- Filtros de búsqueda ---
  searchApp = signal('');
  searchMod = signal('');
  searchPrg = signal('');

  // --- Paginación ---
  pageSize = signal(10);
  pageApp = signal(0);
  pageMod = signal(0);
  pagePrg = signal(0);

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

  // --- Computed para búsqueda de aplicación en diálogo de módulo ---
  aplicacionMap = computed(() => new Map(this.aplicaciones().map(a => [a.codigo, a])));

  nivelMapSegregacion = computed(() => new Map(this.nivelesSegregacion().map(n => [n.id, n])));
  nodoMapSegregacion = computed(() => new Map(this.nodosSegregacion().map(n => [n.id, n])));
  nodosSegregacionPadresActivos = computed(() => {
    return this.nodosSegregacion()
      .filter(n => n.estado === 'ACTIVO' && n.padreId === null)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  });
  filteredAppNodosForSearch = computed(() => {
    const qCodigo = this.appliedAppNodoSearchCodigo().toLowerCase().trim();
    const qNombre = this.appliedAppNodoSearchNombre().toLowerCase().trim();
    return this.nodosSegregacionPadresActivos().filter(n => {
      if (qCodigo && !n.codigo.toLowerCase().includes(qCodigo)) return false;
      if (qNombre && !n.nombre.toLowerCase().includes(qNombre)) return false;
      return true;
    });
  });
  paginatedAppNodosForSearch = computed(() => {
    const list = this.filteredAppNodosForSearch();
    const start = (this.appNodoSearchPage() - 1) * this.appNodoSearchPageSize();
    return list.slice(start, start + this.appNodoSearchPageSize());
  });
  appNodoSearchTotalPages = computed(() => Math.ceil(this.filteredAppNodosForSearch().length / this.appNodoSearchPageSize()) || 1);
  nodosSegregacionActivos = computed(() => {
    return this.nodosSegregacion()
      .filter(n => n.estado === 'ACTIVO')
      .sort((a, b) => {
        const oa = this.nivelMapSegregacion().get(a.nivelId)?.orden ?? 0;
        const ob = this.nivelMapSegregacion().get(b.nivelId)?.orden ?? 0;
        if (oa !== ob) return oa - ob;
        return a.codigo.localeCompare(b.codigo);
      });
  });

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

  setPage(entity: 'app' | 'mod' | 'prg', page: number): void {
    const total = entity === 'app' ? this.totalPagesApp() : entity === 'mod' ? this.totalPagesMod() : this.totalPagesPrg();
    const current = entity === 'app' ? this.pageApp() : entity === 'mod' ? this.pageMod() : this.pagePrg();
    if (page < 0 || page >= total) return;
    if (entity === 'app') this.pageApp.set(page);
    else if (entity === 'mod') this.pageMod.set(page);
    else this.pagePrg.set(page);
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.pageApp.set(0);
    this.pageMod.set(0);
    this.pagePrg.set(0);
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
    const data = this.filteredApps().map(a => ({
      ...a,
      nodoCodigos: (a.nodoIds || []).map(id => this.nodoMapSegregacion().get(id)?.codigo || id).join(', '),
    }));
    this.exportXlsx(
      data,
      ['Código', 'Nombre', 'Descripción', 'Nodos', 'Estado'],
      ['codigo', 'nombre', 'descripcion', 'nodoCodigos', 'estado'],
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

  appForm = this.blankApp();
  modForm = this.blankMod();
  prgForm = this.blankPrg();
  prgAppCodigo = signal('');
  tiposPrograma = TIPOS_PROGRAMA;
  tiposControl = TIPOS_CONTROL;
  prgControles: ControlRow[] = [];
  controlesMap = signal<Map<string, Control[]>>(new Map());

  // --- Refs para retry ---
  loadAplicaciones = () => this._loadApp();
  loadModulos = () => this._loadMod();
  loadProgramas = () => this._loadPrg();

  ngOnInit(): void {
    this._loadApp();
    this._loadMod();
    this._loadPrg();
    this._loadSegregacion();
    this.events.onDataChanged(() => {
      this._loadApp(); this._loadMod(); this._loadPrg(); this._loadSegregacion();
    });
    effect(() => { this.searchApp(); this.pageApp.set(0); }, { allowSignalWrites: true });
    effect(() => { this.searchMod(); this.pageMod.set(0); }, { allowSignalWrites: true });
    effect(() => { this.searchPrg(); this.pagePrg.set(0); }, { allowSignalWrites: true });
    effect(() => { this.pageSize(); this.pageApp.set(0); this.pageMod.set(0); this.pagePrg.set(0); }, { allowSignalWrites: true });
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
  private _loadSegregacion(): void {
    this.api.listNivelesSegregacion().subscribe({
      next: (d) => this.nivelesSegregacion.set(d),
      error: () => {},
    });
    this.api.listNodosSegregacion().subscribe({
      next: (d) => this.nodosSegregacion.set(d),
      error: () => {},
    });
  }

  // ============ FORMS BLANK ============
  blankApp() { return { codigo: '', nombre: '', descripcion: '', estado: 'ACTIVO' as Estado, nodoIds: [] as string[] }; }
  blankMod() { return { codigo: '', nombre: '', descripcion: '', appCodigo: '', estado: 'ACTIVO' as Estado }; }
  blankPrg() { return { codigo: '', nombre: '', descripcion: '', appCodigo: '', modCodigo: '', tipo: '' as TipoPrograma, estado: 'ACTIVO' as Estado }; }

// ============ APLICACIÓN CRUD ============
  openAppDialog(a?: Aplicacion): void {
    const padreIds = new Set(this.nodosSegregacionPadresActivos().map(n => n.id));
    if (a) {
      const nodoIds = (a.nodoIds || []).filter(id => padreIds.has(id)).slice(0, 1);
      this.appForm = {
        codigo: a.codigo,
        nombre: a.nombre,
        descripcion: a.descripcion,
        estado: a.estado,
        nodoIds,
      };
      this.editAppId = a.id;
      const nodo = nodoIds[0] ? this.nodoMapSegregacion().get(nodoIds[0]) : undefined;
      this.appNodoSearchText.set(nodo ? `${nodo.codigo} · ${nodo.nombre}` : '');
    } else {
      this.appForm = this.blankApp();
      this.editAppId = null;
      this.appNodoSearchText.set('');
    }
    this.appTouched = false;
    this.showAppDlg = true;
  }
  closeAppDialog(): void { this.showAppDlg = false; this.editAppId = null; this.appTouched = false; }
  async saveApp(): Promise<void> {
    this.appTouched = true;
    if (!this.appForm.codigo || !this.appForm.nombre) { this.toast.error('Faltan datos', 'Código y nombre son obligatorios.'); return; }
    const padreIds = new Set(this.nodosSegregacionPadresActivos().map(n => n.id));
    const nodoIds = (this.appForm.nodoIds || []).filter(id => padreIds.has(id)).slice(0, 1);
    const payload = { ...this.appForm, nodoIds };
    try {
      if (this.editAppId) { await this.api.updateAplicacion(this.editAppId, payload).toPromise(); this.toast.success('Aplicación actualizada'); }
      else { await this.api.createAplicacion(payload).toPromise(); this.toast.success('Aplicación creada'); }
      this.events.emitDataChanged(); this.closeAppDialog(); this._loadApp();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'Error inesperado.';
      this.toast.error('Error', msg);
    }
  }
  confirmDeleteApp(a: Aplicacion): void {
    if (confirm(`¿Eliminar la aplicación "${a.nombre}"? Se eliminarán también sus módulos, programas y perfiles asociados.`)) {
      this.api.deleteAplicacion(a.id).subscribe({
        next: () => { this.toast.success('Aplicación eliminada'); this.events.emitDataChanged(); this._loadApp(); this._loadMod(); this._loadPrg(); },
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

  // --- Búsqueda de nodo padre para diálogo de aplicación ---
  openAppNodoSearchDialog(): void {
    this.appNodoSearchCodigo = '';
    this.appNodoSearchNombre = '';
    this.appliedAppNodoSearchCodigo.set('');
    this.appliedAppNodoSearchNombre.set('');
    this.appNodoSearchPage.set(1);
    this.showAppNodoSearchDlg = true;
  }

  closeAppNodoSearchDialog(): void {
    this.showAppNodoSearchDlg = false;
  }

  applyAppNodoFilters(): void {
    this.appliedAppNodoSearchCodigo.set(this.appNodoSearchCodigo);
    this.appliedAppNodoSearchNombre.set(this.appNodoSearchNombre);
    this.appNodoSearchPage.set(1);
  }

  clearAppNodoFilters(): void {
    this.appNodoSearchCodigo = '';
    this.appNodoSearchNombre = '';
    this.applyAppNodoFilters();
  }

  changeAppNodoSearchPage(delta: number): void {
    this.appNodoSearchPage.set(Math.min(Math.max(this.appNodoSearchPage() + delta, 1), this.appNodoSearchTotalPages()));
  }

  selectAppNodo(nodo: NodoSegregacion): void {
    this.appForm.nodoIds = [nodo.id];
    this.appNodoSearchText.set(`${nodo.codigo} · ${nodo.nombre}`);
  }

  selectAppNodoFromDialog(nodo: NodoSegregacion): void {
    this.selectAppNodo(nodo);
    this.closeAppNodoSearchDialog();
  }

  clearAppNodo(): void {
    this.appForm.nodoIds = [];
    this.appNodoSearchText.set('');
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
        next: () => { this.toast.success('Módulo eliminado'); this.events.emitDataChanged(); this._loadMod(); this._loadPrg(); },
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
        next: () => { this.toast.success('Programa eliminado'); this.events.emitDataChanged(); this._loadPrg(); },
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
      'DETALLE DE ERRORES - CARGA MASIVA DE SEGURIDADES',
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
    a.download = `errores_seguridades_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
    const validation = validateBulkFileSize(file);
    if (!validation.valid) {
      this.toast.error('Archivo demasiado grande', validation.message || 'El archivo excede el tamaño permitido.');
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
        this.setBulkErrors([{ row: 0, message: 'El archivo no contiene filas de datos.' }]);
        this.bulkLoading.set(false);
        return;
      }

      const headerRow = rawRows[0].map((h: any) => String(h).trim().toUpperCase());
      const expected = ['TIPO', 'CODIGO', 'NOMBRE', 'DESCRIPCION', 'APP_CODIGO', 'MOD_CODIGO', 'PRG_TIPO', 'ESTADO'];
      const missing = expected.filter(h => !headerRow.includes(h));
      if (missing.length > 0) {
        this.setBulkErrors([{ row: 1, message: `Formato incorrecto. Faltan columnas: ${missing.join(', ')}.` }]);
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
        this.setBulkErrors([{ row: 0, message: 'No se encontraron filas con datos válidos.' }]);
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
            this.setBulkErrors(res.errors || [{ row: 0, message: 'Error desconocido.' }]);
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
      this.setBulkErrors([{ row: 0, message: 'No se pudo leer el archivo Excel. Verifique el formato.' }]);
      this.bulkLoading.set(false);
    }
  }
}