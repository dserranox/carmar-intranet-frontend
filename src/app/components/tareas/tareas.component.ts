
import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TasksService } from '../../services/tasks.service';
import { TareasDTO } from '../../models/tarea';
import { MatDialog } from '@angular/material/dialog';
import { FinishTaskDialogComponent, FinishTaskDialogResult } from './finish-task-dialog.component';
import { TiempoProcesoDirective } from '../../directives/tiempo-proceso.directive';
import {
  SuspenderDialogComponent, SuspenderDialogData, SuspenderDialogResult
} from '../corte/suspender-dialog.component';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { OpcionBuscable, SelectBuscableComponent } from '../../shared/select-buscable.component';

@Component({
  selector: 'app-tareas',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    MatTableModule, MatPaginatorModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatTooltipModule, TiempoProcesoDirective,
    SelectBuscableComponent
  ],
  templateUrl: './tareas.component.html',
  styleUrls: ['./tareas.component.css']
})
export class TareasComponent implements OnInit {
  private tasksService = inject(TasksService);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  // raw data
  allTasks: TareasDTO[] = [];
  dataSource = new MatTableDataSource<TareasDTO>([]);

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

  // filter options (populated from loaded data)
  nroPlanes: string[] = [];
  operaciones: { nombreCorto: string; nombre: string }[] = [];
  codigos: string[] = [];
  productos: string[] = [];
  nroMaquinas: number[] = [];

  // Opciones para los desplegables con búsqueda
  opcionesNroPlan: OpcionBuscable[] = [];
  opcionesOperacion: OpcionBuscable[] = [];
  opcionesCodigo: OpcionBuscable[] = [];
  opcionesProducto: OpcionBuscable[] = [];
  opcionesNroMaquina: OpcionBuscable[] = [];
  opcionesUsuario: OpcionBuscable[] = [];

  /**
   * Sub-áreas de la pantalla, en el orden en que el material recorre la planta.
   * El área la trae cada tarea desde su operación (OPERACIONES.OPE_AREA), así que
   * para mover una operación de pestaña alcanza con cambiar ese dato.
   */
  readonly areas = [
    { clave: '',                titulo: 'Todas',              icono: 'list_alt' },
    { clave: 'RECEPCION',       titulo: 'Recepción',          icono: 'local_shipping' },
    { clave: 'PICKING',         titulo: 'Picking',            icono: 'inventory_2' },
    { clave: 'CORTE_CABLE',     titulo: 'Corte de cable',     icono: 'content_cut' },
    { clave: 'CORTE_CORRUGADO', titulo: 'Corte de corrugado', icono: 'cable' },
    { clave: 'ARMADO',          titulo: 'Armado',             icono: 'handyman' },
    { clave: 'CALIDAD',         titulo: 'Calidad',            icono: 'verified' },
    { clave: 'DESPACHO',        titulo: 'Despacho',           icono: 'outbox' },
    { clave: 'SIN_AREA',        titulo: 'Sin área',           icono: 'help_outline' }
  ];

  areaActiva = signal<string>('');

  /** Cuántas tareas tiene cada pestaña, contando el resto de los filtros. */
  private conteoPorArea = new Map<string, number>();

  // filters
  filtroOperacion = signal<string>('');
  filtroNroPlan = signal<string>('');
  filtroUsuario = signal<string>('');
  filtroCodigoProducto = signal<string>('');
  filtroProducto = signal<string>('');
  filtroNroMaquina = signal<number | ''>('');
  filtroFechaDesde = signal<string>(''); // 'yyyy-MM-dd'
  filtroFechaHasta = signal<string>(''); // 'yyyy-MM-dd'

  // permissions / controls
  canReadAll = false;

  // highlight via query param
  highlightedTaskId: number | null = null;

  private dialog = inject(MatDialog);
  private snackFinalizarTarea = inject(MatSnackBar);

  // users list (distinct)
  get usuariosUnicos(): string[] {
    const set = new Set<string>();
    this.allTasks.forEach(t => { if (t.username) set.add(t.username); });
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }

  displayedColumns = [
    'acciones','fecha','nroPlan','codigoProducto','producto','operacion','nroMaquina','operario',
    'horaInicio','horaFin','cantidad','noConforme','tiempo','pausa','tiempodemora','estado','observaciones','documentos'
  ];

