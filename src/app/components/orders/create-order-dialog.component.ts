import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClientesService } from '../../services/clientes.service';
import { ProductosService } from '../../services/productos.service';
import { Cliente } from '../../models/cliente';
import { Producto } from '../../models/producto';
import { OrdenCreateDTO } from '../../models/orden-create';

@Component({
  selector: 'app-create-order-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatRadioModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>Nueva Orden</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-container">

        <!-- Cliente -->
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Cliente </mat-label>
            <mat-select formControlName="clienteId">
              @for (cliente of clientes(); track cliente.id) {
                <mat-option [value]="cliente.id">{{ cliente.razonSocial }}</mat-option>
              }
            </mat-select>
            @if (form.get('clienteId')?.hasError('required')) {
              <mat-error>El cliente es obligatorio</mat-error>
            }
          </mat-form-field>
        </div>

        <!-- Producto -->
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Producto </mat-label>
            <mat-select formControlName="productoId">
              @for (producto of productos(); track producto.id) {
                <mat-option [value]="producto.id">
                  <span class="producto-code">{{ producto.codigo }}</span> - {{ producto.descripcion }}
                </mat-option>
              }
            </mat-select>
            @if (form.get('productoId')?.hasError('required')) {
              <mat-error>El producto es obligatorio</mat-error>
            }
          </mat-form-field>
        </div>

        <!-- Cantidad -->
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Cantidad </mat-label>
            <input matInput type="number" formControlName="cantidad" min="1">
            @if (form.get('cantidad')?.hasError('required')) {
              <mat-error>La cantidad es obligatoria</mat-error>
            }
            @if (form.get('cantidad')?.hasError('min')) {
              <mat-error>La cantidad debe ser mayor a 0</mat-error>
            }
          </mat-form-field>
        </div>

        <!-- Hoja -->
        <div class="form-row">
          <label class="radio-label">Hoja:</label>
          <mat-radio-group formControlName="hoja" class="radio-group">
            <mat-radio-button value="SI">SI</mat-radio-button>
            <mat-radio-button value="NO">NO</mat-radio-button>
          </mat-radio-group>
        </div>

        <!-- Etiqueta -->
        <div class="form-row">
          <label class="radio-label">Etiqueta:</label>
          <mat-radio-group formControlName="etiqueta" class="radio-group">
            <mat-radio-button value="SI">SI</mat-radio-button>
            <mat-radio-button value="NO">NO</mat-radio-button>
          </mat-radio-group>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button color="primary"
              [disabled]="form.invalid || loading()"
              (click)="onSubmit()">
        @if (!loading()) {
          <span>Crear Orden</span>
        }
        @if (loading()) {
          <mat-spinner diameter="20"></mat-spinner>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      min-width: 500px;
      max-width: 600px;
      padding: 20px 0;
    }

    .form-row {
      margin-bottom: 16px;
    }

    .full-width {
      width: 100%;
    }

    .radio-label {
      display: block;
      font-size: 14px;
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 8px;
    }

    .radio-group {
      display: flex;
      gap: 16px;
    }

    .producto-code {
      font-weight: 500;
      color: #1976d2;
    }

    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    mat-spinner {
      display: inline-block;
      margin: 0 auto;
    }
  `]
})
export class CreateOrderDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CreateOrderDialogComponent>);
  private clientesService = inject(ClientesService);
  private productosService = inject(ProductosService);

  clientes = signal<Cliente[]>([]);
  productos = signal<Producto[]>([]);
  loading = signal(false);

  form = this.fb.group({
    clienteId: [null as number | null, Validators.required],
    productoId: [null as number | null, Validators.required],
    cantidad: [null as number | null, [Validators.required, Validators.min(1)]],
    hoja: ['NO'],
    etiqueta: ['NO']
  });

  constructor() {
    this.clientesService.getAll().subscribe({
      next: (data) => this.clientes.set(data),
      error: (err) => console.error('Error loading clientes:', err)
    });

    this.productosService.getAll().subscribe({
      next: (data) => this.productos.set(data),
      error: (err) => console.error('Error loading productos:', err)
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const formValue = this.form.value;

    const payload: OrdenCreateDTO = {
      clienteId: formValue.clienteId!,
      productoId: formValue.productoId!,
      cantidad: formValue.cantidad!,
      hoja: formValue.hoja ?? undefined,
      etiqueta: formValue.etiqueta ?? undefined,
    };

    this.dialogRef.close(payload);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
