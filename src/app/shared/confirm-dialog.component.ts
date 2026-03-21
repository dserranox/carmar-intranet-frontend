import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  titulo: string;
  mensaje: string;
  botonConfirmar?: string;
  botonCancelar?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      <p>{{ data.mensaje }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">{{ data.botonCancelar || 'Cancelar' }}</button>
      <button mat-flat-button class="btn-confirm" (click)="dialogRef.close(true)">{{ data.botonConfirmar || 'Confirmar' }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .btn-confirm {
      background: #b71c1c !important;
      color: white !important;
    }
    mat-dialog-content p {
      font-size: 0.95rem;
      color: #555;
    }
  `]
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
}
