import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface PausaDialogResult {
  subtipo: string;
  motivo?: string;
}

const MOTIVOS = [
  { clave: 'CONSULTA_TECNICA', etiqueta: 'Consulta técnica', icono: 'engineering' },
  { clave: 'CONSULTA_CALIDAD', etiqueta: 'Consulta de calidad', icono: 'fact_check' },
  { clave: 'FALTA_MATERIAL', etiqueta: 'Falta de material', icono: 'inventory_2' },
  { clave: 'MANTENIMIENTO', etiqueta: 'Mantenimiento', icono: 'build' },
  { clave: 'DESCANSO', etiqueta: 'Descanso', icono: 'free_breakfast' },
  { clave: 'OTROS', etiqueta: 'Otros', icono: 'more_horiz' }
];

/** Motivo de la pausa operativa. El cronómetro de la pausa ya está corriendo. */
@Component({
  selector: 'app-pausa-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule
  ],
  templateUrl: './pausa-dialog.component.html',
  styleUrls: ['./pausa-dialog.component.css']
})
export class PausaDialogComponent {
  motivos = MOTIVOS;
  elegido: string | null = null;
  detalle = '';

  constructor(private ref: MatDialogRef<PausaDialogComponent, PausaDialogResult>) {}

  elegir(clave: string): void {
    this.elegido = clave;
  }

  get completo(): boolean {
    if (!this.elegido) return false;
    if (this.elegido === 'OTROS' && !this.detalle.trim()) return false;
    return true;
  }

  confirmar(): void {
    if (!this.completo || !this.elegido) return;
    this.ref.close({ subtipo: this.elegido, motivo: this.detalle.trim() || undefined });
  }

  cancelar(): void {
    this.ref.close();
  }
}
