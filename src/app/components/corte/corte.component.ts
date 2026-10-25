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
import { Corte, SabanaResumen } from '../../models/corte';
import { MotivoDialogComponent, MotivoDialogData } from '../../shared/motivo-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { DetalleSabanaDialogComponent } from './detalle-sabana-dialog.component';

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

  // ==================== el tablero de sábanas ====================
  //
  // Dos zonas, corrugado arriba y cable abajo, con las mismas columnas de
  // estado. Son dos máquinas y dos personas distintas: mezclarlas en una sola
  // grilla obligaba a leer la etiqueta de cada tarjeta para saber cuál era cuál.

  /** Las columnas, en el orden en que se mira una sábana a lo largo del día. */
  readonly estados: Array<{ clave: SabanaResumen['estado']; titulo: string }> = [
    { clave: 'PENDIENTE',  titulo: 'Pendientes' },
    { clave: 'EN_PROCESO', titulo: 'En proceso' },
    { clave: 'SUSPENDIDA', titulo: 'Suspendidas' },
    { clave: 'FINALIZADA', titulo: 'Finalizadas' }
  ];

  readonly zonas: Array<{ clave: 'CORRUGADO' | 'CABLE'; titulo: string }> = [
    { clave: 'CORRUGADO', titulo: 'Corrugado' },
    { clave: 'CABLE', titulo: 'Cable' }
  ];

  busqueda = signal('');

  /** Las finalizadas se acumulan: se muestran las últimas y el resto se despliega. */
  verAnteriores = signal(false);
  private static readonly FINALIZADAS_A_LA_VISTA = 3;

  private coincide(s: SabanaResumen): boolean {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return true;
    const blob = `${s.nombre} ${s.operario ?? ''} ${(s.planes ?? []).join(' ')}`.toLowerCase();
    return blob.includes(texto);
  }

  /** Las sábanas de una zona y un estado, ya filtradas por el buscador. */
  enCelda(zona: 'CORRUGADO' | 'CABLE', estado: string): SabanaResumen[] {
    const tipoDe = (s: SabanaResumen) => s.tipo === 'CORRUGADO' ? 'CORRUGADO' : 'CABLE';
    const lista = this.sabanas()
      .filter(s => tipoDe(s) === zona && s.estado === estado && this.coincide(s));

    if (estado !== 'FINALIZADA') return lista;

    // Las más nuevas primero, y solo las últimas salvo que se pidan todas.
    const ordenadas = [...lista].sort((a, b) =>
      (b.fechaFin ?? '').localeCompare(a.fechaFin ?? ''));
    return this.verAnteriores() ? ordenadas : ordenadas.slice(0, CorteComponent.FINALIZADAS_A_LA_VISTA);
  }

  /** Cuántas finalizadas quedaron escondidas, para el «ver anteriores». */
  finalizadasEscondidas(): number {
    if (this.verAnteriores()) return 0;
    const total = this.sabanas().filter(s => s.estado === 'FINALIZADA' && this.coincide(s)).length;
    return Math.max(0, total - CorteComponent.FINALIZADAS_A_LA_VISTA * this.zonas.length);
  }

  /** El contador de cada columna, sumando las dos zonas. */
  cuentaEstado(estado: string): number {
    return this.sabanas().filter(s => s.estado === estado && this.coincide(s)).length;
  }

  /** El resumen que va al costado de cada zona. */
  resumenZona(zona: 'CORRUGADO' | 'CABLE'): string {
    const tipoDe = (s: SabanaResumen) => s.tipo === 'CORRUGADO' ? 'CORRUGADO' : 'CABLE';
    const propias = this.sabanas().filter(s => tipoDe(s) === zona);
    if (!propias.length) return 'sin sábanas';
    const activas = propias.filter(s => s.estado === 'EN_PROCESO').length;
    const maquinas = [...new Set(propias.map(s => s.nroMaquina).filter(m => m != null))];
    const partes = [`${propias.length} ${propias.length === 1 ? 'sábana' : 'sábanas'}`];
    if (activas) partes.push(`${activas} activa${activas === 1 ? '' : 's'}`);
    else if (maquinas.length === 1) partes.push(`Máq. ${maquinas[0]}`);
    return partes.join(' · ');
  }

  hayAlgoQueMostrar(): boolean {
    return this.sabanas().some(s => this.coincide(s));
  }

  // ==================== cortes pendientes ====================
  //
  // Lo que se salteó en alguna sábana y todavía no se hizo. Viven en la sábana
  // de pendientes de su tipo, que se asigna como cualquier otra; el tiempo de
  // cortarlos se sigue imputando al plan original.

  pendientes = signal<Corte[]>([]);
  verPendientes = signal(false);

  private cargarPendientes(): void {
    this.corteService.pendientes().subscribe({
      next: p => this.pendientes.set(p ?? []),
      error: () => this.pendientes.set([])
    });
  }

  etiquetaSalteo(subtipo?: string): string {
    switch (subtipo) {
      case 'FALTA_MATERIAL': return 'Faltante de material';
      case 'MAQUINA':        return 'Problema de máquina';
      case 'OTRA_MAQUINA':   return 'Se hace en otra máquina';
      case 'OTRO':           return 'Otro';
      default:               return subtipo ?? '—';
    }
  }

  /** El corte se hizo por fuera, o la orden ya no lo necesita. */
  darPorCumplido(corte: Corte): void {
    this.dialog.open<MotivoDialogComponent, MotivoDialogData, string>(MotivoDialogComponent, {
      data: {
        titulo: `Dar por cumplido el corte ${corte.nroCorte}`,
        nota: `Plan ${corte.nroPlan} · ${corte.longitud} mm. Queda como hecho sin pasar por el `
            + 'visor, con tu motivo anotado. Se usa cuando se cortó a mano, en otra máquina, '
            + 'o cuando la orden ya no lo necesita.',
        etiqueta: 'Por qué se da por cumplido',
        botonConfirmar: 'Dar por cumplido',
        botonCancelar: 'Volver'
      }
    }).afterClosed().subscribe(motivo => {
      if (!motivo) return;
      this.corteService.darPorCumplido(corte.scdId, motivo).subscribe({
        next: () => {
          this.snack.open('Corte dado por cumplido', 'OK', { duration: 3000 });
          this.cargar();
        },
        error: err => this.snack.open(
          err?.error?.message || 'No se pudo dar por cumplido', 'OK', { duration: 5000 })
      });
    });
  }

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
      next: s => {
        this.sabanas.set(s || []);
        this.cargando.set(false);
        this.cargarPendientes();
      },
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

  /** La sábana completa, de solo lectura: ver qué trae sin abrir una tarea. */
  verDetalle(sabana: SabanaResumen): void {
    this.dialog.open(DetalleSabanaDialogComponent, {
      data: sabana,
      width: '1200px',
      maxWidth: '96vw'
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
