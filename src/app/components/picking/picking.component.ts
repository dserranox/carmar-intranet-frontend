import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { PickingService } from '../../services/picking.service';
import { Picking, PickingImportResult, PlanPreview } from '../../models/picking';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { PendientesCompraComponent } from './pendientes-compra.component';

type Pestania = 'PICKINGS' | 'COMPRAS';

/**
 * Picking de abastecimiento: el cajón de materiales de almacén que se prepara
 * para cada plan. El cable y el corrugado no entran, vienen de lead prep.
 */
@Component({
  selector: 'app-picking',
  standalone: true,
  imports: [
    CommonModule, DatePipe, FormsModule,
    MatIconModule, MatButtonModule, MatProgressBarModule, MatTooltipModule,
    MatSnackBarModule, MatDialogModule, PendientesCompraComponent
  ],
  templateUrl: './picking.component.html',
  styleUrls: ['./picking.component.css']
})
export class PickingComponent implements OnInit {
  private pickingService = inject(PickingService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly pestanias: Array<{ clave: Pestania; titulo: string; icono: string }> = [
    { clave: 'PICKINGS', titulo: 'Pickings', icono: 'inventory_2' },
    { clave: 'COMPRAS', titulo: 'Pendientes de compra', icono: 'shopping_cart' }
  ];
  pestania = signal<Pestania>('PICKINGS');

  pickings = signal<Picking[]>([]);
  cargando = signal(true);

  /** Filtros del listado. */
  filtroEstado = signal<string>('');
  filtroPlan = signal<string>('');

  readonly estados = [
    { clave: '', titulo: 'Todos', icono: 'list_alt' },
    { clave: 'PENDIENTE', titulo: 'Pendientes', icono: 'schedule' },
    { clave: 'EN_CURSO', titulo: 'En curso', icono: 'play_circle' },
    { clave: 'INCOMPLETO', titulo: 'Incompletos', icono: 'error_outline' },
    { clave: 'COMPLETO', titulo: 'Completos', icono: 'task_alt' }
  ];

  // --- Importación ---
  panelImportar = signal(false);
  archivo: File | null = null;
  previsualizando = signal(false);
  importando = signal(false);
  preview = signal<PickingImportResult | null>(null);
  /** Planes que el usuario eligió reemplazar. */
  private reemplazar = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.cargar();
  }

  get permisos(): string[] {
    try {
      const data = localStorage.getItem('user');
      if (!data) return [];
      const u = JSON.parse(data);
      return Array.isArray(u?.permissions) ? u.permissions : [];
    } catch { return []; }
  }

  get puedeImportar(): boolean { return this.permisos.includes('PICKING:ADMIN'); }
  get puedePreparar(): boolean { return this.permisos.includes('PICKING:WRITE'); }

  cargar(): void {
    this.cargando.set(true);
    this.pickingService.listar(this.filtroEstado() || undefined, this.filtroPlan() || undefined).subscribe({
      next: p => { this.pickings.set(p || []); this.cargando.set(false); },
      error: () => {
        this.pickings.set([]);
        this.cargando.set(false);
        this.snack.open('No se pudieron cargar los pickings', 'OK', { duration: 4000 });
      }
    });
  }

  elegirEstado(estado: string): void {
    this.filtroEstado.set(estado);
    this.cargar();
  }

  buscarPlan(valor: string): void {
    this.filtroPlan.set(valor);
    this.cargar();
  }

  abrir(p: Picking): void {
    this.router.navigate(['/picking', p.pckId]);
  }

  avance(p: Picking): number {
    return p.totalLineas ? (p.lineasRetiradas / p.totalLineas) * 100 : 0;
  }

  textoBoton(p: Picking): string {
    if (p.estado === 'PENDIENTE') return 'Preparar';
    if (p.estado === 'EN_CURSO') return 'Continuar';
    if (p.estado === 'INCOMPLETO') return 'Ver faltantes';
    return 'Ver';
  }

  etiquetaEstado(estado: string): string {
    const etiquetas: Record<string, string> = {
      PENDIENTE: 'PENDIENTE', EN_CURSO: 'EN CURSO',
      COMPLETO: 'COMPLETO', INCOMPLETO: 'INCOMPLETO'
    };
    return etiquetas[estado] ?? estado;
  }

