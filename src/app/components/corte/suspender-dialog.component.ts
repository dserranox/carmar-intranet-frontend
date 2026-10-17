import { Component, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface SuspenderDialogResult {
  subtipo: string;
  /** Siempre viene con texto: suspender exige justificar. */
  motivo: string;
}

/** Con qué palabras se le habla al operario según lo que está suspendiendo. */
export interface SuspenderDialogData {
  titulo?: string;
  nota?: string;
  botonCancelar?: string;
}

const MOTIVOS = [
  { clave: 'FIN_JORNADA', etiqueta: 'Termina la jornada', icono: 'bedtime' },
  { clave: 'OTRA_TAREA', etiqueta: 'Me asignaron otra tarea', icono: 'swap_horiz' },
  { clave: 'OTROS', etiqueta: 'Otros', icono: 'more_horiz' }
];

/** Motivo por el que se deja la sábana a medias para retomarla después. */
@Component({
  selector: 'app-suspender-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title class="titulo">
      <mat-icon>pause_presentation</mat-icon>
      {{ titulo }}
    </h2>

    <mat-dialog-content class="contenido">
      <p class="nota">{{ nota }}</p>
      <p class="obligatorio">
        <mat-icon>edit_note</mat-icon>
        Elegí por qué la dejás: queda asentado en la hoja de vida del lote.
      </p>

      <div class="motivos">
        @for (m of motivos; track m.clave) {
          <button type="button" class="motivo" [class.activo]="elegido === m.clave" (click)="elegido = m.clave">
            <mat-icon>{{ m.icono }}</mat-icon>
            <span>{{ m.etiqueta }}</span>
          </button>
        }
      </div>

      @if (elegido) {
        <mat-form-field appearance="outline" class="campo">
          <mat-label>{{ elegido === 'OTROS' ? 'Aclaración (obligatoria)' : 'Detalle (opcional)' }}</mat-label>
          <input matInput [(ngModel)]="detalle" name="detalle" />
        </mat-form-field>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">{{ botonCancelar }}</button>
      <button mat-flat-button color="primary" [disabled]="!completo" (click)="confirmar()">
        Suspender
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .titulo { display: flex; align-items: center; gap: 8px; }
    .contenido { min-width: 420px; padding-top: 8px; }
    .nota { font-size: .85rem; color: rgba(0, 0, 0, .6); margin: 0 0 14px; }
    .motivos { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
    .motivo {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px; border: 2px solid rgba(0, 0, 0, .12); border-radius: 10px;
      background: #fff; cursor: pointer; font-size: .98rem; font-family: inherit; text-align: left;
      transition: border-color .12s, background .12s;
    }
    .motivo:hover { border-color: #80cbc4; }
    .motivo.activo { border-color: #00695c; background: #e0f2f1; font-weight: 600; color: #00564b; }
    .motivo mat-icon { color: #00695c; }
    .campo { width: 100%; }
    .obligatorio {
      display: flex; align-items: center; gap: 8px;
      margin: 0 0 14px; padding: 8px 12px; border-radius: 8px;
      background: #fff3e0; color: #a35200; font-size: .84rem; font-weight: 600;
    }
    .obligatorio mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `]
})
export class SuspenderDialogComponent {
  motivos = MOTIVOS;
  elegido: string | null = null;
  detalle = '';

  titulo: string;
  nota: string;
  botonCancelar: string;

  constructor(
    private ref: MatDialogRef<SuspenderDialogComponent, SuspenderDialogResult>,
    @Optional() @Inject(MAT_DIALOG_DATA) data: SuspenderDialogData | null
  ) {
    this.titulo = data?.titulo ?? 'Suspender la sábana';
    this.nota = data?.nota ?? 'Se guarda el avance y el tiempo del corte que estás haciendo. '
      + 'Cuando la retomes vas a seguir en el mismo corte, sin perder nada.';
    this.botonCancelar = data?.botonCancelar ?? 'Seguir cortando';
  }

  get completo(): boolean {
    if (!this.elegido) return false;
    return this.elegido !== 'OTROS' || !!this.detalle.trim();
  }

  confirmar(): void {
    if (!this.completo || !this.elegido) return;
    // Siempre viaja una justificación: el detalle escrito, o el motivo elegido.
    const etiqueta = this.motivos.find(m => m.clave === this.elegido)?.etiqueta ?? this.elegido;
    this.ref.close({ subtipo: this.elegido, motivo: this.detalle.trim() || etiqueta });
  }

  cancelar(): void {
    this.ref.close();
  }
}
