import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OpcionBuscable, SelectBuscableComponent } from '../../shared/select-buscable.component';

export interface SeccionTraccion {
  seccion: number;
  fuerzaMinima: number | null;
  excepciones: { terminal: string; fuerzaMinima: number }[];
}

export interface ControlEnTarea {
  tareaId: number;
  tipo: 'TRACCION' | 'VISUAL' | 'DIMENSIONAL';
  operacionNombre: string;
  nroPlan: string | null;
  productoCodigo: string | null;
  puesto: string | null;
  tareaPausadaId: number | null;
  actividadPausada: string | null;
  secciones?: SeccionTraccion[];
}

export interface ResultadoControl {
  seccion?: number;
  terminal?: string;
  valorMedido?: number;
  conforme?: boolean;
  observaciones?: string;
  cantidad?: number;
}

/**
 * El cuadro que llena el operario durante el control. En tracción, al elegir la
 * sección se le dice de entrada cuánta fuerza tiene que aguantar, así no hay
 * que ir a buscarlo a ninguna tabla.
 */
@Component({
  selector: 'app-control-tarea-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, SelectBuscableComponent
  ],
  templateUrl: './control-tarea-dialog.component.html',
  styleUrls: ['./control-tarea-dialog.component.css']
})
export class ControlTareaDialogComponent {
  private ref = inject(MatDialogRef<ControlTareaDialogComponent, ResultadoControl>);
  control = inject<{ control: ControlEnTarea }>(MAT_DIALOG_DATA).control;

  seccion = signal<number | null>(null);
  terminal = signal('');
  valorMedido = signal<number | null>(null);
  conforme = signal<boolean | null>(null);
  observaciones = signal('');
  cantidad = signal<number>(1);

  esTraccion = this.control.tipo === 'TRACCION';

  opcionesSeccion: OpcionBuscable[] = (this.control.secciones ?? [])
    .map(s => ({ valor: s.seccion, texto: `${s.seccion} mm²` }));

  /** La fuerza que exige la sección elegida, con la excepción del terminal si la hay. */
  minimoExigido = computed<number | null>(() => {
    const s = (this.control.secciones ?? []).find(x => x.seccion === this.seccion());
    if (!s) return null;
    const term = this.terminal().trim().toLowerCase();
    const excepcion = s.excepciones?.find(e => e.terminal.toLowerCase() === term);
    return excepcion ? excepcion.fuerzaMinima : s.fuerzaMinima;
  });

  /** Si ya cargó el valor, se le dice en el momento si pasa o no. */
  veredicto = computed<'OK' | 'NO_OK' | null>(() => {
    const minimo = this.minimoExigido();
    const medido = this.valorMedido();
    if (minimo == null || medido == null) return null;
    return medido >= minimo ? 'OK' : 'NO_OK';
  });

  pideObservacion = computed(() =>
    this.veredicto() === 'NO_OK' || this.conforme() === false);

  completo = computed(() => {
    if (this.esTraccion) {
      const listo = this.seccion() != null && !!this.terminal().trim() && this.valorMedido() != null;
      return listo && (!this.pideObservacion() || !!this.observaciones().trim());
    }
    return this.conforme() != null
      && (!this.pideObservacion() || !!this.observaciones().trim());
  });

  guardar(): void {
    if (!this.completo()) return;
    this.ref.close(this.esTraccion
      ? {
          seccion: this.seccion()!,
          terminal: this.terminal().trim(),
          valorMedido: this.valorMedido()!,
          observaciones: this.observaciones().trim() || undefined,
          cantidad: this.cantidad()
        }
      : {
          conforme: this.conforme()!,
          observaciones: this.observaciones().trim() || undefined,
          cantidad: this.cantidad()
        });
  }

  cancelar(): void { this.ref.close(); }
}
