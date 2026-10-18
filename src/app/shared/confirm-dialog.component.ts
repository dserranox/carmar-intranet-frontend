import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  titulo: string;
  mensaje: string;
  botonConfirmar?: string;
  botonCancelar?: string;
  /**
   * El botón va en rojo salvo que se diga lo contrario: el cartel se usa casi
   * siempre para algo que no se deshace. Cuando se confirma algo corriente
   * —terminar órdenes, por ejemplo— el rojo asusta de más.
   */
  peligroso?: boolean;
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
      <button mat-flat-button class="btn-confirm" [class.btn-normal]="data.peligroso === false"
              (click)="dialogRef.close(true)">{{ data.botonConfirmar || 'Confirmar' }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .btn-confirm {
      background: #b71c1c !important;
      color: white !important;
    }
    .btn-confirm.btn-normal {
      background: #1a3a5c !important;
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
