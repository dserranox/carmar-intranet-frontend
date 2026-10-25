import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoConformidadesService } from '../../services/no-conformidades.service';
import { NoConformidad, etiquetaOrigen } from '../../models/no-conformidad';
import { MotivoDialogComponent, MotivoDialogData } from '../../shared/motivo-dialog.component';

/**
 * Las no conformidades esperando validación, en una ventana sobre la pantalla.
 *
 * Es la excepción a la regla de no moverse con una tarea corriendo: calidad
 * recibe el aviso de una NC mientras está haciendo otra cosa y tiene que poder
 * atenderla sin suspender. Como es una ventana y no otra pantalla, el reloj de
 * lo que estaba haciendo sigue corriendo y al cerrarla vuelve a lo suyo.
 *
 * El aviso es compartido entre calidad, el jefe y el administrador: el primero
 * que la atiende la saca de la lista de los otros dos.
 */
@Component({
  selector: 'app-nc-pendientes-dialog',
  standalone: true,
  imports: [CommonModule, DatePipe, MatDialogModule, MatButtonModule, MatIconModule,
            MatTooltipModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>
      No conformidades esperando validación
    </h2>

    <mat-dialog-content>
      <p class="nota">
        Alguien las reportó y todavía no cuentan en los indicadores. Confirmá las que
        realmente son una no conformidad; las que no, quedan registradas como no
        procedentes con tu motivo.
      </p>

      @if (cargando()) {
        <div class="centrado"><mat-progress-spinner mode="indeterminate" diameter="36"></mat-progress-spinner></div>
      } @else if (pendientes().length === 0) {
        <p class="vacio">
          <mat-icon>check_circle</mat-icon>
          No queda ninguna esperando.
        </p>
      } @else {
        @for (nc of pendientes(); track nc.ncfId) {
          <article class="ficha">
            <header>
              <span class="numero">N° {{ nc.numero }}</span>
              <span class="origen">{{ origen(nc) }}</span>
              <span class="fecha">{{ nc.fechaEmision | date:'dd/MM' }}</span>
            </header>

            <div class="contexto">
              @if (nc.nroPlan) { <span class="plan">{{ nc.nroPlan }}</span> }
              @if (nc.productoCodigo) { <span class="codigo">{{ nc.productoCodigo }}</span> }
              @if (nc.operario) { <span class="quien">la cargó {{ nc.operario }}</span> }
            </div>

            <p class="descripcion">{{ nc.descripcion }}</p>

            <footer>
              <button mat-flat-button class="btn-validar" (click)="validar(nc)">
                <mat-icon>check</mat-icon>
                Sí, es una NC
              </button>
              <button mat-stroked-button class="btn-rechazar" (click)="rechazar(nc)">
                <mat-icon>do_not_disturb_on</mat-icon>
                No procede
              </button>
            </footer>
          </article>
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" (click)="ref.close(resolvioAlguna)">
        Volver a lo que estaba haciendo
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 520px; max-width: 620px; max-height: 62vh; }
    .nota { margin: 0 0 14px; font-size: .9rem; color: #555; line-height: 1.45; }

    .centrado { display: flex; justify-content: center; padding: 30px 0; }
    .vacio {
      display: flex; align-items: center; gap: 8px; justify-content: center;
      padding: 26px 0; color: #2e7d32; font-size: .95rem;
    }

    .ficha {
      border: 1px solid #e0e0e0; border-left: 4px solid #ef6c00;
      border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; background: #fff;
    }
    .ficha header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .ficha .numero { font-weight: 800; color: #1a3a5c; }
    .ficha .origen { font-size: .8rem; color: rgba(0, 0, 0, .55); }
    .ficha .fecha { margin-left: auto; font-size: .8rem; color: rgba(0, 0, 0, .45); }

    .contexto { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .contexto span {
      padding: 2px 8px; border-radius: 999px; font-size: .76rem;
      background: #eceff1; color: #37474f;
    }
    .contexto .plan { background: #e8f1f8; color: #1a3a5c; font-weight: 600; }

    .descripcion {
      margin: 0 0 10px; font-size: .92rem; line-height: 1.45; color: #333;
      max-height: 4.5em; overflow: hidden;
    }

    .ficha footer { display: flex; gap: 8px; }
    .btn-validar { background: #2e7d32; color: #fff; }
    .btn-rechazar { color: #8a6200; }
  `]
})
export class NcPendientesDialogComponent {
  private servicio = inject(NoConformidadesService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  ref = inject(MatDialogRef<NcPendientesDialogComponent, boolean>);

  pendientes = signal<NoConformidad[]>([]);
  cargando = signal(true);
  resolvioAlguna = false;

  constructor() { this.cargar(); }

  private cargar(): void {
    this.cargando.set(true);
    this.servicio.listar({ estado: 'PENDIENTE' }).subscribe({
      next: lista => { this.pendientes.set(lista ?? []); this.cargando.set(false); },
      error: () => { this.pendientes.set([]); this.cargando.set(false); }
    });
  }

  origen(nc: NoConformidad): string {
    const base = etiquetaOrigen(nc.origen);
    return nc.origenOtro ? `${base}: ${nc.origenOtro}` : base;
  }

  validar(nc: NoConformidad): void {
    this.servicio.validar(nc.ncfId!).subscribe({
      next: () => {
        this.resolvioAlguna = true;
        this.snack.open(`N° ${nc.numero} validada`, 'OK', { duration: 3000 });
        this.cargar();
      },
      error: err => this.snack.open(err?.error?.message || 'No se pudo validar', 'OK', { duration: 5000 })
    });
  }

  rechazar(nc: NoConformidad): void {
    this.dialog.open<MotivoDialogComponent, MotivoDialogData, string>(MotivoDialogComponent, {
      data: {
        titulo: `La N° ${nc.numero} no procede`,
        nota: 'Queda registrada con tu motivo y afuera de los indicadores. Quien la cargó recibe el aviso.',
        etiqueta: 'Por qué no procede',
        botonConfirmar: 'No procede',
        botonCancelar: 'Volver'
      }
    }).afterClosed().subscribe(motivo => {
      if (!motivo) return;
      this.servicio.rechazar(nc.ncfId!, motivo).subscribe({
        next: () => {
          this.resolvioAlguna = true;
          this.snack.open(`N° ${nc.numero} marcada como no procedente`, 'OK', { duration: 3000 });
          this.cargar();
        },
        error: err => this.snack.open(err?.error?.message || 'No se pudo rechazar', 'OK', { duration: 5000 })
      });
    });
  }
}
