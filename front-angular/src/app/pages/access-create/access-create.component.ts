import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import { TableSkeletonComponent, ErrorStateComponent } from '../../shared/components/ui';
import { IconSearchComponent } from '../../shared/components/icons';
import type { User, NivelSegregacion, NodoSegregacion, Perfil } from '../../shared/models/types';

@Component({
  selector: 'app-access-create',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconSearchComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Nuevo acceso</h1>
        <p>Asigne nodos de segregación y perfiles a un usuario.</p>
      </div>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="5" [cols]="1" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="loadData" />
    } @else {
      <div class="card access-create-card">
        <div class="form-grid two-cols">
          <div class="field form-col">
            <label>Usuario <span class="required">*</span></label>
            <div class="search-field">
              <input class="select" type="text" [ngModel]="userSearchDisplayText()" readonly placeholder="Seleccione un usuario..." />
              <button class="btn btn-ghost btn-sm btn-icon" type="button" (click)="openUserSearchDialog()" title="Buscar usuario">
                <app-icon-search [width]="16" [height]="16" />
              </button>
            </div>
          </div>

          <div class="field form-col">
            <label>Perfiles</label>
            <div class="input-action-row">
              <div class="perfil-autocomplete" style="position:relative;flex:1;min-width:200px;">
                <input
                  type="text"
                  class="select"
                  placeholder="Buscar perfil..."
                  style="width:100%;"
                  [ngModel]="perfilAutoQuery()"
                  (ngModelChange)="perfilAutoQuery.set($event); perfilAutoOpen.set(true)"
                  (focus)="perfilAutoOpen.set(true)"
                  (blur)="closePerfilAutocomplete()"
                />
                @if (perfilAutoOpen() && perfilSuggestions().length > 0) {
                  <div class="perfil-autocomplete-list">
                    @for (p of perfilSuggestions(); track p.id) {
                      <div class="empresa-autocomplete-item" (mousedown)="addPerfilFromAutocomplete(p)">
                        <span class="mono small">{{ p.codigo }}</span>
                        <span class="small">{{ p.nombre }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
              <button class="btn btn-ghost btn-sm" type="button" (click)="openPerfilSearchDialog()" title="Buscar perfiles">
                <app-icon-search [width]="14" [height]="14" /> Buscar Perfiles
              </button>
            </div>
            <div class="selection-box">
              @for (p of selectedPerfilesDetails(); track p.codigo) {
                <label class="selection-item">
                  <input type="checkbox" checked disabled />
                  <span><b>{{ p.codigo }}</b> · {{ p.nombre }}</span>
                </label>
              } @empty {
                <span class="muted small">No hay perfiles asignados.</span>
              }
            </div>
          </div>
        </div>

        <div class="field nodos-section">
          <label>Nodos de Segregación</label>
          <div class="nodos-grid">
            @for (nivel of niveles(); track nivel.id; let i = $index) {
              <div class="nivel-block">
                <div class="input-action-row">
                  @if (i === 0) {
                    <div class="empresa-autocomplete" style="flex: 1;">
                      <label class="small muted nivel-label"><b>{{ nivel.nombre }}</b></label>
                      <input
                        type="text"
                        class="select"
                        placeholder="Buscar empresa..."
                        [ngModel]="empresaAutoQuery()"
                        (ngModelChange)="empresaAutoQuery.set($event); empresaAutoOpen.set(true)"
                        (focus)="empresaAutoOpen.set(true)"
                        (blur)="closeEmpresaAutocomplete()"
                      />
                      @if (empresaAutoOpen() && empresaSuggestions().length > 0) {
                        <div class="empresa-autocomplete-list">
                          @for (n of empresaSuggestions(); track n.id) {
                            <div class="empresa-autocomplete-item" (mousedown)="selectEmpresa(n)">
                              <span class="mono small">{{ n.codigo }}</span>
                              <span class="small">{{ n.nombre }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  } @else if (i === 1) {
                    <div class="empresa-autocomplete" style="flex: 1;">
                      <label class="small muted nivel-label"><b>{{ nivel.nombre }}</b></label>
                      <input
                        type="text"
                        class="select"
                        placeholder="Buscar sucursal..."
                        [ngModel]="sucursalAutoQuery()"
                        (ngModelChange)="sucursalAutoQuery.set($event)"
                        (focus)="onSucursalAutocompleteFocus(nivel.id)"
                        (blur)="closeSucursalAutocomplete()"
                        [disabled]="!puedeBuscarNivel(nivel.id)"
                        [attr.title]="puedeBuscarNivel(nivel.id) ? '' : 'Seleccione primero una ' + getNivelNombre(getNivelPadreId(nivel.id)!)"
                      />
                      @if (sucursalAutoOpen() && sucursalSuggestions().length > 0 && puedeBuscarNivel(nivel.id)) {
                        <div class="empresa-autocomplete-list">
                          @for (n of sucursalSuggestions(); track n.id) {
                            <div class="empresa-autocomplete-item" (mousedown)="selectSucursal(n)">
                              <span class="mono small">{{ n.codigo }}</span>
                              <span class="small">{{ n.nombre }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  } @else if (i === 2) {
                    <div class="empresa-autocomplete" style="flex: 1;">
                      <label class="small muted nivel-label"><b>{{ nivel.nombre }}</b></label>
                      <input
                        type="text"
                        class="select"
                        placeholder="Buscar punto de venta..."
                        [ngModel]="puntoVentaAutoQuery()"
                        (ngModelChange)="puntoVentaAutoQuery.set($event)"
                        (focus)="onPuntoVentaAutocompleteFocus(nivel.id)"
                        (blur)="closePuntoVentaAutocomplete()"
                        [disabled]="!puedeBuscarNivel(nivel.id)"
                        [attr.title]="puedeBuscarNivel(nivel.id) ? '' : 'Seleccione primero una ' + getNivelNombre(getNivelPadreId(nivel.id)!)"
                      />
                      @if (puntoVentaAutoOpen() && puntoVentaSuggestions().length > 0 && puedeBuscarNivel(nivel.id)) {
                        <div class="empresa-autocomplete-list">
                          @for (n of puntoVentaSuggestions(); track n.id) {
                            <div class="empresa-autocomplete-item" (mousedown)="selectPuntoVenta(n)">
                              <span class="mono small">{{ n.codigo }}</span>
                              <span class="small">{{ n.nombre }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  } @else {
                    <span class="small muted"><b>{{ nivel.nombre }}</b></span>
                  }
                  <button class="btn btn-ghost btn-sm" type="button" (click)="openNodoSearchDialog(nivel.id, nivel.nombre)" [disabled]="!puedeBuscarNivel(nivel.id)" [title]="puedeBuscarNivel(nivel.id) ? 'Buscar ' + nivel.nombre : 'Seleccione primero un ' + getNivelNombre(getNivelPadreId(nivel.id)!)">
                    <app-icon-search [width]="14" [height]="14" /> Buscar {{ nivel.nombre }}
                  </button>
                </div>
                <div class="selection-box nodos-box">
                  @for (nodo of selectedNodosByNivelId(nivel.id); track nodo.id) {
                    <label class="selection-item">
                      <input type="checkbox" checked disabled />
                      <span><b>{{ nodo.codigo }}</b> · {{ nodo.nombre }}</span>
                    </label>
                  } @empty {
                    <span class="muted small">Ningún nodo seleccionado.</span>
                  }
                </div>
              </div>
            } @empty {
              <span class="muted small">No hay niveles configurados.</span>
            }
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-ghost" (click)="cancel()">Cancelar</button>
          <button class="btn btn-primary" (click)="save()">Crear acceso</button>
        </div>
      </div>
    }
    <p-dialog
      [(visible)]="showUserSearchDlg"
      header="Buscar usuario"
      [modal]="true"
      [style]="{ width: '1600px', maxWidth: '95vw' }"
      [contentStyle]="{ maxHeight: '88vh', overflow: 'auto' }"
      [closable]="true"
      styleClass="search-dialog user-search-dialog"
      (onHide)="closeUserSearchDialog()"
    >
      <div class="filter-row user-search-filter-row">
        <div class="field">
          <label>Usuario</label>
          <input type="text" class="select" placeholder="Usuario"
            [ngModel]="userSearchCodigo()" (ngModelChange)="userSearchCodigo.set($event); userSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" placeholder="Nombre"
            [ngModel]="userSearchNombre()" (ngModelChange)="userSearchNombre.set($event); userSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Apellido</label>
          <input type="text" class="select" placeholder="Apellido"
            [ngModel]="userSearchApellido()" (ngModelChange)="userSearchApellido.set($event); userSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Correo</label>
          <input type="text" class="select" placeholder="Correo"
            [ngModel]="userSearchCorreo()" (ngModelChange)="userSearchCorreo.set($event); userSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Empresa</label>
          <input type="text" class="select" placeholder="Empresa"
            [ngModel]="userSearchEmpresa()" (ngModelChange)="userSearchEmpresa.set($event); userSearchPage.set(1)" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-ghost" (click)="clearUserFilters()">Limpiar</button>
      </div>
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Correo</th>
              <th>Empresa</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (u of paginatedUsersForSearch(); track u.id) {
              <tr>
                <td class="mono">{{ u.username }}</td>
                <td><div class="cell-strong">{{ u.firstName }}</div></td>
                <td><div class="cell-strong">{{ u.lastName }}</div></td>
                <td>{{ u.email }}</td>
                <td>{{ u.company }}</td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="selectUserFromDialog(u)">Seleccionar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <div class="page-controls">
          <button class="btn btn-ghost btn-sm" [disabled]="userSearchPage() === 1" (click)="changeUserSearchPage(-1)">Anterior</button>
        </div>
        <span>Página {{ userSearchPage() }} de {{ userSearchTotalPages() }} ({{ filteredUsersForSearch().length }} registros)</span>
        <div class="page-size-selector">
          <label class="small muted">Registros por página</label>
          <select class="select" style="width: auto; min-width: 60px;" [ngModel]="userSearchPageSize()" (ngModelChange)="changeUserSearchPageSize($event)">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="15">15</option>
            <option [value]="20">20</option>
          </select>
          <button class="btn btn-ghost btn-sm" [disabled]="userSearchPage() === userSearchTotalPages()" (click)="changeUserSearchPage(1)">Siguiente</button>
        </div>
      </div>
    </p-dialog>
    <p-dialog
      [(visible)]="showPerfilSearchDlg"
      header="Buscar perfiles"
      [modal]="true"
      [style]="{ width: '1100px', maxWidth: '95vw' }"
      [contentStyle]="{ maxHeight: '88vh', overflow: 'auto' }"
      [closable]="true"
      styleClass="search-dialog perfil-search-dialog"
      (onHide)="cancelPerfilSearch()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" placeholder="Código de perfil"
            [ngModel]="perfilSearchCodigo()" (ngModelChange)="perfilSearchCodigo.set($event); perfilSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" placeholder="Nombre de perfil"
            [ngModel]="perfilSearchNombre()" (ngModelChange)="perfilSearchNombre.set($event); perfilSearchPage.set(1)" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-ghost" (click)="clearPerfilFilters()">Limpiar</button>
      </div>

      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th style="width:40px;"></th>
              <th>Código</th>
              <th>Nombre</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            @for (p of paginatedPerfilesForSearch(); track p.id) {
              <tr>
                <td class="center">
                  <input type="checkbox" [checked]="tempSelectedPerfilCodigos().includes(p.codigo)"
                    (change)="togglePerfilSelection(p.codigo)" style="width:16px;height:16px;cursor:pointer;" />
                </td>
                <td class="mono">{{ p.codigo }}</td>
                <td><div class="cell-strong">{{ p.nombre }}</div></td>
                <td>{{ p.descripcion }}</td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <div class="page-controls">
          <button class="btn btn-ghost btn-sm" [disabled]="perfilSearchPage() === 1" (click)="changePerfilSearchPage(-1)">Anterior</button>
        </div>
        <span>Página {{ perfilSearchPage() }} de {{ perfilSearchTotalPages() }} ({{ filteredPerfilesForSearch().length }} registros)</span>
        <div class="page-size-selector">
          <label class="small muted">Registros por página</label>
          <select class="select" style="width: auto; min-width: 60px;" [ngModel]="perfilSearchPageSize()" (ngModelChange)="changePerfilSearchPageSize($event)">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="15">15</option>
            <option [value]="20">20</option>
          </select>
          <button class="btn btn-ghost btn-sm" [disabled]="perfilSearchPage() === perfilSearchTotalPages()" (click)="changePerfilSearchPage(1)">Siguiente</button>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="cancelPerfilSearch()">Cancelar</button>
        <button class="btn btn-primary" (click)="acceptPerfilSearch()">Aceptar ({{ tempSelectedPerfilCodigos().length }})</button>
      </ng-template>
    </p-dialog>
    <p-dialog
      [(visible)]="showNodoSearchDlg"
      [header]="'Buscar ' + nodoSearchNivelNombre()"
      [modal]="true"
      [style]="{ width: '1100px', maxWidth: '95vw' }"
      [contentStyle]="{ maxHeight: '88vh', overflow: 'auto' }"
      [closable]="true"
      styleClass="search-dialog nodo-search-dialog"
      (onHide)="cancelNodoSearch()"
    >
      <div class="filter-row">
        <div class="field">
          <label>Código</label>
          <input type="text" class="select" placeholder="Código de nodo"
            [ngModel]="nodoSearchCodigo()" (ngModelChange)="nodoSearchCodigo.set($event); nodoSearchPage.set(1)" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" class="select" placeholder="Nombre de nodo"
            [ngModel]="nodoSearchNombre()" (ngModelChange)="nodoSearchNombre.set($event); nodoSearchPage.set(1)" />
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-ghost" (click)="clearNodoFilters()">Limpiar</button>
      </div>

      @if (getSelectedParentIds(nodoSearchNivelId()).length > 0) {
        <div class="muted small" style="margin-bottom: 8px;">
          Mostrando {{ nodoSearchNivelNombre() }} del {{ getNivelNombre(getNivelPadreId(nodoSearchNivelId())!) }} seleccionado.
        </div>
      }

      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th style="width:40px;"></th>
              <th>Código</th>
              <th>Nombre</th>
              <th>Padre</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (n of paginatedNodosForSearch(); track n.id) {
              <tr>
                <td class="center">
                  <input type="checkbox" [checked]="tempSelectedNodoIds().includes(n.id)"
                    (change)="toggleNodoSelection(n.id)" style="width:16px;height:16px;cursor:pointer;" />
                </td>
                <td class="mono">{{ n.codigo }}</td>
                <td><div class="cell-strong">{{ n.nombre }}</div></td>
                <td>
                  @if (n.padreId) {
                    {{ getNodoPadreLabel(n.padreId) }}
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
                <td>
                  <span class="badge" [class.badge-green]="n.estado === 'ACTIVO'" [class.badge-gray]="n.estado !== 'ACTIVO'">
                    {{ n.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <div class="page-controls">
          <button class="btn btn-ghost btn-sm" [disabled]="nodoSearchPage() === 1" (click)="changeNodoSearchPage(-1)">Anterior</button>
        </div>
        <span>Página {{ nodoSearchPage() }} de {{ nodoSearchTotalPages() }} ({{ filteredNodosForSearch().length }} registros)</span>
        <div class="page-size-selector">
          <label class="small muted">Registros por página</label>
          <select class="select" style="width: auto; min-width: 60px;" [ngModel]="nodoSearchPageSize()" (ngModelChange)="changeNodoSearchPageSize($event)">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="15">15</option>
            <option [value]="20">20</option>
          </select>
          <button class="btn btn-ghost btn-sm" [disabled]="nodoSearchPage() === nodoSearchTotalPages()" (click)="changeNodoSearchPage(1)">Siguiente</button>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="cancelNodoSearch()">Cancelar</button>
        <button class="btn btn-primary" (click)="acceptNodoSearch()">Aceptar ({{ tempSelectedNodoIds().length }})</button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .center { text-align: center; }

    .access-create-card {
      max-width: 1200px;
      padding: 32px;
    }

    .form-grid {
      display: grid;
      gap: 24px;
    }
    .form-grid.two-cols {
      grid-template-columns: repeat(2, 1fr);
    }
    @media (max-width: 768px) {
      .form-grid.two-cols {
        grid-template-columns: 1fr;
      }
    }

    .form-col {
      margin: 0;
    }
    .form-col > label {
      display: block;
      margin-bottom: 10px;
    }

    .input-action-row {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 12px;
    }

    .selection-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 160px;
      overflow-y: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      background: var(--surface-2);
    }
    .selection-item {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: default;
      opacity: 0.85;
    }
    .selection-item input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: default;
      flex-shrink: 0;
    }

    .nodos-section {
      margin-top: 8px;
    }
    .nodos-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-top: 10px;
    }
    .nivel-block {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .nivel-label {
      display: block;
      margin-bottom: 6px;
    }
    .nodos-box {
      max-height: 120px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }

    .empresa-autocomplete {
      position: relative;
      width: 100%;
      min-width: 220px;
    }
    .empresa-autocomplete input {
      width: 100%;
    }
    .empresa-autocomplete-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow-md);
      max-height: 200px;
      overflow-y: auto;
      margin-top: 4px;
    }
    .empresa-autocomplete-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid var(--border);
    }
    .empresa-autocomplete-item:last-child {
      border-bottom: none;
    }
    .empresa-autocomplete-item:hover {
      background: var(--surface-2);
    }
    .perfil-autocomplete {
      position: relative;
    }
    .perfil-autocomplete input {
      width: 100%;
    }
    .perfil-autocomplete-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow-md);
      max-height: 200px;
      overflow-y: auto;
      margin-top: 4px;
    }
    .user-search-filter-row {
      grid-template-columns: repeat(5, minmax(140px, 1fr));
    }

    /* Diálogos de búsqueda: más anchos, altura ajustada y controles con ancho fijo */
    ::ng-deep .search-dialog {
      display: flex;
      flex-direction: column;
    }
    ::ng-deep .search-dialog .p-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-bottom: 16px;
    }
    ::ng-deep .search-dialog .card.table-wrap {
      flex: 0 0 auto;
      min-height: 300px;
      height: auto;
      overflow: visible;
    }
    ::ng-deep .search-dialog .filter-row {
      display: flex !important;
      flex-wrap: wrap !important;
      justify-content: flex-start !important;
      gap: 5px;
    }
    ::ng-deep .search-dialog .filter-row .field {
      flex: 0 1 264px;
      max-width: 312px;
      min-width: 200px;
    }
    ::ng-deep .search-dialog .filter-row .field input,
    ::ng-deep .search-dialog .filter-row .field select {
      width: 100%;
      max-width: 312px;
    }
    ::ng-deep .search-dialog .filter-actions {
      justify-content: flex-end;
    }
    ::ng-deep .search-dialog .pagination {
      margin-top: 8px;
      flex-shrink: 0;
    }

    /* Asegurar que las tablas de los diálogos tengan el mismo estilo que la tabla de Usuarios,
       incluyendo la línea inferior visible en la última fila. */
    ::ng-deep .search-dialog table.data {
      width: 100%;
      border-collapse: collapse;
    }
    ::ng-deep .search-dialog table.data th,
    ::ng-deep .search-dialog table.data td {
      border-bottom: 1px solid var(--border);
    }
    ::ng-deep .search-dialog table.data tr:last-child td {
      border-bottom: 1px solid var(--border);
    }
  `],
})
export class AccessCreateComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);
  private router = inject(Router);

  users = signal<User[]>([]);
  niveles = signal<NivelSegregacion[]>([]);
  nodos = signal<NodoSegregacion[]>([]);
  perfiles = signal<Perfil[]>([]);

  loading = signal(true);
  error = signal<string | null>(null);

  selectedUserId = '';
  editForm = signal({ nodoIds: [] as string[], perfilCodigos: [] as string[] });
  userSearchDisplayText = signal('');
  showUserSearchDlg = false;
  userSearchCodigo = signal('');
  userSearchNombre = signal('');
  userSearchApellido = signal('');
  userSearchCorreo = signal('');
  userSearchEmpresa = signal('');
  userSearchPage = signal(1);
  userSearchPageSize = signal(5);

  showPerfilSearchDlg = false;
  perfilSearchCodigo = signal('');
  perfilSearchNombre = signal('');
  perfilSearchPage = signal(1);
  perfilSearchPageSize = signal(5);
  tempSelectedPerfilCodigos = signal<string[]>([]);

  showNodoSearchDlg = false;
  nodoSearchNivelId = signal('');
  nodoSearchNivelNombre = signal('');
  nodoSearchCodigo = signal('');
  nodoSearchNombre = signal('');
  nodoSearchPage = signal(1);
  nodoSearchPageSize = signal(5);
  tempSelectedNodoIds = signal<string[]>([]);

  empresaAutoQuery = signal('');
  empresaAutoOpen = signal(false);
  empresaAutoTimer: any = null;

  sucursalAutoQuery = signal('');
  sucursalAutoOpen = signal(false);
  sucursalAutoTimer: any = null;

  puntoVentaAutoQuery = signal('');
  puntoVentaAutoOpen = signal(false);
  puntoVentaAutoTimer: any = null;

  perfilAutoQuery = signal('');
  perfilAutoOpen = signal(false);
  perfilAutoTimer: any = null;

  primerNivel = computed(() => {
    const sorted = [...this.niveles()].sort((a, b) => a.orden - b.orden);
    return sorted[0] || null;
  });

  segundoNivel = computed(() => {
    const sorted = [...this.niveles()].sort((a, b) => a.orden - b.orden);
    return sorted[1] || null;
  });

  tercerNivel = computed(() => {
    const sorted = [...this.niveles()].sort((a, b) => a.orden - b.orden);
    return sorted[2] || null;
  });

  empresaSuggestions = computed(() => {
    const primer = this.primerNivel();
    if (!primer) return [];
    const q = this.empresaAutoQuery().toLowerCase().trim();
    return this.nodos()
      .filter(n => n.nivelId === primer.id && n.estado === 'ACTIVO' &&
        (!q || n.codigo.toLowerCase().includes(q) || n.nombre.toLowerCase().includes(q)))
      .slice(0, 8);
  });

  sucursalSuggestions = computed(() => {
    const segundo = this.segundoNivel();
    if (!segundo) return [];
    const q = this.sucursalAutoQuery().toLowerCase().trim();
    return this.nodos()
      .filter(n => n.nivelId === segundo.id && n.estado === 'ACTIVO' &&
        (!q || n.codigo.toLowerCase().includes(q) || n.nombre.toLowerCase().includes(q)))
      .slice(0, 8);
  });

  puntoVentaSuggestions = computed(() => {
    const tercer = this.tercerNivel();
    if (!tercer) return [];
    const q = this.puntoVentaAutoQuery().toLowerCase().trim();
    return this.nodos()
      .filter(n => n.nivelId === tercer.id && n.estado === 'ACTIVO' &&
        (!q || n.codigo.toLowerCase().includes(q) || n.nombre.toLowerCase().includes(q)))
      .slice(0, 8);
  });

  perfilSuggestions = computed(() => {
    const q = this.perfilAutoQuery().toLowerCase().trim();
    return this.perfiles()
      .filter(p => p.estado === 'ACTIVO' &&
        (!q || p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)))
      .slice(0, 8);
  });
  filteredUsersForSearch = computed(() => {
    const qCodigo = this.userSearchCodigo().toLowerCase().trim();
    const qNombre = this.userSearchNombre().toLowerCase().trim();
    const qApellido = this.userSearchApellido().toLowerCase().trim();
    const qCorreo = this.userSearchCorreo().toLowerCase().trim();
    const qEmpresa = this.userSearchEmpresa().toLowerCase().trim();
    return this.users().filter(u =>
      (!qCodigo || u.username.toLowerCase().includes(qCodigo)) &&
      (!qNombre || u.firstName.toLowerCase().includes(qNombre)) &&
      (!qApellido || u.lastName.toLowerCase().includes(qApellido)) &&
      (!qCorreo || u.email.toLowerCase().includes(qCorreo)) &&
      (!qEmpresa || u.company.toLowerCase().includes(qEmpresa))
    );
  });

  paginatedUsersForSearch = computed(() => {
    const start = (this.userSearchPage() - 1) * this.userSearchPageSize();
    return this.filteredUsersForSearch().slice(start, start + this.userSearchPageSize());
  });

  userSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsersForSearch().length / this.userSearchPageSize())));

  filteredPerfilesForSearch = computed(() => {
    const qCodigo = this.perfilSearchCodigo().toLowerCase().trim();
    const qNombre = this.perfilSearchNombre().toLowerCase().trim();
    return this.perfiles().filter(p =>
      (!qCodigo || p.codigo.toLowerCase().includes(qCodigo)) &&
      (!qNombre || p.nombre.toLowerCase().includes(qNombre))
    );
  });

  paginatedPerfilesForSearch = computed(() => {
    const start = (this.perfilSearchPage() - 1) * this.perfilSearchPageSize();
    return this.filteredPerfilesForSearch().slice(start, start + this.perfilSearchPageSize());
  });

  perfilSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredPerfilesForSearch().length / this.perfilSearchPageSize())));

  selectedPerfilesDetails = computed(() => {
    return this.editForm().perfilCodigos
      .map(codigo => this.perfiles().find(p => p.codigo === codigo))
      .filter((p): p is Perfil => !!p);
  });

  getNivelPadreId(nivelId: string): string | null {
    const sorted = [...this.niveles()].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex(n => n.id === nivelId);
    return idx > 0 ? sorted[idx - 1].id : null;
  }

  getSelectedParentIds(nivelId: string): string[] {
    const parentNivelId = this.getNivelPadreId(nivelId);
    if (!parentNivelId) return [];
    return this.editForm().nodoIds
      .map(id => this.nodos().find(n => n.id === id))
      .filter((n): n is NodoSegregacion => !!n && n.nivelId === parentNivelId)
      .map(n => n.id);
  }

  puedeBuscarNivel(nivelId: string): boolean {
    const parentNivelId = this.getNivelPadreId(nivelId);
    if (!parentNivelId) return true;
    return this.getSelectedParentIds(nivelId).length > 0;
  }
  filteredNodosForSearch = computed(() => {
    const nivelId = this.nodoSearchNivelId();
    const parentNivelId = this.getNivelPadreId(nivelId);
    const selectedParentIds = parentNivelId ? this.getSelectedParentIds(nivelId) : [];
    const hasParentFilter = parentNivelId && selectedParentIds.length > 0;
    const qCodigo = this.nodoSearchCodigo().toLowerCase().trim();
    const qNombre = this.nodoSearchNombre().toLowerCase().trim();
    return this.nodos().filter(n => {
      if (n.nivelId !== nivelId || n.estado !== 'ACTIVO') return false;
      if (hasParentFilter && n.padreId && !selectedParentIds.includes(n.padreId)) return false;
      return (!qCodigo || n.codigo.toLowerCase().includes(qCodigo)) &&
             (!qNombre || n.nombre.toLowerCase().includes(qNombre));
    });
  });

  paginatedNodosForSearch = computed(() => {
    const start = (this.nodoSearchPage() - 1) * this.nodoSearchPageSize();
    return this.filteredNodosForSearch().slice(start, start + this.nodoSearchPageSize());
  });

  nodoSearchTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredNodosForSearch().length / this.nodoSearchPageSize())));

  selectedNodosByNivelId = (nivelId: string) => {
    return this.editForm().nodoIds
      .map(id => this.nodos().find(n => n.id === id))
      .filter((n): n is NodoSegregacion => !!n && n.nivelId === nivelId);
  };

  selectEmpresa(n: NodoSegregacion): void {
    this.editForm.update(f => ({
      ...f,
      nodoIds: f.nodoIds.includes(n.id) ? f.nodoIds : [...f.nodoIds, n.id],
    }));
    this.empresaAutoQuery.set('');
    this.empresaAutoOpen.set(false);
    clearTimeout(this.empresaAutoTimer);
  }

  selectSucursal(n: NodoSegregacion): void {
    this.editForm.update(f => ({
      ...f,
      nodoIds: f.nodoIds.includes(n.id) ? f.nodoIds : [...f.nodoIds, n.id],
    }));
    this.sucursalAutoQuery.set('');
    this.sucursalAutoOpen.set(false);
    clearTimeout(this.sucursalAutoTimer);
  }

  selectPuntoVenta(n: NodoSegregacion): void {
    this.editForm.update(f => ({
      ...f,
      nodoIds: f.nodoIds.includes(n.id) ? f.nodoIds : [...f.nodoIds, n.id],
    }));
    this.puntoVentaAutoQuery.set('');
    this.puntoVentaAutoOpen.set(false);
    clearTimeout(this.puntoVentaAutoTimer);
  }

  onSucursalAutocompleteFocus(nivelId: string): void {
    if (this.puedeBuscarNivel(nivelId)) {
      this.sucursalAutoOpen.set(true);
    }
  }

  onPuntoVentaAutocompleteFocus(nivelId: string): void {
    if (this.puedeBuscarNivel(nivelId)) {
      this.puntoVentaAutoOpen.set(true);
    }
  }

  closeEmpresaAutocomplete(): void {
    this.empresaAutoTimer = setTimeout(() => this.empresaAutoOpen.set(false), 150);
  }

  closeSucursalAutocomplete(): void {
    this.sucursalAutoTimer = setTimeout(() => this.sucursalAutoOpen.set(false), 150);
  }

  closePuntoVentaAutocomplete(): void {
    this.puntoVentaAutoTimer = setTimeout(() => this.puntoVentaAutoOpen.set(false), 150);
  }

  addPerfilFromAutocomplete(p: Perfil): void {
    const current = this.editForm().perfilCodigos;
    if (!current.includes(p.codigo)) {
      this.editForm.update(f => ({ ...f, perfilCodigos: [...f.perfilCodigos, p.codigo] }));
    }
    this.perfilAutoQuery.set('');
    this.perfilAutoOpen.set(false);
    clearTimeout(this.perfilAutoTimer);
  }

  closePerfilAutocomplete(): void {
    this.perfilAutoTimer = setTimeout(() => this.perfilAutoOpen.set(false), 150);
  }
  ngOnInit(): void {
    this.loadData();
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

  openUserSearchDialog(): void {
    this.userSearchCodigo.set('');
    this.userSearchNombre.set('');
    this.userSearchApellido.set('');
    this.userSearchCorreo.set('');
    this.userSearchEmpresa.set('');
    this.userSearchPage.set(1);
    this.showUserSearchDlg = true;
  }

  closeUserSearchDialog(): void {
    this.showUserSearchDlg = false;
  }

  clearUserFilters(): void {
    this.userSearchCodigo.set('');
    this.userSearchNombre.set('');
    this.userSearchApellido.set('');
    this.userSearchCorreo.set('');
    this.userSearchEmpresa.set('');
    this.userSearchPage.set(1);
  }

  changeUserSearchPage(delta: number): void {
    this.userSearchPage.set(Math.min(Math.max(this.userSearchPage() + delta, 1), this.userSearchTotalPages()));
  }

  changeUserSearchPageSize(value: any): void {
    this.userSearchPageSize.set(Number(value));
    this.userSearchPage.set(1);
  }

  selectUser(u: User): void {
    this.selectedUserId = u.id;
    this.userSearchDisplayText.set(`${u.username} · ${u.firstName} ${u.lastName}`);
  }

  selectUserFromDialog(u: User): void {
    this.selectUser(u);
    this.closeUserSearchDialog();
  }

  openPerfilSearchDialog(): void {
    this.perfilSearchCodigo.set('');
    this.perfilSearchNombre.set('');
    this.perfilSearchPage.set(1);
    this.tempSelectedPerfilCodigos.set([...this.editForm().perfilCodigos]);
    this.showPerfilSearchDlg = true;
  }

  cancelPerfilSearch(): void {
    this.showPerfilSearchDlg = false;
    this.tempSelectedPerfilCodigos.set([]);
  }

  clearPerfilFilters(): void {
    this.perfilSearchCodigo.set('');
    this.perfilSearchNombre.set('');
    this.perfilSearchPage.set(1);
  }

  changePerfilSearchPage(delta: number): void {
    this.perfilSearchPage.set(Math.min(Math.max(this.perfilSearchPage() + delta, 1), this.perfilSearchTotalPages()));
  }

  changePerfilSearchPageSize(value: any): void {
    this.perfilSearchPageSize.set(Number(value));
    this.perfilSearchPage.set(1);
  }

  togglePerfilSelection(codigo: string): void {
    const selected = this.tempSelectedPerfilCodigos();
    if (selected.includes(codigo)) {
      this.tempSelectedPerfilCodigos.set(selected.filter(c => c !== codigo));
    } else {
      this.tempSelectedPerfilCodigos.set([...selected, codigo]);
    }
  }

  acceptPerfilSearch(): void {
    this.editForm.set({ ...this.editForm(), perfilCodigos: [...this.tempSelectedPerfilCodigos()] });
    this.tempSelectedPerfilCodigos.set([]);
    this.showPerfilSearchDlg = false;
  }
  openNodoSearchDialog(nivelId: string, nivelNombre: string): void {
    this.nodoSearchNivelId.set(nivelId);
    this.nodoSearchNivelNombre.set(nivelNombre);
    this.nodoSearchCodigo.set('');
    this.nodoSearchNombre.set('');
    this.nodoSearchPage.set(1);
    this.tempSelectedNodoIds.set(this.editForm().nodoIds.filter(id => {
      const n = this.nodos().find(x => x.id === id);
      return n?.nivelId === nivelId;
    }));
    this.showNodoSearchDlg = true;
  }

  cancelNodoSearch(): void {
    this.showNodoSearchDlg = false;
    this.nodoSearchNivelId.set('');
    this.nodoSearchNivelNombre.set('');
    this.tempSelectedNodoIds.set([]);
  }

  clearNodoFilters(): void {
    this.nodoSearchCodigo.set('');
    this.nodoSearchNombre.set('');
    this.nodoSearchPage.set(1);
  }

  changeNodoSearchPage(delta: number): void {
    this.nodoSearchPage.set(Math.min(Math.max(this.nodoSearchPage() + delta, 1), this.nodoSearchTotalPages()));
  }

  changeNodoSearchPageSize(value: any): void {
    this.nodoSearchPageSize.set(Number(value));
    this.nodoSearchPage.set(1);
  }

  toggleNodoSelection(nodoId: string): void {
    const selected = this.tempSelectedNodoIds();
    if (selected.includes(nodoId)) {
      this.tempSelectedNodoIds.set(selected.filter(id => id !== nodoId));
    } else {
      this.tempSelectedNodoIds.set([...selected, nodoId]);
    }
  }

  acceptNodoSearch(): void {
    const form = this.editForm();
    const nivelId = this.nodoSearchNivelId();
    const newSelected = this.tempSelectedNodoIds();

    const prevSelected = form.nodoIds.filter(id => this.nodos().find(n => n.id === id)?.nivelId === nivelId);
    const deselected = prevSelected.filter(id => !newSelected.includes(id));

    const idsToRemove = new Set<string>();
    for (const id of deselected) {
      idsToRemove.add(id);
      for (const desc of this.descendientesDe(id)) {
        idsToRemove.add(desc);
      }
    }

    const otherNodes = form.nodoIds.filter(id => {
      if (idsToRemove.has(id)) return false;
      const n = this.nodos().find(x => x.id === id);
      return n?.nivelId !== nivelId;
    });

    this.editForm.set({ ...form, nodoIds: [...otherNodes, ...newSelected] });
    this.tempSelectedNodoIds.set([]);
    this.showNodoSearchDlg = false;
    this.nodoSearchNivelId.set('');
    this.nodoSearchNivelNombre.set('');
  }

  getNivelNombre(nivelId: string): string {
    return this.niveles().find(n => n.id === nivelId)?.nombre ?? '';
  }

  getNodoLabel(nodoId: string): string {
    const nodo = this.nodos().find(n => n.id === nodoId);
    if (!nodo) return nodoId;
    const nivel = this.niveles().find(n => n.id === nodo.nivelId);
    return `${nodo.codigo} · ${nodo.nombre}${nivel ? ` (${nivel.nombre})` : ''}`;
  }

  descendientesDe(nodoId: string): string[] {
    const result: string[] = [];
    const stack = [nodoId];
    while (stack.length) {
      const actual = stack.pop()!;
      const hijos = this.nodos().filter(n => n.padreId === actual);
      for (const h of hijos) {
        result.push(h.id);
        stack.push(h.id);
      }
    }
    return result;
  }

  getNodoPadreLabel(padreId: string): string {
    const padre = this.nodos().find(n => n.id === padreId);
    return padre ? `${padre.codigo} · ${padre.nombre}` : padreId;
  }

  async save(): Promise<void> {
    if (!this.selectedUserId) {
      this.toast.error('Faltan datos', 'Debe seleccionar un usuario.');
      return;
    }
    try {
      await this.api.updateUserAccess(this.selectedUserId, this.editForm()).toPromise();
      this.toast.success('Acceso creado');
      this.events.emitDataChanged();
      this.router.navigate(['/usuarios'], { queryParams: { tab: 'ACCESOS' } });
    } catch (e: any) {
      this.toast.error('Error', e?.error?.error || 'Error inesperado.');
    }
  }

  cancel(): void {
    this.router.navigate(['/usuarios']);
  }
}

