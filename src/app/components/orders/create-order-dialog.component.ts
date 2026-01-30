import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ClientesService } from '../../services/clientes.service';
import { ProductosService } from '../../services/productos.service';
import { Cliente } from '../../models/cliente';
import { Producto } from '../../models/producto';
import { OrdenCreateDTO } from '../../models/orden-create';
import { Observable, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-create-order-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule
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
              <mat-option [value]="null">-- Sin Cliente --</mat-option>
              <mat-option *ngFor="let cliente of clientes" [value]="cliente.id">
                {{ cliente.razonSocial }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Producto con Autocomplete -->
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Producto</mat-label>
            <input matInput
                   formControlName="productoSearch"
                   [matAutocomplete]="autoProducto"
                   placeholder="Buscar producto...">
            <mat-autocomplete #autoProducto="matAutocomplete"
                              [displayWith]="displayProducto"
                              (optionSelected)="onProductoSelected($event.option.value)">
              <mat-option *ngFor="let producto of filteredProductos$ | async" [value]="producto">
                <span class="producto-code">{{ producto.codigo }}</span> -
                <span>{{ producto.descripcion }}</span>
              </mat-option>
            </mat-autocomplete>
          </mat-form-field>
        </div>

        <!-- Cantidad -->
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Cantidad</mat-label>
            <input matInput type="number" formControlName="cantidad" min="1">
            <mat-error *ngIf="form.get('cantidad')?.hasError('min')">
              La cantidad debe ser mayor a 0
            </mat-error>
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

        <!-- Etiqueta (SI/NO) -->
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
              [disabled]="form.invalid || loading"
              (click)="onSubmit()">
        <span *ngIf="!loading">Crear Orden</span>
        <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
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
export class CreateOrderDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CreateOrderDialogComponent>);
  private clientesService = inject(ClientesService);
  private productosService = inject(ProductosService);

  form!: FormGroup;
  clientes: Cliente[] = [];
  filteredProductos$!: Observable<Producto[]>;
  loading = false;
  selectedProductoId: number | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadClientes();
  }

  private initForm(): void {
    this.form = this.fb.group({
      clienteId: [null],
      productoSearch: [''],
      cantidad: [null, Validators.min(1)],
      hoja: ['NO'],
      etiqueta: ['NO']
    });

    // Setup autocomplete con búsqueda en servidor
    this.filteredProductos$ = this.form.get('productoSearch')!.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        const searchTerm = typeof value === 'string' ? value : value?.descripcion || '';
        return this.productosService.buscar(searchTerm).pipe(
          catchError(() => of([]))
        );
      })
    );
  }

  displayProducto(producto: Producto): string {
    return producto ? `${producto.codigo} - ${producto.descripcion}` : '';
  }

  onProductoSelected(producto: Producto): void {
    this.selectedProductoId = producto.id;
  }

  private loadClientes(): void {
    this.clientesService.getAll().subscribe({
      next: (data) => this.clientes = data,
      error: (err) => console.error('Error loading clientes:', err)
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const formValue = this.form.value;

    const payload: OrdenCreateDTO = {
      clienteId: formValue.clienteId || undefined,
      productoId: this.selectedProductoId || undefined,
      cantidad: formValue.cantidad || undefined,
      hoja: formValue.hoja || undefined,
      etiqueta: formValue.etiqueta || undefined,
    };

    this.dialogRef.close(payload);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
