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
import { TaskSessionDialogComponent } from './task-session-dialog.component';
import { Router } from '@angular/router';
import { FinishOrderDialogComponent } from './finish-order-dialog.component';
import { CreateOrderDialogComponent } from './create-order-dialog.component';
import { OrdenCreateDTO } from '../../models/orden-create';
import { FechaFormatoDirective } from '../../directives/fecha-formato.directive';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

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

  // Listas de opciones para los selects (extraídas de los datos cargados)
  nroPlanes: string[] = [];
  clientes: number[] = [];
  codigos: string[] = [];
  productos: string[] = [];
  estados: string[] = [];

  // Valores seleccionados en los filtros
  filterNroPlan = '';
  filterClienteId: number | '' = '';
  filterProductoCodigo = '';
  filterProductoDescripcion = '';
  filterSituacionClave = '';

  fechaCreacionDesde: Date | null = null;
  fechaCreacionHasta: Date | null = null;
  fechaInicioDesde: Date | null = null;
  fechaInicioHasta: Date | null = null;
  fechaFinalizacionDesde: Date | null = null;
  fechaFinalizacionHasta: Date | null = null;

  private allOrders: OrdenResponseDTO[] = [];

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
    this.resetSelectFilters();
    this.ordersSvc.listByYear(this.year).subscribe({
      next: (orders) => {
        let data = orders || [];
        if (!this.isAdmin) {
          data = data.filter(o => (o.situacionClave || '').toUpperCase() === 'EN PROCESO');
        }
        this.allOrders = data;
        this.buildFilterOptions(data);
        this.applyFilters();
      },
      error: (err) => console.error(err),
      complete: () => this.loading = false
    });
  }

  private buildFilterOptions(orders: OrdenResponseDTO[]): void {
    this.nroPlanes = [...new Set(orders.map(o => o.ordNroPlan).filter((v): v is string => !!v))].sort();
    this.clientes  = [...new Set(orders.map(o => o.clienteId).filter((v): v is number => v != null))].sort((a, b) => a - b);
    this.codigos   = [...new Set(orders.map(o => o.productoCodigo).filter((v): v is string => !!v))].sort();
    this.productos = [...new Set(orders.map(o => o.productoDescripcion).filter((v): v is string => !!v))].sort();
    this.estados   = [...new Set(orders.map(o => o.situacionClave).filter((v): v is string => !!v))].sort();
  }

  private resetSelectFilters(): void {
    this.filterNroPlan = '';
    this.filterClienteId = '';
    this.filterProductoCodigo = '';
    this.filterProductoDescripcion = '';
    this.filterSituacionClave = '';
  }

  applyFilters(): void {
    let data = this.allOrders;
    if (this.filterNroPlan)             data = data.filter(o => o.ordNroPlan === this.filterNroPlan);
    if (this.filterClienteId)           data = data.filter(o => o.clienteId === this.filterClienteId);
    if (this.filterProductoCodigo)      data = data.filter(o => o.productoCodigo === this.filterProductoCodigo);
    if (this.filterProductoDescripcion) data = data.filter(o => o.productoDescripcion === this.filterProductoDescripcion);
    if (this.filterSituacionClave)      data = data.filter(o => o.situacionClave === this.filterSituacionClave);

    if (this.fechaCreacionDesde)  data = data.filter(o => this.dateOf(o.fechaCreacion)   >= this.startOf(this.fechaCreacionDesde!));
    if (this.fechaCreacionHasta)  data = data.filter(o => this.dateOf(o.fechaCreacion)   <= this.endOf(this.fechaCreacionHasta!));
    if (this.fechaInicioDesde)    data = data.filter(o => this.dateOf(o.fechaInicio)      >= this.startOf(this.fechaInicioDesde!));
    if (this.fechaInicioHasta)    data = data.filter(o => this.dateOf(o.fechaInicio)      <= this.endOf(this.fechaInicioHasta!));
    if (this.fechaFinalizacionDesde) data = data.filter(o => this.dateOf(o.fechaFinalizacion) >= this.startOf(this.fechaFinalizacionDesde!));
    if (this.fechaFinalizacionHasta) data = data.filter(o => this.dateOf(o.fechaFinalizacion) <= this.endOf(this.fechaFinalizacionHasta!));

    this.dataSource.data = data;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  private dateOf(value: string | null): number {
    if (!value) return NaN;
    return new Date(value).getTime();
  }

  private startOf(d: Date): number {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r.getTime();
  }

  private endOf(d: Date): number {
    const r = new Date(d);
    r.setHours(23, 59, 59, 999);
    return r.getTime();
  }

  clearFilter() {
    this.filterValue = '';
    this.resetSelectFilters();
    this.fechaCreacionDesde = null;
    this.fechaCreacionHasta = null;
    this.fechaInicioDesde = null;
    this.fechaInicioHasta = null;
    this.fechaFinalizacionDesde = null;
    this.fechaFinalizacionHasta = null;
    this.dataSource.data = this.allOrders;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
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
      case 'REVISAR PLANO':  return 'status revisar-plano';
      case 'PLANIFICADO':    return 'status planificado';
      case 'EN PROCESO':     return 'status en-proceso';
      case 'TERMINADO':      return 'status terminado';
      case 'FALTA MATERIAL': return 'status falta-material';
      case 'CANCELADO':      return 'status cancelado';
      default:               return 'status otro';
    }
  }

  isPlanificado(row: any):    boolean { return row.situacionClave === 'PLANIFICADO'; }
  isEnProceso(row: any):      boolean { return row.situacionClave === 'EN PROCESO'; }
  isRevisarPlano(row: any):   boolean { return row.situacionClave === 'REVISAR PLANO'; }
  isFaltaMaterial(row: any):  boolean { return row.situacionClave === 'FALTA MATERIAL'; }

  cambiarEstado(order: OrdenResponseDTO, situacion: string, confirmar = false): void {
    if (confirmar) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          titulo: 'Cancelar orden',
          mensaje: `¿Confirma cancelar la orden ${order.ordNroPlan}? Esta acción no se puede deshacer.`,
          botonConfirmar: 'Cancelar orden',
          botonCancelar: 'Volver'
        }
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) this.ejecutarCambioEstado(order, situacion);
      });
    } else {
      this.ejecutarCambioEstado(order, situacion);
    }
  }

  private ejecutarCambioEstado(order: OrdenResponseDTO, situacion: string): void {
    const dto: OrdenResponseDTO = { ...order, situacionClave: situacion };
    this.ordersSvc.avanzarOrden(dto).subscribe({
      next: () => {
        this.snack.open(`Estado actualizado: ${situacion}`, 'Cerrar', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        console.error('Error al cambiar estado:', err);
        this.snack.open('Error al cambiar el estado', 'Cerrar', { duration: 5000 });
      }
    });
  }

  startProcess(order: OrdenResponseDTO): void {
    this.cambiarEstado(order, 'EN PROCESO');
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
        this.tasksService.iniciarTarea(this.tareasDTO).subscribe({
          next: (tareaResult) => {
            this.snack.open('Tarea iniciada correctamente', 'Cerrar', { duration: 3000 });
            this.router.navigate(['/tareas'], { queryParams: tareaResult.tarId });
          },
          error: (err) => {
            const msg = err?.error?.message || 'No se pudo iniciar la tarea.';
            this.snack.open(msg, 'Cerrar', { duration: 5000 });
          }
        });
      }
    });
  }

  /** DEMO del nuevo flujo unificado de tarea — sin llamadas al backend */
  openTaskSessionDialog(order: OrdenResponseDTO): void {
    const dialogRef = this.dialog.open(TaskSessionDialogComponent, {
      width: '660px',
      disableClose: false,
      data: {
        ordenId:             order.id,
        ordNroPlan:          order.ordNroPlan,
        productoCodigo:      order.productoCodigo,
        productoDescripcion: order.productoDescripcion,
        ordCantidad:         order.cantidad
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.snack.open('Tarea finalizada correctamente', 'OK', { duration: 3000 });
        this.load();
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
