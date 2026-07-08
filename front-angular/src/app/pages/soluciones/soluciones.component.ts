import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule, moveItemInArray, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { ApiService } from '../../core/services/api.service';
import { IconChevronRightComponent, IconServerComponent, IconLockComponent } from '../../shared/components/icons';
import type { Aplicacion, Modulo, Programa, Perfil } from '../../shared/models/types';

@Component({
  selector: 'app-soluciones',
  standalone: true,
  imports: [CommonModule, DragDropModule, IconChevronRightComponent, IconServerComponent, IconLockComponent],
  template: `
    @if (loading()) {
      <div class="page-head">
        <div>
          <h1>Cargando...</h1>
        </div>
      </div>
    } @else if (app()) {
      <div class="page-head">
        <div>
          <h1>{{ app()!.nombre }}</h1>
          <p>{{ app()!.descripcion || 'Aplicación sin descripción' }}</p>
        </div>
        <span class="badge" [class.badge-green]="app()!.estado === 'ACTIVO'" [class.badge-gray]="app()!.estado !== 'ACTIVO'">
          {{ app()!.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
        </span>
      </div>

      <!-- breadcrumb -->
      <div class="breadcrumb">
        <button class="btn btn-ghost btn-sm" (click)="goBack()">‹ Volver a Soluciones</button>
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
              <div class="drag-handle" title="Arrastrar para reordenar" (click)="$event.stopPropagation()"></div>
              <div class="hierarchy-header mod-header" (click)="toggleMod(mod.id)">
                <div class="hierarchy-left">
                  <app-icon-chevron-right [width]="14" [height]="14" [class.rotated]="expandedMods().has(mod.id)" />
                  <app-icon-server [width]="15" [height]="15" />
                  <div>
                    <div class="cell-strong">{{ mod.nombre }}</div>
                    <div class="tiny dim">{{ mod.codigo }} · {{ mod.descripcion || 'Sin descripción' }}</div>
                  </div>
                </div>
                <span class="badge" [class.badge-green]="mod.estado === 'ACTIVO'" [class.badge-gray]="mod.estado !== 'ACTIVO'">
                  {{ mod.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                </span>
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
                          <div class="drag-handle small" title="Arrastrar para reordenar" (click)="$event.stopPropagation()"></div>
                          <div class="hierarchy-left">
                            <app-icon-chevron-right [width]="14" [height]="14" [class.rotated]="expandedPrgs().has(prg.id)" />
                            <div>
                              <div class="cell-strong">{{ prg.nombre }}</div>
                              <div class="tiny dim">{{ prg.codigo }} · {{ prg.descripcion || 'Sin descripción' }}</div>
                            </div>
                          </div>
                          <span class="badge" [class.badge-green]="prg.estado === 'ACTIVO'" [class.badge-gray]="prg.estado !== 'ACTIVO'">
                            {{ prg.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                          </span>
                        </div>

                        @if (expandedPrgs().has(prg.id)) {
                          <!-- PERFILES -->
                          <div class="hierarchy-children">
                            <div class="child-label">Perfiles <span class="muted">({{ getPerfiles(prg.codigo).length }})</span></div>
                            @if (loadingPerfs()) {
                              <div class="skeleton-row"></div>
                            } @else if (getPerfiles(prg.codigo).length === 0) {
                              <div class="empty-hint child">No hay perfiles en este programa.</div>
                            } @else {
                              @for (perf of getPerfiles(prg.codigo); track perf.id) {
                                <div class="hierarchy-header perf-header">
                                  <div class="hierarchy-left">
                                    <app-icon-lock [width]="14" [height]="14" />
                                    <div>
                                      <div class="cell-strong">{{ perf.nombre }}</div>
                                      <div class="tiny dim">{{ perf.codigo }} · {{ perf.descripcion || 'Sin descripción' }}</div>
                                    </div>
                                  </div>
                                  <span class="badge" [class.badge-green]="perf.estado === 'ACTIVO'" [class.badge-gray]="perf.estado !== 'ACTIVO'">
                                    {{ perf.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                                  </span>
                                </div>
                              }
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
    } @else {
      <div class="page-head">
        <div>
          <h1>Soluciones</h1>
          <p>Seleccione una aplicación para ver su jerarquía de seguridades.</p>
        </div>
      </div>
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
    .perf-header {
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 4px;
      background: #fafafa;
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
    .prg-header:hover .drag-handle {
      opacity: 0.65;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
    .drag-handle.small {
      left: 8px;
      width: 10px;
      height: 14px;
    }
    .hierarchy-left {
      padding-left: 18px;
    }
    .prg-header .hierarchy-left {
      padding-left: 16px;
    }

    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drag-animating {
      transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
    }
  `],
})
export class SolucionesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private router = inject(Router);

  app = signal<Aplicacion | null>(null);
  modulos = signal<Modulo[]>([]);
  programas = signal<Programa[]>([]);
  perfiles = signal<Perfil[]>([]);

  loading = signal(true);
  loadingMods = signal(false);
  loadingPrgs = signal(false);
  loadingPerfs = signal(false);

  expandedMods = signal<Set<string>>(new Set());
  expandedPrgs = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const codigo = params.get('codigo');
      if (codigo) {
        this.loadApp(codigo);
      } else {
        this.loading.set(false);
      }
    });
  }

  private loadApp(codigo: string): void {
    this.loading.set(true);
    this.api.listAplicaciones().subscribe({
      next: (apps) => {
        const found = apps.find(a => a.codigo === codigo);
        this.app.set(found || null);
        this.loading.set(false);
        if (found) {
          this.loadModulos();
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
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
    this.loadPerfiles();
  }

  private loadPerfiles(): void {
    this.loadingPerfs.set(true);
    this.api.listPerfiles().subscribe({
      next: (perfs) => {
        const modCodigos = this.modulos().map(m => m.codigo);
        const prgCodigos = this.programas().map(p => p.codigo);
        this.perfiles.set(perfs.filter(p => p.programas.some(pp => prgCodigos.includes(pp.prgCodigo))));
        this.loadingPerfs.set(false);
      },
      error: () => this.loadingPerfs.set(false),
    });
  }

  getProgramas(modCodigo: string): Programa[] {
    return this.programas().filter(p => p.modCodigo === modCodigo);
  }

  getPerfiles(prgCodigo: string): Perfil[] {
    return this.perfiles().filter(p => p.programas.some(pp => pp.prgCodigo === prgCodigo));
  }

  dropModulo(event: CdkDragDrop<Modulo[]>): void {
    const reordered = [...this.modulos()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.modulos.set(reordered);

    const payload = reordered.map((m, idx) => ({ id: m.id, orden: idx }));
    this.api.reordenarModulos(payload).subscribe({
      error: () => this.loadModulos(),
    });
  }

  dropPrograma(event: CdkDragDrop<Programa[]>, modCodigo: string): void {
    const reordered = [...event.container.data];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);

    this.programas.update((all) => {
      const otros = all.filter(p => p.modCodigo !== modCodigo);
      return [...otros, ...reordered];
    });

    const payload = reordered.map((p, idx) => ({ id: p.id, orden: idx }));
    this.api.reordenarProgramas(payload).subscribe({
      error: () => this.loadProgramas(),
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

  goBack(): void {
    this.router.navigate(['/soluciones']);
  }
}
