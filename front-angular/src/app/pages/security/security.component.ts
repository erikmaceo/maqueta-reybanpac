import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IconPlusComponent, IconTrashComponent, IconEditComponent, IconSecurityComponent,
} from '../../shared/components/icons';
import type { Aplicacion, Modulo, Programa, Perfil } from '../../shared/models/types';

type Estado = 'ACTIVO' | 'INACTIVO';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Tabs, TabList, Tab, TabPanels, TabPanel,
    DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule,
    TableSkeletonComponent, ErrorStateComponent,
    IconPlusComponent, IconTrashComponent, IconEditComponent, IconSecurityComponent,
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
            <b class="small muted">Total: {{ aplicaciones().length }}</b>
            <button class="btn btn-primary" (click)="openAppDialog()">
              <app-icon-plus [width]="14" [height]="14" /> Nueva aplicación
            </button>
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
                @for (a of aplicaciones(); track a.id) {
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
            <b class="small muted">Total: {{ modulos().length }}</b>
            <button class="btn btn-primary" (click)="openModDialog()">
              <app-icon-plus [width]="14" [height]="14" /> Nuevo módulo
            </button>
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
                @for (m of modulos(); track m.id) {
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
            <b class="small muted">Total: {{ programas().length }}</b>
            <button class="btn btn-primary" (click)="openPrgDialog()">
              <app-icon-plus [width]="14" [height]="14" /> Nuevo programa
            </button>
          </div>
          <div class="card table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Módulo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (p of programas(); track p.id) {
                  <tr>
                    <td class="mono">{{ p.codigo }}</td>
                    <td><div class="cell-strong">{{ p.nombre }}</div><div class="tiny dim">{{ p.descripcion }}</div></td>
                    <td><span class="badge badge-blue">{{ p.modCodigo }}</span></td>
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
                  <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin programas registrados.</td></tr>
                }
              </tbody>
            </table>
          </div>
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
            <b class="small muted">Total: {{ perfiles().length }}</b>
            <button class="btn btn-primary" (click)="openPerfDialog()">
              <app-icon-plus [width]="14" [height]="14" /> Nuevo perfil
            </button>
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
                @for (p of perfiles(); track p.id) {
                  <tr>
                    <td class="mono">{{ p.codigo }}</td>
                    <td><div class="cell-strong">{{ p.nombre }}</div><div class="tiny dim">{{ p.descripcion }}</div></td>
                    <td><span class="badge badge-blue">{{ p.prgCodigo }}</span></td>
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
      [modal]="true" [style]="{ width: '480px' }" [closable]="true"
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
        <label>Módulo</label>
        <select class="select" [(ngModel)]="prgForm.modCodigo">
          <option value="">— Seleccione —</option>
          @for (m of modulos(); track m.id) {
            <option [value]="m.codigo">{{ m.codigo }} · {{ m.nombre }}</option>
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
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closePrgDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="savePrg()">{{ editPrgId ? 'Guardar' : 'Crear' }}</button>
      </ng-template>
    </p-dialog>

    <!-- ============ DIÁLOGO PERFIL ============ -->
    <p-dialog
      [(visible)]="showPerfDlg"
      [header]="editPerfId ? 'Editar perfil' : 'Nuevo perfil'"
      [modal]="true" [style]="{ width: '480px' }" [closable]="true"
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
        <label>Programa</label>
        <select class="select" [(ngModel)]="perfForm.prgCodigo">
          <option value="">— Seleccione —</option>
          @for (p of programas(); track p.id) {
            <option [value]="p.codigo">{{ p.codigo }} · {{ p.nombre }}</option>
          }
        </select>
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

  appForm = this.blankApp();
  modForm = this.blankMod();
  prgForm = this.blankPrg();
  perfForm = this.blankPerf();

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
  }

  // ============ LOADERS ============
  private _loadApp(): void {
    this.loadingApp.set(true); this.errorApp.set(null);
    this.api.listAplicaciones().subscribe({
      next: (d) => this.aplicaciones.set(d),
      error: (e) => this.errorApp.set(e.message),
      complete: () => this.loadingApp.set(false),
    });
  }
  private _loadMod(): void {
    this.loadingMod.set(true); this.errorMod.set(null);
    this.api.listModulos().subscribe({
      next: (d) => this.modulos.set(d),
      error: (e) => this.errorMod.set(e.message),
      complete: () => this.loadingMod.set(false),
    });
  }
  private _loadPrg(): void {
    this.loadingPrg.set(true); this.errorPrg.set(null);
    this.api.listProgramas().subscribe({
      next: (d) => this.programas.set(d),
      error: (e) => this.errorPrg.set(e.message),
      complete: () => this.loadingPrg.set(false),
    });
  }
  private _loadPerf(): void {
    this.loadingPerf.set(true); this.errorPerf.set(null);
    this.api.listPerfiles().subscribe({
      next: (d) => this.perfiles.set(d),
      error: (e) => this.errorPerf.set(e.message),
      complete: () => this.loadingPerf.set(false),
    });
  }

  // ============ FORMS BLANK ============
  blankApp() { return { codigo: '', nombre: '', descripcion: '', estado: 'ACTIVO' as Estado }; }
  blankMod() { return { codigo: '', nombre: '', descripcion: '', appCodigo: '', estado: 'ACTIVO' as Estado }; }
  blankPrg() { return { codigo: '', nombre: '', descripcion: '', modCodigo: '', estado: 'ACTIVO' as Estado }; }
  blankPerf() { return { codigo: '', nombre: '', descripcion: '', prgCodigo: '', estado: 'ACTIVO' as Estado }; }

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
    } catch (e: any) { this.toast.error('Error', e.message); }
  }
  confirmDeleteApp(a: Aplicacion): void {
    if (confirm(`¿Eliminar la aplicación "${a.nombre}"? Se eliminarán también sus módulos, programas y perfiles asociados.`)) {
      this.api.deleteAplicacion(a.id).subscribe({
        next: () => { this.toast.success('Aplicación eliminada'); this.events.emitDataChanged(); this._loadApp(); this._loadMod(); this._loadPrg(); this._loadPerf(); },
        error: (e) => this.toast.error('Error', e.message),
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
    } catch (e: any) { this.toast.error('Error', e.message); }
  }
  confirmDeleteMod(m: Modulo): void {
    if (confirm(`¿Eliminar el módulo "${m.nombre}"? Se eliminarán también sus programas y perfiles asociados.`)) {
      this.api.deleteModulo(m.id).subscribe({
        next: () => { this.toast.success('Módulo eliminado'); this.events.emitDataChanged(); this._loadMod(); this._loadPrg(); this._loadPerf(); },
        error: (e) => this.toast.error('Error', e.message),
      });
    }
  }

  // ============ PROGRAMA CRUD ============
  openPrgDialog(p?: Programa): void {
    if (p) { this.prgForm = { codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion, modCodigo: p.modCodigo, estado: p.estado }; this.editPrgId = p.id; }
    else { this.prgForm = this.blankPrg(); this.editPrgId = null; }
    this.showPrgDlg = true;
  }
  closePrgDialog(): void { this.showPrgDlg = false; this.editPrgId = null; }
  async savePrg(): Promise<void> {
    if (!this.prgForm.codigo || !this.prgForm.nombre || !this.prgForm.modCodigo) { this.toast.error('Faltan datos', 'Código, nombre y módulo son obligatorios.'); return; }
    try {
      if (this.editPrgId) { await this.api.updatePrograma(this.editPrgId, this.prgForm).toPromise(); this.toast.success('Programa actualizado'); }
      else { await this.api.createPrograma(this.prgForm).toPromise(); this.toast.success('Programa creado'); }
      this.events.emitDataChanged(); this.closePrgDialog(); this._loadPrg();
    } catch (e: any) { this.toast.error('Error', e.message); }
  }
  confirmDeletePrg(p: Programa): void {
    if (confirm(`¿Eliminar el programa "${p.nombre}"? Se eliminarán también sus perfiles asociados.`)) {
      this.api.deletePrograma(p.id).subscribe({
        next: () => { this.toast.success('Programa eliminado'); this.events.emitDataChanged(); this._loadPrg(); this._loadPerf(); },
        error: (e) => this.toast.error('Error', e.message),
      });
    }
  }

  // ============ PERFIL CRUD ============
  openPerfDialog(p?: Perfil): void {
    if (p) { this.perfForm = { codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion, prgCodigo: p.prgCodigo, estado: p.estado }; this.editPerfId = p.id; }
    else { this.perfForm = this.blankPerf(); this.editPerfId = null; }
    this.showPerfDlg = true;
  }
  closePerfDialog(): void { this.showPerfDlg = false; this.editPerfId = null; }
  async savePerf(): Promise<void> {
    if (!this.perfForm.codigo || !this.perfForm.nombre || !this.perfForm.prgCodigo) { this.toast.error('Faltan datos', 'Código, nombre y programa son obligatorios.'); return; }
    try {
      if (this.editPerfId) { await this.api.updatePerfil(this.editPerfId, this.perfForm).toPromise(); this.toast.success('Perfil actualizado'); }
      else { await this.api.createPerfil(this.perfForm).toPromise(); this.toast.success('Perfil creado'); }
      this.events.emitDataChanged(); this.closePerfDialog(); this._loadPerf();
    } catch (e: any) { this.toast.error('Error', e.message); }
  }
  confirmDeletePerf(p: Perfil): void {
    if (confirm(`¿Eliminar el perfil "${p.nombre}"?`)) {
      this.api.deletePerfil(p.id).subscribe({
        next: () => { this.toast.success('Perfil eliminado'); this.events.emitDataChanged(); this._loadPerf(); },
        error: (e) => this.toast.error('Error', e.message),
      });
    }
  }
}