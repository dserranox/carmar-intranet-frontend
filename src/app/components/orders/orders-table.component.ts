import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription, firstValueFrom } from 'rxjs';
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
import { TaskSessionDialogComponent } from './task-session-dialog.component';
import { AsignarDialogComponent } from './asignar-dialog.component';
import { Router } from '@angular/router';
import { FinishOrderDialogComponent } from './finish-order-dialog.component';
import { CreateOrderDialogComponent } from './create-order-dialog.component';
import { OrdenCreateDTO } from '../../models/orden-create';
import { FechaFormatoDirective } from '../../directives/fecha-formato.directive';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { OpcionBuscable, SelectBuscableComponent } from '../../shared/select-buscable.component';
import { NuevoClienteDialogComponent } from './nuevo-cliente-dialog.component';
import { NuevoProductoDialogComponent } from './nuevo-producto-dialog.component';
import { AsignarClienteDialogComponent } from './asignar-cliente-dialog.component';

@Component({
  selector: 'app-orders-table',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, FechaFormatoDirective,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatIconModule, MatButtonModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    SelectBuscableComponent
  ],
  templateUrl: './orders-table.component.html',
  styleUrls: ['./orders-table.component.scss']
})
export class OrdersTableComponent implements OnInit {
  private ordersSvc = inject(OrdersService);
  dataSource = new MatTableDataSource<OrdenResponseDTO>([]);
  displayedColumns = [
    'fechaCreacion','ordNroPlan','clienteId','productoCodigo','productoDescripcion',
    'cantidad','fechaInicio','situacionClave','fechaFinalizacion','acciones'
  ];
  years: number[] = [];
  year = new Date().getFullYear();
  loading = false;
  filterValue = '';

  // Opciones de los filtros buscables (extraídas de los datos cargados)
  opcionesAnio: OpcionBuscable[] = [];
  opcionesNroPlan: OpcionBuscable[] = [];
  opcionesCliente: OpcionBuscable[] = [];
  opcionesCodigo: OpcionBuscable[] = [];
  opcionesProducto: OpcionBuscable[] = [];
  opcionesEstado: OpcionBuscable[] = [];

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
  /** Solo quien tenga CLIENTES:READ ve la razón social. */
  puedeVerClientes = false;

  private _paginatorTop?: MatPaginator;
  private _paginatorBottom?: MatPaginator;
  private _topSub?: Subscription;
  private _bottomSub?: Subscription;

  @ViewChild('paginatorTop') set paginatorTopSetter(p: MatPaginator) {
    this._paginatorTop = p;
    if (p) p.length = this.dataSource.data.length;
    this._linkPaginators();
  }

  @ViewChild('paginatorBottom') set paginatorBottomSetter(p: MatPaginator) {
    this._paginatorBottom = p;
    if (p) this.dataSource.paginator = p;
    this._linkPaginators();
  }

  private _linkPaginators(): void {
    this._topSub?.unsubscribe();
    this._bottomSub?.unsubscribe();
    const top = this._paginatorTop;
    const bottom = this._paginatorBottom;
    if (!top || !bottom) return;

    this._topSub = top.page.subscribe((e: PageEvent) => {
      bottom.pageIndex = e.pageIndex;
      bottom.pageSize = e.pageSize;
      bottom.page.emit(e);
    });

    this._bottomSub = bottom.page.subscribe((e: PageEvent) => {
      top.pageIndex = e.pageIndex;
      top.pageSize = e.pageSize;
    });
  }

  private savedSortActive = '';
  private savedSortDirection: 'asc' | 'desc' | '' = '';

  @ViewChild(MatSort) set sort(s: MatSort) {
    if (s) {
      this.dataSource.sort = s;
      s.sortChange.subscribe(({ active, direction }) => {
        this.savedSortActive = active;
        this.savedSortDirection = direction;
      });
    }
  }

  constructor(
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private tasksService: TasksService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.resolveIsAdmin();
    // La columna Cliente muestra la razón social, así que también ordena por ella.
    this.dataSource.sortingDataAccessor = (row: any, columna: string) =>
      columna === 'clienteId' ? this.nombreCliente(row).toLowerCase() : row[columna];
    this.dataSource.filterPredicate = (row, filter) => {
      const blob = `${row.ordNroPlan} ${row.clienteRazonSocial ?? ''} ${row.productoDescripcion} ${row.productoCodigo} ${row.situacionClave}`.toLowerCase();
      return blob.includes(filter.trim().toLowerCase());
    };
    this.loadYears();
  }

