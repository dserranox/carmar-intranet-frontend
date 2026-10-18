import { Component, inject } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CambioMasivoResultado } from '../../models/order';

/**
 * Qué pasó con el lote de órdenes.
 *
 * Se abre solamente cuando algo quedó afuera: si entraron todas, alcanza con el
 * aviso de abajo y no hay por qué hacer clic en nada. Cuando algo no entró, en
 * cambio, hay que poder leer cuál y por qué sin que se vaya en tres segundos.
 */
@Component({
  selector: 'app-resultado-masivo-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, LowerCasePipe],
  template: `
    <h2 mat-dialog-title>
      {{ data.cambiadas.length > 0 ? 'Algunas órdenes quedaron afuera' : 'No se pudo cambiar ninguna' }}
    </h2>

    <mat-dialog-content>
      @if (data.cambiadas.length > 0) {
        <p class="resumen ok">
          <mat-icon>check_circle</mat-icon>
          <span>
            {{ data.cambiadas.length }}
            {{ data.cambiadas.length === 1 ? 'orden pasó' : 'órdenes pasaron' }}
            a {{ data.situacionClave | lowercase }}:
            {{ planes(data.cambiadas) }}
          </span>
        </p>
      }

      <p class="resumen afuera">
        <mat-icon>error_outline</mat-icon>
        <span>
          {{ data.rechazadas.length === 1 ? 'Esta quedó' : 'Estas quedaron' }}
          como estaba{{ data.rechazadas.length === 1 ? '' : 'n' }}:
        </span>
      </p>

      <ul class="rechazadas">
        @for (r of data.rechazadas; track r.id) {
          <li><b>{{ r.nroPlan }}</b> — {{ r.motivo }}</li>
        }
      </ul>

      <p class="nota">
        Las que tienen tareas sin cerrar se pueden terminar una vez que el operario
        cierre o suspenda la tarea.
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" (click)="ref.close()">Entendido</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { max-width: 540px; }

    .resumen {
      display: flex; align-items: flex-start; gap: 8px;
      margin: 0 0 12px; font-size: .92rem; line-height: 1.45;
    }
    .resumen mat-icon { font-size: 20px; width: 20px; height: 20px; flex: 0 0 auto; }
    .resumen.ok { color: #2e7d32; }
    .resumen.afuera { color: #b26500; margin-bottom: 6px; }

    .rechazadas { margin: 0 0 12px; padding-left: 26px; font-size: .92rem; }
    .rechazadas li { margin-bottom: 5px; color: #444; }

    .nota { margin: 0; font-size: .84rem; color: rgba(0, 0, 0, .55); line-height: 1.45; }
  `]
})
export class ResultadoMasivoDialogComponent {
  data = inject<CambioMasivoResultado>(MAT_DIALOG_DATA);
  ref = inject(MatDialogRef<ResultadoMasivoDialogComponent>);

  /** Los números de plan en una sola línea; si son muchos, los primeros y cuántos faltan. */
  planes(filas: { nroPlan: string }[]): string {
    const tope = 12;
    const nombres = filas.map(f => f.nroPlan);
    if (nombres.length <= tope) return nombres.join(', ');
    return `${nombres.slice(0, tope).join(', ')} y ${nombres.length - tope} más`;
  }
}
