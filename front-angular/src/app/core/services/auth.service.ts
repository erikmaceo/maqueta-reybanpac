import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, tokenStore } from './api.service';
import type { User } from '../../shared/models/types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  user = signal<User | null>(null);
  loading = signal(true);

  isAdmin = computed(() => !!this.user()?.isAdmin);

  constructor() {
    this.checkAuth();
  }

  private checkAuth(): void {
    const token = tokenStore.get();
    if (!token) {
      this.loading.set(false);
      return;
    }
    this.api.me().subscribe({
      next: (user) => this.user.set(user),
      error: () => tokenStore.clear(),
      complete: () => this.loading.set(false),
    });
  }

  login(username: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.login(username, password).subscribe({
        next: ({ token, user }) => {
          tokenStore.set(token);
          this.user.set(user);
          resolve();
        },
        error: (err) => reject(err),
      });
    });
  }

  logout(): void {
    this.api.logout().subscribe({
      error: () => {},
      complete: () => {},
    });
    tokenStore.clear();
    this.user.set(null);
    this.router.navigate(['/login']);
  }
}