  ngOnInit(): void {
    this.resolvePermissions();

    if (!this.canReadAll) {
      this.displayedColumns = [
        'acciones','fecha','nroPlan','codigoProducto','operacion',
        'horaInicio','horaFin','cantidad','noConforme','tiempo','pausa','tiempodemora','estado'
      ];
    }
    this.route.queryParamMap.subscribe(qp => {
      const tid = qp.get('taskId');
      this.highlightedTaskId = tid ? Number(tid) : null;
      if (this.highlightedTaskId) {
        this.snack.open('Tarea creada correctamente', 'OK', { duration: 2500 });
      }
    });

    this.load();
  }

  load(): void {
    this.tasksService.listarTareas().subscribe({
      next: (tasks) => {
        this.allTasks = tasks || [];
        this.buildFilterOptions(this.allTasks);
        this.applyFilters();
      },
      error: () => {
        this.allTasks = [];
        this.dataSource.data = [];
        this.snack.open('No se pudieron cargar las tareas', 'OK', { duration: 3000 });
      }
    });
  }

  private buildFilterOptions(tasks: TareasDTO[]): void {
    this.nroPlanes = [...new Set(tasks.map(t => t.nroPlan).filter((v): v is string => !!v))].sort((a, b) => b.localeCompare(a));

    const opMap = new Map<string, string>();
    tasks.forEach(t => {
      if (t.operacionNombreCorto) opMap.set(t.operacionNombreCorto, t.operacionNombre ?? '');
    });
    this.operaciones = Array.from(opMap.entries())
      .map(([nombreCorto, nombre]) => ({ nombreCorto, nombre }))
      .sort((a, b) => a.nombreCorto.localeCompare(b.nombreCorto));

    this.codigos   = [...new Set(tasks.map(t => t.productoCodigo).filter((v): v is string => !!v))].sort();
    this.productos = [...new Set(tasks.map(t => t.productoDescripcion).filter((v): v is string => !!v))].sort();
    this.nroMaquinas = [...new Set(tasks.map(t => t.nroMaquina).filter((v): v is number => v != null))].sort((a, b) => a - b);

    this.armarOpcionesBuscables();
  }

  /** Arma las listas que consumen los desplegables con búsqueda. */
  private armarOpcionesBuscables(): void {
    this.opcionesNroPlan = this.nroPlanes.map(p => ({ valor: p, texto: p }));
    this.opcionesCodigo = this.codigos.map(c => ({ valor: c, texto: c }));
    this.opcionesProducto = this.productos.map(p => ({ valor: p, texto: p }));
    this.opcionesNroMaquina = this.nroMaquinas.map(m => ({ valor: m, texto: String(m) }));
    this.opcionesUsuario = this.usuariosUnicos.map(u => ({ valor: u, texto: u }));
    // La operación se busca tanto por la sigla (CAC) como por el nombre completo.
    this.opcionesOperacion = this.operaciones.map(op => ({
      valor: op.nombreCorto,
      texto: `${op.nombreCorto} — ${op.nombre}`,
      extra: op.nombre
    }));
  }

