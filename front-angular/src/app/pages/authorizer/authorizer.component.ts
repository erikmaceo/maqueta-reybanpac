import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { EventsService } from '../../core/services/events.service';
import {
  TableSkeletonComponent,
  EmptyStateComponent,
  SearchBoxComponent,
  StatusBadgeComponent,
  AvatarComponent,
} from '../../shared/components/ui';
import {
  IconAuthorizerComponent,
  IconShieldComponent,
  IconPlusComponent,
  IconCheckComponent,
  IconCloseComponent,
  IconKeyComponent,
} from '../../shared/components/icons';
import type { AccessRequest, Role, SystemApp, User } from '../../shared/models/types';

@Component({
  selector: 'app-authorizer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TextareaModule,
    TableModule,
    TableSkeletonComponent,
    EmptyStateComponent,
    SearchBoxComponent,
    StatusBadgeComponent,
    AvatarComponent,
    IconAuthorizerComponent,
    IconShieldComponent,
    IconPlusComponent,
    IconCheckComponent,
    IconCloseComponent,
    IconKeyComponent,
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Módulo autorizador</h1>
        <p>Aprobación y rechazo de solicitudes de acceso. Los flujos pending requieren su autorización.</p>
      </div>
      <button class="btn btn-primary" (click)="showRequestDialog = true">
        <app-icon-plus /> Nueva Solicitud
      </button>
    </div>

    @if (loading()) {
      <app-table-skeleton [rows]="6" [cols]="5" />
    } @else {
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Solicitante</th>
              <th>Rol pedido</th>
              <th>Sistema</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (req of requests(); track req.id) {
              <tr>
                <td>
                  <div>{{ formatDate(req.createdAt) }}</div>
                  <div class="tiny dim">{{ formatDateTime(req.createdAt) }}</div>
                </td>
                <td>
                  <div class="row gap-2">
                    <app-avatar [first]="getUserFirst(req.userId)" [last]="getUserLast(req.userId)" size="sm" />
                    <div>
                      <div class="small">{{ getUserName(req.userId) }}</div>
                      <div class="tiny dim mono">{{ getUserUsername(req.userId) }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <b>{{ getRoleName(req.roleId) }}</b>
                  @if (getRole(req.roleId)?.isAdmin) {
                    <app-icon-shield [width]="12" [height]="12" style="margin-left: 4px;" />
                  }
                </td>
                <td>
                  @if (getSystemName(req.systemId)) {
                    <span class="badge badge-blue">{{ getSystemName(req.systemId) }}</span>
                  } @else {
                    <span class="muted small">Transversal</span>
                  }
                </td>
                <td><app-status-badge [status]="req.status" /></td>
                <td>
                  @if (req.status === 'PENDING') {
                    @if (canApprove(req)) {
                      <div class="row gap-2">
                        <button class="btn btn-success btn-sm" (click)="openApprove(req)">
                          <app-icon-check [width]="14" [height]="14" /> Aprobar
                        </button>
                        <button class="btn btn-danger btn-sm" (click)="openReject(req)">
                          <app-icon-close [width]="14" [height]="14" /> Rechazar
                        </button>
                      </div>
                    } @else {
                      <span class="muted small">No le corresponde</span>
                    }
                  } @else if (req.status === 'APPROVED') {
                    <span class="small muted">Decisión: {{ getDeciderName(req) }}</span>
                  } @else {
                    <span class="small muted">{{ req.decisionComment }}</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <p-dialog
      [(visible)]="showApproveDialog"
      header="Aprobar solicitud"
      [modal]="true"
      [style]="{ width: '480px' }"
      [closable]="true"
      (onHide)="closeApproveDialog()"
    >
      @if (selectedRequest) {
        <div class="banner banner-ok mb-4">
          <app-icon-shield />
          <div>
            Se otorgará el rol <b>{{ getRoleName(selectedRequest.roleId) }}</b> a <b>{{ getUserName(selectedRequest.userId) }}</b>.
          </div>
        </div>
        <div class="field">
          <label>Comentario (opcional)</label>
          <textarea class="input" [(ngModel)]="decisionComment" rows="3" placeholder="Agregue un comentario sobre la decisión…" maxlength="250"></textarea>
          <div class="muted small" style="margin-top:2px;">{{ (decisionComment || '').length }}/250 caracteres máximos.</div>
        </div>
      }
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeApproveDialog()">Cancelar</button>
        <button class="btn btn-success" (click)="approve()">
          <app-icon-check [width]="14" [height]="14" /> Confirmar aprobación
        </button>
      </ng-template>
    </p-dialog>

    <p-dialog
      [(visible)]="showRejectDialog"
      header="Rechazar solicitud"
      [modal]="true"
      [style]="{ width: '480px' }"
      [closable]="true"
      (onHide)="closeRejectDialog()"
    >
      @if (selectedRequest) {
        <div class="field">
          <label>Comentario</label>
          <textarea class="input" [(ngModel)]="decisionComment" rows="3" placeholder="¿Por qué se rechaza esta solicitud?" maxlength="250"></textarea>
          <div class="muted small" style="margin-top:2px;">{{ (decisionComment || '').length }}/250 caracteres máximos.</div>
        </div>
      }
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeRejectDialog()">Cancelar</button>
        <button class="btn btn-danger" (click)="reject()" [disabled]="!decisionComment.trim()">
          <app-icon-close [width]="14" [height]="14" /> Confirmar rechazo
        </button>
      </ng-template>
    </p-dialog>

    <p-dialog
      [(visible)]="showRequestDialog"
      header="Nueva solicitud"
      [modal]="true"
      [style]="{ width: '560px' }"
      [closable]="true"
      (onHide)="closeRequestDialog()"
    >
      <div class="field">
        <label>Usuario</label>
        <select class="select" [(ngModel)]="requestForm.userId">
          <option value="">Seleccione un usuario…</option>
          @for (u of users(); track u.id) {
            <option [value]="u.id">{{ u.firstName }} {{ u.lastName }} · {{ u.type === 'ADMIN' ? 'Admin' : 'Cliente final' }} ({{ u.source }})</option>
          }
        </select>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Sistema</label>
          <select class="select" [(ngModel)]="requestForm.systemId" (ngModelChange)="onSystemChange()">
            <option value="">Todos los sistemas</option>
            @for (s of systems(); track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Rol</label>
          <select class="select" [(ngModel)]="requestForm.roleId">
            <option value="">Seleccione un rol…</option>
            @for (r of availableRoles; track r.id) {
              <option [value]="r.id">{{ r.name }}{{ r.isAdmin ? ' (acceso completo)' : '' }}</option>
            }
          </select>
        </div>
      </div>
      @if (selectedRole) {
        <div class="banner banner-ok mb-4">
          <app-icon-shield />
          <div>
            Este rol será autorizado por <b>{{ getAuthorizerName(selectedRole.authorizerUserId) }}</b> · {{ selectedRole.permissionIds.length }} accesos.
          </div>
        </div>
        @if (selectedRole.isAdmin) {
          <div class="banner banner-warn mb-4">
            <app-icon-shield />
            <div><b>Atención:</b> este rol concede <b>acceso completo</b> a todos los sistemas de la consola.</div>
          </div>
        }
      }
      <div class="field">
        <label>Justificación</label>
        <textarea class="input" [(ngModel)]="requestForm.justification" rows="3" placeholder="¿Por qué este usuario necesita este rol?" maxlength="250"></textarea>
        <div class="muted small" style="margin-top:2px;">{{ (requestForm.justification || '').length }}/250 caracteres máximos.</div>
      </div>
      <ng-template pTemplate="footer">
        <button class="btn btn-ghost" (click)="closeRequestDialog()">Cancelar</button>
        <button class="btn btn-primary" (click)="createRequest()">
          <app-icon-key [width]="14" [height]="14" /> Enviar a Autorización
        </button>
      </ng-template>
    </p-dialog>
  `,
})
export class AuthorizerComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private events = inject(EventsService);

  requests = signal<AccessRequest[]>([]);
  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  systems = signal<SystemApp[]>([]);
  loading = signal(false);

  showApproveDialog = false;
  showRejectDialog = false;
  showRequestDialog = false;
  selectedRequest: AccessRequest | null = null;
  decisionComment = '';

  requestForm = { userId: '', roleId: '', systemId: '', justification: '' };

  ngOnInit(): void {
    this.loadData();
    this.events.onDataChanged(() => this.loadData());
  }

  loadData(): void {
    this.loading.set(true);
    Promise.all([
      this.api.listRequests().toPromise(),
      this.api.listUsers().toPromise(),
      this.api.listRoles().toPromise(),
      this.api.listSystems().toPromise(),
    ]).then(([reqs, u, r, s]) => {
      this.requests.set(reqs || []);
      this.users.set(u || []);
      this.roles.set(r || []);
      this.systems.set(s || []);
    }).finally(() => {
      this.loading.set(false);
    });
  }

  getUser(id: string): User | undefined {
    return this.users().find((u) => u.id === id);
  }

  getUserName(id: string): string {
    const u = this.getUser(id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  }

  getUserFirst(id: string): string {
    return this.getUser(id)?.firstName || '';
  }

  getUserLast(id: string): string {
    return this.getUser(id)?.lastName || '';
  }

  getUserUsername(id: string): string {
    return this.getUser(id)?.username || '';
  }

  getRole(id: string): Role | undefined {
    return this.roles().find((r) => r.id === id);
  }

  getRoleName(id: string): string {
    return this.getRole(id)?.name || id;
  }

  getSystemName(id: string | null): string {
    if (!id) return '';
    return this.systems().find((s) => s.id === id)?.name || '';
  }

  getAuthorizerName(userId: string | null): string {
    if (!userId) return 'un administrador global';
    const u = this.getUser(userId);
    return u ? `${u.firstName} ${u.lastName}` : 'un administrador global';
  }

  getDeciderName(req: AccessRequest): string {
    if (!req.decidedByUserId) return '';
    return this.getUserName(req.decidedByUserId);
  }

  canApprove(req: AccessRequest): boolean {
    const role = this.getRole(req.roleId);
    if (!role) return false;
    if (this.auth.isAdmin()) return true;
    return role.authorizerUserId === this.auth.user()?.id;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  get availableRoles(): Role[] {
    if (!this.requestForm.systemId) return this.roles();
    return this.roles().filter((r) => !r.systemId || r.systemId === this.requestForm.systemId);
  }

  get selectedRole(): Role | null {
    if (!this.requestForm.roleId) return null;
    return this.getRole(this.requestForm.roleId) || null;
  }

  onSystemChange(): void {
    this.requestForm.roleId = '';
  }

  openApprove(req: AccessRequest): void {
    this.selectedRequest = req;
    this.decisionComment = '';
    this.showApproveDialog = true;
  }

  closeApproveDialog(): void {
    this.showApproveDialog = false;
    this.selectedRequest = null;
  }

  openReject(req: AccessRequest): void {
    this.selectedRequest = req;
    this.decisionComment = '';
    this.showRejectDialog = true;
  }

  closeRejectDialog(): void {
    this.showRejectDialog = false;
    this.selectedRequest = null;
  }

  closeRequestDialog(): void {
    this.showRequestDialog = false;
    this.requestForm = { userId: '', roleId: '', systemId: '', justification: '' };
  }

  approve(): void {
    if (!this.selectedRequest) return;
    this.api.approveRequest(this.selectedRequest.id, this.decisionComment).subscribe({
      next: () => {
        this.toast.success('Solicitud aprobada', 'El acceso fue otorgado correctamente.');
        this.events.emitDataChanged();
        this.closeApproveDialog();
        this.loadData();
      },
      error: (e) => this.toast.error('Error', e.message),
    });
  }

  reject(): void {
    if (!this.selectedRequest || !this.decisionComment.trim()) return;
    this.api.rejectRequest(this.selectedRequest.id, this.decisionComment).subscribe({
      next: () => {
        this.toast.success('Solicitud rechazada');
        this.events.emitDataChanged();
        this.closeRejectDialog();
        this.loadData();
      },
      error: (e) => this.toast.error('Error', e.message),
    });
  }

  createRequest(): void {
    if (!this.requestForm.userId || !this.requestForm.roleId) {
      this.toast.error('Faltan datos', 'Seleccione usuario y rol.');
      return;
    }
    this.api.createRequest({
      userId: this.requestForm.userId,
      roleId: this.requestForm.roleId,
      justification: this.requestForm.justification,
    }).subscribe({
      next: () => {
        this.toast.success('Solicitud enviada', 'La asignación quedó pendiente de autorización.');
        this.events.emitDataChanged();
        this.closeRequestDialog();
        this.loadData();
      },
      error: (e) => this.toast.error('Error', e.message),
    });
  }
}
