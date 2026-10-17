import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OrdenAbierta } from '../../models/calidad';

function normalizar(texto: string): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Elegir qué orden se va a controlar. Pensado para usar con el dedo. */
@Component({
  selector: 'app-elegir-orden-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title class="titulo">
      <mat-icon>playlist_add_check</mat-icon>
      ¿Qué orden vas a controlar?
    </h2>

    <mat-dialog-content class="contenido">
      <mat-form-field appearance="outline" class="buscador">
        <mat-label>{{ puedeVerClientes ? 'Buscar por plan, código, producto o cliente' : 'Buscar por plan, código o producto' }}</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)" autocomplete="off" />
      </mat-form-field>

      <p class="ayuda">
        Arriba aparecen las órdenes que se están trabajando ahora mismo, con el puesto donde ir.
      </p>

      <div class="lista">
        @for (o of visibles(); track o.ordenId) {
          <button type="button" class="orden" [class.trabajando]="o.operarios.length > 0"
                  [disabled]="o.yaControlada" (click)="elegir(o)">
            <div class="izquierda">
              <span class="plan">{{ o.nroPlan }}</span>
              <span class="codigo">{{ o.productoCodigo ?? '—' }}</span>
            </div>
            <div class="centro">
              <span class="desc">{{ o.productoDescripcion ?? '—' }}</span>
              <span class="cliente">
                @if (puedeVerClientes) { {{ o.clienteRazonSocial ?? 'sin cliente' }} · }
                {{ o.situacionClave }}
              </span>
            </div>
            <div class="derecha">
              @if (o.yaControlada) {
                <span class="marca ya">ya controlada</span>
              } @else if (o.operarios.length) {
                <span class="marca activa">{{ o.operarios.join(', ') }}</span>
                @if (o.puestos.length) { <span class="puesto">{{ o.puestos.join(' · ') }}</span> }
              } @else {
                <span class="marca quieta">sin trabajo en curso</span>
              }
            </div>
          </button>
        }
        @if (visibles().length === 0) {
          <p class="vacio">No hay órdenes abiertas que coincidan con «{{ busqueda() }}».</p>
        }
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cerrar()">Cancelar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .titulo { display: flex; align-items: center; gap: 8px; }
    .contenido { width: min(90vw, 900px); padding-top: 8px; }
    .buscador { width: 100%; }
    .ayuda { margin: -8px 0 8px; font-size: .8rem; color: rgba(0,0,0,.55); }

    .lista { display: flex; flex-direction: column; gap: 6px; max-height: 52vh; overflow: auto; }

    .orden {
      display: grid; grid-template-columns: 130px 1fr 190px;
      align-items: center; gap: 12px;
      width: 100%; text-align: left; cursor: pointer;
      padding: 10px 14px; border-radius: 10px;
      border: 1px solid rgba(0,0,0,.10); background: #fff;
      font: inherit;
    }
    .orden:hover:not(:disabled) { background: #e0f2f1; border-color: #26a69a; }
    .orden:disabled { opacity: .5; cursor: not-allowed; }
    .orden.trabajando { border-left: 4px solid #1565c0; }

    .izquierda { display: flex; flex-direction: column; }
    .plan { font-weight: 700; font-size: 1rem; color: #1a1a2e; }
    .codigo { font-size: .8rem; color: rgba(0,0,0,.6); }

    .centro { display: flex; flex-direction: column; min-width: 0; }
    .desc { font-size: .88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cliente { font-size: .76rem; color: rgba(0,0,0,.5); }

    .derecha { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .marca { font-size: .74rem; font-weight: 700; border-radius: 999px; padding: 2px 10px; }
    .marca.activa { background: #e3f2fd; color: #1565c0; }
    .marca.quieta { background: #eceff1; color: #607d8b; }
    .marca.ya { background: #e8f5e9; color: #2e7d32; }
    .puesto { font-size: .72rem; color: rgba(0,0,0,.5); }

    .vacio { padding: 20px; text-align: center; color: rgba(0,0,0,.5); }
  `]
})
export class ElegirOrdenDialogComponent {
  private ref = inject(MatDialogRef<ElegirOrdenDialogComponent, OrdenAbierta>);
  private datos = inject<{ ordenes: OrdenAbierta[] }>(MAT_DIALOG_DATA);

  busqueda = signal('');

  /**
   * En planta no se ve para quién se fabrica. Si el rol no puede verlo, no se
   * muestra la línea ni se promete buscar por algo que nunca va a estar:
   * «sin cliente» hace pensar que falta cargar un dato y alguien lo va a ir a
   * «arreglar».
   */
  puedeVerClientes = this.tienePermiso('CLIENTES:READ');

  private tienePermiso(permiso: string): boolean {
    try {
      const data = localStorage.getItem('user');
      if (!data) return false;
      const perms = JSON.parse(data)?.permissions;
      return Array.isArray(perms) && perms.includes(permiso);
    } catch { return false; }
  }

  visibles = computed(() => {
    const q = normalizar(this.busqueda()).trim();
    const todas = this.datos.ordenes ?? [];
    if (!q) return todas;
    return todas.filter(o =>
      normalizar(o.nroPlan).includes(q) ||
      normalizar(o.productoCodigo ?? '').includes(q) ||
      normalizar(o.productoDescripcion ?? '').includes(q) ||
      normalizar(o.clienteRazonSocial ?? '').includes(q));
  });

  elegir(orden: OrdenAbierta): void {
    if (orden.yaControlada) return;
    this.ref.close(orden);
  }

  cerrar(): void { this.ref.close(); }
}
