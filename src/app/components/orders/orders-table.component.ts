import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
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
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { ResultadoMasivoDialogComponent } from './resultado-masivo-dialog.component';

@Component({
  selector: 'app-orders-table',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, FechaFormatoDirective,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatIconModule, MatButtonModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatMenuModule, MatCheckboxModule,
    SelectBuscableComponent
  ],
  templateUrl: './orders-table.component.html',
  styleUrls: ['./orders-table.component.scss']
})
export class OrdersTableComponent implements OnInit {
  private ordersSvc = inject(OrdersService);
  dataSource = new MatTableDataSource<OrdenResponseDTO>([]);

  /**
   * Las columnas con su nombre, en el orden de fábrica. Cada uno se arma su
   * vista: esconde las que no mira y sube las que usa. Queda guardado en esta
   * máquina, así la próxima vez abre como la dejó.
   *
   * «Acciones» no está acá: va siempre al final y pegada al borde derecho,
   * porque es la columna que más se usa.
   */
  readonly columnasDisponibles: { clave: string; etiqueta: string }[] = [
    { clave: 'fechaCreacion',       etiqueta: 'Fecha creación' },
    { clave: 'ordNroPlan',          etiqueta: 'Nro plan' },
    { clave: 'clienteId',           etiqueta: 'Cliente' },
    { clave: 'productoCodigo',      etiqueta: 'Código' },
    { clave: 'productoDescripcion', etiqueta: 'Producto' },
    { clave: 'cantidad',            etiqueta: 'Cantidad' },
    { clave: 'fechaInicio',         etiqueta: 'Fecha inicio' },
    { clave: 'situacionClave',      etiqueta: 'Estado' },
    { clave: 'fechaFinalizacion',   etiqueta: 'Fecha finalización' }
  ];

  private static readonly CLAVE_VISTA = 'ordenes.columnas';

  /** El orden y la visibilidad elegidos; se completa con los valores de fábrica. */
  vistaColumnas: { clave: string; visible: boolean }[] = [];

  displayedColumns: string[] = [];
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

  /**
   * A la vista quedan los tres que se usan siempre — año, plan y estado — y el
   * resto se despliega. Las tres fechas juntas ocupaban media pantalla y casi
   * nunca se tocan.
   */
  masFiltros = signal(false);

  // ==================== acciones sobre varias órdenes ====================

  /**
   * Lo que se puede hacer con un grupo de órdenes, y desde qué estado.
   *
   * Es el mismo repertorio que los botones de cada fila: nada nuevo se puede
   * hacer en lote, solo se hace junto. Una acción se ofrece cuando **todas** las
   * seleccionadas la admiten — si en el grupo hay una planificada y una en
   * proceso, «Terminar» no aparece, en lugar de aplicarse a medias.
   */
  readonly accionesMasivas: {
    clave: string; etiqueta: string; icono: string; desde: string[]; peligrosa?: boolean;
  }[] = [
    { clave: 'EN PROCESO',     etiqueta: 'Poner en proceso',     icono: 'play_arrow',
      desde: ['PLANIFICADO', 'REVISAR PLANO', 'FALTA MATERIAL'] },
    { clave: 'TERMINADO',      etiqueta: 'Terminar',             icono: 'stop_circle',
      desde: ['EN PROCESO'] },
    { clave: 'FALTA MATERIAL', etiqueta: 'Falta material',       icono: 'production_quantity_limits',
      desde: ['EN PROCESO'] },
    { clave: 'REVISAR PLANO',  etiqueta: 'Revisar plano',        icono: 'rate_review',
      desde: ['EN PROCESO'] },
    { clave: 'PLANIFICADO',    etiqueta: 'Volver a planificado', icono: 'undo',
      desde: ['EN PROCESO'] },
    { clave: 'CANCELADO',      etiqueta: 'Cancelar órdenes',     icono: 'cancel',
      desde: ['PLANIFICADO', 'EN PROCESO', 'REVISAR PLANO', 'FALTA MATERIAL'], peligrosa: true }
  ];

  /** Los ids tildados. Se guarda el id y no la fila, que se reemplaza en cada carga. */
  private seleccionados = new Set<number>();

  /** Mover órdenes en lote es lo mismo que moverlas de a una: pide ORDENES:WRITE. */
  get puedeAccionesMasivas(): boolean { return this.isAdmin; }

  estaSeleccionada(orden: OrdenResponseDTO): boolean {
    return this.seleccionados.has(orden.id);
  }

