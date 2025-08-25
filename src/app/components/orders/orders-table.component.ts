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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TasksService } from '../../services/tasks.service';
import { StartTaskDialogComponent } from './start-task-dialog.component';
import { Router } from '@angular/router';

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

  isAdmin = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private tasksService: TasksService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.resolveIsAdmin();
    this.load();
  }

  private resolveIsAdmin() {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) { this.isAdmin = false; return; }
      const obj = JSON.parse(raw);
      const username = (obj?.username || '').toString().toLowerCase();
      const roles: string[] = Array.isArray(obj?.roles) ? obj.roles.map((r:any)=>String(r).toUpperCase()) : [];
      this.isAdmin = username === 'admin' || roles.includes('ADMIN') || roles.includes('ROLE_ADMIN');
    } catch {
      this.isAdmin = false;
    }
  }

  load() {
    this.loading = true;
    this.ordersSvc.listByYear(this.year).subscribe({
      next: (orders) => {
        let data = orders || [];
        if (!this.isAdmin) {
          data = data.filter(o => (o.situacionClave || '').toUpperCase() === 'EN PROCESO');
        }
        this.dataSource = new MatTableDataSource<OrdenResponseDTO>(data);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.dataSource.filterPredicate = (row, filter) => {
          const blob = `${row.ordNroPlan} ${row.clienteId} ${row.productoDescripcion} ${row.productoCodigo} ${row.situacionClave}`.toLowerCase();
          return blob.includes(filter.trim().toLowerCase());
        };
        if (this.filterValue) this.applyFilter();
      },
      error: (err) => console.error(err),
      complete: () => this.loading = false
    });
  }

  applyFilter() { this.dataSource.filter = this.filterValue; }
  clearFilter() { this.filterValue = ''; this.applyFilter(); }

  openDocs(row: OrdenResponseDTO) {
    const docs: any[] = (row as any).ordenesDocumentosDTOs || [];
    if (!docs?.length) return;
    window.open(docs[0].odoDriveUrl, '_blank');
  }

  onActionClick(action: string, row: OrdenResponseDTO) { console.log(action, row); }

  statusClass(s?: string) {
    const val = (s || '').toUpperCase();
    switch (val) {
      case 'REVISAR PLANO': return 'status revisar-plano';
      case 'PLANIFICADO': return 'status planificado';
      case 'EN PROCESO': return 'status en-proceso';
      case 'TERMINADO': return 'status terminado';
      case 'FALTA MATERIAL': return 'status falta-material';
      default: return 'status otro';
    }
  }

  canShowActions(row: any): boolean {
    return row.situacionClave === 'EN PROCESO';
  }

  openStartTaskDialog(order: any) {
    const dialogRef = this.dialog.open(StartTaskDialogComponent, {
      data: { order }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.tasksService.startTask(result).subscribe(() => {
          this.snack.open('Tarea iniciada correctamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/tareas'], {
            queryParams: result
          });
        });
      }
    });
  }

  stopOrder(order: any) {
    this.snack.open('Finalizar orden aún no implementado', 'Cerrar', { duration: 3000 });
  }
}
