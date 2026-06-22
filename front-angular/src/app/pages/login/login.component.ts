import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  IconShieldComponent,
  IconRolesComponent,
  IconLdapComponent,
  IconUserComponent,
  IconLockComponent,
} from '../../shared/components/icons';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconShieldComponent,
    IconRolesComponent,
    IconLdapComponent,
    IconUserComponent,
    IconLockComponent,
  ],
  template: `
    <div class="login-wrap">
      <aside class="login-aside">
        <div class="brand-lg" style="text-align: center">
          <img src="/logo-reybanpac.png" alt="Logo Reybanpac" style="width: 200px; height: auto;" />
          <div style="margin-top: 16px;">
            <div style="font-weight: 800; font-size: 24px;">Central Access Manager</div>
            <div style="color: var(--gold-500); font-size: 14px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase;">
              Favorita Fruit Company · Reybanpac
            </div>
          </div>
        </div>

        <div>
          <h2>Administración centralizada de accesos a sistemas mediante roles.</h2>
          <div class="feat">
            <app-icon-roles />
            <div>
              <b style="color: #fff;">Roles y accesos</b><br/>
              Defina roles y seleccione qué accesos otorgan en cada sistema.
            </div>
          </div>
          <div class="feat">
            <app-icon-shield />
            <div>
              <b style="color: #fff;">Módulo autorizador</b><br/>
              Flujo de aprobación para autorizar el acceso de los usuarios.
            </div>
          </div>
          <div class="feat">
            <app-icon-ldap />
            <div>
              <b style="color: #fff;">Integración LDAP</b><br/>
              Los clientes finales se integran exclusivamente desde el directorio.
            </div>
          </div>
        </div>

        <div style="color: #8aa6da; font-size: 12px;">
          © {{ currentYear }} Reybanpac · Maqueta de gobierno de identidades
        </div>
      </aside>

      <div class="login-form-side">
        <form class="login-card" (ngSubmit)="onSubmit()">
          <div class="lc-logo">
            <img src="/logo-reybanpac.png" alt="Logo Reybanpac" style="width: 80px; height: auto;" />
            <b>Central Access Manager</b>
          </div>
          <h1 style="font-size: 24px;">Iniciar sesión</h1>
          <p class="muted mt-2 mb-4">Acceda con su cuenta de administrador local.</p>

          <div class="field">
            <label>Usuario</label>
            <div class="search" style="padding: 0 12px;">
              <app-icon-user />
              <input
                style="width: 100%;"
                [(ngModel)]="username"
                name="username"
                placeholder="usuario"
                autofocus
              />
            </div>
          </div>

          <div class="field">
            <label>Contraseña</label>
            <div class="search" style="padding: 0 12px;">
              <app-icon-lock />
              <input
                style="width: 100%;"
                type="password"
                [(ngModel)]="password"
                name="password"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            class="btn btn-primary"
            style="width: 100%; margin-top: 8px; padding: 11px;"
            type="submit"
            [disabled]="busy()"
          >
            {{ busy() ? 'Ingresando…' : 'Ingresar' }}
          </button>

          <div class="hint-box mt-4">
            <b>Maqueta:</b> use <span class="mono">ctudela</span> / <span class="mono">admin123</span> (Administrador Global).
          </div>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  username = 'ctudela';
  password = 'admin123';
  busy = signal(false);
  currentYear = new Date().getFullYear();

  onSubmit(): void {
    if (this.busy()) return;
    this.busy.set(true);

    this.auth.login(this.username, this.password).then(() => {
      this.toast.success('Bienvenido', 'Sesión iniciada correctamente.');
      this.router.navigate(['/']);
    }).catch((err) => {
      this.toast.error('No se pudo iniciar sesión', err.message || 'Error desconocido');
    }).finally(() => {
      this.busy.set(false);
    });
  }
}