  alternarSeleccion(orden: OrdenResponseDTO): void {
    if (this.seleccionados.has(orden.id)) this.seleccionados.delete(orden.id);
    else this.seleccionados.add(orden.id);
  }

  /**
   * Las órdenes tildadas que siguen a la vista. Si se cambió un filtro o el año,
   * lo que ya no está en el listado no cuenta: se actúa sobre lo que se ve.
   */
  get seleccion(): OrdenResponseDTO[] {
    return this.dataSource.filteredData.filter(o => this.seleccionados.has(o.id));
  }

  /** Cuántas hay en el listado filtrado, para decir «5 de 23». */
  get totalListado(): number { return this.dataSource.filteredData.length; }

  get todasSeleccionadas(): boolean {
    return this.totalListado > 0 && this.seleccion.length === this.totalListado;
  }

  get algunaSeleccionada(): boolean {
    return this.seleccion.length > 0 && !this.todasSeleccionadas;
  }

  /** La casilla del encabezado toma todo el listado filtrado, no solo la página. */
  alternarTodas(): void {
    if (this.todasSeleccionadas) this.limpiarSeleccion();
    else for (const o of this.dataSource.filteredData) this.seleccionados.add(o.id);
  }

  limpiarSeleccion(): void {
    this.seleccionados.clear();
  }

  /** De todo el repertorio, lo que se puede aplicar a las tildadas sin excepción. */
  get accionesDisponibles(): { clave: string; etiqueta: string; icono: string; peligrosa?: boolean }[] {
    const elegidas = this.seleccion;
    if (elegidas.length === 0) return [];
    return this.accionesMasivas.filter(a =>
      elegidas.every(o => a.desde.includes((o.situacionClave || '').toUpperCase())));
  }

  /** Los estados distintos que hay en la selección, para explicar por qué no hay acciones. */
  get estadosSeleccionados(): string[] {
    return [...new Set(this.seleccion.map(o => o.situacionClave || '—'))].sort();
  }

