
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

  // filters
  filtroOperacion = signal<string>('');
  filtroNroPlan = signal<string>('');
  filtroUsuario = signal<string>('');
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
    'fecha','nroPlan','operacion','nroMaquina','operario',
    'horaInicio','horaFin','cantidad','tiempo','observaciones','documentos','acciones'
  ];

  ngOnInit(): void {
    this.resolvePermissions();

    if(!this.canReadAll){
      this.displayedColumns = [
    'fecha', 'nroPlan', 'operacion','nroMaquina',
    'horaInicio','horaFin','cantidad','tiempo','observaciones','documentos','acciones'
  ]
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
        this.applyFilters();
      },
      error: () => {
        this.allTasks = [];
        this.filtered = [];
        this.snack.open('No se pudieron cargar las tareas', 'OK', { duration: 3000 });
      }
    });

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
  onDesdeChange(val: string) { this.filtroFechaDesde.set(val || ''); this.applyFilters(); }
  onHastaChange(val: string) { this.filtroFechaHasta.set(val || ''); this.applyFilters(); }

  limpiarFiltros() {
    this.filtroOperacion.set('');
    this.filtroNroPlan.set('');
    this.filtroUsuario.set('');
    this.filtroFechaDesde.set('');
    this.filtroFechaHasta.set('');
    this.applyFilters();
  }

  private applyFilters() {
    const op = this.filtroOperacion().toLowerCase().trim();
    const nroP = this.filtroNroPlan().toLowerCase().trim();
    const user = this.filtroUsuario().toLowerCase().trim();
    const d = this.filtroFechaDesde();
    const h = this.filtroFechaHasta();

    const dFrom = d ? new Date(d + 'T00:00:00') : null;
    const dTo = h ? new Date(h + 'T23:59:59') : null;

    this.filtered = this.allTasks.filter(t => {
      // operacion filter
      const opBlob = `${t.operacionNombre ?? ''} ${t.operacionNombreCorto ?? ''}`.toLowerCase();
      if (op && !opBlob.includes(op)) return false;

      // nro plan filter
      const npF = `${t.nroPlan ?? ''}`.toLowerCase();
      if (nroP && !npF.includes(nroP)) return false;

      // user filter (only if canReadAll and selected any)
      if (this.canReadAll && user && !(t.username ?? '').toLowerCase().includes(user)) return false;

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
    this.dialog.open(FinishTaskDialogComponent, {
      width: '520px',
      data: { tarea: row }
    }).afterClosed().subscribe((res: FinishTaskDialogResult | undefined) => {
      if (!res) return;
      const payload = { ...row, cantidad: res.cantidad, observaciones: res.observaciones };
      this.tasksService.finalizarTarea(payload).subscribe({
        next: () => {
          this.snackFinalizarTarea.open('Tarea finalizada', 'OK', { duration: 2500 });
          this.tasksService.listarTareas().subscribe({
            next: (tasks) => { this.allTasks = tasks || []; this.applyFilters(); },
            error: () => { this.snack.open('No se pudo refrescar la lista', 'OK', { duration: 2500 }); }
          });
        },
        error: () => this.snack.open('No se pudo finalizar la tarea', 'OK', { duration: 3000 })
      });
    });
  }

  toDate(val: any): Date | null {
    if (!val) return null;
    return new Date(val);
  }

  isHighlighted(row: TareasDTO): boolean {
    return !!this.highlightedTaskId && row.id === this.highlightedTaskId;
  }
}