  loadYears(): void {
    this.ordersSvc.getYears().subscribe({
      next: (years) => {
        this.years = years;
        this.opcionesAnio = years.map(y => ({ valor: y, texto: String(y) }));
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
      // En planta no se muestra para qué cliente se fabrica.
      this.puedeVerClientes = permissions.includes('CLIENTES:READ');
    } catch {
      this.isAdmin = false;
      this.puedeVerClientes = false;
    }
    if (!this.puedeVerClientes) {
      this.displayedColumns = this.displayedColumns.filter(c => c !== 'clienteId');
    }
  }

  async load(resetFilters = false) {
    this.loading = true;
    if (resetFilters) {
      this.resetSelectFilters();
      this.savedSortActive = '';
      this.savedSortDirection = '';
    }
    try {
      const orders = await firstValueFrom(this.ordersSvc.listByYear(this.year));
      let data = orders || [];
      if (!this.isAdmin) {
        data = data.filter(o => (o.situacionClave || '').toUpperCase() === 'EN PROCESO');
      }
      this.allOrders = data;
      this.buildFilterOptions(data);
      this.applyFilters();
    } catch (err) {
      console.error(err);
    } finally {
      this.loading = false;
      if (this.savedSortActive && this.savedSortDirection) {
        await new Promise(r => setTimeout(r, 0));
        this.dataSource.sort?.sort({
          id: this.savedSortActive,
          start: this.savedSortDirection as 'asc' | 'desc',
          disableClear: false
        });
      }
    }
  }

  private buildFilterOptions(orders: OrdenResponseDTO[]): void {
    this.opcionesNroPlan = this.opcionesDeTexto(orders.map(o => o.ordNroPlan));
    this.opcionesCodigo  = this.opcionesDeTexto(orders.map(o => o.productoCodigo));
    this.opcionesProducto = this.opcionesDeTexto(orders.map(o => o.productoDescripcion));
    this.opcionesEstado  = this.opcionesDeTexto(orders.map(o => o.situacionClave));

    // El cliente se busca y se muestra por razón social, no por su id interno.
    const porId = new Map<number, string>();
    for (const o of orders) {
      if (o.clienteId == null) continue;
      if (!porId.has(o.clienteId)) porId.set(o.clienteId, this.nombreCliente(o));
    }
    this.opcionesCliente = [...porId.entries()]
      .map(([valor, texto]) => ({ valor, texto }))
      .sort((a, b) => a.texto.localeCompare(b.texto));
  }

  /** Razón social del cliente; si la orden no la trae, al menos el id para no dejarlo vacío. */
  nombreCliente(orden: OrdenResponseDTO): string {
    if (orden.clienteRazonSocial) return orden.clienteRazonSocial;
    return orden.clienteId != null ? `Cliente ${orden.clienteId}` : '—';
  }

  private opcionesDeTexto(valores: (string | null | undefined)[]): OpcionBuscable[] {
    return [...new Set(valores.filter((v): v is string => !!v))]
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ valor: v, texto: v }));
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
    if (this._paginatorTop) {
      this._paginatorTop.length = data.length;
      this._paginatorTop.pageIndex = 0;
    }
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
    this.savedSortActive = '';
    this.savedSortDirection = '';
    this.dataSource.sort?.sort({ id: '', start: 'asc', disableClear: false });
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
    if (this._paginatorTop) {
      this._paginatorTop.length = this.allOrders.length;
      this._paginatorTop.pageIndex = 0;
    }
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


  /** DEMO del nuevo flujo unificado de tarea — sin llamadas al backend */
  /** Permiso para repartir el trabajo de una orden entre los operarios. */
  get puedeAsignar(): boolean {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return false;
      const perms = JSON.parse(raw)?.permissions;
      return Array.isArray(perms) && perms.includes('ASIGNACIONES:WRITE');
    } catch { return false; }
  }

  openAsignarDialog(order: OrdenResponseDTO): void {
    this.dialog.open(AsignarDialogComponent, {
      width: '1040px',
      maxWidth: '96vw',
      data: {
        ordenId: order.id,
        nroPlan: order.ordNroPlan,
        productoCodigo: order.productoCodigo,
        productoDescripcion: order.productoDescripcion,
        cantidad: order.cantidad
      }
    }).afterClosed().subscribe(asignado => {
      if (asignado) {
        this.snack.open('Trabajo asignado', 'OK', { duration: 3000 });
      }
    });
  }

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

  /** Alta de cliente sin salir de Órdenes. */
  abrirNuevoCliente(): void {
    this.dialog.open(NuevoClienteDialogComponent, { width: '440px' })
      .afterClosed().subscribe(cliente => {
        if (!cliente) return;
        this.snack.open(`Cliente "${cliente.razonSocial}" creado`, 'Cerrar', { duration: 3000 });
      });
  }

  /** El administrador le pone el cliente a una orden que se cargó sin él. */
  abrirAsignarCliente(orden: OrdenResponseDTO): void {
    this.dialog.open(AsignarClienteDialogComponent, { data: { orden } })
      .afterClosed().subscribe(actualizada => {
        if (!actualizada) return;
        this.snack.open('Cliente asignado', 'Cerrar', { duration: 3000 });
        this.load();
      });
  }

  /** Alta de producto sin salir de Órdenes. */
  abrirNuevoProducto(): void {
    this.dialog.open(NuevoProductoDialogComponent, { width: '440px' })
      .afterClosed().subscribe(producto => {
        if (!producto) return;
        this.snack.open(`Producto ${producto.codigo} creado`, 'Cerrar', { duration: 3000 });
      });
  }
}
