import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ClientesService } from '../../services/clientes.service';
import { Cliente } from '../../models/cliente';

/** Alta rápida de cliente sin salir de la carga de la orden. */
@Component({
  selector: 'app-nuevo-cliente-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title class="titulo">
      <mat-icon>person_add</mat-icon>
      Nuevo cliente
    </h2>

    <mat-dialog-content class="contenido">
      <mat-form-field appearance="outline" class="campo">
        <mat-label>Razón social</mat-label>
        <input matInput [(ngModel)]="razonSocial" name="razonSocial" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="campo">
        <mat-label>CUIT</mat-label>
        <input matInput [(ngModel)]="cuit" name="cuit" placeholder="30-12345678-9" />
      </mat-form-field>

      @if (error()) {
        <p class="error"><mat-icon>error</mat-icon> {{ error() }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!completo || guardando()" (click)="guardar()">
        {{ guardando() ? 'Guardando…' : 'Crear cliente' }}
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
export class NuevoClienteDialogComponent {
  private clientesService = inject(ClientesService);
  private ref = inject(MatDialogRef<NuevoClienteDialogComponent, Cliente>);

  razonSocial = '';
  cuit = '';
  guardando = signal(false);
  error = signal<string | null>(null);

  get completo(): boolean {
    return !!this.razonSocial.trim() && !!this.cuit.trim();
  }

  guardar(): void {
    if (!this.completo) return;
    this.guardando.set(true);
    this.error.set(null);

    this.clientesService.crear({ razonSocial: this.razonSocial.trim(), cuit: this.cuit.trim() }).subscribe({
      next: cliente => {
        this.guardando.set(false);
        this.ref.close(cliente);
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.message || 'No se pudo crear el cliente');
      }
    });
  }

  cancelar(): void {
    this.ref.close();
  }
}
