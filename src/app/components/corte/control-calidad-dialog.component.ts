import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Corte } from '../../models/corte';

export interface ControlDialogData {
  corte: Corte;
}

export interface ControlDialogResult {
  controles: Array<{ tipo: string; extremo?: string | null; valorMedido: number; observaciones?: string }>;
}

/**
 * Pide las mediciones que la sábana marcó como obligatorias para el corte:
 * longitud al abrir y cerrar cada tramo de bobina, y tracción del primer
 * cable agrafado de cada sección + terminal.
 */
@Component({
  selector: 'app-control-calidad-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule
  ],
  templateUrl: './control-calidad-dialog.component.html',
  styleUrls: ['./control-calidad-dialog.component.css']
})
export class ControlCalidadDialogComponent {
  corte: Corte;

  /** El corrugado se reconoce por el diámetro: ahí el control es longitudinal. */
  get esCorrugado(): boolean {
    return this.corte?.diametroTxt != null || this.corte?.diametro != null;
  }

  longitudMedida: number | null = null;
  traccionA: number | null = null;
  traccionB: number | null = null;
  observaciones = '';

  constructor(
    private ref: MatDialogRef<ControlCalidadDialogComponent, ControlDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: ControlDialogData
  ) {
    this.corte = data.corte;
  }

  get pideLongitud(): boolean { return !!this.corte.reqCtrlLongitud; }
  get pideTraccionA(): boolean { return !!this.corte.reqCtrlTraccionA; }
  get pideTraccionB(): boolean { return !!this.corte.reqCtrlTraccionB; }

  get longitudOk(): boolean | null {
    if (this.longitudMedida == null) return null;
    const min = this.corte.longitudMin ?? this.corte.longitud;
    const max = this.corte.longitudMax ?? this.corte.longitud;
    return this.longitudMedida >= min && this.longitudMedida <= max;
  }

  traccionOk(valor: number | null, minimo?: number): boolean | null {
    if (valor == null) return null;
    if (minimo == null) return true;
    return valor >= minimo;
  }

  get hayRechazo(): boolean {
    return this.longitudOk === false
      || this.traccionOk(this.traccionA, this.corte.fuerzaMinimaA) === false
      || this.traccionOk(this.traccionB, this.corte.fuerzaMinimaB) === false;
  }

  get completo(): boolean {
    if (this.pideLongitud && this.longitudMedida == null) return false;
    if (this.pideTraccionA && this.traccionA == null) return false;
    if (this.pideTraccionB && this.traccionB == null) return false;
    // Fuera de tolerancia hay que dejar asentado el motivo.
    if (this.hayRechazo && !this.observaciones.trim()) return false;
    return true;
  }

  confirmar(): void {
    const controles: ControlDialogResult['controles'] = [];
    const obs = this.observaciones.trim() || undefined;
    if (this.pideLongitud && this.longitudMedida != null) {
      controles.push({ tipo: 'LONGITUD', valorMedido: this.longitudMedida, observaciones: obs });
    }
    if (this.pideTraccionA && this.traccionA != null) {
      controles.push({ tipo: 'TRACCION', extremo: 'A', valorMedido: this.traccionA, observaciones: obs });
    }
    if (this.pideTraccionB && this.traccionB != null) {
      controles.push({ tipo: 'TRACCION', extremo: 'B', valorMedido: this.traccionB, observaciones: obs });
    }
    this.ref.close({ controles });
  }

  cancelar(): void {
    this.ref.close();
  }
}
