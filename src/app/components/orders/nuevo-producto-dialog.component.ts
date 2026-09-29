import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProductosService } from '../../services/productos.service';
import { Producto } from '../../models/producto';

/** Alta rápida de producto desde la pantalla de órdenes. */
@Component({
  selector: 'app-nuevo-producto-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title class="titulo">
      <mat-icon>inventory_2</mat-icon>
      Nuevo producto
    </h2>

    <mat-dialog-content class="contenido">
      <mat-form-field appearance="outline" class="campo">
        <mat-label>Código</mat-label>
        <input matInput [(ngModel)]="codigo" name="codigo" placeholder="C1234" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="campo">
        <mat-label>Descripción</mat-label>
        <input matInput [(ngModel)]="descripcion" name="descripcion" />
      </mat-form-field>

      @if (error()) {
        <p class="error"><mat-icon>error</mat-icon> {{ error() }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!completo || guardando()" (click)="guardar()">
        {{ guardando() ? 'Guardando…' : 'Crear producto' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .titulo { display: flex; align-items: center; gap: 8px; }
    .contenido { display: flex; flex-direction: column; min-width: 380px; padding-top: 8px; }
    .campo { width: 100%; }
    .error {
      display: flex; align-items: center; gap: 6px; margin: 0;
      color: #c62828; font-size: .88rem; font-weight: 600;
    }
    .error mat-icon { font-size: 20px; width: 20px; height: 20px; }
  `]
})
export class NuevoProductoDialogComponent {
  private productosService = inject(ProductosService);
  private ref = inject(MatDialogRef<NuevoProductoDialogComponent, Producto>);

  codigo = '';
  descripcion = '';
  guardando = signal(false);
  error = signal<string | null>(null);

  get completo(): boolean {
    return !!this.codigo.trim() && !!this.descripcion.trim();
  }

  guardar(): void {
    if (!this.completo) return;
    this.guardando.set(true);
    this.error.set(null);

    this.productosService.crear({ codigo: this.codigo.trim(), descripcion: this.descripcion.trim() }).subscribe({
      next: producto => {
        this.guardando.set(false);
        this.ref.close(producto);
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.message || 'No se pudo crear el producto');
      }
    });
  }

  cancelar(): void {
    this.ref.close();
  }
}
