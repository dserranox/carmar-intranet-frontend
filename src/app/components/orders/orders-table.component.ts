import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { OrdersService } from '../../services/orders.service';
import { OrdenResponseDTO } from '../../models/order';

@Component({
  selector: 'app-orders-table',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatIconModule, MatButtonModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule
  ],
  templateUrl: './orders-table.component.html',
  styleUrls: ['./orders-table.component.scss']
})
export class OrdersTableComponent implements OnInit {
  private ordersSvc = inject(OrdersService);
  dataSource = new MatTableDataSource<OrdenResponseDTO>([]);
  displayedColumns = [
    'ordNroPlan','clienteId','productoDescripcion','productoCodigo',
    'fechaInicio','cantidad','hoja','etiqueta','situacionClave','fechaFinalizacion','acciones'
  ];
  year = new Date().getFullYear();
  loading = false;
  filterValue = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.ordersSvc.listByYear(this.year).subscribe({
      next: (orders) => {
        this.dataSource.data = orders;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.dataSource.filterPredicate = (data, filter) => {
          const blob = `${data.ordNroPlan} ${data.clienteId} ${data.productoDescripcion} ${data.productoCodigo} ${data.situacionClave}`.toLowerCase();
          return blob.includes(filter.trim().toLowerCase());
        };
      },
      error: (err) => console.error(err),
      complete: () => this.loading = false
    });
  }

  applyFilter() {
    this.dataSource.filter = this.filterValue;
  }

  clearFilter() {
    this.filterValue = '';
    this.applyFilter();
  }

  openDocs(row: OrdenResponseDTO) {
    // For now: if there is a single doc, open it; if multiple, open the first.
    const docs = row.ordenesDocumentosDTOs || [];
    if (!docs.length) return;
    window.open(docs[0].odoDriveUrl, '_blank');
  }

  onActionClick(action: string, row: OrdenResponseDTO) {
    // Placeholder for future row actions
    console.log(action, row);
  }
}
