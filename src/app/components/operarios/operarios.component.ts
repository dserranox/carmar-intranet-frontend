import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { TasksService } from '../../services/tasks.service';
import { OperarioEstadoDTO } from '../../models/operario-estado';
import { Asignacion } from '../../models/asignacion';
import { AsignacionesService } from '../../services/asignaciones.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-operarios',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    MatTableModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    MatTooltipModule, MatDialogModule
  ],
  templateUrl: './operarios.component.html',
  styleUrls: ['./operarios.component.css']
})
export class OperariosComponent implements OnInit {
  private tasksService = inject(TasksService);
  private snack = inject(MatSnackBar);
  private asignacionesService = inject(AsignacionesService);
  private dialog = inject(MatDialog);

  allOperarios: OperarioEstadoDTO[] = [];
  filtered: OperarioEstadoDTO[] = [];

  filtroUsuario = signal<string>('');

  displayedColumns = ['usuario', 'estado', 'fechaInicio', 'nroPlan', 'productoCodigo', 'operacion', 'nroMaquina', 'cola'];

  get usuariosUnicos(): string[] {
    return this.allOperarios.map(o => o.username).sort((a, b) => a.localeCompare(b));
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.tasksService.getOperariosActivos().subscribe({
      next: (data) => {
        this.allOperarios = data || [];
        this.applyFilters();
      },
      error: () => {
        this.allOperarios = [];
        this.filtered = [];
        this.snack.open('No se pudo cargar el estado de operarios', 'OK', { duration: 3000 });
      }
    });
  }

  onUsuarioChange(val: string): void {
    this.filtroUsuario.set(val || '');
    this.applyFilters();
  }

  limpiarFiltros(): void {
    this.filtroUsuario.set('');
    this.applyFilters();
  }

  private applyFilters(): void {
    const user = this.filtroUsuario().toLowerCase().trim();
    this.filtered = this.allOperarios.filter(o => {
      if (user && !o.username.toLowerCase().includes(user)) return false;
      return true;
    });
  }

  estadoClass(row: OperarioEstadoDTO): string {
    return row.fechaInicio != null ? 'status en-curso' : 'status libre';
  }

  estadoLabel(row: OperarioEstadoDTO): string {
    return row.fechaInicio != null ? 'EN CURSO' : 'LIBRE';
  }

  /** Dónde está trabajando: el puesto de la asignación o, si no hay, la máquina de la tarea. */
  puestoActual(row: OperarioEstadoDTO): string {
    const puesto = row.enCurso?.puesto;
    const maquina = row.enCurso?.nroMaquina ?? row.nroMaquina;
    if (puesto && maquina != null) return `${puesto} · máq. ${maquina}`;
    if (puesto) return puesto;
    if (maquina != null) return `Máquina ${maquina}`;
    return '—';
  }

  detalleAsignacion(a: Asignacion): string {
    const actividades = (a.actividades || []).map(x => x.operacionNombre).join(', ');
    const partes = [
      `Plan ${a.nroPlan}`,
      a.productoDescripcion || '',
      actividades,
      a.cantidad ? `${a.cantidad} unidades` : '',
      a.puesto || (a.nroMaquina != null ? `Máquina ${a.nroMaquina}` : ''),
      a.estado === 'SUSPENDIDA' ? 'SUSPENDIDO' : ''
    ].filter(Boolean);
    return partes.join(' · ');
  }

  /** Resumen corto de las actividades de un código, para el chip de la cola. */
  actividadesDe(a: Asignacion): string {
    const nombres = (a.actividades || []).map(x => x.operacionNombreCorto || x.operacionNombre);
    if (!nombres.length) return '';
    return nombres.length <= 3 ? nombres.join(' ') : `${nombres.slice(0, 3).join(' ')} +${nombres.length - 3}`;
  }

  mover(a: Asignacion, delta: number): void {
    this.asignacionesService.mover(a.asgId, delta).subscribe({
      next: () => this.load(),
      error: err => this.snack.open(err?.error?.message || 'No se pudo reordenar', 'OK', { duration: 5000 })
    });
  }

  cancelar(a: Asignacion): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Cancelar asignación',
        mensaje: `¿Sacarle a ${a.operario} el código ${a.productoCodigo ?? ''} del plan ${a.nroPlan}?`,
        botonConfirmar: 'Cancelar asignación',
        botonCancelar: 'Volver'
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.asignacionesService.cancelar(a.asgId).subscribe({
        next: () => { this.snack.open('Asignación cancelada', 'OK', { duration: 3000 }); this.load(); },
        error: err => this.snack.open(err?.error?.message || 'No se pudo cancelar', 'OK', { duration: 5000 })
      });
    });
  }
}
