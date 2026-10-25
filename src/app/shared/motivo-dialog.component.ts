import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface MotivoDialogData {
  titulo: string;
  /** Qué va a pasar, en una o dos líneas. */
  nota?: string;
  etiqueta?: string;
  botonConfirmar?: string;
  botonCancelar?: string;
  /** El botón va en rojo cuando lo que se confirma no se deshace. */
  peligroso?: boolean;
}

/**
 * Confirmar algo que además exige explicar por qué.
 *
 * El cartel de confirmación común alcanza cuando basta con un sí o un no. Acá
 * el motivo es el dato que queda escrito en el registro —por qué no procede una
 * no conformidad, por qué se anuló—, así que sin texto no hay botón.
 */
@Component({
  selector: 'app-motivo-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>

    <mat-dialog-content>
      @if (data.nota) { <p class="nota">{{ data.nota }}</p> }

      <mat-form-field appearance="outline" class="campo">
        <mat-label>{{ data.etiqueta || 'Motivo' }}</mat-label>
        <textarea matInput rows="3" [(ngModel)]="motivo" cdkFocusInitial
                  placeholder="Queda escrito en el registro"></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close()">{{ data.botonCancelar || 'Cancelar' }}</button>
      <button mat-flat-button class="btn-confirmar" [class.peligroso]="data.peligroso"
              [disabled]="!motivo.trim()" (click)="ref.close(motivo.trim())">
        {{ data.botonConfirmar || 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 420px; max-width: 520px; }
    .nota { margin: 0 0 14px; font-size: .92rem; color: #555; line-height: 1.45; }
    .campo { width: 100%; }
    .campo ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .btn-confirmar { background: #1a3a5c; color: #fff; }
    .btn-confirmar.peligroso { background: #b71c1c; }
    .btn-confirmar[disabled] { background: rgba(0, 0, 0, .12); color: rgba(0, 0, 0, .38); }
  `]
})
export class MotivoDialogComponent {
  data = inject<MotivoDialogData>(MAT_DIALOG_DATA);
  ref = inject(MatDialogRef<MotivoDialogComponent, string | undefined>);
  motivo = '';
}
