import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { CorteService } from '../../services/corte.service';
import { TasksService } from '../../services/tasks.service';
import { SabanaResumen } from '../../models/corte';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-corte',
  standalone: true,
  imports: [
    CommonModule, DatePipe, FormsModule, MatIconModule, MatButtonModule, MatProgressBarModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule,
    MatSnackBarModule, MatDialogModule
  ],
  templateUrl: './corte.component.html',
  styleUrls: ['./corte.component.css']
})
export class CorteComponent implements OnInit {
  private corteService = inject(CorteService);
  private tasksService = inject(TasksService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  sabanas = signal<SabanaResumen[]>([]);
  operarios = signal<string[]>([]);
  cargando = signal(true);
  importando = signal(false);
  panelImportar = signal(false);

  /** Las dos sábanas que se importan. Cambia el Excel que se espera, no el circuito. */
  readonly tipos: Array<{ clave: 'CABLE' | 'CORRUGADO'; titulo: string; icono: string }> = [
    { clave: 'CABLE', titulo: 'Corte de cable', icono: 'cable' },
    { clave: 'CORRUGADO', titulo: 'Corte de corrugado', icono: 'blur_linear' }
  ];

  // formulario de importación
  tipo: 'CABLE' | 'CORRUGADO' = 'CABLE';
  archivo: File | null = null;
  nombre = '';
  operario = '';
  nroMaquina: number | null = null;
  toleranciaInf = 0;
  toleranciaSup = 1.5;
  forzar = false;

  ngOnInit(): void {
    this.cargar();
    if (this.esAdmin) {
      this.tasksService.getOperariosActivos().subscribe({
        next: ops => this.operarios.set((ops || []).map(o => o.username).sort()),
        error: () => this.operarios.set([])
      });
    }
  }

  get permisos(): string[] {
    try {
      const data = localStorage.getItem('user');
      if (!data) return [];
      const u = JSON.parse(data);
      return Array.isArray(u?.permissions) ? u.permissions : [];
    } catch { return []; }
  }

  get esAdmin(): boolean {
    return this.permisos.includes('SABANAS:WRITE');
  }

  get puedeConfigurarCalidad(): boolean {
    return this.permisos.includes('CALIDAD:WRITE');
  }

  irATraccion(): void {
    this.router.navigate(['/corte/config/traccion']);
  }

  cargar(): void {
    this.cargando.set(true);
    this.corteService.misSabanas().subscribe({
      next: s => { this.sabanas.set(s || []); this.cargando.set(false); },
      error: () => {
        this.sabanas.set([]);
        this.cargando.set(false);
        this.snack.open('No se pudieron cargar las sábanas', 'OK', { duration: 4000 });
      }
    });
  }

  abrir(sabana: SabanaResumen): void {
    this.router.navigate(['/corte', sabana.sabId]);
  }

  progreso(s: SabanaResumen): number {
    return s.totalCortes ? (s.cortesHechos / s.totalCortes) * 100 : 0;
  }

  textoBoton(s: SabanaResumen): string {
    if (s.estado === 'PENDIENTE') return 'Empezar';
    if (s.estado === 'SUSPENDIDA') return 'Retomar';
    return 'Continuar';
  }

  etiquetaSuspension(subtipo?: string): string {
    const etiquetas: Record<string, string> = {
      FIN_JORNADA: 'terminó la jornada',
      OTRA_TAREA: 'lo pasaron a otra tarea',
      OTROS: 'otro motivo'
    };
    return subtipo ? (etiquetas[subtipo] || subtipo) : '';
  }

  duracion(segundos?: number): string {
    if (!segundos) return '—';
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // ------------------------------------------------------------ importar

  elegirTipo(tipo: 'CABLE' | 'CORRUGADO'): void {
    this.tipo = tipo;
  }

  /** Qué columnas tiene que traer el Excel, según lo que se va a cortar. */
  get columnasEsperadas(): string {
    return this.tipo === 'CORRUGADO'
      ? 'El Excel tiene que traer: N° de corte, plan, código, largo (mm) y diámetro. '
        + 'Opcionales: tipo (abierto o cerrado), cant. x prod., cant. total y programa.'
      : 'El Excel tiene que traer: N° de corte, plan, código, color, sección y longitud. '
        + 'Opcionales: cantidad, cable, orígenes, terminales, pelados, gaps e impresión.';
  }

  archivoElegido(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo = input.files && input.files.length ? input.files[0] : null;
    if (this.archivo && !this.nombre) {
      this.nombre = this.archivo.name.replace(/\.[^.]+$/, '');
    }
  }

  importar(): void {
    if (!this.archivo) {
      this.snack.open('Elegí el archivo Excel de la sábana', 'OK', { duration: 4000 });
      return;
    }
    this.importando.set(true);
    this.corteService.importar(this.archivo, {
      nombre: this.nombre || undefined,
      operario: this.operario || undefined,
      nroMaquina: this.nroMaquina ?? undefined,
      toleranciaInf: this.toleranciaInf,
      toleranciaSup: this.toleranciaSup,
      forzar: false,
      tipo: this.tipo
    }).subscribe({
      next: res => {
        this.importando.set(false);
        this.snack.open(`Sábana importada: ${res.cortesImportados} cortes`, "OK", { duration: 6000 });
        res.ordenesCreadas?.forEach(o => this.snack.open("Orden creada: " + o, "OK", { duration: 7000 }));
        res.advertencias.forEach(a => this.snack.open(a, 'OK', { duration: 6000 }));
        this.limpiarFormulario();
        this.panelImportar.set(false);
        this.cargar();
      },
      error: err => {
        this.importando.set(false);
        const detalle = err?.error;
        const mensajes: string[] = detalle?.errores?.length
          ? detalle.errores
          : [detalle?.message || 'No se pudo importar la sábana'];
        this.snack.open(mensajes.join(' · '), 'OK', { duration: 10000 });
      }
    });
  }

  private limpiarFormulario(): void {
    this.archivo = null;
    this.nombre = '';
    this.operario = '';
    this.nroMaquina = null;
    this.forzar = false;
  }

  asignar(sabana: SabanaResumen, username: string): void {
    this.corteService.asignar(sabana.sabId, username || null, sabana.nroMaquina).subscribe({
      next: () => { this.snack.open('Sábana asignada', 'OK', { duration: 3000 }); this.cargar(); },
      error: err => this.snack.open(err?.error?.message || 'No se pudo asignar', 'OK', { duration: 5000 })
    });
  }

  eliminar(sabana: SabanaResumen): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Eliminar sábana',
        mensaje: `¿Eliminar "${sabana.nombre}" y sus ${sabana.totalCortes} cortes?`,
        botonConfirmar: 'Eliminar',
        botonCancelar: 'Cancelar'
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.corteService.eliminar(sabana.sabId).subscribe({
        next: () => { this.snack.open('Sábana eliminada', 'OK', { duration: 3000 }); this.cargar(); },
        error: err => this.snack.open(err?.error?.message || 'No se pudo eliminar', 'OK', { duration: 5000 })
      });
    });
  }
}
