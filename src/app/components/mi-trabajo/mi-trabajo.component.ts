import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AsignacionesService } from '../../services/asignaciones.service';
import { TasksService } from '../../services/tasks.service';
import { ActividadAsignada, Asignacion } from '../../models/asignacion';
import {
  FinishTaskDialogComponent, FinishTaskDialogResult
} from '../tareas/finish-task-dialog.component';
import { PausaDialogComponent, PausaDialogResult } from '../corte/pausa-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { ControlEnTarea, ControlTareaDialogComponent, ResultadoControl } from './control-tarea-dialog.component';
import {
  SuspenderDialogComponent, SuspenderDialogData, SuspenderDialogResult
} from '../corte/suspender-dialog.component';

const ETIQUETA_PAUSA: Record<string, string> = {
  CONSULTA_TECNICA: 'Consulta técnica',
  CONSULTA_CALIDAD: 'Consulta de calidad',
  FALTA_MATERIAL: 'Falta de material',
  MANTENIMIENTO: 'Mantenimiento',
  DESCANSO: 'Descanso',
  OTROS: 'Otros'
};

const ETIQUETA_SUSPENSION: Record<string, string> = {
  FIN_JORNADA: 'terminó la jornada',
  OTRA_TAREA: 'lo pasaron a otra tarea',
  OTROS: 'otro motivo'
};

/**
 * Lo que el operario tiene que hacer. Trabaja sobre un código a la vez: adentro
 * arranca y termina las actividades que le habilitaron, las veces que haga falta,
 * y cuando avisa que terminó pasa al código siguiente de su cola.
 */
