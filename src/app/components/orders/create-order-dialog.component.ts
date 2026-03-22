import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
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
    MatAutocompleteModule,
    MatButtonModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Nueva Orden</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-container">

        <!-- Cliente -->
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Cliente</mat-label>
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

        <!-- Producto con búsqueda -->
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Producto</mat-label>
            <input matInput
                   [formControl]="productoSearchCtrl"
                   [matAutocomplete]="autoProducto"
                   placeholder="Buscar por código o descripción"
                   (blur)="onProductoBlur()">
            <mat-icon matSuffix>search</mat-icon>
            <mat-autocomplete #autoProducto="matAutocomplete"
                              [displayWith]="displayProducto"
                              (optionSelected)="onProductoSelected($event.option.value)">
              @for (producto of productosFiltrados(); track producto.id) {
                <mat-option [value]="producto">
                  <span class="producto-code">{{ producto.codigo }}</span>
                  <span class="producto-desc"> — {{ producto.descripcion }}</span>
                </mat-option>
              }
              @if (productosFiltrados().length === 0) {
                <mat-option disabled>Sin resultados</mat-option>
              }
            </mat-autocomplete>
            @if (productoSearchCtrl.touched && productoSearchCtrl.hasError('required')) {
              <mat-error>El producto es obligatorio</mat-error>
            } @else if (productoSearchCtrl.touched && productoSearchCtrl.hasError('noSeleccionado')) {
              <mat-error>Seleccioná un producto de la lista</mat-error>
            }
          </mat-form-field>
        </div>

        <!-- Cantidad -->
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Cantidad</mat-label>
            <input matInput type="number" formControlName="cantidad" min="1">
            @if (form.get('cantidad')?.hasError('required')) {
              <mat-error>La cantidad es obligatoria</mat-error>
            }
            @if (form.get('cantidad')?.hasError('min')) {
              <mat-error>La cantidad debe ser mayor a 0</mat-error>
            }
          </mat-form-field>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button color="primary"
              [disabled]="loading()"
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

    .producto-code {
      font-weight: 600;
      color: #1976d2;
    }

    .producto-desc {
      color: #444;
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
  private todosProductos = signal<Producto[]>([]);
  productosFiltrados = signal<Producto[]>([]);
  loading = signal(false);

  /** Control separado para el input de búsqueda de producto */
  productoSearchCtrl = new FormControl<string | Producto>('');

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
      next: (data) => {
        this.todosProductos.set(data);
        this.productosFiltrados.set(data);
      },
      error: (err) => console.error('Error loading productos:', err)
    });

    // Filtrar mientras el usuario escribe
    this.productoSearchCtrl.valueChanges.subscribe(val => {
      if (typeof val === 'string') {
        // El usuario está escribiendo: limpiar la selección y filtrar
        this.form.patchValue({ productoId: null });
        this.filtrar(val);
      }
      // Si val es un objeto Producto, ya fue manejado por onProductoSelected
    });
  }

  private filtrar(busqueda: string): void {
    const b = busqueda.toLowerCase().trim();
    if (!b) {
      this.productosFiltrados.set(this.todosProductos());
      return;
    }
    this.productosFiltrados.set(
      this.todosProductos().filter(p =>
        p.codigo.toLowerCase().includes(b) ||
        p.descripcion.toLowerCase().includes(b)
      )
    );
  }

  /** Función de display para mat-autocomplete */
  displayProducto = (value: Producto | string | null): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return `${value.codigo} — ${value.descripcion}`;
  };

  onProductoSelected(producto: Producto): void {
    this.form.patchValue({ productoId: producto.id });
    this.productoSearchCtrl.setErrors(null);
    // Restaurar lista completa para la próxima apertura del panel
    this.productosFiltrados.set(this.todosProductos());
  }

  /** Al perder el foco sin haber seleccionado de la lista */
  onProductoBlur(): void {
    if (!this.form.get('productoId')?.value) {
      this.productoSearchCtrl.markAsTouched();
      if (this.productoSearchCtrl.value) {
        this.productoSearchCtrl.setErrors({ noSeleccionado: true });
      } else {
        this.productoSearchCtrl.setErrors({ required: true });
      }
    }
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    this.productoSearchCtrl.markAsTouched();

    // Validar producto seleccionado
    if (!this.form.get('productoId')?.value) {
      const texto = this.productoSearchCtrl.value;
      this.productoSearchCtrl.setErrors(texto ? { noSeleccionado: true } : { required: true });
      return;
    }

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
