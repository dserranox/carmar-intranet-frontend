import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { CorteService } from '../../services/corte.service';
import { TraccionMinima } from '../../models/corte';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

/**
 * Valores de referencia del control de tracción: la fuerza mínima que tiene que
 * aguantar el terminal agrafado. Se define por sección y, si un terminal puntual
 * exige otra cosa, se carga una excepción para esa sección + terminal.
 */
@Component({
  selector: 'app-traccion-minima',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatTooltipModule, MatSnackBarModule, MatDialogModule
  ],
  templateUrl: './traccion-minima.component.html',
  styleUrls: ['./traccion-minima.component.css']
})
export class TraccionMinimaComponent implements OnInit {
  /** Cuando se muestra dentro de Criterios no lleva su propio encabezado. */
  @Input() embebido = false;

  private corteService = inject(CorteService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  valores = signal<TraccionMinima[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  editandoId = signal<number | null>(null);

  columnas = ['seccion', 'terminal', 'fuerza', 'observaciones', 'acciones'];

  // alta / edición
  seccion: number | null = null;
  terminal = '';
  fuerza: number | null = null;
  observaciones = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.corteService.getTraccionMinima().subscribe({
      next: v => { this.valores.set(v || []); this.cargando.set(false); },
      error: () => {
        this.valores.set([]);
        this.cargando.set(false);
        this.snack.open('No se pudieron cargar los valores', 'OK', { duration: 4000 });
      }
    });
  }

  editar(valor: TraccionMinima): void {
    this.editandoId.set(valor.trmId ?? null);
    this.seccion = valor.trmSeccion;
    this.terminal = valor.trmTerminal || '';
    this.fuerza = valor.trmFuerzaMin;
    this.observaciones = valor.trmObservaciones || '';
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.seccion = null;
    this.terminal = '';
    this.fuerza = null;
    this.observaciones = '';
  }

  guardar(): void {
    if (this.seccion == null || this.fuerza == null) {
      this.snack.open('Completá sección y fuerza mínima', 'OK', { duration: 4000 });
      return;
    }
    this.guardando.set(true);
    this.corteService.guardarTraccionMinima({
      trmId: this.editandoId() ?? undefined,
      trmSeccion: this.seccion,
      trmFuerzaMin: this.fuerza,
      trmTerminal: this.terminal.trim() || null,
      trmObservaciones: this.observaciones.trim() || null
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snack.open('Valor guardado', 'OK', { duration: 3000 });
        this.cancelarEdicion();
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo guardar', 'OK', { duration: 6000 });
      }
    });
  }

  eliminar(valor: TraccionMinima): void {
    const que = valor.trmTerminal
      ? `la excepción de ${valor.trmSeccion} mm2 para el terminal ${valor.trmTerminal}`
      : `el valor general de ${valor.trmSeccion} mm2`;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { titulo: 'Eliminar valor', mensaje: `¿Eliminar ${que}?`, botonConfirmar: 'Eliminar' }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok || !valor.trmId) return;
      this.corteService.eliminarTraccionMinima(valor.trmId).subscribe({
        next: () => { this.snack.open('Valor eliminado', 'OK', { duration: 3000 }); this.cargar(); },
        error: err => this.snack.open(err?.error?.message || 'No se pudo eliminar', 'OK', { duration: 5000 })
      });
    });
  }

  volver(): void {
    this.router.navigate(['/corte']);
  }
}
