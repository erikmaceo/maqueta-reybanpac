import { Injectable } from '@angular/core';

const EVENT = 'cam:data-changed';

@Injectable({ providedIn: 'root' })
export class EventsService {
  emitDataChanged(): void {
    window.dispatchEvent(new CustomEvent(EVENT));
  }

  onDataChanged(handler: () => void): () => void {
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  relativeTime(iso: string | null): string {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.round(diff / 60000);
    if (m < 1) return 'hace un momento';
    if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24);
    return `hace ${d} d`;
  }
}
