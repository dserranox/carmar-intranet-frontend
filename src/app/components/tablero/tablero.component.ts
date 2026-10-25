import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { TableroService } from '../../services/tablero.service';
import { Tablero } from '../../models/tablero';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { OrdersService } from '../../services/orders.service';
import { ElegirOrdenDialogComponent } from '../calidad/elegir-orden-dialog.component';
import { AsignarDialogComponent } from '../orders/asignar-dialog.component';

/**
 * El tablero del administrador.
 *
 * Hay indicadores que todavía no tienen con qué llenarse —el reparto entre
 * efectivo, setup y pausa, o casi todo lo fino de calidad— porque esos datos
 * recién empiezan a cargarse con el reloj y los controles nuevos. En vez de
 * mostrar un cero que miente, esas tarjetas dicen que se están llenando: un
 * tablero con ceros falsos es un tablero que la gente aprende a no mirar.
 */
@Component({
  selector: 'app-tablero',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatTooltipModule, MatSnackBarModule, MatDialogModule
  ],
  templateUrl: './tablero.component.html',
  styleUrls: ['./tablero.component.css']
})
export class TableroComponent implements OnInit {
  private servicio = inject(TableroService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private ordersSvc = inject(OrdersService);

  datos = signal<Tablero | null>(null);
  cargando = signal(true);

  desde: Date;
  hasta: Date = new Date();

  constructor() {
    const hace30 = new Date();
    hace30.setDate(hace30.getDate() - 29);
    this.desde = hace30;
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.get(this.aISO(this.desde), this.aISO(this.hasta)).subscribe({
      next: t => { this.datos.set(t); this.cargando.set(false); },
      error: err => {
        this.cargando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo cargar el tablero', 'OK',
          { duration: 6000 });
      }
    });
  }

  /** Los atajos de arriba: lo que se mira todos los días. */
  periodo(dias: number): void {
    const desde = new Date();
    desde.setDate(desde.getDate() - (dias - 1));
    this.desde = desde;
    this.hasta = new Date();
    this.cargar();
  }

  esteAnio(): void {
    this.desde = new Date(new Date().getFullYear(), 0, 1);
    this.hasta = new Date();
    this.cargar();
  }

  // ==================== cuentas de pantalla ====================

  horas(segundos: number): number {
    return Math.round(segundos / 360) / 10;
  }

  /** Qué parte del tiempo fue producción real. Sin pausas cargadas todavía no dice nada. */
  hayRepartoDeTiempo = computed(() => {
    const t = this.datos();
    return !!t && (t.segundosSetup > 0 || t.segundosPausa > 0);
  });

  porcentajeEfectivo = computed(() => {
    const t = this.datos();
    if (!t) return null;
    const total = t.segundosEfectivos + t.segundosSetup + t.segundosPausa;
    return total > 0 ? Math.round(1000 * t.segundosEfectivos / total) / 10 : null;
  });

  /** Primera pasada: órdenes que atravesaron la planta sin una sola falla. */
  primeraPasada = computed(() => {
    const t = this.datos();
    if (!t || !t.ordenesConTrabajo) return null;
    return Math.round(1000 * t.ordenesSinFalla / t.ordenesConTrabajo) / 10;
  });

  controlesTotal = computed(() => this.datos()?.controles.reduce((a, c) => a + c.total, 0) ?? 0);
  controlesNoOk = computed(() => this.datos()?.controles.reduce((a, c) => a + c.noOk, 0) ?? 0);

  tasaNoConformidad = computed(() => {
    const total = this.controlesTotal();
    return total > 0 ? Math.round(1000 * this.controlesNoOk() / total) / 10 : null;
  });

  /** El ancho de la barra de un ranking, relativo al más grande. */
  proporcion(valor: number, lista: { valor: number }[]): number {
    const mayor = Math.max(...lista.map(v => v.valor), 1);
    return Math.round(100 * valor / mayor);
  }

  proporcionDe(valor: number, mayor: number): number {
    return mayor > 0 ? Math.round(100 * valor / mayor) : 0;
  }

