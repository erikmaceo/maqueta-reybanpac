import { Component, inject, OnInit, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import {
  TableSkeletonComponent,
  ErrorStateComponent,
  EmptyStateComponent,
  StatusBadgeComponent,
  EnvBadgeComponent,
  LevelPillComponent,
  SystemTileComponent,
} from '../../shared/components/ui';
import { PermTableComponent } from '../../shared/components/perm-table.component';
import {
  IconPlusComponent,
  IconSystemsComponent,
  IconTrashComponent,
  IconEditComponent,
  IconKeyComponent,
  IconRolesComponent,
  IconCloseComponent,
} from '../../shared/components/icons';
import type { SystemApp, Permission, Role, Environment } from '../../shared/models/types';

const COLORS = ['#2563eb', '#7c3aed', '#0d9488', '#d97706', '#dc2626', '#0891b2', '#db2777'];

interface SystemForm {
  code: string;
  name: string;
  description: string;
  environment: Environment;
  ownerName: string;
  color: string;
}

@Component({
  selector: 'app-systems',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
        TableModule,
    ConfirmDialogModule,
    TableSkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    EnvBadgeComponent,
    LevelPillComponent,
    SystemTileComponent,
    PermTableComponent,
    IconPlusComponent,
    IconSystemsComponent,
    IconTrashComponent,
    IconEditComponent,
    IconKeyComponent,
    IconRolesComponent,
    IconCloseComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Sistemas y aplicativos</h1>
        <p>Cada sistema expone un catálogo de accesos que luego se agrupan en roles para autorizar usuarios.</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">
        <app-icon-plus /> Nuevo Sistema
      </button>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="6" [cols]="3" />
    } @else if (error()) {
      <app-error-state [message]="error()!" [onRetry]="load" />
    } @else if (systems().length === 0) {
      <div class="card">
        <div class="empty">
          <div class="empty-icon"><app-icon-systems /></div>
          <h4>Aún no hay sistemas</h4>
          <p class="muted small">Cree el primer sistema gobernado por la consola.</p>
          <div class="mt-4">
            <button class="btn btn-primary" (click)="openCreate()">
              <app-icon-plus /> Nuevo Sistema
            </button>
          </div>
        </div>
      </div>
    } @else {
      <div class="grid cols-3">
        @for (s of systems(); track s.id) {
          <div class="card pad" style="display: flex; flex-direction: column; gap: 12px;">
            <div class="row between">
              <app-system-tile [code]="s.code" [color]="s.color" />
              <app-env-badge [env]="s.environment" />
            </div>
            <div>
              <h3 style="font-size: 16px;">{{ s.name }}</h3>
              <div class="mono tiny dim">{{ s.code }}</div>
            </div>
            <p class="muted small" style="flex: 1; margin: 0;">{{ s.description }}</p>
            <div class="row gap-3 small muted">
              <span class="row gap-2">
                <app-icon-key [width]="14" [height]="14" /> {{ permsOf(s.id).length }} accesos
              </span>
              <span class="row gap-2">
                <app-icon-roles [width]="14" [height]="14" /> {{ rolesOf(s.id).length }} roles
              </span>
            </div>
            <div class="tiny dim">Dueño: {{ s.ownerName || '—' }}</div>
            <div class="divider" style="margin: 4px 0;"></div>
            <div class="row gap-2">
              <button class="btn btn-ghost btn-sm grow" (click)="openDetail(s)">
                <app-icon-key [width]="14" [height]="14" /> Accesos
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" title="Editar" (click)="openEdit(s)">
                <app-icon-edit [width]="15" [height]="15" />
              </button>
              <button class="btn btn-danger btn-sm btn-icon" title="Eliminar" (click)="confirmDelete(s)">
                <app-icon-trash [width]="15" [height]="15" />
              </button>
            </div>
          </div>
        }
      </div>
    }

    <p-dialog
      [(visible)]="showFormDialog"
      [header]="editId ? 'Editar Sistema' : 'Nuevo Sistema'"
      [modal]="true"
      [style]="{ width: '560px' }"
      [closable]="true"
      (onHide)="closeFormDialog()"
    >
      <div class="form-grid">
        <div class="field">
          <label>Código</label>
          <input class="input" [(ngModel)]="formData.code" placeholder="KS8" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input class="input" [(ngModel)]="formData.name" placeholder="Kubernetes KS8" />
        </div>
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea class="input" [(ngModel)]="formData.description" rows="2" maxlength="250"></textarea>
        <div class="muted small" style="margin-top:2px;">{{ (formData.description || '').length }}/250 caracteres máximos.</div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Entorno</label>
          <select class="select" [(ngModel)]="formData.environment">
            <option value="DEV">DEV</option>
            <option value="QAS">QAS</option>
            <option value="PRE">PRE</option>
            <option value="PROD">PROD</option>
          </select>
        </div>
        <div class="field">
          <label>Dueño / responsable</label>
          <input class="input" [(ngModel)]="formData.ownerName" />
        </div>
      </div>
      <div class="field">
        <label>Color</label>
        <div class="row gap-2">
          @for (c of colors; track c) {
            <button
              type="button"
              [style.width.px]="28"
              [style.height.px]="28"
              [style.borderRadius.px]="8"
              [style.background]="c"
              [style.border]="formData.color === c ? '3px solid var(--navy-800)' : '2px solid #fff'"
              [style.boxShadow]="'var(--shadow-sm)'"
              (click)="formData.color = c"
            ></button>
          }
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeFormDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="save()">
          {{ editId ? 'Guardar Cambios' : 'Crear sistema' }}
        </button>
      </ng-template>
    </p-dialog>

    <p-dialog
      [(visible)]="showDetailDialog"
      [header]="'Accesos · ' + (detailSystem?.name || '')"
      [modal]="true"
      [style]="{ width: '820px' }"
      [closable]="true"
      (onHide)="closeDetailDialog()"
    >
      @if (showPermForm) {
        <div class="card pad mb-4" style="background: var(--surface-2);">
          <b class="small">Agregar acceso a {{ detailSystem?.code }}</b>
          <div class="form-grid mt-3">
            <div class="field">
              <label>Nombre</label>
              <input class="input" [(ngModel)]="permFormData.name" placeholder="Ver pods" />
            </div>
            <div class="field">
              <label>Categoría</label>
              <input class="input" [(ngModel)]="permFormData.category" />
            </div>
          </div>
          <div class="field">
            <label>Nivel</label>
            <select class="select" [(ngModel)]="permFormData.level">
              <option value="VIEW">VIEW · Lectura</option>
              <option value="EDIT">EDIT · Escritura</option>
              <option value="ADMIN">ADMIN · Total</option>
            </select>
          </div>
          <div class="field">
            <label>Descripción</label>
            <input class="input" [(ngModel)]="permFormData.description" />
          </div>
          <div class="row gap-2">
            <button class="btn btn-primary btn-sm" (click)="addPermission()">Agregar</button>
            <button class="btn btn-ghost btn-sm" (click)="showPermForm = false">Cancelar</button>
          </div>
        </div>
      }

      @if (detailSystem) {
        <app-perm-table [perms]="permsOf(detailSystem.id)" />
      }

      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeDetailDialog()">Cerrar</button>
        <button class="btn btn-primary" (click)="showPermForm = true">
          <app-icon-plus /> Nuevo Acceso
        </button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
})
export class SystemsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  systems = signal<SystemApp[]>([]);
  permissions = signal<Permission[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  showFormDialog = false;
  showDetailDialog = false;
  showPermForm = false;
  editId: string | null = null;
  detailSystem: SystemApp | null = null;

  formData: SystemForm = this.blankForm();
  permFormData = { name: '', level: 'VIEW' as const, category: 'General', description: '' };
  colors = COLORS;

  load = () => this.loadData();

  ngOnInit(): void {
    this.loadData();
    this.events.onDataChanged(() => this.loadData());
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    Promise.all([
      this.api.listSystems().toPromise(),
      this.api.listPermissions().toPromise(),
      this.api.listRoles().toPromise(),
    ]).then(([s, p, r]) => {
      this.systems.set(s || []);
      this.permissions.set(p || []);
      this.roles.set(r || []);
    }).catch((e) => {
      this.error.set(e.message);
    }).finally(() => {
      this.loading.set(false);
    });
  }

  blankForm(): SystemForm {
    return { code: '', name: '', description: '', environment: 'DEV', ownerName: '', color: COLORS[0] };
  }

  permsOf(systemId: string): Permission[] {
    return this.permissions().filter(p => p.systemId === systemId);
  }

  rolesOf(systemId: string): Role[] {
    return this.roles().filter(r => r.systemId === systemId);
  }

  openCreate(): void {
    this.formData = this.blankForm();
    this.editId = null;
    this.showFormDialog = true;
  }

  openEdit(s: SystemApp): void {
    this.formData = { code: s.code, name: s.name, description: s.description, environment: s.environment, ownerName: s.ownerName, color: s.color };
    this.editId = s.id;
    this.showFormDialog = true;
  }

  closeFormDialog(): void {
    this.showFormDialog = false;
    this.editId = null;
  }

  openDetail(s: SystemApp): void {
    this.detailSystem = s;
    this.showPermForm = false;
    this.showDetailDialog = true;
  }

  closeDetailDialog(): void {
    this.showDetailDialog = false;
    this.detailSystem = null;
  }

  async save(): Promise<void> {
    if (!this.formData.code || !this.formData.name) {
      this.toast.error('Faltan datos', 'Código y nombre son obligatorios.');
      return;
    }
    try {
      if (this.editId) {
        await this.api.updateSystem(this.editId, this.formData).toPromise();
        this.toast.success('Sistema actualizado');
      } else {
        await this.api.createSystem(this.formData).toPromise();
        this.toast.success('Sistema creado', `${this.formData.name} fue agregado.`);
      }
      this.events.emitDataChanged();
      this.closeFormDialog();
      this.loadData();
    } catch (e: any) {
      this.toast.error('Error', e.message);
    }
  }

  async addPermission(): Promise<void> {
    if (!this.detailSystem || !this.permFormData.name) {
      this.toast.error('Falta el nombre del acceso');
      return;
    }
    try {
      await this.api.createPermission({ ...this.permFormData, systemId: this.detailSystem.id }).toPromise();
      this.toast.success('Acceso agregado', `"${this.permFormData.name}" añadido a ${this.detailSystem.code}.`);
      this.showPermForm = false;
      this.permFormData = { name: '', level: 'VIEW', category: 'General', description: '' };
      this.loadData();
    } catch (e: any) {
      this.toast.error('Error', e.message);
    }
  }

  confirmDelete(s: SystemApp): void {
    if (confirm(`¿Eliminar "${s.name}"? Se eliminarán también sus accesos y roles asociados.`)) {
      this.remove(s);
    }
  }

  async remove(s: SystemApp): Promise<void> {
    try {
      await this.api.deleteSystem(s.id).toPromise();
      this.toast.success('Sistema eliminado');
      this.events.emitDataChanged();
      this.loadData();
    } catch (e: any) {
      this.toast.error('Error', e.message);
    }
  }
}
