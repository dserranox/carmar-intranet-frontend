import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { PickingService } from '../../services/picking.service';
import { Picking, PickingLinea } from '../../models/picking';
import { FaltanteDialogComponent, FaltanteDialogData, FaltanteDialogResult } from './faltante-dialog.component';
import { CantidadDialogComponent, CantidadDialogData } from './cantidad-dialog.component';

/** Las líneas de una misma ubicación, para recorrer el almacén una sola vez. */
interface Tramo {
  ubicacion: string;
  lineas: PickingLinea[];
}

/**
 * La pantalla que usa el operario de logística en la tablet de 10" horizontal.
 * Todo táctil: zonas de 48 px para arriba y nada que dependa de pasar el mouse.
 */
@Component({
  selector: 'app-picking-preparacion',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule, MatProgressBarModule,
    MatTooltipModule, MatSnackBarModule, MatDialogModule
  ],
  templateUrl: './picking-preparacion.component.html',
  styleUrls: ['./picking-preparacion.component.css']
})
export class PickingPreparacionComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pickingService = inject(PickingService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  picking = signal<Picking | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  segundos = signal(0);

  private pckId!: number;
  private cronometro?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.pckId = Number(this.route.snapshot.paramMap.get('pckId'));
    this.cargar();
    this.cronometro = setInterval(() => {
      if (this.picking()?.estado === 'EN_CURSO') this.segundos.update(s => s + 1);
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.cronometro) clearInterval(this.cronometro);
  }

  private cargar(): void {
    this.cargando.set(true);
    this.pickingService.getPicking(this.pckId).subscribe({
      next: p => { this.mostrar(p); this.cargando.set(false); },
      error: err => {
        this.cargando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo abrir el picking', 'OK', { duration: 6000 });
        setTimeout(() => this.volver(), 1200);
      }
    });
  }

  private mostrar(p: Picking): void {
    this.picking.set(p);
    // Si venía de antes, el reloj arranca desde lo que ya llevaba.
    if (p.fechaInicio && p.estado === 'EN_CURSO') {
      const desde = new Date(p.fechaInicio).getTime();
      this.segundos.set(Math.max(0, Math.floor((Date.now() - desde) / 1000)));
    } else {
      this.segundos.set(p.segundos ?? 0);
    }
  }

  // ------------------------------------------------------------- agrupado

  /** Las líneas agrupadas por ubicación, en el orden del recorrido. */
  readonly tramos = computed<Tramo[]>(() => {
    const lineas = this.picking()?.lineas ?? [];
    const mapa = new Map<string, PickingLinea[]>();
    for (const l of lineas) {
      const clave = l.ubicacion || 'Sin ubicación';
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave)!.push(l);
    }
    return [...mapa.entries()].map(([ubicacion, lineas]) => ({ ubicacion, lineas }));
  });

  readonly avance = computed(() => {
    const p = this.picking();
    return p && p.totalLineas ? (p.lineasRetiradas / p.totalLineas) * 100 : 0;
  });

  readonly sinTocar = computed(() =>
    (this.picking()?.lineas ?? []).filter(l => l.estado === 'PENDIENTE').length);

  readonly faltantes = computed(() =>
    (this.picking()?.lineas ?? []).filter(l => l.estado === 'FALTANTE' || l.estado === 'PARCIAL'));

  get enCurso(): boolean { return this.picking()?.estado === 'EN_CURSO'; }
  get cerrado(): boolean { return this.picking()?.estado === 'COMPLETO'; }
  get incompleto(): boolean { return this.picking()?.estado === 'INCOMPLETO'; }
  get puedeTocar(): boolean { return !this.cerrado && !this.incompleto; }

  get reloj(): string {
    const s = this.segundos();
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const seg = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(seg)}` : `${pad(m)}:${pad(seg)}`;
  }

  // -------------------------------------------------------------- acciones

  iniciar(): void {
    this.guardando.set(true);
    this.pickingService.iniciar(this.pckId).subscribe({
      next: p => { this.mostrar(p); this.guardando.set(false); },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo iniciar', 'OK', { duration: 6000 });
      }
    });
  }

  /** El tilde grande: se llevó todo lo que pedía la línea. */
  retirarTodo(linea: PickingLinea): void {
    if (!this.puedeTocar) return;
    // Volver a tocar una línea ya retirada la deshace.
    const cantidad = linea.estado === 'RETIRADO' ? 0 : undefined;
    this.aplicar(this.pickingService.retirar(linea.pkdId, cantidad));
  }

  cargarParcial(linea: PickingLinea): void {
    if (!this.puedeTocar) return;
    this.dialog.open<CantidadDialogComponent, CantidadDialogData, number>(
      CantidadDialogComponent, {
        disableClose: true,
        data: {
          codigoPieza: linea.codigoPieza,
          cantTotal: linea.cantTotal,
          cantActual: linea.cantRetirada
        }
      }).afterClosed().subscribe(cantidad => {
        if (cantidad === undefined || cantidad === null) return;
        this.aplicar(this.pickingService.retirar(linea.pkdId, cantidad));
      });
  }

  marcarFaltante(linea: PickingLinea): void {
    if (!this.puedeTocar) return;
    this.dialog.open<FaltanteDialogComponent, FaltanteDialogData, FaltanteDialogResult>(
      FaltanteDialogComponent, {
        disableClose: true,
        data: { codigoPieza: linea.codigoPieza, cantTotal: linea.cantTotal }
      }).afterClosed().subscribe(res => {
        if (!res) return;
        this.aplicar(this.pickingService.marcarFaltante(linea.pkdId, res.motivo, res.observaciones));
      });
  }

  finalizar(): void {
    this.guardando.set(true);
    this.pickingService.finalizar(this.pckId, this.segundos()).subscribe({
      next: p => {
        this.mostrar(p);
        this.guardando.set(false);
        this.snack.open(
          p.estado === 'COMPLETO'
            ? 'Cajón completo. Buen trabajo.'
            : `Cajón cerrado con ${p.lineasFaltantes + p.lineasParciales} faltantes. Ya se avisó a producción.`,
          'OK', { duration: 7000 });
      },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo cerrar el picking', 'OK', { duration: 7000 });
      }
    });
  }

  /** Llegó el material que faltaba. */
  entregar(linea: PickingLinea): void {
    this.aplicar(this.pickingService.entregar(linea.pkdId), () => {
      const p = this.picking();
      if (p?.estado === 'COMPLETO') {
        this.snack.open('Se entregó todo lo que faltaba: el picking quedó completo.',
          'OK', { duration: 6000 });
      }
    });
  }

  private aplicar(peticion: ReturnType<PickingService['retirar']>, despues?: () => void): void {
    this.guardando.set(true);
    peticion.subscribe({
      next: p => {
        this.mostrar(p);
        this.guardando.set(false);
        if (despues) despues();
      },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo guardar', 'OK', { duration: 6000 });
        this.cargar();
      }
    });
  }

  volver(): void {
    this.router.navigate(['/picking']);
  }

  // ---------------------------------------------------------------- vista

  etiquetaMotivo(motivo?: string): string {
    const etiquetas: Record<string, string> = {
      SIN_STOCK: 'sin stock',
      NO_ENCONTRADO: 'no se encontró',
      OTRO: 'otro motivo'
    };
    return motivo ? (etiquetas[motivo] ?? motivo) : '';
  }
}
