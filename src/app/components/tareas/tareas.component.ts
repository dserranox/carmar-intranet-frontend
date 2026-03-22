
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
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

@Component({
  selector: 'app-tareas',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    MatTableModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatTooltipModule, TiempoProcesoDirective
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
  filtered: TareasDTO[] = [];

  // filter options (populated from loaded data)
  nroPlanes: string[] = [];
  operaciones: { nombreCorto: string; nombre: string }[] = [];
  codigos: string[] = [];
  productos: string[] = [];
  nroMaquinas: number[] = [];

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
    'horaInicio','horaFin','cantidad','noConforme','tiempo','tiempodemora','estado','observaciones','documentos'
  ];

  ngOnInit(): void {
    this.resolvePermissions();

    if (!this.canReadAll) {
      this.displayedColumns = [
        'acciones','fecha','nroPlan','codigoProducto','operacion',
        'horaInicio','horaFin','cantidad','noConforme','tiempo','tiempodemora','estado'
      ];
    }
    this.route.queryParamMap.subscribe(qp => {
      const tid = qp.get('taskId');
      this.highlightedTaskId = tid ? Number(tid) : null;
      if (this.highlightedTaskId) {
        this.snack.open('Tarea creada correctamente', 'OK', { duration: 2500 });
      }
    });

    this.tasksService.listarTareas().subscribe({
      next: (tasks) => {
        this.allTasks = tasks || [];
        this.buildFilterOptions(this.allTasks);
        this.applyFilters();
      },
      error: () => {
        this.allTasks = [];
        this.filtered = [];
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

    this.filtered = this.allTasks.filter(t => {
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
          this.tasksService.listarTareas().subscribe({
            next: (tasks) => { this.allTasks = tasks || []; this.buildFilterOptions(this.allTasks); this.applyFilters(); },
            error: () => { this.snack.open('No se pudo refrescar la lista', 'OK', { duration: 2500 }); }
          });
        },
        error: () => this.snack.open('No se pudo finalizar la tarea', 'OK', { duration: 3000 })
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

  tiempoDemoraTooltip(row: TareasDTO): string {
    const r = row.perdidaRendimiento ?? 0;
    const m = row.perdidaMantenimiento ?? 0;
    const c = row.perdidaCalidad ?? 0;
    return `Rendimiento: ${r} min | Mantenimiento: ${m} min | Calidad: ${c} min`;
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
