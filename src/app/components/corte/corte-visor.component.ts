import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CorteService } from '../../services/corte.service';
import { Corte, RegistrarCorteRequest, RegistrarCorteResponse, SabanaResumen } from '../../models/corte';
import {
  ControlCalidadDialogComponent, ControlDialogData, ControlDialogResult
} from './control-calidad-dialog.component';
import { PausaDialogComponent, PausaDialogResult } from './pausa-dialog.component';
import { CableDibujoComponent } from './cable-dibujo.component';
import { CorrugadoDibujoComponent } from './corrugado-dibujo.component';
import { SuspenderDialogComponent, SuspenderDialogResult } from './suspender-dialog.component';
import { SaltearDialogComponent, SaltearDialogResult } from './saltear-dialog.component';

/** Etiquetas de los motivos de pausa, para mostrarlos mientras está parada la máquina. */
const ETIQUETA_PAUSA: Record<string, string> = {
  CONSULTA_TECNICA: 'Consulta técnica',
  CONSULTA_CALIDAD: 'Consulta de calidad',
  FALTA_MATERIAL: 'Falta de material',
  MANTENIMIENTO: 'Mantenimiento',
  DESCANSO: 'Descanso',
  OTROS: 'Otros'
};

/** Colores de cable más usados, para pintar la pastilla del visor. */
const COLORES: Record<string, string> = {
  'NEGRO': '#212121', 'BLANCO': '#f5f5f5', 'ROJO': '#d32f2f', 'AZUL': '#1565c0',
  'VERDE': '#2e7d32', 'AMARILLO': '#f5c400', 'NARANJA': '#ef6c00', 'GRIS': '#9e9e9e',
  'MARRON': '#6d4c41', 'MARRÓN': '#6d4c41', 'VIOLETA': '#7b1fa2', 'ROSA': '#ec407a',
  'CELESTE': '#4fc3f7', 'BEIGE': '#d7ccc8', 'NA': '#ef6c00', 'BL': '#f5f5f5'
};

