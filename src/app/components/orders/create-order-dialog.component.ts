import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
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
import { NuevoClienteDialogComponent } from './nuevo-cliente-dialog.component';
import { NuevoProductoDialogComponent } from './nuevo-producto-dialog.component';

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
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title>Nueva Orden</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-container">

        <!-- Cliente: solo lo carga quien puede verlo. El jefe de producción
             da de alta la orden sin cliente y el administrador se lo asigna. -->
        @if (puedeVerClientes) {
        <div class="form-row fila-cliente">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Cliente</mat-label>
            <input matInput
                   [formControl]="clienteSearchCtrl"
                   [matAutocomplete]="autoCliente"
                   placeholder="Buscar por razón social"
                   (blur)="onClienteBlur()">
            <mat-icon matSuffix>search</mat-icon>
            <mat-autocomplete #autoCliente="matAutocomplete"
                              [displayWith]="displayCliente"
                              (optionSelected)="onClienteSelected($event.option.value)">
              @for (cliente of clientesFiltrados(); track cliente.id) {
                <mat-option [value]="cliente">{{ cliente.razonSocial }}</mat-option>
              }
              @if (clientesFiltrados().length === 0) {
                <mat-option disabled>Sin resultados</mat-option>
              }
            </mat-autocomplete>
            @if (clienteSearchCtrl.touched && clienteSearchCtrl.hasError("noSeleccionado")) {
              <mat-error>Seleccioná un cliente de la lista</mat-error>
            }
          </mat-form-field>

          @if (puedeCrearClientes) {
            <button mat-stroked-button type="button" class="btn-nuevo-cliente"
                    matTooltip="Dar de alta un cliente nuevo" (click)="nuevoCliente()">
              <mat-icon>person_add</mat-icon>
              Nuevo
            </button>
          }
        </div>
        }

        <!-- Producto con búsqueda -->
        <div class="form-row fila-cliente">
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

          @if (puedeCrearProductos) {
            <button mat-stroked-button type="button" class="btn-nuevo-cliente"
                    matTooltip="Dar de alta un producto nuevo" (click)="nuevoProducto()">
              <mat-icon>inventory_2</mat-icon>
              Nuevo
            </button>
          }
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
      <button mat-flat-button color="primary"
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

    .fila-cliente {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .btn-nuevo-cliente {
      margin-top: 8px;
      white-space: nowrap;
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
  private dialog = inject(MatDialog);
  private clientesService = inject(ClientesService);
  private productosService = inject(ProductosService);

  private todosClientes = signal<Cliente[]>([]);
  clientesFiltrados = signal<Cliente[]>([]);
  private todosProductos = signal<Producto[]>([]);
  productosFiltrados = signal<Producto[]>([]);
  loading = signal(false);

  clienteSearchCtrl = new FormControl<string | Cliente>('');
  /** Control separado para el input de búsqueda de producto */
  productoSearchCtrl = new FormControl<string | Producto>('');

  form = this.fb.group({
    // El cliente no es obligatorio: la orden puede nacer sin él.
    clienteId: [null as number | null],
    productoId: [null as number | null, Validators.required],
    cantidad: [null as number | null, [Validators.required, Validators.min(1)]],
    hoja: ['NO'],
    etiqueta: ['NO']
  });

  constructor() {
    this.clientesService.getAll().subscribe({
      next: (data) => {
        this.todosClientes.set(data);
        this.clientesFiltrados.set(data);
      },
      error: (err) => console.error('Error loading clientes:', err)
    });

    this.clienteSearchCtrl.valueChanges.subscribe(val => {
      if (typeof val === 'string') {
        this.form.patchValue({ clienteId: null });
        this.filtrarClientes(val);
      }
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

  private filtrarClientes(busqueda: string): void {
    const b = busqueda.toLowerCase().trim();
    if (!b) { this.clientesFiltrados.set(this.todosClientes()); return; }
    this.clientesFiltrados.set(
      this.todosClientes().filter(c => c.razonSocial.toLowerCase().includes(b))
    );
  }

  displayCliente = (value: Cliente | string | null): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.razonSocial;
  };

  onClienteSelected(cliente: Cliente): void {
    this.form.patchValue({ clienteId: cliente.id });
    this.clienteSearchCtrl.setErrors(null);
    this.clientesFiltrados.set(this.todosClientes());
  }

  /** Sin CLIENTES:READ no se muestra el campo ni se exige el dato. */
  get puedeVerClientes(): boolean {
    try {
      const data = localStorage.getItem("user");
      if (!data) return false;
      const perms = JSON.parse(data)?.permissions;
      return Array.isArray(perms) && perms.includes("CLIENTES:READ");
    } catch { return false; }
  }

  get puedeCrearClientes(): boolean {
    try {
      const data = localStorage.getItem('user');
      if (!data) return false;
      const perms = JSON.parse(data)?.permissions;
      return Array.isArray(perms) && perms.includes('CLIENTES:WRITE');
    } catch { return false; }
  }

  get puedeCrearProductos(): boolean {
    try {
      const data = localStorage.getItem('user');
      if (!data) return false;
      const perms = JSON.parse(data)?.permissions;
      return Array.isArray(perms) && perms.includes('PRODUCTOS:WRITE');
    } catch { return false; }
  }

  /** Da de alta un producto y lo deja seleccionado en la orden. */
  nuevoProducto(): void {
    const ref = this.dialog.open(NuevoProductoDialogComponent, { disableClose: true });
    ref.afterClosed().subscribe((producto: Producto | undefined) => {
      if (!producto) return;
      this.todosProductos.set([...this.todosProductos(), producto]
        .sort((a, b) => a.codigo.localeCompare(b.codigo)));
      this.productosFiltrados.set(this.todosProductos());
      this.productoSearchCtrl.setValue(producto);
      this.onProductoSelected(producto);
    });
  }

  /** Da de alta un cliente y lo deja seleccionado en la orden. */
  nuevoCliente(): void {
    const ref = this.dialog.open(NuevoClienteDialogComponent, { disableClose: true });
    ref.afterClosed().subscribe((cliente: Cliente | undefined) => {
      if (!cliente) return;
      this.todosClientes.set([...this.todosClientes(), cliente]
        .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)));
      this.clientesFiltrados.set(this.todosClientes());
      this.clienteSearchCtrl.setValue(cliente);
      this.onClienteSelected(cliente);
    });
  }

  onClienteBlur(): void {
    if (this.form.get('clienteId')?.value) return;
    // Dejarlo vacío es válido: el administrador lo asigna después. Solo se
    // reclama cuando escribieron algo y no eligieron de la lista.
    if (this.clienteSearchCtrl.value) {
      this.clienteSearchCtrl.markAsTouched();
      this.clienteSearchCtrl.setErrors({ noSeleccionado: true });
    } else {
      this.clienteSearchCtrl.setErrors(null);
    }
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
    this.clienteSearchCtrl.markAsTouched();
    this.productoSearchCtrl.markAsTouched();

    // Validar cliente seleccionado
    if (!this.form.get('clienteId')?.value) {
      const texto = this.clienteSearchCtrl.value;
      this.clienteSearchCtrl.setErrors(texto ? { noSeleccionado: true } : { required: true });
      return;
    }

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
