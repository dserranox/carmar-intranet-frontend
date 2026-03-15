import { TareasDTO } from './../../models/tarea';
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
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { OrdersService } from '../../services/orders.service';
import { OrdenResponseDTO } from '../../models/order';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TasksService } from '../../services/tasks.service';
import { StartTaskDialogComponent } from './start-task-dialog.component';
import { Router } from '@angular/router';
import { FinishOrderDialogComponent } from './finish-order-dialog.component';
import { CreateOrderDialogComponent } from './create-order-dialog.component';
import { OrdenCreateDTO } from '../../models/orden-create';
import { FechaFormatoDirective } from '../../directives/fecha-formato.directive';

@Component({
  selector: 'app-orders-table',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, FechaFormatoDirective,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatIconModule, MatButtonModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule
  ],
  templateUrl: './orders-table.component.html',
  styleUrls: ['./orders-table.component.scss']
})
export class OrdersTableComponent implements OnInit {
  private ordersSvc = inject(OrdersService);
  dataSource = new MatTableDataSource<OrdenResponseDTO>([]);
  tareasDTO : TareasDTO = {} as TareasDTO;
  displayedColumns = [
    'fechaCreacion','ordNroPlan','clienteId','productoCodigo','productoDescripcion',
    'cantidad','fechaInicio','situacionClave','fechaFinalizacion','acciones'
  ];
  years: number[] = [];
  year = new Date().getFullYear();
  loading = false;
  filterValue = '';

  fechaCreacionDesde: Date | null = null;
  fechaCreacionHasta: Date | null = null;
  fechaInicioDesde: Date | null = null;
  fechaInicioHasta: Date | null = null;
  fechaFinalizacionDesde: Date | null = null;
  fechaFinalizacionHasta: Date | null = null;

  isAdmin = false;

  @ViewChild(MatPaginator) set paginator(p: MatPaginator) {
    if (p) this.dataSource.paginator = p;
  }
  @ViewChild(MatSort) set sort(s: MatSort) {
    if (s) this.dataSource.sort = s;
  }

  constructor(
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private tasksService: TasksService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.resolveIsAdmin();
    this.dataSource.filterPredicate = (row, filter) => {
      const blob = `${row.ordNroPlan} ${row.clienteId} ${row.productoDescripcion} ${row.productoCodigo} ${row.situacionClave}`.toLowerCase();
      return blob.includes(filter.trim().toLowerCase());
    };
    this.loadYears();
  }

  loadYears(): void {
    this.ordersSvc.getYears().subscribe({
      next: (years) => {
        this.years = years;
        if (years.length > 0) {
          this.year = years[0];
        }
        this.load();
      },
      error: () => this.load()
    });
  }

  private resolveIsAdmin() {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) { this.isAdmin = false; return; }
      const obj = JSON.parse(raw);
      const username = (obj?.username || '').toString().toLowerCase();
      const permissions: string[] = Array.isArray(obj?.permissions) ? obj.permissions.map((r:any)=>String(r).toUpperCase()) : [];
      this.isAdmin = username === 'admin' || permissions.includes('ORDENES:WRITE');
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
        this.dataSource.data = data;
        if (this.filterValue) this.applyFilter();
      },
      error: (err) => console.error(err),
      complete: () => this.loading = false
    });
  }

  applyFilter() { this.dataSource.filter = this.filterValue; }

  clearFilter() {
    this.filterValue = '';
    this.fechaCreacionDesde = null;
    this.fechaCreacionHasta = null;
    this.fechaInicioDesde = null;
    this.fechaInicioHasta = null;
    this.fechaFinalizacionDesde = null;
    this.fechaFinalizacionHasta = null;
    this.applyFilter();
  }

  // openDocs(row: OrdenResponseDTO) {
  //   const docs: any[] = (row as any).ordenesDocumentosDTOs || [];
  //   if (!docs?.length) return;
  //   window.open(docs[0].odoDriveUrl, '_blank');
  // }

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

  isPlanificado(row: any): boolean {
    return row.situacionClave === 'PLANIFICADO';
  }

  isEnProceso(row: any): boolean {
    return row.situacionClave === 'EN PROCESO';
  }

  startProcess(order: OrdenResponseDTO): void {
    const ordenAIniciar: OrdenResponseDTO = {
      ...order,
      situacionClave: 'EN PROCESO'
    };
    this.ordersSvc.avanzarOrden(ordenAIniciar).subscribe({
      next: () => {
        this.snack.open('Orden iniciada correctamente', 'Cerrar', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        console.error('Error al iniciar orden:', err);
        this.snack.open('Error al iniciar la orden', 'Cerrar', { duration: 5000 });
      }
    });
  }

  openStartTaskDialog(order: any) {
    const dialogRef = this.dialog.open(StartTaskDialogComponent, {
      data: { order }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.tareasDTO.ordenId = order.id;
        this.tareasDTO.operacionId = result.operacionId;
        this.tareasDTO.nroMaquina = result.nroMaquina;
        this.tasksService.iniciarTarea(this.tareasDTO).subscribe(tareaResult => {
          this.snack.open('Tarea iniciada correctamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/tareas'], {
            queryParams: tareaResult.tarId
          });
        });
      }
    });
  }

  stopOrder(order: any) {
    console.log('Stopping order', order);
    const dialogRef = this.dialog.open(FinishOrderDialogComponent, {
      data: order
    });
    dialogRef.afterClosed().subscribe(result => {
      this.load();
    });
  }

  openCreateOrderDialog() {
    const dialogRef = this.dialog.open(CreateOrderDialogComponent, {
      width: '600px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((result: OrdenCreateDTO | undefined) => {
      if (!result) return;

      this.loading = true;
      this.ordersSvc.createOrden(result).subscribe({
        next: (ordenCreada) => {
          this.snack.open('Orden creada exitosamente', 'Cerrar', { duration: 3000 });
          this.load(); // Reload the table
        },
        error: (err) => {
          console.error('Error creating order:', err);
          const errorMsg = err.error?.message || 'Error al crear la orden';
          this.snack.open(errorMsg, 'Cerrar', { duration: 5000 });
          this.loading = false;
        }
      });
    });
  }
}
