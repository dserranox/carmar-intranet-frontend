import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { OrdersService } from '../../services/orders.service';
import { OperacionesDTO } from '../../models/operacion';
import { OrdenResponseDTO } from '../../models/order';



export interface StartTaskDialogResult {
  operacionId: number;
  nroMaquina: number;
  ordenId?: number;
}

@Component({
  selector: 'app-finish-order-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './finish-order-dialog.component.html',
  styleUrls: ['./finish-order-dialog.component.scss']
})
export class FinishOrderDialogComponent implements OnInit {
  operaciones: OperacionesDTO[] = [];

  constructor(
    private ref: MatDialogRef<FinishOrderDialogComponent, void>,
    @Inject(MAT_DIALOG_DATA) public data: OrdenResponseDTO,
    private ordenesService: OrdersService
  ) {
  }

  ngOnInit(): void {    
    console.log(this.data);
  }

  cancelar(): void {
    this.ref.close();
  }

  finalizarOrden(): void {
    this.ordenesService.finalizarOrden(this.data.id).subscribe({
      next: () => { this.ref.close(); }
    });
  }
}