  private resolvePermissions() {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) { this.canReadAll = false; return; }
      const obj = JSON.parse(raw);
      const perms: string[] = Array.isArray(obj?.permissions) ? obj.permissions : [];
      this.canReadAll = perms.includes('TAREAS:READ_ALL');
    } catch {
      this.canReadAll = false;
    }
  }

  onOperacionChange(val: string) { this.filtroOperacion.set(val || ''); this.applyFilters(); }
  onNroPlanChange(val: string) { this.filtroNroPlan.set(val || ''); this.applyFilters(); }
  onUsuarioChange(val: string) { this.filtroUsuario.set(val || ''); this.applyFilters(); }
  onCodigoChange(val: string) { this.filtroCodigoProducto.set(val || ''); this.applyFilters(); }
  onProductoChange(val: string) { this.filtroProducto.set(val || ''); this.applyFilters(); }
  onNroMaquinaChange(val: number | '') { this.filtroNroMaquina.set(val); this.applyFilters(); }
  onDesdeChange(val: string) { this.filtroFechaDesde.set(val || ''); this.applyFilters(); }
  onHastaChange(val: string) { this.filtroFechaHasta.set(val || ''); this.applyFilters(); }

  elegirArea(clave: string) {
    this.areaActiva.set(clave);
    this.applyFilters();
  }

  cantidadDeArea(clave: string): number {
    return this.conteoPorArea.get(clave) ?? 0;
  }

  /** "Sin área" solo molesta si está vacía: aparece únicamente cuando hace falta. */
  areaVisible(clave: string): boolean {
    return clave !== 'SIN_AREA' || this.cantidadDeArea('SIN_AREA') > 0;
  }

  get tituloAreaActiva(): string {
    return this.areas.find(a => a.clave === this.areaActiva())?.titulo ?? 'Todas';
  }

  limpiarFiltros() {
    this.filtroOperacion.set('');
    this.filtroNroPlan.set('');
    this.filtroUsuario.set('');
    this.filtroCodigoProducto.set('');
    this.filtroProducto.set('');
    this.filtroNroMaquina.set('');
    this.filtroFechaDesde.set('');
    this.filtroFechaHasta.set('');
    this.applyFilters();
  }

  private applyFilters() {
    const op = this.filtroOperacion();
    const nroP = this.filtroNroPlan();
    const user = this.filtroUsuario().toLowerCase().trim();
    const cod = this.filtroCodigoProducto();
    const prod = this.filtroProducto();
    const maq = this.filtroNroMaquina();
    const d = this.filtroFechaDesde();
    const h = this.filtroFechaHasta();

    const dFrom = d ? new Date(d + 'T00:00:00') : null;
    const dTo = h ? new Date(h + 'T23:59:59') : null;

    // Primero todo menos el área: ese subconjunto es el que cuentan las pestañas.
    const sinArea = this.allTasks.filter(t => {
      if (op && t.operacionNombreCorto !== op) return false;
      if (nroP && t.nroPlan !== nroP) return false;

      // filtros solo admin
      if (this.canReadAll && user && !(t.username ?? '').toLowerCase().includes(user)) return false;
      if (this.canReadAll && cod && t.productoCodigo !== cod) return false;
      if (this.canReadAll && prod && t.productoDescripcion !== prod) return false;
      if (this.canReadAll && maq !== '' && t.nroMaquina !== maq) return false;

      // date range on fechaInicio
      if (dFrom || dTo) {
        const fi = t.fechaInicio ? new Date(t.fechaInicio) : null;
        if (!fi) return false;
        if (dFrom && fi < dFrom) return false;
        if (dTo && fi > dTo) return false;
      }
      return true;
    });

    this.conteoPorArea = new Map();
    for (const t of sinArea) {
      const clave = t.area || 'SIN_AREA';
      this.conteoPorArea.set(clave, (this.conteoPorArea.get(clave) ?? 0) + 1);
    }
    this.conteoPorArea.set('', sinArea.length);

    const area = this.areaActiva();
    const data = !area ? sinArea : sinArea.filter(t => (t.area || 'SIN_AREA') === area);

    this.dataSource.data = data;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
    if (this._paginatorTop) {
      this._paginatorTop.length = data.length;
      this._paginatorTop.pageIndex = 0;
    }
  }

  docLabel(nombre?: string | null): string {
    if (!nombre) return '-';
    const base = nombre.slice(0, 7);
    const pretty = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    return pretty + (nombre.length > 7 ? '...' : '');
  }

  finalizarTarea(row: TareasDTO) {
    
    const fechaFinalizacion = this.formatDateTime(new Date());
    this.dialog.open(FinishTaskDialogComponent, {
      width: '95vw',
      maxWidth: '560px',
      maxHeight: '90dvh',
      data: { tarea: row }
    }).afterClosed().subscribe((res: FinishTaskDialogResult | undefined) => {
      if (!res) return;
      const payload = {
        ...row,
        cantidad: res.cantidad,
        observaciones: res.observaciones,
        noConforme: res.noConforme,
        perdidaRendimiento: res.perdidaRendimiento,
        perdidaMantenimiento: res.perdidaMantenimiento,
        perdidaCalidad: res.perdidaCalidad,
        fechaFinalizacion
      };
      this.tasksService.finalizarTarea(payload).subscribe({
        next: () => {
          this.snackFinalizarTarea.open('Tarea finalizada', 'OK', { duration: 2500 });
          this.load();
        },
        error: () => this.snack.open('No se pudo finalizar la tarea', 'OK', { duration: 3000 })
      });
    });
  }

  /**
   * Suspender la tarea de otro. El caso típico es el operario que se fue sin
   * cerrarla: el reloj le sigue corriendo y al día siguiente no puede arrancar
   * nada hasta que alguien la destrabe.
   *
   * No se finaliza, se suspende: la cantidad producida la sabe él, no nosotros.
   */
  suspenderTarea(row: TareasDTO) {
    this.dialog.open<SuspenderDialogComponent, SuspenderDialogData, SuspenderDialogResult>(
      SuspenderDialogComponent, {
        disableClose: true,
        width: '480px',
        data: {
          titulo: `Suspender la tarea de ${row.username ?? "este operario"}`,
          nota: 'La tarea queda a medias y el reloj se detiene. El operario la puede retomar '
              + 'y cerrarla él con la cantidad real. Queda registrado que la suspendiste vos.',
          botonCancelar: 'Dejarla como está'
        }
      }).afterClosed().subscribe(res => {
      if (!res) return;
      this.tasksService.suspenderTareaDeOtro(row.id, res.motivo).subscribe({
        next: () => {
          this.snack.open('Tarea suspendida', 'OK', { duration: 3000 });
          this.load();
        },
        error: err => this.snack.open(
          err?.error?.message || 'No se pudo suspender la tarea', 'OK', { duration: 5000 })
      });
    });
  }

  private formatDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  toDate(val: any): Date | null {
    if (!val) return null;
    return new Date(val);
  }

  isHighlighted(row: TareasDTO): boolean {
    return !!this.highlightedTaskId && row.id === this.highlightedTaskId;
  }

  estadoTarea(row: TareasDTO): 'EN PROCESO' | 'TERMINADO' {
    return row.fechaFinalizacion == null ? 'EN PROCESO' : 'TERMINADO';
  }

  estadoClass(row: TareasDTO): string {
    return row.fechaFinalizacion == null ? 'status en-proceso' : 'status terminado';
  }

  /** mm:ss hasta la hora, después h:mm:ss. */
  hhmmss(segundos: number): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  /**
   * El tiempo de proceso es el efectivo que midió el reloj de la tarea: la pausa
   * no cuenta como producción. Las tareas viejas, anteriores al reloj, siguen
   * mostrando el reloj de pared.
   */
  tiempoProcesoTooltip(row: TareasDTO): string {
    if (row.segundosEfectivos == null) return 'Tiempo de pared: esta tarea es anterior al reloj de tarea';
    const pausa = row.segundosPausa ?? 0;
    return pausa
      ? `Tiempo efectivo, sin contar ${this.hhmmss(pausa)} de pausas`
      : 'Tiempo efectivo, sin pausas';
  }

  tiempoDemoraTooltip(row: TareasDTO): string {
    const r = row.perdidaRendimiento ?? 0;
    const m = row.perdidaMantenimiento ?? 0;
    const c = row.perdidaCalidad ?? 0;
    return `Rendimiento: ${r} min | Mantenimiento: ${m} min | Calidad: ${c} min`;
  }

  async exportarExcel(): Promise<void> {
    const data = this.dataSource.filteredData;
    if (!data.length) {
      this.snack.open('No hay datos para exportar', 'OK', { duration: 2500 });
      return;
    }

    const wb = new Workbook();
    const ws = wb.addWorksheet(this.tituloAreaActiva.slice(0, 31));

    const columnas = this.displayedColumns.filter(c => c !== 'acciones');

    const headerMap: Record<string, string> = {
      fecha: 'Fecha Creación',
      nroPlan: 'Nro. Plan',
      codigoProducto: 'Código',
      producto: 'Producto',
      operacion: 'Operación',
      nroMaquina: 'Nro. Máquina',
      operario: 'Operario',
      horaInicio: 'Hora Inicio',
      horaFin: 'Hora Fin',
      cantidad: 'Cantidad',
      noConforme: 'Piezas NC',
      tiempo: 'Tiempo Proceso',
      pausa: 'En Pausa',
      tiempodemora: 'Tiempo Demora',
      estado: 'Estado',
      observaciones: 'Observaciones',
      documentos: 'Documentos'
    };

    const headerRow = ws.addRow(columnas.map(c => headerMap[c] ?? c));
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF0D2035' } }
      };
    });

    for (const row of data) {
      const valores = columnas.map(col => this.valorCelda(row, col));
      ws.addRow(valores);
    }

    columnas.forEach((_, i) => {
      const col = ws.getColumn(i + 1);
      let maxLen = String(headerMap[columnas[i]] ?? columnas[i]).length;
      col.eachCell({ includeEmpty: false }, cell => {
        const len = String(cell.value ?? '').length;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 4, 40);
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fecha = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const area = this.areaActiva() ? this.areaActiva().toLowerCase() + '_' : '';
    const nombre = `tareas_${area}${fecha.getFullYear()}${pad(fecha.getMonth() + 1)}${pad(fecha.getDate())}_${pad(fecha.getHours())}${pad(fecha.getMinutes())}.xlsx`;
    saveAs(blob, nombre);
  }

  private valorCelda(row: TareasDTO, col: string): string | number {
    switch (col) {
      case 'fecha': {
        const d = row.fechaInicio ? new Date(row.fechaInicio) : null;
        if (!d || isNaN(d.getTime())) return '-';
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      }
      case 'nroPlan': return row.nroPlan ?? '-';
      case 'codigoProducto': return row.productoCodigo ?? '-';
      case 'producto': return row.productoDescripcion ?? '-';
      case 'operacion': return `${row.operacionNombreCorto ?? ''} — ${row.operacionNombre ?? ''}`;
      case 'nroMaquina': return row.nroMaquina ?? '-';
      case 'operario': return row.username ?? '-';
      case 'horaInicio': {
        const d = row.fechaInicio ? new Date(row.fechaInicio) : null;
        if (!d || isNaN(d.getTime())) return '-';
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      case 'horaFin': {
        const d = row.fechaFinalizacion ? new Date(row.fechaFinalizacion) : null;
        if (!d || isNaN(d.getTime())) return '-';
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      case 'cantidad': return row.cantidad ?? '-';
      case 'noConforme': return row.noConforme ?? '-';
      case 'tiempo': return row.segundosEfectivos != null
        ? this.hhmmss(row.segundosEfectivos)
        : this.tiempoProceso(row);
      case 'pausa': return row.segundosPausa ? this.hhmmss(row.segundosPausa) : '-';
      case 'tiempodemora': return this.tiempoDemora(row);
      case 'estado': return row.fechaFinalizacion == null ? 'EN PROCESO' : 'TERMINADO';
      case 'observaciones': return row.observaciones ?? '-';
      case 'documentos': {
        if (!row.documentos?.length) return '-';
        return row.documentos.map(d => d.pdoNombre).join(', ');
      }
      default: return '-';
    }
  }

  private tiempoProceso(row: TareasDTO): string {
    const start = row.fechaInicio ? new Date(row.fechaInicio) : null;
    const end = row.fechaFinalizacion ? new Date(row.fechaFinalizacion) : null;
    if (!start || !end) return '—';
    let ms = end.getTime() - start.getTime();
    if (ms < 0) ms = 0;
    const totalSeg = Math.floor(ms / 1000);
    const min = Math.floor(totalSeg / 60);
    const seg = totalSeg % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(min)}:${pad(seg)}`;
  }

  tiempoDemora(row: TareasDTO): string {
    const start = row.fechaInicio ? new Date(row.fechaInicio) : null;
    const end   = row.fechaFinalizacion ? new Date(row.fechaFinalizacion) : null;
    const procesoMs = (start && end) ? Math.max(0, end.getTime() - start.getTime()) : 0;

    const demoraMs = ((row.perdidaRendimiento ?? 0) + (row.perdidaMantenimiento ?? 0) + (row.perdidaCalidad ?? 0)) * 60_000;

    const totalMs = procesoMs + demoraMs;
    if (totalMs === 0) return '—';

    const totalSeg = Math.floor(totalMs / 1000);
    const min = Math.floor(totalSeg / 60);
    const seg = totalSeg % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(min)}:${pad(seg)}`;
  }
}