@Component({
  selector: 'app-corte-visor',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule, MatProgressBarModule,
    MatTooltipModule, MatDialogModule, MatSnackBarModule,
    CableDibujoComponent, CorrugadoDibujoComponent
  ],
  templateUrl: './corte-visor.component.html',
  styleUrls: ['./corte-visor.component.css']
})
export class CorteVisorComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private corteService = inject(CorteService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  sabana = signal<SabanaResumen | null>(null);
  corte = signal<Corte | null>(null);
  proximos = signal<Corte[]>([]);

  segundos = signal(0);
  enPausa = signal(false);
  avisoPendiente = signal(false);
  guardando = signal(false);
  terminada = signal(false);
  /** Cortes que se dejaron para después en esta sábana. */
  salteados = signal(0);
  cargando = signal(true);
  noConforme = signal(0);

  /** Cronómetros que corren aparte del tiempo de corte. */
  setupSegundos = signal(0);
  pausaSegundos = signal(0);
  motivoPausa = signal<PausaDialogResult | null>(null);

  private sabId!: number;
  private cronometro: any;
  private todosLosCortes: Corte[] = [];

  ngOnInit(): void {
    this.sabId = Number(this.route.snapshot.paramMap.get('sabId'));
    this.cargar();
    this.cronometro = setInterval(() => this.tick(), 1000);
  }

  /** Un solo reloj: o corre el set up, o corre la pausa, o corre el corte. */
  private tick(): void {
    if (!this.corte() || this.guardando()) return;
    if (this.avisoPendiente()) {
      this.setupSegundos.update(s => s + 1);
    } else if (this.enPausa()) {
      this.pausaSegundos.update(s => s + 1);
    } else {
      this.segundos.update(s => s + 1);
    }
  }

  ngOnDestroy(): void {
    if (this.cronometro) clearInterval(this.cronometro);
  }

  // --------------------------------------------------------------- carga

  private cargar(): void {
    this.cargando.set(true);
    this.corteService.getSabana(this.sabId).subscribe({
      next: s => this.sabana.set(s),
      error: () => this.snack.open('No se pudo cargar la sábana', 'OK', { duration: 4000 })
    });

    this.corteService.getCortes(this.sabId).subscribe({
      next: cortes => {
        this.todosLosCortes = cortes;
        this.actualizarProximos();
      }
    });

    this.corteService.corteActual(this.sabId).subscribe({
      next: corte => {
        this.cargando.set(false);
        if (!corte) {
          this.terminada.set(true);
          return;
        }
        this.mostrarCorte(corte);
      },
      error: err => {
        this.cargando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo abrir el visor', 'OK', { duration: 7000 });
        // No se pudo arrancar el corte (por ejemplo, tiene otra tarea abierta):
        // se lo devuelve a la lista en vez de dejarlo en una pantalla vacía.
        setTimeout(() => this.volver(), 1200);
      }
    });
  }

  private mostrarCorte(corte: Corte): void {
    this.corte.set(corte);
    // Si la sábana se había suspendido en medio de este corte, el reloj sigue desde ahí.
    this.segundos.set(corte.segundos ?? 0);
    this.setupSegundos.set(0);
    this.pausaSegundos.set(0);
    this.motivoPausa.set(null);
    this.noConforme.set(0);
    this.enPausa.set(false);
    // Si el corte trae cambio de bobina o de terminal, el reloj que arranca es el de
    // set up. Si ese set up ya se registró (por ejemplo, se suspendió después de
    // hacerlo), no se vuelve a pedir ni se cuenta dos veces.
    this.avisoPendiente.set((!!corte.cambioBobina || !!corte.cambioTerminal) && !corte.setupRegistrado);
    this.actualizarProximos();
  }

  private actualizarProximos(): void {
    const actual = this.corte();
    if (!actual || !this.todosLosCortes.length) {
      this.proximos.set([]);
      return;
    }
    const idx = this.todosLosCortes.findIndex(c => c.scdId === actual.scdId);
    this.proximos.set(idx >= 0 ? this.todosLosCortes.slice(idx + 1, idx + 4) : []);
  }

  // -------------------------------------------------------------- acciones

  /** Cierra el aviso y guarda el tiempo que llevó el cambio como set up. */
  confirmarAviso(): void {
    const corte = this.corte();
    const segundos = this.setupSegundos();
    this.avisoPendiente.set(false);
    this.segundos.set(0);

    if (!corte || segundos <= 0) return;
    const subtipo = this.esCorrugado
      ? 'CAMBIO_DIAMETRO'
      : (corte.cambioBobina && corte.cambioTerminal
          ? 'CAMBIO_BOBINA_TERMINAL'
          : (corte.cambioBobina ? 'CAMBIO_BOBINA' : 'CAMBIO_TERMINAL'));

    this.corteService.registrarEvento(corte.scdId, { tipo: 'SETUP', subtipo, segundos }).subscribe({
      next: () => this.refrescarResumen(),
      error: err => this.snack.open(
        err?.error?.message || 'No se pudo registrar el tiempo de set up', 'OK', { duration: 6000 })
    });
  }

  alternarPausa(): void {
    if (this.enPausa()) {
      this.terminarPausa();
      return;
    }
    // El reloj de la pausa arranca ya, mientras el operario elige el motivo.
    this.pausaSegundos.set(0);
    this.enPausa.set(true);

    const ref = this.dialog.open<PausaDialogComponent, void, PausaDialogResult>(
      PausaDialogComponent, { disableClose: true, width: '500px' });

    ref.afterClosed().subscribe(res => {
      if (res) {
        this.motivoPausa.set(res);
      } else {
        // Se arrepintió: no fue una pausa, se descarta.
        this.enPausa.set(false);
        this.pausaSegundos.set(0);
      }
    });
  }

  private terminarPausa(): void {
    const corte = this.corte();
    const motivo = this.motivoPausa();
    const segundos = this.pausaSegundos();
    this.enPausa.set(false);
    this.pausaSegundos.set(0);
    this.motivoPausa.set(null);

    if (!corte || !motivo || segundos <= 0) return;
    this.corteService.registrarEvento(corte.scdId, {
      tipo: 'PAUSA', subtipo: motivo.subtipo, motivo: motivo.motivo, segundos
    }).subscribe({
      next: () => this.refrescarResumen(),
      error: err => this.snack.open(
        err?.error?.message || 'No se pudo registrar la pausa', 'OK', { duration: 6000 })
    });
  }

  private refrescarResumen(): void {
    this.corteService.getSabana(this.sabId).subscribe({ next: s => this.sabana.set(s) });
  }

  etiquetaPausa(subtipo?: string): string {
    return subtipo ? (ETIQUETA_PAUSA[subtipo] || subtipo) : '';
  }

  sumarNoConforme(): void {
    this.noConforme.update(n => n + 1);
  }

  restarNoConforme(): void {
    this.noConforme.update(n => Math.max(0, n - 1));
  }

  siguiente(): void {
    const corte = this.corte();
    if (!corte || this.guardando() || this.avisoPendiente()) return;

    if (corte.reqCtrlLongitud || corte.reqCtrlTraccionA || corte.reqCtrlTraccionB) {
      const ref = this.dialog.open<ControlCalidadDialogComponent, ControlDialogData, ControlDialogResult>(
        ControlCalidadDialogComponent, { data: { corte }, disableClose: true, width: '520px' });
      ref.afterClosed().subscribe(res => {
        if (res) this.registrar(corte, res.controles);
      });
    } else {
      this.registrar(corte, []);
    }
  }

  private registrar(corte: Corte, controles: ControlDialogResult['controles']): void {
    this.guardando.set(true);
    const payload: RegistrarCorteRequest = {
      segundos: this.segundos(),
      noConforme: this.noConforme() || undefined,
      controles
    };

    this.corteService.registrarCorte(corte.scdId, payload).subscribe({
      next: res => {
        this.guardando.set(false);
        this.sabana.set(res.sabana);
        res.tareasGeneradas.forEach(t => this.snack.open(t, 'OK', { duration: 7000 }));

        this.todosLosCortes = this.todosLosCortes.map(
          c => c.scdId === corte.scdId ? { ...c, estado: 'HECHO' as const } : c);

        this.salteados.set(res.salteadosPendientes ?? 0);
        if (res.siguiente) {
          this.mostrarCorte(res.siguiente);
        } else {
          this.corte.set(null);
          this.terminada.set(true);
        }
      },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo registrar el corte', 'OK', { duration: 7000 });
      }
    });
  }

  // ------------------------------------------------- saltear y volver atrás

  /** ¿Hay algún corte hecho sobre el que se pueda volver? */
  hayHechos(): boolean {
    return this.todosLosCortes.some(c => c.estado === 'HECHO');
  }

  /**
   * Deja este corte para después. No se pierde: al final de la sábana se
   * vuelve a ofrecer, y si todavía no se puede hacer va a pendientes.
   */
  saltear(): void {
    const corte = this.corte();
    if (!corte) return;

    this.dialog.open<SaltearDialogComponent, void, SaltearDialogResult>(
      SaltearDialogComponent, { disableClose: true, width: '520px' }
    ).afterClosed().subscribe(res => {
      if (!res) return;
      this.guardando.set(true);
      this.corteService.saltearCorte(corte.scdId, res).subscribe({
        next: r => this.despuesDeMoverse(r, 'Corte salteado'),
        error: err => {
          this.guardando.set(false);
          this.snack.open(err?.error?.message || 'No se pudo saltear el corte', 'OK', { duration: 6000 });
        }
      });
    });
  }

  /** Vuelve sobre el último corte hecho para rehacerlo. */
  volverAlAnterior(): void {
    this.guardando.set(true);
    this.corteService.volverAlAnterior(this.sabId).subscribe({
      next: r => this.despuesDeMoverse(r, 'Volviste sobre el corte anterior'),
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo volver atrás', 'OK', { duration: 6000 });
      }
    });
  }

  /** Llegó el material: los salteados vuelven a la cola. */
  retomarSalteados(): void {
    this.guardando.set(true);
    this.corteService.retomarSalteados(this.sabId).subscribe({
      next: r => {
        this.terminada.set(false);
        this.despuesDeMoverse(r, 'Los cortes salteados vuelven a la cola');
      },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudieron retomar', 'OK', { duration: 6000 });
      }
    });
  }

  /** Cierra la sábana y manda lo que quedó a la lista de pendientes. */
  cerrarDejandoPendientes(): void {
    this.guardando.set(true);
    this.corteService.cerrarConPendientes(this.sabId).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snack.open('Sábana cerrada. Los cortes que faltaron quedaron en pendientes.',
          'OK', { duration: 7000 });
        this.volver();
      },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo cerrar la sábana', 'OK', { duration: 6000 });
      }
    });
  }

  /** Lo común a saltear, volver y retomar: refrescar el visor con lo que haya. */
  private despuesDeMoverse(r: RegistrarCorteResponse, aviso: string): void {
    this.guardando.set(false);
    if (r.sabana) this.sabana.set(r.sabana);
    this.salteados.set(r.salteadosPendientes ?? 0);
    this.snack.open(aviso, 'OK', { duration: 3000 });

    // La lista local quedó vieja: se vuelve a pedir para que los «vienen» y el
    // botón de volver atrás muestren el estado real.
    this.corteService.getCortes(this.sabId).subscribe(cortes => {
      this.todosLosCortes = cortes ?? [];
      if (r.siguiente) {
        this.mostrarCorte(r.siguiente);
        this.terminada.set(false);
      } else {
        this.corte.set(null);
        this.terminada.set(true);
      }
    });
  }

  /** Deja la sábana para retomarla más tarde, guardando el avance y el tiempo del corte. */
  suspender(): void {
    const corte = this.corte();
    if (!corte) return;

    const ref = this.dialog.open<SuspenderDialogComponent, void, SuspenderDialogResult>(
      SuspenderDialogComponent, { disableClose: true, width: '480px' });

    ref.afterClosed().subscribe(res => {
      if (!res) return;
      this.corteService.suspender(this.sabId, {
        subtipo: res.subtipo,
        motivo: res.motivo,
        scdId: corte.scdId,
        segundos: this.segundos()
      }).subscribe({
        next: () => {
          this.snack.open('Sábana suspendida. La retomás cuando quieras en este mismo corte.',
            'OK', { duration: 6000 });
          this.volver();
        },
        error: err => this.snack.open(
          err?.error?.message || 'No se pudo suspender la sábana', 'OK', { duration: 6000 })
      });
    });
  }

  volver(): void {
    this.router.navigate(['/corte']);
  }

  // ----------------------------------------------------------------- vista

  @HostListener('document:keydown', ['$event'])
  atajos(event: KeyboardEvent): void {
    if (this.dialog.openDialogs.length) return;
    const target = event.target as HTMLElement;
    if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.avisoPendiente()) this.confirmarAviso();
      else this.siguiente();
    }
    if (event.key === ' ') {
      event.preventDefault();
      this.alternarPausa();
    }
  }

  colorFondo(nombre?: string | null): string {
    if (!nombre) return '#e0e0e0';
    const partes = nombre.split('/').map(p => COLORES[p.trim().toUpperCase()] || '#bdbdbd');
    return partes.length > 1
      ? `linear-gradient(135deg, ${partes[0]} 0 50%, ${partes[1]} 50% 100%)`
      : partes[0];
  }

  colorTexto(nombre?: string | null): string {
    const claros = ['BLANCO', 'AMARILLO', 'GRIS', 'BEIGE', 'CELESTE', 'BL'];
    const primero = (nombre || '').split('/')[0].trim().toUpperCase();
    return claros.includes(primero) ? '#212121' : '#ffffff';
  }

  get reloj(): string {
    return this.mmss(this.segundos());
  }

  /** El reloj grande muestra el set up o la pausa cuando son los que están corriendo. */
  get relojActivo(): string {
    if (this.avisoPendiente()) return this.mmss(this.setupSegundos());
    if (this.enPausa()) return this.mmss(this.pausaSegundos());
    return this.mmss(this.segundos());
  }

  get rotuloReloj(): string {
    if (this.avisoPendiente()) return 'SET UP';
    if (this.enPausa()) return 'PAUSA';
    return 'CORTE';
  }

  private mmss(s: number): string {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  get progreso(): number {
    const s = this.sabana();
    if (!s || !s.totalCortes) return 0;
    return (s.cortesHechos / s.totalCortes) * 100;
  }

  duracion(segundos?: number): string {
    if (!segundos) return '—';
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m ${String(s).padStart(2, '0')}s`;
  }

  /** El mismo visor sirve para los dos: cambia lo que se muestra, no el circuito. */
  get esCorrugado(): boolean {
    return this.sabana()?.tipo === 'CORRUGADO';
  }

  get textoAviso(): string {
    const c = this.corte();
    if (!c) return '';

    // En corrugado el set up es cambiar el diámetro y cargar el programa.
    if (this.esCorrugado) {
      const programa = c.programa ? ` · programa ${c.programa}` : '';
      return `CAMBIO DE DIÁMETRO: Ø ${c.diametroTxt ?? c.diametro ?? '—'}${programa}`;
    }

    const avisos: string[] = [];
    if (c.cambioBobina) {
      const antes = `${c.colorAnterior ?? '—'} ${c.seccionAnterior ?? ''} mm2`.trim();
      const ahora = `${c.color ?? '—'} ${c.seccion ?? ''} mm2`.trim();
      avisos.push(`CAMBIO DE BOBINA: ${antes} → ${ahora}`);
    }
    if (c.cambioTerminal) {
      const cambios: string[] = [];
      if ((c.terminalAnteriorA || null) !== (c.terminalA || null)) {
        cambios.push(`A: ${c.terminalAnteriorA ?? 'sin terminal'} → ${c.terminalA ?? 'sin terminal'}`);
      }
      if ((c.terminalAnteriorB || null) !== (c.terminalB || null)) {
        cambios.push(`B: ${c.terminalAnteriorB ?? 'sin terminal'} → ${c.terminalB ?? 'sin terminal'}`);
      }
      avisos.push(`CAMBIO DE TERMINAL — ${cambios.join(' · ')}`);
    }
    return avisos.join('   |   ');
  }
}