  ejecutarAccionMasiva(accion: { clave: string; etiqueta: string; peligrosa?: boolean }): void {
    const elegidas = this.seleccion;
    if (elegidas.length === 0) return;

    const planes = elegidas.map(o => o.ordNroPlan);
    const listado = planes.length <= 12
      ? planes.join(', ')
      : `${planes.slice(0, 12).join(', ')} y ${planes.length - 12} más`;

    const mensaje = `${accion.etiqueta}: ${planes.length === 1 ? '1 orden' : planes.length + ' órdenes'}`
      + ` (${listado}).`
      + (accion.peligrosa ? ' Cancelar una orden no se puede deshacer.' : '')
      + ' ¿Confirma?';

    this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      data: {
        titulo: accion.etiqueta,
        mensaje,
        botonConfirmar: accion.etiqueta,
        botonCancelar: 'Volver',
        peligroso: accion.peligrosa === true
      }
    }).afterClosed().subscribe(confirmado => {
      if (confirmado) this.aplicarAccionMasiva(accion, elegidas.map(o => o.id));
    });
  }

  private aplicarAccionMasiva(accion: { clave: string; etiqueta: string }, ids: number[]): void {
    this.loading = true;
    this.ordersSvc.avanzarMasivo(ids, accion.clave).subscribe({
      next: (resultado) => {
        this.limpiarSeleccion();
        const hechas = resultado.cambiadas.length;

        if (resultado.rechazadas.length > 0) {
          // Hay algo que explicar: va en un cartel que no se cierra solo.
          this.dialog.open(ResultadoMasivoDialogComponent, { width: '560px', data: resultado });
        } else {
          this.snack.open(
            `${hechas === 1 ? '1 orden' : hechas + ' órdenes'} a ${resultado.situacionClave.toLowerCase()}`,
            'Cerrar', { duration: 4000 });
        }
        this.load();
      },
      error: (err) => {
        console.error('Error en el cambio masivo:', err);
        this.snack.open(err.error?.message || 'No se pudieron cambiar las órdenes',
          'Cerrar', { duration: 5000 });
        this.loading = false;
      }
    });
  }

  // ==================== la vista de la tabla ====================

  /** Carga lo que el usuario dejó elegido, o el orden de fábrica si es la primera vez. */
  private cargarVista(): void {
    let guardada: { clave: string; visible: boolean }[] = [];
    try {
      const crudo = localStorage.getItem(OrdersTableComponent.CLAVE_VISTA);
      if (crudo) guardada = JSON.parse(crudo) ?? [];
    } catch { /* si está rota, se arranca de cero */ }

    const conocidas = new Set(this.columnasDisponibles.map(c => c.clave));
    const vista = guardada.filter(c => conocidas.has(c.clave));

    // Las columnas nuevas de una versión posterior entran visibles al final.
    for (const columna of this.columnasDisponibles) {
      if (!vista.some(v => v.clave === columna.clave)) {
        vista.push({ clave: columna.clave, visible: true });
      }
    }
    this.vistaColumnas = vista;
    this.aplicarVista();
  }

  private aplicarVista(): void {
    this.displayedColumns = [
      // La casilla va primera y solo para quien puede mover órdenes.
      ...(this.puedeAccionesMasivas ? ['seleccion'] : []),
      ...this.vistaColumnas.filter(c => c.visible).map(c => c.clave),
      'acciones'
    ];
    // El cliente no se muestra a quien no puede verlo, elija lo que elija.
    if (!this.puedeVerClientes) {
      this.displayedColumns = this.displayedColumns.filter(c => c !== 'clienteId');
    }
  }

  private guardarVista(): void {
    try {
      localStorage.setItem(OrdersTableComponent.CLAVE_VISTA, JSON.stringify(this.vistaColumnas));
    } catch { /* sin localStorage se pierde al salir, pero la sesión funciona igual */ }
  }

  etiquetaColumna(clave: string): string {
    return this.columnasDisponibles.find(c => c.clave === clave)?.etiqueta ?? clave;
  }

  /** Las columnas que se pueden tocar: sin la de cliente si el rol no la ve. */
  get columnasConfigurables(): { clave: string; visible: boolean }[] {
    return this.vistaColumnas.filter(c => this.puedeVerClientes || c.clave !== 'clienteId');
  }

  alternarColumna(clave: string): void {
    const columna = this.vistaColumnas.find(c => c.clave === clave);
    if (!columna) return;
    const visibles = this.vistaColumnas.filter(c => c.visible).length;
    if (columna.visible && visibles <= 1) {
      this.snack.open('Dejá al menos una columna a la vista', 'Cerrar', { duration: 3000 });
      return;
    }
    columna.visible = !columna.visible;
    this.aplicarVista();
    this.guardarVista();
  }

  moverColumna(clave: string, haciaDonde: -1 | 1): void {
    const i = this.vistaColumnas.findIndex(c => c.clave === clave);
    const destino = i + haciaDonde;
    if (i < 0 || destino < 0 || destino >= this.vistaColumnas.length) return;
    const [columna] = this.vistaColumnas.splice(i, 1);
    this.vistaColumnas.splice(destino, 0, columna);
    this.aplicarVista();
    this.guardarVista();
  }

  restaurarVista(): void {
    this.vistaColumnas = this.columnasDisponibles.map(c => ({ clave: c.clave, visible: true }));
    this.aplicarVista();
    this.guardarVista();
    this.snack.open('Columnas como vienen de fábrica', 'Cerrar', { duration: 2500 });
  }

  /** Cuántos de los filtros guardados están puestos, para avisar que hay algo filtrando. */
  otrosFiltrosActivos(): number {
    const valores = [
      this.filterClienteId, this.filterProductoCodigo, this.filterProductoDescripcion,
      this.fechaCreacionDesde, this.fechaCreacionHasta,
      this.fechaInicioDesde, this.fechaInicioHasta,
      this.fechaFinalizacionDesde, this.fechaFinalizacionHasta
    ];
    return valores.filter(v => v !== null && v !== '' && v !== undefined).length;
  }

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
    this.cargarVista();
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
  }

  async load(resetFilters = false) {
    this.loading = true;
    // Los datos se reemplazan: lo tildado antes ya no es lo que está a la vista.
    this.limpiarSeleccion();
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
      // Por defecto, la más reciente primero: es la que se acaba de cargar y la
      // que todos van a buscar. Desde ahí se ordena por cualquier columna.
      const activa = this.savedSortActive || 'ordNroPlan';
      const sentido = this.savedSortDirection || 'desc';
      await new Promise(r => setTimeout(r, 0));
      this.dataSource.sort?.sort({ id: activa, start: sentido as 'asc' | 'desc', disableClear: false });
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
          // El número de plan lo genera la app: es el dato con el que después
          // todos van a hablar, así que se dice y la orden queda a la vista.
          this.snack.open(`Orden ${ordenCreada?.ordNroPlan ?? ''} creada`.trim(), 'Cerrar',
            { duration: 6000 });
          this.load();
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
