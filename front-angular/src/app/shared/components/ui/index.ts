import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessLevel, Environment, RequestStatus, UserSource, UserType } from '../../models/types';
import { IconAlertComponent, IconRefreshComponent, IconSearchComponent } from '../icons';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="'badge ' + badgeClass">
      <span class="dot"></span>
      {{ label }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input() status!: RequestStatus;

  get badgeClass(): string {
    const map: Record<RequestStatus, string> = {
      PENDING: 'badge-amber',
      APPROVED: 'badge-green',
      REJECTED: 'badge-red',
    };
    return map[this.status];
  }

  get label(): string {
    const map: Record<RequestStatus, string> = {
      PENDING: 'Pendiente',
      APPROVED: 'Aprobada',
      REJECTED: 'Rechazada',
    };
    return map[this.status];
  }
}

@Component({
  selector: 'app-level-pill',
  standalone: true,
  imports: [CommonModule],
  template: `<span [class]="'level-pill level-' + level">{{ labels[level] }}</span>`,
})
export class LevelPillComponent {
  @Input() level!: AccessLevel;
  labels: Record<AccessLevel, string> = { VIEW: 'View', EDIT: 'Edit', ADMIN: 'Admin' };
}

@Component({
  selector: 'app-env-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span [class]="'badge ' + badgeClass">{{ env }}</span>`,
})
export class EnvBadgeComponent {
  @Input() env!: Environment;

  get badgeClass(): string {
    const map: Record<Environment, string> = {
      PROD: 'badge-red',
      PRE: 'badge-amber',
      QAS: 'badge-violet',
      DEV: 'badge-blue',
    };
    return map[this.env];
  }
}

@Component({
  selector: 'app-type-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="type === 'ADMIN' ? 'badge badge-blue' : 'badge badge-gray'">
      {{ type === 'ADMIN' ? 'Administrador' : 'Cliente final' }}
    </span>
  `,
})
export class TypeBadgeComponent {
  @Input() type!: UserType;
}

@Component({
  selector: 'app-source-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="source === 'LDAP' ? 'badge badge-gold' : 'badge badge-green'">
      {{ source === 'LDAP' ? 'LDAP' : 'Local' }}
    </span>
  `,
})
export class SourceBadgeComponent {
  @Input() source!: UserSource;
}

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="'avatar' + (size ? ' ' + size : '') + (ldap ? ' ldap' : '')">
      {{ initials }}
    </span>
  `,
})
export class AvatarComponent {
  @Input() first = '';
  @Input() last = '';
  @Input() size: 'sm' | 'lg' | '' = '';
  @Input() ldap = false;

  get initials(): string {
    return `${this.first?.[0] || ''}${this.last?.[0] || ''}`.toUpperCase();
  }
}

@Component({
  selector: 'app-system-tile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="icon-tile" [style.background]="color">
      {{ code.slice(0, 2).toUpperCase() }}
    </span>
  `,
})
export class SystemTileComponent {
  @Input() code = '';
  @Input() color = '#2563eb';
}

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty">
      <div class="empty-icon">
        <ng-content select="[icon]"></ng-content>
      </div>
      <h4>{{ title }}</h4>
      <p class="muted small" *ngIf="hint">{{ hint }}</p>
      <div class="mt-4" *ngIf="showAction">
        <ng-content select="[action]"></ng-content>
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title = '';
  @Input() hint = '';
  @Input() showAction = false;
}

@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-body">
        @for (r of rowArray; track r) {
          <div class="row gap-4" style="padding: 10px 0">
            @for (c of colArray; track c) {
              <div
                class="skeleton"
                [style.height.px]="14"
                [style.flex]="c === 0 ? 2 : 1"
              ></div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class TableSkeletonComponent {
  @Input() rows = 5;
  @Input() cols = 4;

  get rowArray(): number[] {
    return Array(this.rows).fill(0).map((_, i) => i);
  }

  get colArray(): number[] {
    return Array(this.cols).fill(0).map((_, i) => i);
  }
}

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule, IconAlertComponent, IconRefreshComponent],
  template: `
    <div class="card">
      <div class="empty">
        <div class="empty-icon">
          <app-icon-alert />
        </div>
        <h4>No se pudieron cargar los datos</h4>
        <p class="muted small">{{ message || 'Ocurrió un error al consultar el servidor. Inténtelo de nuevo.' }}</p>
        <div class="mt-4">
          <button class="btn btn-primary" (click)="onRetry()">
            <app-icon-refresh [width]="16" [height]="16" /> Reintentar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ErrorStateComponent {
  @Input() message?: string;
  @Input() onRetry: () => void = () => {};
}

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [CommonModule, IconSearchComponent],
  template: `
    <div class="search">
      <app-icon-search />
      <input
        [value]="value"
        (input)="onInput($event)"
        [placeholder]="placeholder"
        [attr.aria-label]="placeholder"
      />
    </div>
  `,
})
export class SearchBoxComponent {
  @Input() value = '';
  @Input() placeholder = 'Buscar…';
  @Output() valueChange = new EventEmitter<string>();

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}

@Component({
  selector: 'app-switch',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="switch">
      <input type="checkbox" [checked]="checked" (change)="onChange($event)" />
      <span class="track"></span>
      @if (label) {
        <span class="small" style="font-weight: 600">{{ label }}</span>
      }
    </label>
  `,
})
export class SwitchComponent {
  @Input() checked = false;
  @Input() label?: string;
  @Output() checkedChange = new EventEmitter<boolean>();

  onChange(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}

export const UI_COMPONENTS = [
  StatusBadgeComponent,
  LevelPillComponent,
  EnvBadgeComponent,
  TypeBadgeComponent,
  SourceBadgeComponent,
  AvatarComponent,
  SystemTileComponent,
  EmptyStateComponent,
  TableSkeletonComponent,
  ErrorStateComponent,
  SearchBoxComponent,
  SwitchComponent,
];
