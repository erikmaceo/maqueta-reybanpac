import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  msg?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  toasts = signal<Toast[]>([]);

  private show(kind: ToastKind, title: string, msg?: string): void {
    const id = ++this.counter;
    this.toasts.update((t) => [...t, { id, kind, title, msg }]);
    setTimeout(() => this.remove(id), 4200);
  }

  remove(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }

  success(title: string, msg?: string): void {
    this.show('success', title, msg);
  }

  error(title: string, msg?: string): void {
    this.show('error', title, msg);
  }

  info(title: string, msg?: string): void {
    this.show('info', title, msg);
  }
}