@Component({
  selector: 'app-mi-trabajo',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule,
    MatTooltipModule, MatDialogModule, MatSnackBarModule
  ],
  templateUrl: './mi-trabajo.component.html',
  styleUrls: ['./mi-trabajo.component.css']
})
export class MiTrabajoComponent implements OnInit, OnDestroy {
  private asignacionesService = inject(AsignacionesService);
  private tasksService = inject(TasksService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  asignaciones = signal<Asignacion[]>([]);
  cargando = signal(true);
  trabajando = signal(false);
  ahora = signal(Date.now());
  /** Cuándo se trajo el estado del servidor: el reloj corre a partir de ahí. */
  cargadoEn = signal(Date.now());

  /** Código que el operario eligió mirar (por ejemplo al retomar uno suspendido). */
  seleccionadaId = signal<number | null>(null);

  private reloj: any;

  /** El código actual: el que está en curso, el elegido, o el primero de la cola. */
  actual = computed<Asignacion | null>(() => {
    const lista = this.asignaciones();
    const elegida = lista.find(a => a.asgId === this.seleccionadaId());
    if (elegida) return elegida;
    return lista.find(a => a.estado === 'EN_CURSO')
        ?? lista.find(a => a.estado === 'PENDIENTE')
        ?? lista.find(a => a.estado === 'SUSPENDIDA')
        ?? null;
  });

  tareaAbierta = computed(() => this.actual()?.enCurso ?? null);

  siguientes = computed<Asignacion[]>(() => {
    const actual = this.actual();
    return this.asignaciones().filter(a => a.asgId !== actual?.asgId);
  });

  ngOnInit(): void {
    this.cargar();
    this.reloj = setInterval(() => {
      this.ahora.set(Date.now());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.reloj) clearInterval(this.reloj);
  }

  cargar(): void {
    this.cargando.set(true);
    this.asignacionesService.mias().subscribe({
      next: a => {
        this.asignaciones.set(a || []);
        // El reloj corre a partir de lo que dijo el servidor recién ahora.
        this.cargadoEn.set(Date.now());
        this.cargando.set(false);
      },
      error: () => {
        this.asignaciones.set([]);
        this.cargando.set(false);
        this.snack.open('No se pudo cargar tu trabajo asignado', 'OK', { duration: 4000 });
      }
    });
  }

  // ------------------------------------------------------------ actividades

  iniciar(actividad: ActividadAsignada): void {
    const asignacion = this.actual();
    if (!asignacion) return;
    this.trabajando.set(true);
    this.asignacionesService.iniciarActividad(asignacion.asgId, actividad.aacId).subscribe({
      next: () => {
        this.trabajando.set(false);
        this.seleccionadaId.set(asignacion.asgId);
        this.snack.open(`${actividad.operacionNombre} iniciada`, 'OK', { duration: 3000 });
        this.cargar();
      },
      error: err => {
        this.trabajando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo iniciar la actividad', 'OK', { duration: 7000 });
      }
    });
  }

  finalizarTarea(): void {
    const asignacion = this.actual();
    const enCurso = this.tareaAbierta();
    if (!asignacion || !enCurso) return;

    const tarea = {
      id: enCurso.tareaId,
      ordCantidad: enCurso.cantidad ?? asignacion.cantidad ?? asignacion.cantidadOrden ?? null,
      fechaInicio: enCurso.fechaInicio
    };

    this.dialog.open(FinishTaskDialogComponent, {
      width: '95vw', maxWidth: '560px', maxHeight: '90dvh', data: { tarea }
    }).afterClosed().subscribe((res: FinishTaskDialogResult | undefined) => {
      if (!res) return;
      this.tasksService.finalizarTarea({
        id: enCurso.tareaId,
        cantidad: res.cantidad,
        observaciones: res.observaciones,
        noConforme: res.noConforme,
        perdidaRendimiento: res.perdidaRendimiento,
        perdidaMantenimiento: res.perdidaMantenimiento,
        perdidaCalidad: res.perdidaCalidad,
        fechaFinalizacion: this.formatoFecha(new Date())
      }).subscribe({
        next: () => {
          this.snack.open('Actividad terminada. Podés arrancar la siguiente del código.',
            'OK', { duration: 5000 });
          this.cargar();
        },
        error: err => this.snack.open(
          err?.error?.message || 'No se pudo finalizar la tarea', 'OK', { duration: 7000 })
      });
    });
  }

  // ------------------------------------------------------------ el código

  terminarCodigo(): void {
    const asignacion = this.actual();
    if (!asignacion) return;
    this.asignacionesService.terminar(asignacion.asgId).subscribe({
      next: () => {
        this.seleccionadaId.set(null);
        this.snack.open('Código terminado. Seguís con el próximo de tu lista.', 'OK', { duration: 5000 });
        this.cargar();
      },
      error: err => this.snack.open(
        err?.error?.message || 'No se pudo terminar el código', 'OK', { duration: 7000 })
    });
  }

  suspender(): void {
    const asignacion = this.actual();
    if (!asignacion) return;

    this.dialog.open<SuspenderDialogComponent, void, SuspenderDialogResult>(
      SuspenderDialogComponent, { disableClose: true, width: '480px' }
    ).afterClosed().subscribe(res => {
      if (!res) return;
      this.asignacionesService.suspender(asignacion.asgId, res.subtipo, res.motivo).subscribe({
        next: () => {
          this.seleccionadaId.set(null);
          this.snack.open('Código suspendido. Lo retomás cuando quieras.', 'OK', { duration: 5000 });
          this.cargar();
        },
        error: err => this.snack.open(
          err?.error?.message || 'No se pudo suspender el código', 'OK', { duration: 7000 })
      });
    });
  }

  retomar(asignacion: Asignacion): void {
    this.seleccionadaId.set(asignacion.asgId);
  }

  /**
   * Volver a la lista sin tocar nada. Solo tiene sentido con la tarea frenada:
   * con el reloj corriendo no se sale, que es la regla de toda la app.
   */
  volverAlListado(): void {
    if (this.tareaCorriendo) return;
    this.seleccionadaId.set(null);
    this.cargar();
  }

  // ------------------------------------------------- pausa y suspensión

  /** El estado del reloj lo manda el servidor; acá solo se dibuja. */
  get estadoTarea(): string {
    return this.tareaAbierta()?.estado ?? 'EN_CURSO';
  }

  get tareaPausada(): boolean { return this.estadoTarea === 'PAUSADA'; }
  get tareaSuspendida(): boolean { return this.estadoTarea === 'SUSPENDIDA'; }
  get tareaCorriendo(): boolean { return this.estadoTarea === 'EN_CURSO'; }

  alternarPausa(): void {
    const asignacion = this.actual();
    if (!asignacion) return;

    if (this.tareaPausada) {
      this.retomarTarea();
      return;
    }

    this.dialog.open<PausaDialogComponent, void, PausaDialogResult>(
      PausaDialogComponent, { disableClose: true, width: '500px' }
    ).afterClosed().subscribe(res => {
      if (!res) return;
      this.asignacionesService.pausarTarea(asignacion.asgId, res.subtipo, res.motivo).subscribe({
        next: () => this.cargar(),
        error: err => this.snack.open(
          err?.error?.message || 'No se pudo pausar la tarea', 'OK', { duration: 6000 })
      });
    });
  }

  /**
   * Se termina el día sin terminar la tarea. No es finalizar: al otro día se
   * retoma donde quedó y el tiempo de la noche no cuenta.
   */
  suspenderTarea(): void {
    const asignacion = this.actual();
    if (!asignacion) return;

    this.dialog.open<SuspenderDialogComponent, SuspenderDialogData, SuspenderDialogResult>(
      SuspenderDialogComponent, {
        disableClose: true,
        width: '480px',
        data: {
          titulo: 'Suspender la tarea',
          nota: 'La tarea queda a medias y el reloj se detiene. Cuando la retomes, sigue '
              + 'contando desde donde quedó, así el tiempo del lote es el que realmente '
              + 'se estuvo trabajando.',
          botonCancelar: 'Seguir trabajando'
        }
      }).afterClosed().subscribe(res => {
      if (!res) return;
      this.asignacionesService.suspenderTarea(asignacion.asgId, res.motivo).subscribe({
        next: () => {
          // Suspender la tarea casi siempre es para arrancar otra cosa: lo
          // devolvemos a su lista en vez de dejarlo adentro del código parado.
          this.seleccionadaId.set(null);
          this.snack.open('Tarea suspendida. Elegí con qué seguís.', 'OK', { duration: 5000 });
          this.cargar();
        },
        error: err => this.snack.open(
          err?.error?.message || 'No se pudo suspender la tarea', 'OK', { duration: 6000 })
      });
    });
  }

  // ------------------------------------------------- controles de calidad

  /**
   * El control es una tarea propia: pausa lo que está haciendo, corre su reloj,
   * y al cerrarlo vuelve solo a la actividad anterior.
   */
  hacerControl(tipo: 'TRACCION' | 'VISUAL' | 'DIMENSIONAL'): void {
    const asignacion = this.actual();
    if (!asignacion) return;

    this.asignacionesService.iniciarControl(asignacion.asgId, tipo).subscribe({
      next: control => this.abrirCuadroDeControl(asignacion.asgId, control),
      error: err => this.snack.open(
        err?.error?.message || 'No se pudo abrir el control', 'OK', { duration: 6000 })
    });
  }

  private abrirCuadroDeControl(asgId: number, control: ControlEnTarea): void {
    this.dialog.open<ControlTareaDialogComponent, { control: ControlEnTarea }, ResultadoControl>(
      ControlTareaDialogComponent, { disableClose: true, data: { control } }
    ).afterClosed().subscribe(res => {
      if (!res) {
        // Se arrepintió: se descarta el control y vuelve a lo que hacía.
        this.asignacionesService.cancelarControl(asgId, control.tareaId).subscribe({
          next: () => this.cargar(),
          error: () => this.cargar()
        });
        return;
      }
      this.asignacionesService.cerrarControl(asgId, control.tareaId, res).subscribe({
        next: () => {
          this.snack.open('Control registrado', 'OK', { duration: 3000 });
          this.cargar();
        },
        error: err => {
          this.snack.open(err?.error?.message || 'No se pudo cerrar el control', 'OK',
            { duration: 8000 });
          // Sigue abierto: se le vuelve a mostrar el cuadro para corregir.
          this.abrirCuadroDeControl(asgId, control);
        }
      });
    });
  }

  retomarTarea(): void {
    const asignacion = this.actual();
    if (!asignacion) return;
    this.asignacionesService.retomarTarea(asignacion.asgId).subscribe({
      next: () => this.cargar(),
      error: err => this.snack.open(
        err?.error?.message || 'No se pudo retomar la tarea', 'OK', { duration: 6000 })
    });
  }

  // ----------------------------------------------------------------- vista

  /**
   * El reloj arranca de los segundos que trae el servidor y solo sigue
   * corriendo si la tarea está en curso: pausada o suspendida, queda quieto.
   */
  get transcurrido(): string {
    const tarea = this.tareaAbierta();
    if (!tarea) return '—';
    let segundos = tarea.segundosEfectivos ?? 0;
    if (tarea.estado === 'EN_CURSO') {
      segundos += Math.max(0, Math.floor((this.ahora() - this.cargadoEn()) / 1000));
    }
    return this.comoReloj(segundos);
  }

  get relojPausa(): string {
    const tarea = this.tareaAbierta();
    if (!tarea) return '00:00';
    let segundos = tarea.segundosPausa ?? 0;
    if (tarea.estado === 'PAUSADA') {
      segundos += Math.max(0, Math.floor((this.ahora() - this.cargadoEn()) / 1000));
    }
    return this.comoReloj(segundos);
  }

  private comoReloj(segundos: number): string {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  puestoDe(item: { puesto?: string; nroMaquina?: number }): string {
    if (item.puesto && item.nroMaquina != null) return `${item.puesto} · máq. ${item.nroMaquina}`;
    if (item.puesto) return item.puesto;
    if (item.nroMaquina != null) return `Máquina ${item.nroMaquina}`;
    return 'Sin puesto indicado';
  }

  etiquetaPausa(subtipo?: string): string {
    return subtipo ? (ETIQUETA_PAUSA[subtipo] || subtipo) : '';
  }

  etiquetaSuspension(subtipo?: string): string {
    return subtipo ? (ETIQUETA_SUSPENSION[subtipo] || subtipo) : '';
  }

  duracion(minutos?: number): string {
    if (!minutos) return '—';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  private formatoFecha(fecha: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`
         + `T${p(fecha.getHours())}:${p(fecha.getMinutes())}:${p(fecha.getSeconds())}`;
  }
}
