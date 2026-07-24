import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DragDropModule, moveItemInArray, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { IconChevronRightComponent, IconServerComponent, IconSettingsComponent } from '../../shared/components/icons';
import type { Aplicacion, Modulo, Programa, Control } from '../../shared/models/types';

@Component({
  selector: 'app-soluciones',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, IconChevronRightComponent, IconServerComponent, IconSettingsComponent],
  template: `
    @if (app()) {
      <!-- ============ VISTA ORDENAMIENTO ============ -->
      <div class="page-head">
        <div>
          <h1>{{ app()!.nombre }}</h1>
          <p>{{ app()!.descripcion || 'Aplicación sin descripción' }}</p>
        </div>
        <div class="row gap-2">
          <span class="badge" [class.badge-green]="app()!.estado === 'ACTIVO'" [class.badge-gray]="app()!.estado !== 'ACTIVO'">
            {{ app()!.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
      </div>

      <div class="breadcrumb">
        <button class="btn btn-ghost btn-sm" (click)="goBack()">‹ Volver a Ordenar Soluciones</button>
      </div>

      <!-- MÓDULOS -->
      <div class="section-title">
        <app-icon-server [width]="16" [height]="16" />
        Módulos <span class="muted">({{ modulos().length }})</span>
      </div>

      @if (loadingMods()) {
        <div class="skeleton-row"></div>
      } @else if (modulos().length === 0) {
        <div class="empty-hint">No hay módulos registrados para esta aplicación.</div>
      } @else {
        <div class="modules-list" cdkDropList (cdkDropListDropped)="dropModulo($event)">
          @for (mod of modulos(); track mod.id) {
            <div class="hierarchy-card" cdkDrag cdkDragLockAxis="y">
              <div class="drag-handle" [class.hidden]="expandedMods().has(mod.id)" title="Arrastrar para reordenar" (click)="$event.stopPropagation()"></div>
              <div class="hierarchy-header mod-header" (click)="toggleMod(mod.id)">
                <div class="hierarchy-left">
                  <app-icon-chevron-right [width]="14" [height]="14" [class.rotated]="expandedMods().has(mod.id)" />
                  <app-icon-server [width]="15" [height]="15" />
                  <div>
                    <div class="cell-strong">{{ mod.nombre }}</div>
                    <div class="tiny dim">{{ mod.codigo }} · {{ mod.descripcion || 'Sin descripción' }}</div>
                  </div>
                </div>
              </div>

              @if (expandedMods().has(mod.id)) {
                <!-- PROGRAMAS -->
                <div class="hierarchy-children">
                  <div class="child-label">Programas <span class="muted">({{ getProgramas(mod.codigo).length }})</span></div>
                  @if (loadingPrgs()) {
                    <div class="skeleton-row"></div>
                  } @else if (getProgramas(mod.codigo).length === 0) {
                    <div class="empty-hint child">No hay programas en este módulo.</div>
                  } @else {
                    <div class="programs-list"
                         cdkDropList
                         [cdkDropListData]="getProgramas(mod.codigo)"
                         (cdkDropListDropped)="dropPrograma($event, mod.codigo)">
                      @for (prg of getProgramas(mod.codigo); track prg.id) {
                        <div class="hierarchy-header prg-header" cdkDrag cdkDragLockAxis="y" (click)="togglePrg(prg.id)">
                          <div class="drag-handle small" [class.hidden]="expandedPrgs().has(prg.id)" title="Arrastrar para reordenar" (click)="$event.stopPropagation()"></div>
                          <div class="hierarchy-left">
                            <app-icon-chevron-right [width]="14" [height]="14" [class.rotated]="expandedPrgs().has(prg.id)" />
                            <div>
                              <div class="cell-strong">{{ prg.nombre }}</div>
                              <div class="tiny dim">{{ prg.codigo }} · {{ prg.descripcion || 'Sin descripción' }}</div>
                            </div>
                          </div>
                        </div>

                        @if (expandedPrgs().has(prg.id)) {
                          <!-- CONTROLES -->
                          <div class="hierarchy-children">
                            <div class="child-label">Controles <span class="muted">({{ getControles(prg.codigo).length }})</span></div>
                            @if (loadingCtrls()) {
                              <div class="skeleton-row"></div>
                            } @else if (getControles(prg.codigo).length === 0) {
                              <div class="empty-hint child">No hay controles en este programa.</div>
                            } @else {
                              <div class="controls-list"
                                   cdkDropList
                                   [cdkDropListData]="getControles(prg.codigo)"
                                   (cdkDropListDropped)="dropControl($event, prg.codigo)">
                                @for (ctrl of getControles(prg.codigo); track ctrl.id) {
                                  <div class="hierarchy-header ctrl-header" cdkDrag cdkDragLockAxis="y">
                                    <div class="drag-handle small" title="Arrastrar para reordenar" (click)="$event.stopPropagation()"></div>
                                    <div class="hierarchy-left">
                                      <app-icon-settings [width]="14" [height]="14" />
                                      <div>
                                        <div class="cell-strong">{{ ctrl.codigo }} · {{ ctrl.descripcion }}</div>
                                        <div class="tiny dim">{{ ctrl.tipoControl }} · {{ ctrl.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}</div>
                                      </div>
                                    </div>
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        }
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      <div class="actions-footer">
        <button class="btn btn-ghost" (click)="goBack()">Volver</button>
        <button class="btn btn-primary" (click)="saveOrder()">Actualizar Orden</button>
      </div>
    } @else {
      <!-- ============ VISTA TABLA ============ -->
      <div class="page-head">
        <div>
          <h1>Ordenar Soluciones</h1>
          <p>Seleccione una aplicación para ordenar su jerarquía de seguridades.</p>
        </div>
      </div>

      @if (loading()) {
        <div class="skeleton-row"></div>
      } @else {
        <div class="card table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (a of paginatedApps(); track a.id) {
                <tr>
                  <td class="mono">{{ a.codigo }}</td>
                  <td><div class="cell-strong">{{ a.nombre }}</div></td>
                  <td class="muted small">{{ a.descripcion || '—' }}</td>
                  <td>
                    <span class="badge" [class.badge-green]="a.estado === 'ACTIVO'" [class.badge-gray]="a.estado !== 'ACTIVO'">
                      {{ a.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-primary btn-sm" (click)="goToOrder(a)">Ordenar</button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="muted center" style="padding: 24px;">Sin aplicaciones registradas.</td></tr>
              }
            </tbody>
          </table>
        </div>

        @if (apps().length > 0) {
          <div class="pagination">
            <div class="page-controls">
              <button class="btn btn-ghost btn-sm" [disabled]="page() === 0" (click)="setPage(page() - 1)">Anterior</button>
            </div>
            <span>Página {{ page() + 1 }} de {{ totalPages() }} ({{ apps().length }} registros)</span>
            <div class="page-size-selector">
              <label class="small muted">Registros por página</label>
              <select class="select" style="width: auto; min-width: 60px;" [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)">
                <option [value]="5">5</option>
                <option [value]="10">10</option>
                <option [value]="15">15</option>
                <option [value]="20">20</option>
              </select>
              <button class="btn btn-ghost btn-sm" [disabled]="page() === totalPages() - 1" (click)="setPage(page() + 1)">Siguiente</button>
            </div>
          </div>
        }
      }
    }
  `,
  styles: [`
    .breadcrumb {
      margin-bottom: 16px;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-2);
      text-transform: uppercase;
      letter-spacing: .04em;
      margin-bottom: 10px;
      margin-top: 20px;
    }
    .modules-list {
      display: block;
    }
    .hierarchy-card {
      display: block;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 6px;
      overflow: hidden;
      position: relative;
    }
    .hierarchy-card:last-child {
      margin-bottom: 0;
    }
    .hierarchy-card.cdk-drag-preview {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      opacity: 0.95;
      margin-bottom: 0;
    }
    .hierarchy-card.cdk-drag-placeholder {
      opacity: 0.35;
      border-style: dashed;
      margin-bottom: 6px;
    }
    .hierarchy-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      transition: background .15s;
    }
    .hierarchy-header:hover {
      background: var(--surface-2);
    }
    .hierarchy-left {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-left: 18px;
    }
    .hierarchy-left app-icon-chevron-right {
      transition: transform .2s;
      color: var(--text-3);
      flex-shrink: 0;
    }
    .hierarchy-left app-icon-chevron-right.rotated {
      transform: rotate(90deg);
    }
    .hierarchy-children {
      background: var(--surface-2);
      border-top: 1px solid var(--border);
      padding: 10px 16px;
    }
    .child-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-3);
      text-transform: uppercase;
      letter-spacing: .04em;
      margin-bottom: 8px;
    }
    .programs-list {
      display: block;
      min-height: 8px;
    }
    .prg-header {
      display: block;
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 4px;
      background: var(--surface);
      position: relative;
    }
    .prg-header:last-child {
      margin-bottom: 0;
    }
    .prg-header.cdk-drag-preview {
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
      margin-bottom: 0;
    }
    .prg-header.cdk-drag-placeholder {
      opacity: 0.35;
      border-style: dashed;
      background: transparent;
      margin-bottom: 4px;
    }
    .controls-list {
      display: block;
      min-height: 8px;
    }
    .ctrl-header {
      display: block;
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 4px;
      background: #fafafa;
      position: relative;
      cursor: default;
    }
    .ctrl-header:last-child {
      margin-bottom: 0;
    }
    .ctrl-header.cdk-drag-preview {
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      margin-bottom: 0;
    }
    .ctrl-header.cdk-drag-placeholder {
      opacity: 0.35;
      border-style: dashed;
      background: transparent;
      margin-bottom: 4px;
    }
    .empty-hint {
      padding: 10px 0;
      font-size: 13px;
      color: var(--text-3);
      font-style: italic;
    }
    .empty-hint.child {
      padding-left: 20px;
    }
    .skeleton-row {
      height: 40px;
      background: linear-gradient(90deg, #eef1f7 25%, #f6f8fc 37%, #eef1f7 63%);
      background-size: 400% 100%;
      animation: shimmer 1.3s infinite;
      border-radius: 8px;
      margin-bottom: 6px;
    }
    @keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }

    .drag-handle {
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 12px;
      height: 18px;
      cursor: grab;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      opacity: 0.35;
      transition: opacity .15s;
    }
    .drag-handle::before,
    .drag-handle::after {
      content: '';
      display: block;
      height: 2px;
      background: currentColor;
      border-radius: 1px;
      box-shadow: 0 4px 0 currentColor, 0 8px 0 currentColor;
    }
    .drag-handle::after {
      box-shadow: none;
    }
    .hierarchy-card:hover .drag-handle,
    .prg-header:hover .drag-handle,
    .ctrl-header:hover .drag-handle {
      opacity: 0.65;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
    .drag-handle.hidden {
      display: none !important;
    }
    .drag-handle.small {
      left: 8px;
      width: 10px;
      height: 14px;
    }
    .prg-header .hierarchy-left,
    .ctrl-header .hierarchy-left {
      padding-left: 16px;
    }

    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drag-animating {
      transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
    }
    .actions-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 24px;
    }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 16px;
      font-size: 13px;
      color: var(--text-2);
    }
  `],
})
export class SolucionesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);

  apps = signal<Aplicacion[]>([]);
  app = signal<Aplicacion | null>(null);
  modulos = signal<Modulo[]>([]);
  programas = signal<Programa[]>([]);
  controles = signal<Control[]>([]);

  loading = signal(true);
  loadingMods = signal(false);
  loadingPrgs = signal(false);
  loadingCtrls = signal(false);

  page = signal(0);
  pageSize = signal(10);
  paginatedApps = computed(() => {
    const start = this.page() * this.pageSize();
    return this.apps().slice(start, start + this.pageSize());
  });
  totalPages = computed(() => Math.max(1, Math.ceil(this.apps().length / this.pageSize())));

  expandedMods = signal<Set<string>>(new Set());
  expandedPrgs = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.loadApps();
    this.route.paramMap.subscribe((params) => {
      const codigo = params.get('codigo');
      if (codigo) {
        this.loadAppForRoute(codigo);
      }
    });
  }

  private loadApps(): void {
    this.loading.set(true);
    this.api.listAplicaciones().subscribe({
      next: (apps) => {
        this.apps.set(apps);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private loadAppForRoute(codigo: string): void {
    this.loading.set(true);
    this.api.listAplicaciones().subscribe({
      next: (apps) => {
        const found = apps.find(a => a.codigo === codigo);
        this.app.set(found || null);
        this.loading.set(false);
        if (found) {
          this.expandedMods.set(new Set());
          this.expandedPrgs.set(new Set());
          this.loadModulos();
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  goToOrder(a: Aplicacion): void {
    this.router.navigate(['/soluciones', a.codigo]);
  }

  goBack(): void {
    this.router.navigate(['/soluciones']);
  }

  setPage(p: number): void {
    this.page.set(p);
  }

  changePageSize(value: any): void {
    this.pageSize.set(Number(value));
    this.page.set(0);
  }

  private loadModulos(): void {
    this.loadingMods.set(true);
    this.api.listModulos().subscribe({
      next: (mods) => {
        const appCodigo = this.app()?.codigo;
        this.modulos.set(mods.filter(m => m.appCodigo === appCodigo));
        this.loadingMods.set(false);
      },
      error: () => this.loadingMods.set(false),
    });
    this.loadProgramas();
  }

  private loadProgramas(): void {
    this.loadingPrgs.set(true);
    this.api.listProgramas().subscribe({
      next: (prgs) => {
        const appCodigo = this.app()?.codigo;
        const modCodigos = this.modulos().map(m => m.codigo);
        this.programas.set(prgs.filter(p => modCodigos.includes(p.modCodigo)));
        this.loadingPrgs.set(false);
      },
      error: () => this.loadingPrgs.set(false),
    });
    this.loadControles();
  }

  private loadControles(): void {
    this.loadingCtrls.set(true);
    this.api.listControles().subscribe({
      next: (ctrls) => {
        const prgCodigos = this.programas().map(p => p.codigo);
        this.controles.set(ctrls.filter(c => prgCodigos.includes(c.prgCodigo)));
        this.loadingCtrls.set(false);
      },
      error: () => this.loadingCtrls.set(false),
    });
  }

  getProgramas(modCodigo: string): Programa[] {
    return this.programas().filter(p => p.modCodigo === modCodigo);
  }

  getControles(prgCodigo: string): Control[] {
    return this.controles().filter(c => c.prgCodigo === prgCodigo);
  }

  dropModulo(event: CdkDragDrop<Modulo[]>): void {
    const reordered = [...this.modulos()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.modulos.set(reordered);
  }

  dropPrograma(event: CdkDragDrop<Programa[]>, modCodigo: string): void {
    const reordered = [...event.container.data];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);

    this.programas.update((all) => {
      const otros = all.filter(p => p.modCodigo !== modCodigo);
      return [...otros, ...reordered];
    });
  }

  dropControl(event: CdkDragDrop<Control[]>, prgCodigo: string): void {
    const reordered = [...event.container.data];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);

    this.controles.update((all) => {
      const otros = all.filter(c => c.prgCodigo !== prgCodigo);
      return [...otros, ...reordered];
    });
  }

  saveOrder(): void {
    const modPayload = this.modulos().map((m, idx) => ({ id: m.id, orden: idx }));
    const prgPayload = this.programas().map((p, idx) => ({ id: p.id, orden: idx }));
    const ctrlPayload = this.controles().map((c, idx) => ({ id: c.id, orden: idx }));

    let completed = 0;
    const total = 3;
    const checkComplete = () => {
      completed++;
      if (completed === total) {
        this.toast.success('Orden actualizado', 'El nuevo orden se ha persistido correctamente.');
      }
    };

    this.api.reordenarModulos(modPayload).subscribe({
      next: () => checkComplete(),
      error: () => { this.toast.error('Error', 'No se pudo guardar el orden de los módulos.'); this.loadModulos(); },
    });
    this.api.reordenarProgramas(prgPayload).subscribe({
      next: () => checkComplete(),
      error: () => { this.toast.error('Error', 'No se pudo guardar el orden de los programas.'); this.loadProgramas(); },
    });
    this.api.reordenarControles(ctrlPayload).subscribe({
      next: () => checkComplete(),
      error: () => { this.toast.error('Error', 'No se pudo guardar el orden de los controles.'); this.loadControles(); },
    });
  }

  toggleMod(id: string): void {
    this.expandedMods.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  togglePrg(id: string): void {
    this.expandedPrgs.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
}