  duracion(segundos?: number): string {
    if (!segundos) return '—';
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // ------------------------------------------------------------ importar

  archivoElegido(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo = input.files && input.files.length ? input.files[0] : null;
    this.preview.set(null);
    this.reemplazar.set(new Set());
    if (this.archivo) this.previsualizar();
  }

  previsualizar(): void {
    if (!this.archivo) return;
    this.previsualizando.set(true);
    this.pickingService.previsualizar(this.archivo).subscribe({
      next: res => { this.preview.set(res); this.previsualizando.set(false); },
      error: err => {
        this.previsualizando.set(false);
        const detalle = err?.error as PickingImportResult | undefined;
        if (detalle?.errores?.length) {
          this.preview.set(detalle);
        } else {
          this.snack.open(err?.error?.message || 'No se pudo leer el archivo', 'OK', { duration: 6000 });
        }
      }
    });
  }

  /** Los planes que ya existen y todavía se pueden pisar. */
  readonly reemplazables = computed(() =>
    (this.preview()?.planes ?? []).filter(p => p.yaExiste && !p.conAvance));

  /** Los que ya se empezaron a preparar: esos no se tocan. */
  readonly bloqueados = computed(() =>
    (this.preview()?.planes ?? []).filter(p => p.conAvance));

  estaMarcado(plan: string): boolean {
    return this.reemplazar().has(plan);
  }

  alternarReemplazo(plan: string): void {
    const copia = new Set(this.reemplazar());
    copia.has(plan) ? copia.delete(plan) : copia.add(plan);
    this.reemplazar.set(copia);
  }

  /** Los planes que van a entrar: los nuevos, más los repetidos que se marcaron. */
  readonly aImportar = computed(() =>
    (this.preview()?.planes ?? []).filter(p => !p.yaExiste || this.estaMarcado(p.nroPlan)));

  /** Los repetidos que no se marcaron: se saltean, no frenan al resto. */
  readonly salteados = computed(() =>
    (this.preview()?.planes ?? []).filter(p => p.yaExiste && !this.estaMarcado(p.nroPlan)));

  /** Alcanza con que haya algo para crear y que nada marcado esté bloqueado. */
  readonly listoParaImportar = computed(() => {
    const p = this.preview();
    if (!p || p.errores.length) return false;
    if (this.bloqueados().some(b => this.estaMarcado(b.nroPlan))) return false;
    return this.aImportar().length > 0;
  });

  importar(): void {
    if (!this.archivo || !this.listoParaImportar()) return;
    this.importando.set(true);
    this.pickingService.importar(this.archivo, [...this.reemplazar()]).subscribe({
      next: res => {
        this.importando.set(false);
        this.snack.open(`Se cargaron ${res.creados.length} pickings`, 'OK', { duration: 6000 });
        res.advertencias?.slice(0, 3).forEach(a => this.snack.open(a, 'OK', { duration: 7000 }));
        this.cerrarImportacion();
        this.cargar();
      },
      error: err => {
        this.importando.set(false);
        const detalle = err?.error as PickingImportResult | undefined;
        const mensajes = detalle?.errores?.length
          ? detalle.errores
          : [err?.error?.message || 'No se pudo importar el archivo'];
        this.snack.open(mensajes.join(' · '), 'OK', { duration: 10000 });
        if (detalle) this.preview.set(detalle);
      }
    });
  }

  cerrarImportacion(): void {
    this.panelImportar.set(false);
    this.archivo = null;
    this.preview.set(null);
    this.reemplazar.set(new Set());
  }

  planesConAdvertencia(planes: PlanPreview[]): PlanPreview[] {
    return planes.filter(p => p.advertencias.length || p.sinOrden || p.yaExiste);
  }

  eliminar(p: Picking): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Eliminar picking',
        mensaje: `¿Eliminar el picking del plan ${p.nroPlan} y sus ${p.totalLineas} líneas?`,
        botonConfirmar: 'Eliminar',
        botonCancelar: 'Cancelar'
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.pickingService.eliminar(p.pckId).subscribe({
        next: () => { this.snack.open('Picking eliminado', 'OK', { duration: 3000 }); this.cargar(); },
        error: err => this.snack.open(err?.error?.message || 'No se pudo eliminar', 'OK', { duration: 6000 })
      });
    });
  }
}
