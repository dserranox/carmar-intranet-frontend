import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface CantidadDialogData {
  codigoPieza: string;
  cantTotal: number;
  cantActual: number;
}

/**
 * Cuánto se llevó cuando no se pudo llevar todo. Teclado numérico grande:
 * el operario lo usa con guantes y de parado.
 */
@Component({
  selector: 'app-cantidad-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="titulo">
      <mat-icon>pin</mat-icon>
      {{ data.codigoPieza }}
    </h2>

    <mat-dialog-content class="contenido">
      <p class="nota">El plan pide <strong>{{ data.cantTotal }}</strong>. ¿Cuánto llevaste?</p>

      <div class="visor">
        <button type="button" class="paso" (click)="sumar(-1)" [disabled]="valor <= 0">
          <mat-icon>remove</mat-icon>
        </button>
        <span class="numero">{{ valor }}</span>
        <button type="button" class="paso" (click)="sumar(1)" [disabled]="valor >= data.cantTotal">
          <mat-icon>add</mat-icon>
        </button>
      </div>

      <div class="teclado">
        @for (t of teclas; track t) {
          <button type="button" class="tecla" (click)="tocar(t)">{{ t }}</button>
        }
        <button type="button" class="tecla borrar" (click)="borrar()">
          <mat-icon>backspace</mat-icon>
        </button>
      </div>

      @if (valor > data.cantTotal) {
        <p class="error"><mat-icon>error</mat-icon> No podés llevar más de {{ data.cantTotal }}.</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button class="grande" (click)="cancelar()">Volver</button>
      <button mat-flat-button color="primary" class="grande"
              [disabled]="valor > data.cantTotal" (click)="confirmar()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .titulo { display: flex; align-items: center; gap: 8px; }
    .contenido { min-width: 360px; padding-top: 8px; }
    .nota { font-size: .95rem; color: rgba(0,0,0,.65); margin: 0 0 14px; }

    .visor { display: flex; align-items: center; justify-content: center; gap: 18px; margin-bottom: 16px; }
    .numero {
      font-size: 3.2rem; font-weight: 800; color: #1a3a5c; min-width: 110px; text-align: center;
      font-variant-numeric: tabular-nums;
    }
    .paso {
      width: 56px; height: 56px; border-radius: 50%;
      border: 2px solid #d0d4da; background: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .paso:disabled { opacity: .35; }

    .teclado { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .tecla {
      min-height: 56px; border-radius: 12px; border: 1px solid #d0d4da; background: #f7f9fb;
      font: inherit; font-size: 1.4rem; font-weight: 700; color: #37474f; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .tecla:active { background: #e3f2fd; }
    .tecla.borrar { grid-column: 3; }

    .error {
      display: flex; align-items: center; gap: 6px; margin: 12px 0 0;
      color: #b3261e; font-size: .88rem; font-weight: 600;
    }
    .grande { min-height: 48px !important; padding: 0 20px !important; }
  `]
})
export class CantidadDialogComponent {
  readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  valor: number;

  constructor(
    private ref: MatDialogRef<CantidadDialogComponent, number>,
    @Inject(MAT_DIALOG_DATA) public data: CantidadDialogData
  ) {
    this.valor = data.cantActual ?? 0;
  }

  tocar(tecla: string): void {
    const siguiente = Number(String(this.valor === 0 ? '' : this.valor) + tecla);
    if (!Number.isNaN(siguiente)) this.valor = siguiente;
  }

  borrar(): void {
    this.valor = Math.floor(this.valor / 10);
  }

  sumar(delta: number): void {
    this.valor = Math.min(this.data.cantTotal, Math.max(0, this.valor + delta));
  }

  confirmar(): void {
    if (this.valor > this.data.cantTotal) return;
    this.ref.close(this.valor);
  }

  cancelar(): void { this.ref.close(); }
}
