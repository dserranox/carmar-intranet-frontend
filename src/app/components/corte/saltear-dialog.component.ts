import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface SaltearDialogResult {
  subtipo: string;
  motivo: string;
}

const MOTIVOS = [
  { clave: 'FALTA_MATERIAL', etiqueta: 'Faltante de material',    icono: 'inventory_2' },
  { clave: 'MAQUINA',        etiqueta: 'Problema de máquina',     icono: 'build' },
  { clave: 'OTRA_MAQUINA',   etiqueta: 'Se hace en otra máquina', icono: 'swap_horiz' },
  { clave: 'OTRO',           etiqueta: 'Otro',                    icono: 'more_horiz' }
];

/**
 * Por qué se deja un corte para después.
 *
 * La lista es fija a propósito: con texto libre cada uno escribe lo que quiere
 * y después no hay forma de contar cuánto se frena por falta de material. Solo
 * «otro» pide escribir.
 */
@Component({
  selector: 'app-saltear-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
            MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Saltear el corte</h2>

    <mat-dialog-content>
      <p class="nota">
        El corte no se pierde: queda pendiente y al final de la sábana se vuelve a
        ofrecer. Si para entonces todavía no se puede hacer, pasa a la lista de
        pendientes para reasignarlo.
      </p>

      <div class="motivos">
        @for (m of motivos; track m.clave) {
          <button type="button" class="motivo" [class.activo]="elegido === m.clave"
                  (click)="elegido = m.clave">
            <mat-icon>{{ m.icono }}</mat-icon>
            {{ m.etiqueta }}
          </button>
        }
      </div>

      <mat-form-field appearance="outline" class="detalle">
        <mat-label>{{ elegido === 'OTRO' ? 'Contá qué pasó' : 'Detalle (opcional)' }}</mat-label>
        <textarea matInput rows="2" [(ngModel)]="detalle"
                  placeholder="Por ejemplo: no hay caño de 16 mm"></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close()">Seguir cortando</button>
      <button mat-flat-button class="btn-saltear" [disabled]="!puede()" (click)="confirmar()">
        Saltear el corte
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 440px; max-width: 540px; }
    .nota { margin: 0 0 14px; font-size: .9rem; color: #555; line-height: 1.45; }
    .motivos { display: flex; flex-direction: column; gap: 9px; margin-bottom: 14px; }
    .motivo {
      display: flex; align-items: center; gap: 10px;
      padding: 11px 14px; border: 2px solid #e0e0e0; border-radius: 10px;
      background: #fff; cursor: pointer; font-size: .95rem; text-align: left;
    }
    .motivo:hover { border-color: #90caf9; }
    .motivo.activo { border-color: #1565c0; background: #e3f2fd; font-weight: 600; color: #0d47a1; }
    .motivo mat-icon { color: #1565c0; }
    .detalle { width: 100%; }
    .detalle ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .btn-saltear { background: #ef6c00; color: #fff; }
    .btn-saltear[disabled] { background: rgba(0, 0, 0, .12); color: rgba(0, 0, 0, .38); }
  `]
})
export class SaltearDialogComponent {
  ref = inject(MatDialogRef<SaltearDialogComponent, SaltearDialogResult | undefined>);

  motivos = MOTIVOS;
  elegido = '';
  detalle = '';

  puede(): boolean {
    if (!this.elegido) return false;
    return this.elegido !== 'OTRO' || !!this.detalle.trim();
  }

  confirmar(): void {
    if (!this.puede()) return;
    const etiqueta = this.motivos.find(m => m.clave === this.elegido)?.etiqueta ?? this.elegido;
    this.ref.close({ subtipo: this.elegido, motivo: this.detalle.trim() || etiqueta });
  }
}
