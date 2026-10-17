import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ClientesService } from '../../services/clientes.service';
import { OrdersService } from '../../services/orders.service';
import { OrdenResponseDTO } from '../../models/order';
import { OpcionBuscable, SelectBuscableComponent } from '../../shared/select-buscable.component';

/**
 * El jefe de producción carga la orden sin cliente; acá el administrador se lo
 * asigna. Se puede dejar vacío, porque el cliente no es obligatorio.
 */
@Component({
  selector: 'app-asignar-cliente-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatIconModule, SelectBuscableComponent
  ],
  template: `
    <h2 mat-dialog-title class="titulo">
      <mat-icon>business</mat-icon>
      Cliente de la orden
    </h2>

    <mat-dialog-content class="contenido">
      <p class="orden">
        Plan <b>{{ orden.ordNroPlan }}</b>
        @if (orden.productoCodigo) { · {{ orden.productoCodigo }} }
      </p>

      <app-select-buscable label="Cliente" placeholder="Buscar cliente…"
                           textoTodos="Sin cliente" [valorTodos]="null"
                           [opciones]="opciones()"
                           [(ngModel)]="clienteId" />

      @if (error()) {
        <p class="error"><mat-icon>error</mat-icon> {{ error() }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cerrar()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="guardando()" (click)="guardar()">
        {{ guardando() ? 'Guardando…' : 'Guardar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .titulo { display: flex; align-items: center; gap: 8px; }
    .contenido { min-width: 400px; padding-top: 8px; }
    .orden { margin: 0 0 14px; font-size: .9rem; color: rgba(0, 0, 0, .7); }
    .error {
      display: flex; align-items: center; gap: 6px; margin: 8px 0 0;
      color: #c62828; font-size: .88rem; font-weight: 600;
    }
    .error mat-icon { font-size: 20px; width: 20px; height: 20px; }
  `]
})
export class AsignarClienteDialogComponent {
  private clientesService = inject(ClientesService);
  private ordersService = inject(OrdersService);
  private ref = inject(MatDialogRef<AsignarClienteDialogComponent, OrdenResponseDTO>);

  orden = inject<{ orden: OrdenResponseDTO }>(MAT_DIALOG_DATA).orden;

  clienteId: number | null = this.orden.clienteId ?? null;
  opciones = signal<OpcionBuscable[]>([]);
  guardando = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.clientesService.getAll().subscribe({
      next: cs => this.opciones.set(cs
        .map(c => ({ valor: c.id, texto: c.razonSocial }))
        .sort((a, b) => a.texto.localeCompare(b.texto))),
      error: () => this.error.set('No se pudo cargar la lista de clientes')
    });
  }

  guardar(): void {
    this.guardando.set(true);
    this.error.set(null);
    this.ordersService.asignarCliente(this.orden.id, this.clienteId).subscribe({
      next: actualizada => { this.guardando.set(false); this.ref.close(actualizada); },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.message || 'No se pudo asignar el cliente');
      }
    });
  }

  cerrar(): void { this.ref.close(); }
}
