import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MotivoFaltante } from '../../models/picking';

export interface FaltanteDialogData {
  codigoPieza: string;
  cantTotal: number;
}

export interface FaltanteDialogResult {
  motivo: MotivoFaltante;
  observaciones?: string;
}

const MOTIVOS: Array<{ clave: MotivoFaltante; etiqueta: string; icono: string }> = [
  { clave: 'SIN_STOCK', etiqueta: 'No hay stock', icono: 'production_quantity_limits' },
  { clave: 'NO_ENCONTRADO', etiqueta: 'No lo encontré', icono: 'search_off' },
  { clave: 'OTRO', etiqueta: 'Otro motivo', icono: 'more_horiz' }
];

/** Por qué no se pudo llevar el material. Pensado para el dedo, no para el mouse. */
@Component({
  selector: 'app-faltante-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title class="titulo">
      <mat-icon>error_outline</mat-icon>
      Falta {{ data.codigoPieza }}
    </h2>

    <mat-dialog-content class="contenido">
      <p class="nota">Pedía {{ data.cantTotal }} unidades. ¿Por qué no se pudo llevar?</p>

      <div class="motivos">
        @for (m of motivos; track m.clave) {
          <button type="button" class="motivo" [class.activo]="elegido === m.clave"
                  (click)="elegido = m.clave">
            <mat-icon>{{ m.icono }}</mat-icon>
            <span>{{ m.etiqueta }}</span>
          </button>
        }
      </div>

      @if (elegido) {
        <mat-form-field appearance="outline" class="campo">
          <mat-label>{{ elegido === 'OTRO' ? 'Aclaración (obligatoria)' : 'Detalle (opcional)' }}</mat-label>
          <input matInput [(ngModel)]="detalle" name="detalle" />
        </mat-form-field>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button class="grande" (click)="cancelar()">Volver</button>
      <button mat-flat-button color="warn" class="grande" [disabled]="!completo" (click)="confirmar()">
        Marcar como faltante
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .titulo { display: flex; align-items: center; gap: 8px; }
    .contenido { min-width: 420px; padding-top: 8px; }
    .nota { font-size: .9rem; color: rgba(0,0,0,.6); margin: 0 0 14px; }
    .motivos { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
    .motivo {
      display: flex; align-items: center; gap: 12px;
      min-height: 56px; padding: 0 18px;
      border: 2px solid rgba(0,0,0,.12); border-radius: 12px;
      background: #fff; cursor: pointer; font: inherit; font-size: 1rem; text-align: left;
    }
    .motivo.activo { border-color: #c62828; background: #ffebee; font-weight: 700; color: #b3261e; }
    .motivo mat-icon { color: #c62828; }
    .campo { width: 100%; }
    .grande { min-height: 48px !important; padding: 0 20px !important; }
  `]
})
export class FaltanteDialogComponent {
  motivos = MOTIVOS;
  elegido: MotivoFaltante | null = null;
  detalle = '';

  constructor(
    private ref: MatDialogRef<FaltanteDialogComponent, FaltanteDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: FaltanteDialogData
  ) {}

  get completo(): boolean {
    if (!this.elegido) return false;
    return this.elegido !== 'OTRO' || !!this.detalle.trim();
  }

  confirmar(): void {
    if (!this.completo || !this.elegido) return;
    this.ref.close({ motivo: this.elegido, observaciones: this.detalle.trim() || undefined });
  }

  cancelar(): void { this.ref.close(); }
}