  mayorUnidadesHora = computed(() =>
    Math.max(...(this.datos()?.rendimientoPorOperacion ?? [])
      .map(r => r.unidadesPorHora ?? 0), 1));

  mayorHorasOperario = computed(() =>
    Math.max(...(this.datos()?.cargaPorOperario ?? []).map(c => c.horas), 1));

  /** Un margen de tracción por debajo del 10 % es el que avisa antes de romperse. */
  margenApretado(margen: number | null): boolean {
    return margen !== null && margen < 10;
  }

  // ==================== asignar desde el tablero ====================
  //
  // El caso de uso es ver quién está libre y mandarle algo. Si para eso hay que
  // cambiar de pantalla, el tablero deja de servir. El botón solo aparece para
  // quien ya tiene permiso de asignar.

  get puedeAsignar(): boolean {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return false;
      const perms = JSON.parse(raw)?.permissions;
      return Array.isArray(perms) && perms.includes('ASIGNACIONES:WRITE');
    } catch { return false; }
  }

  /** Elegir el código y repartirlo, sin salir del tablero. */
  asignarA(usuario: string): void {
    this.ordersSvc.listByYear(new Date().getFullYear()).subscribe({
      next: ordenes => {
        // Solo lo que se puede trabajar: planificado o en proceso.
        const elegibles = (ordenes ?? [])
          .filter(o => ['PLANIFICADO', 'EN PROCESO'].includes((o.situacionClave ?? '').toUpperCase()))
          .map(o => ({
            ordenId: o.id,
            nroPlan: o.ordNroPlan,
            productoCodigo: o.productoCodigo,
            productoDescripcion: o.productoDescripcion,
            clienteRazonSocial: o.clienteRazonSocial ?? null,
            situacionClave: o.situacionClave,
            cantidad: o.cantidad,
            operarios: [],
            puestos: [],
            yaControlada: false
          }));

        if (!elegibles.length) {
          this.snack.open('No hay órdenes planificadas ni en proceso para asignar', 'OK',
            { duration: 5000 });
          return;
        }

        this.dialog.open(ElegirOrdenDialogComponent, {
          width: '720px', maxWidth: '95vw',
          data: { ordenes: elegibles }
        }).afterClosed().subscribe(elegida => {
          if (!elegida) return;
          this.dialog.open(AsignarDialogComponent, {
            width: '1040px', maxWidth: '96vw',
            data: {
              ordenId: elegida.ordenId,
              nroPlan: elegida.nroPlan,
              productoCodigo: elegida.productoCodigo,
              productoDescripcion: elegida.productoDescripcion,
              cantidad: elegida.cantidad,
              operarioSugerido: usuario
            }
          }).afterClosed().subscribe(asignado => {
            if (!asignado) return;
            this.snack.open(`Trabajo asignado a ${usuario}`, 'OK', { duration: 4000 });
            this.cargar();
          });
        });
      },
      error: () => this.snack.open('No se pudieron leer las órdenes', 'OK', { duration: 5000 })
    });
  }

  etiquetaEstado(estado: string): string {
    switch (estado) {
      case 'EN_CURSO': return 'trabajando';
      case 'PAUSADA': return 'en pausa';
      case 'SUSPENDIDA': return 'suspendida';
      case 'SIN_TAREA': return 'libre';
      default: return estado.toLowerCase();
    }
  }

  etiquetaMotivo(clave: string): string {
    switch (clave) {
      case 'DESCANSO': return 'Descanso';
      case 'ALMUERZO': return 'Almuerzo';
      case 'FALTA_MATERIAL': return 'Falta material';
      case 'MANTENIMIENTO': return 'Mantenimiento';
      case 'CONSULTA_CALIDAD': return 'Consulta a calidad';
      case 'FIN_JORNADA': return 'Terminó la jornada';
      case 'OTRA_TAREA': return 'Lo pasaron a otra tarea';
      case 'TAREA': return 'Dejó la tarea';
      case 'OTROS': return 'Otros';
      default: return clave;
    }
  }

  private aISO(fecha: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
  }
}

