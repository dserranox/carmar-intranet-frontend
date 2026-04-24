import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OperationsService } from '../../services/operations.service';
import { OperacionesDTO } from '../../models/operacion';
import { TasksService } from '../../services/tasks.service';
import { UsuarioService, UsuarioAdminDTO } from '../../services/usuario.service';

export interface TaskSessionDialogData {
  ordenId?: number;
  ordNroPlan?: string;
  productoCodigo?: string;
  productoDescripcion?: string;
  ordCantidad?: number | null;
}

type DialogState = 'iniciar' | 'en-progreso' | 'finalizar';

@Component({
  selector: 'app-task-session-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatSelectModule,
    MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule
  ],
  templateUrl: './task-session-dialog.component.html',
  styleUrls: ['./task-session-dialog.component.scss']
})
export class TaskSessionDialogComponent implements OnInit, OnDestroy {

  estado: DialogState = 'iniciar';
  loading = false;

  // ── Admin ──────────────────────────────────────────────
  isAdmin = false;
  loggedUsername = '';
  usuariosActivos: UsuarioAdminDTO[] = [];

  // ── Estado 1: iniciar ──────────────────────────────────
  operaciones: OperacionesDTO[] = [];
  iniciarForm: FormGroup;

  // ── Estado 2: en progreso ──────────────────────────────
  operacionNombre = '';
  nroMaquina = '';
  timerDisplay = '00:00:00';
  private startTime?: Date;
  private pausedElapsedSeconds = 0;
  private timerInterval?: ReturnType<typeof setInterval>;
  private tareaIniciada: any = null;

  // ── Estado 3: finalizar ────────────────────────────────
  finalizarForm: FormGroup;
  maxDemoraMinutos = Infinity;

  constructor(
    private fb: FormBuilder,
    private ref: MatDialogRef<TaskSessionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskSessionDialogData,
    private operacionesService: OperationsService,
    private tasksService: TasksService,
    private usuarioService: UsuarioService,
    private snack: MatSnackBar
  ) {
    const stored = localStorage.getItem('user');
    const parsed = stored ? JSON.parse(stored) : null;
    this.loggedUsername = parsed?.username ?? '';
    const perms: string[] = parsed?.permissions || [];
    this.isAdmin = perms.includes('ORDENES:WRITE');

    this.iniciarForm = this.fb.group({
      operacionId:    [null, Validators.required],
      nroMaquina:     [null, Validators.pattern(/^\d+$/)],
      usuarioOperario:[this.loggedUsername]
    });

    this.finalizarForm = this.fb.group({
      cantidad:              [data?.ordCantidad ?? null, [Validators.required, Validators.pattern(/^\d+$/), Validators.min(1)]],
      noConforme:            [null],
      perdidaRendimiento:    [null],
      perdidaMantenimiento:  [null],
      perdidaCalidad:        [null],
      observaciones:         [null],
      tiempoDuracionTarea:   [null]
    });

    this.finalizarForm.get('noConforme')?.valueChanges.subscribe(() => this.validateNoConforme());
    this.finalizarForm.get('cantidad')?.valueChanges.subscribe(() => this.validateNoConforme());
    ['perdidaRendimiento', 'perdidaMantenimiento', 'perdidaCalidad'].forEach(f =>
      this.finalizarForm.get(f)?.valueChanges.subscribe(() => this.validateDemora())
    );
  }

  ngOnInit(): void {
    this.operacionesService.getAll().subscribe({
      next: (ops) => { this.operaciones = ops || []; },
      error: () => { this.operaciones = []; }
    });

    if (this.isAdmin) {
      this.usuarioService.getUsuariosActivos().subscribe({
        next: (users) => {
          this.usuariosActivos = users || [];
          const seleccionado = this.usuariosActivos.find(u => u.username === this.loggedUsername);
          if (seleccionado) {
            this.iniciarForm.get('usuarioOperario')?.setValue(seleccionado.username);
          } else if (this.usuariosActivos.length > 0) {
            this.iniciarForm.get('usuarioOperario')?.setValue(this.usuariosActivos[0].username);
          }
        },
        error: () => { this.usuariosActivos = []; }
      });
    }
  }

  // ── Acciones estado 1 ─────────────────────────────────

