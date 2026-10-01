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
    MatTooltipModule, MatSnackBarModule
  ],
  templateUrl: './tablero.component.html',
  styleUrls: ['./tablero.component.css']
})
export class TableroComponent implements OnInit {
  private servicio = inject(TableroService);
  private snack = inject(MatSnackBar);

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

  etiquetaEstado(estado: string): string {
    switch (estado) {
      case 'EN_CURSO': return 'trabajando';
      case 'PAUSADA': return 'en pausa';
      case 'SUSPENDIDA': return 'suspendida';
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
