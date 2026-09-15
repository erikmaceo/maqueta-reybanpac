import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SeguridadDraftService {
  private pending: unknown = null;

  save(draft: unknown): void {
    this.pending = draft;
  }

  consume(): unknown {
    const draft = this.pending;
    this.pending = null;
    return draft;
  }
}