  iniciar(): void {
    if (this.iniciarForm.invalid) { this.iniciarForm.markAllAsTouched(); return; }

    const { operacionId, nroMaquina, usuarioOperario } = this.iniciarForm.value;
    this.loading = true;

    const payload: any = {
      ordenId: this.data.ordenId,
      operacionId: Number(operacionId),
      nroMaquina: nroMaquina ? Number(nroMaquina) : Number(0)
    };

    if (this.isAdmin && usuarioOperario) {
      payload.usuarioOperario = usuarioOperario;
    }

    this.tasksService.iniciarTarea(payload).subscribe({
      next: (tarea) => {
        this.tareaIniciada = tarea;
        this.operacionNombre = this.operaciones.find(o => o.opeId === operacionId)?.opeNombre ?? '';
        this.nroMaquina = nroMaquina ? String(nroMaquina) : '';
        this.loading = false;
        this.estado = 'en-progreso';
        this.ref.disableClose = true;
        this.startTime = new Date();
        this.startTimer();
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err?.error?.message || 'No se pudo iniciar la tarea', 'OK', { duration: 4000 });
      }
    });
  }

  cancelar(): void { this.ref.close(); }

  // ── Acciones estado 2 ─────────────────────────────────

  irAFinalizar(): void {
    this.pausedElapsedSeconds = this.startTime
      ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
      : 0;
    this.maxDemoraMinutos = Math.floor(this.pausedElapsedSeconds / 60);
    this.stopTimer();
    this.estado = 'finalizar';
  }

  // ── Acciones estado 3 ─────────────────────────────────

  volverAEnProgreso(): void {
    this.startTime = new Date(Date.now() - this.pausedElapsedSeconds * 1000);
    this.estado = 'en-progreso';
    this.startTimer();
  }

  confirmarFinalizar(): void {
    if (this.finalizarForm.invalid) { this.finalizarForm.markAllAsTouched(); return; }

    const { cantidad, noConforme, perdidaRendimiento, perdidaMantenimiento, perdidaCalidad, observaciones, tiempoDuracionTarea } = this.finalizarForm.value;

    let fechaBase = new Date();
    if (this.isAdmin && tiempoDuracionTarea != null && Number(tiempoDuracionTarea) > 0) {
      fechaBase = new Date(fechaBase.getTime() + Number(tiempoDuracionTarea) * 60 * 1000);
    }
    const fechaFinalizacion = this.formatDateTime(fechaBase);

    const payload = {
      ...this.tareaIniciada,
      cantidad: Number(cantidad),
      noConforme: noConforme != null ? Number(noConforme) : null,
      perdidaRendimiento: perdidaRendimiento != null ? Number(perdidaRendimiento) : null,
      perdidaMantenimiento: perdidaMantenimiento != null ? Number(perdidaMantenimiento) : null,
      perdidaCalidad: perdidaCalidad != null ? Number(perdidaCalidad) : null,
      observaciones: (observaciones ?? '').toString().trim() || null,
      fechaFinalizacion
    };

    this.loading = true;
    this.tasksService.finalizarTarea(payload).subscribe({
      next: () => {
        this.loading = false;
        this.ref.disableClose = false;
        this.ref.close({ success: true });
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err?.error?.message || 'No se pudo finalizar la tarea', 'OK', { duration: 4000 });
      }
    });
  }

  // ── Timer ─────────────────────────────────────────────

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (!this.startTime) return;
      const elapsed = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      this.timerDisplay = `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`;
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = undefined; }
  }

  private pad(n: number): string { return n.toString().padStart(2, '0'); }

  private formatDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  // ── Validaciones finalizar ────────────────────────────

  private validateNoConforme(): void {
    const cantidad = Number(this.finalizarForm.get('cantidad')?.value);
    const noConf   = Number(this.finalizarForm.get('noConforme')?.value);
    const ctrl     = this.finalizarForm.get('noConforme');
    if (!isNaN(noConf) && !isNaN(cantidad) && noConf > cantidad) {
      ctrl?.setErrors({ noConformeExcedeCantidad: true });
    } else if (ctrl?.hasError('noConformeExcedeCantidad')) {
      ctrl.setErrors(null);
    }
  }

  private validateDemora(): void {
    const total = (Number(this.finalizarForm.get('perdidaRendimiento')?.value)   || 0)
                + (Number(this.finalizarForm.get('perdidaMantenimiento')?.value) || 0)
                + (Number(this.finalizarForm.get('perdidaCalidad')?.value)       || 0);
    const ctrl = this.finalizarForm.get('perdidaCalidad');
    if (total > this.maxDemoraMinutos) {
      ctrl?.setErrors({ demoraExcedeProceso: true });
    } else if (ctrl?.hasError('demoraExcedeProceso')) {
      ctrl.setErrors(null);
    }
  }

  ngOnDestroy(): void { this.stopTimer(); }
}
