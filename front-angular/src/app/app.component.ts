import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ToastService } from './core/services/toast.service';
import { CommonModule } from '@angular/common';
import {
  IconCheckComponent,
  IconAlertComponent,
  IconInfoComponent,
  IconCloseComponent,
} from './shared/components/icons';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    IconCheckComponent,
    IconAlertComponent,
    IconInfoComponent,
    IconCloseComponent,
  ],
  template: `
    @if (auth.loading()) {
      <div style="display: grid; place-items: center; height: 100vh;">
        <div class="row gap-3 muted">
          <div class="skeleton" style="width: 40px; height: 40px; border-radius: 12px;"></div>
          Cargando consola…
        </div>
      </div>
    }
    <router-outlet></router-outlet>

    <div class="toast-wrap">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="t.kind">
          <span [style.color]="t.kind === 'success' ? 'var(--green-600)' : t.kind === 'error' ? 'var(--red-700)' : 'var(--navy-600)'">
            @if (t.kind === 'success') {
              <app-icon-check [width]="20" [height]="20" />
            } @else if (t.kind === 'error') {
              <app-icon-alert [width]="20" [height]="20" />
            } @else {
              <app-icon-info [width]="20" [height]="20" />
            }
          </span>
          <div class="grow">
            <div class="t-title">{{ t.title }}</div>
            @if (t.msg) {
              <div class="t-msg">{{ t.msg }}</div>
            }
          </div>
          <button class="x-btn" (click)="toast.remove(t.id)">
            <app-icon-close [width]="14" [height]="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  toast = inject(ToastService);
}