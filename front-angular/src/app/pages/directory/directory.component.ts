import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

import { TableModule } from 'primeng/table';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EventsService } from '../../core/services/events.service';
import {
  TableSkeletonComponent,
  EmptyStateComponent,
  SearchBoxComponent,
  AvatarComponent,
} from '../../shared/components/ui';
import {
  IconLdapComponent,
  IconDownloadComponent,
  IconCheckComponent,
  IconUserPlusComponent,
} from '../../shared/components/icons';
import type { LdapPerson, Role } from '../../shared/models/types';

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
        TableModule,
    TableSkeletonComponent,
    EmptyStateComponent,
    SearchBoxComponent,
    AvatarComponent,
    IconLdapComponent,
    IconDownloadComponent,
    IconCheckComponent,
    IconUserPlusComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Directorio LDAP</h1>
        <p>Usuarios cliente final integrados desde el directorio corporativo. Importe un usuario para asignarle roles.</p>
      </div>
      <button class="btn btn-primary" (click)="loadLdapUsers()">
        <app-icon-download /> Sincronizar directorio
      </button>
    </div>

    <div class="card mb-4">
      <div class="card-body row gap-3">
        <app-icon-ldap [width]="32" [height]="32" style="color: var(--amber-600);" />
        <div>
          <b>Origen del directorio</b>
          <div class="small muted">
            Los usuarios cliente final se integran exclusivamente desde el directorio corporativo LDAP de Favorita Fruit Company.
          </div>
        </div>
        <div class="grow"></div>
        @if (ldapResponse()) {
          <span class="badge" [class.badge-green]="ldapResponse()!.source === 'LDAP'" [class.badge-amber]="ldapResponse()!.source === 'FALLBACK'">
            {{ ldapResponse()!.source === 'LDAP' ? 'LDAP conectado' : 'Modo offline' }}
          </span>
        }
      </div>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="6" [cols]="5" />
    } @else if (ldapError()) {
      <div class="card">
        <div class="empty">
          <div class="empty-icon"><app-icon-ldap /></div>
          <h4>No se pudo conectar al directorio</h4>
          <p class="muted small">{{ ldapError() }}</p>
          <div class="mt-4">
            <button class="btn btn-primary" (click)="loadLdapUsers()">
              <app-icon-download /> Reintentar
            </button>
          </div>
        </div>
      </div>
    } @else if (ldapResponse()?.people?.length === 0) {
      <div class="card">
        <div class="empty">
          <div class="empty-icon"><app-icon-ldap /></div>
          <h4>Sin usuarios en el directorio</h4>
          <p class="muted small">No se encontraron usuarios en el directorio LDAP.</p>
        </div>
      </div>
    } @else {
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Cargo</th>
              <th>Departamento</th>
              <th>DN</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (p of filteredLdapUsers(); track p.username) {
              <tr>
                <td>
                  <div class="row gap-3">
                    <app-avatar [first]="p.firstName" [last]="p.lastName" [ldap]="true" />
                    <div>
                      <div class="cell-strong">{{ p.firstName }} {{ p.lastName }}</div>
                      <div class="tiny dim mono">{{ p.username }}</div>
                    </div>
                  </div>
                </td>
                <td>{{ p.email }}</td>
                <td>{{ p.cargo || '—' }}</td>
                <td>{{ p.department || '—' }}</td>
                <td class="mono tiny dim">{{ p.dn }}</td>
                <td>
                  @if (p.imported) {
                    <span class="badge badge-green">
                      <app-icon-check [width]="12" [height]="12" /> Importado
                    </span>
                  } @else {
                    <button class="btn btn-primary btn-sm" (click)="openImport(p)">
                      <app-icon-user-plus [width]="14" [height]="14" /> Importar
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <p-dialog
      [(visible)]="showImportDialog"
      header="Importar usuario desde LDAP"
      [modal]="true"
      [style]="{ width: '560px' }"
      [closable]="true"
      (onHide)="closeImportDialog()"
    >
      @if (ldapPerson) {
        <div class="card pad mb-4" style="background: var(--surface-2);">
          <div class="row gap-3">
            <app-avatar [first]="ldapPerson.firstName" [last]="ldapPerson.lastName" [ldap]="true" size="lg" />
            <div>
              <b style="font-size: 16px;">{{ ldapPerson.firstName }} {{ ldapPerson.lastName }}</b>
              <div class="mono tiny dim">{{ ldapPerson.username }}</div>
              <div class="small muted">{{ ldapPerson.email }}</div>
            </div>
          </div>
        </div>

        <div class="field">
          <label>Asignar roles (opcional)</label>
          <div class="grid" style="gap: 8px; margin-top: 8px;">
            @for (r of roles(); track r.id) {
              <label class="check-card" [class.checked]="isRoleSelected(r.id)">
                <input
                  type="checkbox"
                  [checked]="isRoleSelected(r.id)"
                  (change)="toggleRole(r.id)"
                />
                <div class="grow">
                  <div class="cc-title">{{ r.name }}</div>
                  <div class="cc-desc">{{ r.description }}</div>
                </div>
              </label>
            }
          </div>
        </div>
      }
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeImportDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="importUser()">
          <app-icon-download /> Importar usuario
        </button>
      </ng-template>
    </p-dialog>
  `,
})
export class DirectoryComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private events = inject(EventsService);

  ldapResponse = signal<{ source: 'LDAP' | 'FALLBACK'; message: string; people: LdapPerson[] } | null>(null);
  ldapError = signal<string | null>(null);
  roles = signal<Role[]>([]);
  loading = signal(false);
  q = signal('');

  showImportDialog = false;
  ldapPerson: LdapPerson | null = null;
  selectedRoleIds: string[] = [];

  ngOnInit(): void {
    this.loadLdapUsers();
    this.loadRoles();
  }

  loadRoles(): void {
    this.api.listRoles().subscribe({
      next: (r) => this.roles.set(r),
      error: () => {},
    });
  }

  loadLdapUsers(): void {
    this.loading.set(true);
    this.ldapError.set(null);
    this.api.ldapUsers().subscribe({
      next: (res) => {
        this.ldapResponse.set(res);
        this.loading.set(false);
      },
      error: (e) => {
        this.ldapError.set(e.message);
        this.loading.set(false);
      },
    });
  }

  filteredLdapUsers(): LdapPerson[] {
    const query = this.q().toLowerCase();
    if (!query) return this.ldapResponse()?.people || [];
    return (this.ldapResponse()?.people || []).filter(
      (p) => `${p.firstName} ${p.lastName} ${p.username} ${p.email} ${p.department}`.toLowerCase().includes(query)
    );
  }

  openImport(p: LdapPerson): void {
    this.ldapPerson = p;
    this.selectedRoleIds = [];
    this.showImportDialog = true;
  }

  closeImportDialog(): void {
    this.showImportDialog = false;
    this.ldapPerson = null;
  }

  isRoleSelected(roleId: string): boolean {
    return this.selectedRoleIds.includes(roleId);
  }

  toggleRole(roleId: string): void {
    const idx = this.selectedRoleIds.indexOf(roleId);
    if (idx >= 0) {
      this.selectedRoleIds = this.selectedRoleIds.filter((id) => id !== roleId);
    } else {
      this.selectedRoleIds = [...this.selectedRoleIds, roleId];
    }
  }

  importUser(): void {
    if (!this.ldapPerson) return;
    this.api.importLdap(this.ldapPerson.username, this.selectedRoleIds).subscribe({
      next: () => {
        this.toast.success('Usuario importado', `${this.ldapPerson!.firstName} ${this.ldapPerson!.lastName} fue agregado a la consola.`);
        this.events.emitDataChanged();
        this.closeImportDialog();
        this.loadLdapUsers();
      },
      error: (e) => {
        this.toast.error('Error al importar', e.message);
      },
    });
  }
}
