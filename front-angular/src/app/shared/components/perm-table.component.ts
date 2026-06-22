import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LevelPillComponent, EmptyStateComponent } from './ui';
import { IconKeyComponent } from './icons';
import type { Permission } from '../models/types';

@Component({
  selector: 'app-perm-table',
  standalone: true,
  imports: [CommonModule, LevelPillComponent, EmptyStateComponent, IconKeyComponent],
  template: `
    @if (perms.length === 0) {
      <div class="empty">
        <div class="empty-icon"><app-icon-key /></div>
        <h4>Sin accesos definidos</h4>
        <p class="muted small">Agregue el primer acceso de este sistema.</p>
      </div>
    } @else {
      @for (cat of categories; track cat) {
        <div>
          <div class="group-label" style="color: var(--text-3); padding: 0 0 6px;">{{ cat }}</div>
          <div class="table-wrap card">
            <table class="data">
              <thead>
                <tr>
                  <th>Acceso</th>
                  <th>Código</th>
                  <th>Nivel</th>
                </tr>
              </thead>
              <tbody>
                @for (p of permsByCategory(cat); track p.id) {
                  <tr>
                    <td>
                      <div class="cell-strong">{{ p.name }}</div>
                      <div class="tiny dim">{{ p.description }}</div>
                    </td>
                    <td class="mono tiny dim">{{ p.code }}</td>
                    <td><app-level-pill [level]="p.level" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    }
  `,
})
export class PermTableComponent {
  @Input() perms: Permission[] = [];

  get categories(): string[] {
    return [...new Set(this.perms.map(p => p.category))];
  }

  permsByCategory(cat: string): Permission[] {
    return this.perms.filter(p => p.category === cat);
  }
}
