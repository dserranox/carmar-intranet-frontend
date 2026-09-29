import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { CalidadService } from '../../services/calidad.service';
import { ControlRuta, OrdenAbierta, ResultadoPunto, RutaCalidad } from '../../models/calidad';
import { ElegirOrdenDialogComponent } from './elegir-orden-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

/**
 * La recorrida en la mano: el responsable elige una orden abierta y va marcando
 * los puntos de control. Pensada para la tablet de 10" en horizontal, entera en
 * una pantalla y sin scroll.
 */
@Component({
  selector: 'app-ruta-visor',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatTooltipModule, MatSnackBarModule, MatDialogModule
  ],
  templateUrl: './ruta-visor.component.html',
  styleUrls: ['./ruta-visor.component.css']
})
export class RutaVisorComponent implements OnInit, OnDestroy {
  private calidadService = inject(CalidadService);
  private ruteador = inject(Router);
  private rutaActiva = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  ruta = signal<RutaCalidad | null>(null);
  seleccionadoId = signal<number | null>(null);
  guardando = signal(false);
  transcurrido = signal('0:00');

  private cronometro?: ReturnType<typeof setInterval>;

  /** La orden que se está controlando en este momento. */
  control = computed<ControlRuta | null>(() => {
    const r = this.ruta();
    if (!r?.controles?.length) return null;
    const id = this.seleccionadoId();
    return r.controles.find(c => c.rccId === id) ?? r.controles[0];
  });

  soloLectura = computed(() => {
    const r = this.ruta();
    if (!r) return true;
    return r.estado !== 'EN_CURSO' || r.responsable !== this.usuarioActual();
  });

  /**
   * Cuántos puntos faltan marcar en la orden que está abierta. Lee la ruta y no
   * control(), porque control() devuelve siempre el mismo objeto y el computed
   * no se volvería a calcular al marcar un punto.
   */
  faltantes = computed(() => {
    const r = this.ruta();
    const id = this.seleccionadoId();
    const c = r?.controles?.find(x => x.rccId === id) ?? r?.controles?.[0];
    return (c?.items ?? []).filter(i => i.resultado === 'PENDIENTE').length;
  });

  ngOnInit(): void {
    const id = Number(this.rutaActiva.snapshot.paramMap.get('rcaId'));
    this.cargar(id);
    this.cronometro = setInterval(() => this.actualizarReloj(), 1000);
  }

  ngOnDestroy(): void {
    if (this.cronometro) clearInterval(this.cronometro);
  }

  private cargar(rcaId: number): void {
    this.calidadService.getRuta(rcaId).subscribe({
      next: ruta => {
        this.ruta.set(ruta);
        if (!this.seleccionadoId() && ruta.controles?.length) {
          this.seleccionadoId.set(ruta.controles[ruta.controles.length - 1].rccId);
        }
        this.actualizarReloj();
      },
      error: err => {
        this.snack.open(err?.error?.message || 'No se pudo abrir la recorrida', 'OK', { duration: 5000 });
        this.ruteador.navigate(['/calidad']);
      }
    });
  }

  private actualizarReloj(): void {
    const r = this.ruta();
    if (!r) return;
    const fin = r.fechaFin ? new Date(r.fechaFin) : new Date();
    const segundos = Math.max(0, Math.floor((fin.getTime() - new Date(r.fechaInicio).getTime()) / 1000));
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    this.transcurrido.set(h > 0
      ? `${h}:${String(m).padStart(2, '0')} h`
      : `${m} min`);
  }

  usuarioActual(): string {
    try {
      const data = localStorage.getItem('user');
      return data ? (JSON.parse(data)?.username ?? '') : '';
    } catch { return ''; }
  }

  // ==================== Órdenes de la recorrida ====================

  agregarOrden(): void {
    const r = this.ruta();
    if (!r) return;
    this.calidadService.getOrdenesAbiertas(r.rcaId).subscribe({
      next: ordenes => this.abrirSelector(ordenes),
      error: () => this.snack.open('No se pudieron cargar las órdenes abiertas', 'OK', { duration: 4000 })
    });
  }

  private abrirSelector(ordenes: OrdenAbierta[]): void {
    const r = this.ruta();
    if (!r) return;
    this.dialog.open(ElegirOrdenDialogComponent, { data: { ordenes } })
      .afterClosed().subscribe((elegida: OrdenAbierta | undefined) => {
        if (!elegida) return;
        this.calidadService.agregarOrden(r.rcaId, elegida.ordenId).subscribe({
          next: actualizada => {
            this.ruta.set(actualizada);
            const nueva = actualizada.controles?.find(c => c.ordenId === elegida.ordenId);
            if (nueva) this.seleccionadoId.set(nueva.rccId);
            // Si el operario está trabajando esa orden, se anota solo.
            if (nueva && !nueva.operario && elegida.operarios.length) {
              nueva.operario = elegida.operarios.join(', ');
              nueva.puesto = elegida.puestos.join(' · ') || null;
            }
          },
          error: err => this.snack.open(err?.error?.message || 'No se pudo agregar la orden', 'OK',
            { duration: 5000 })
        });
      });
  }

  elegirControl(control: ControlRuta): void {
    this.seleccionadoId.set(control.rccId);
  }

  quitar(control: ControlRuta): void {
    const r = this.ruta();
    if (!r) return;
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Sacar la orden',
        mensaje: `¿Sacar el plan ${control.nroPlan} de esta recorrida? Se pierde lo que marcaste.`,
        botonConfirmar: 'Sacar',
        botonCancelar: 'Volver'
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.calidadService.quitarOrden(r.rcaId, control.rccId).subscribe({
        next: actualizada => {
          this.ruta.set(actualizada);
          this.seleccionadoId.set(actualizada.controles?.length
            ? actualizada.controles[actualizada.controles.length - 1].rccId : null);
        },
        error: err => this.snack.open(err?.error?.message || 'No se pudo sacar', 'OK', { duration: 5000 })
      });
    });
  }

  // ==================== Marcar los puntos ====================

  marcar(item: { resultado: ResultadoPunto }, valor: ResultadoPunto): void {
    if (this.soloLectura()) return;
    // Volver a tocar el mismo botón lo desmarca, por si se apretó de más.
    item.resultado = item.resultado === valor ? 'PENDIENTE' : valor;
    // Los ítems son objetos comunes: sin esto el contador de faltantes no se entera.
    const actual = this.ruta();
    if (actual) this.ruta.set({ ...actual });
  }

  guardar(): void {
    const r = this.ruta();
    const c = this.control();
    if (!r || !c) return;
    this.guardando.set(true);
    this.calidadService.guardarControl(r.rcaId, c).subscribe({
      next: actualizada => {
        this.guardando.set(false);
        this.ruta.set(actualizada);
        const guardado = actualizada.controles?.find(x => x.rccId === c.rccId);
        // Un KO tiene que terminar en una no conformidad: se ofrece abrirla ahí mismo.
        if (guardado?.resultado === 'KO') {
          this.ofrecerNoConformidad(guardado);
        } else {
          this.snack.open(`Plan ${c.nroPlan} guardado`, 'OK', { duration: 2500 });
        }
      },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo guardar', 'OK', { duration: 6000 });
      }
    });
  }

  /**
   * Un KO no puede quedar solo anotado: da lugar a una no conformidad interna.
   * El formulario se abre precargado y la persona lo revisa antes de confirmar.
   */
  private ofrecerNoConformidad(control: ControlRuta): void {
    this.dialog.open(ConfirmDialogComponent, {
      disableClose: true,
      data: {
        titulo: 'Abrir no conformidad',
        mensaje: `El plan ${control.nroPlan} quedó KO. Corresponde abrir una no conformidad interna: `
               + 'el formulario se abre con lo que ya cargaste.',
        botonConfirmar: 'Abrir no conformidad',
        botonCancelar: 'Más tarde'
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) {
        this.snack.open('Quedó pendiente abrir la no conformidad de ese KO', 'OK', { duration: 5000 });
        return;
      }
      this.ruteador.navigate(['/no-conformidades/nueva'], { queryParams: { rccId: control.rccId } });
    });
  }

  /** Desde la lista, para el KO que se dejó para después. */
  abrirNoConformidad(control: ControlRuta): void {
    this.ruteador.navigate(['/no-conformidades/nueva'], { queryParams: { rccId: control.rccId } });
  }

  // ==================== Cerrar ====================

  cerrarRuta(): void {
    const r = this.ruta();
    if (!r) return;
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Cerrar la recorrida',
        mensaje: `Controlaste ${this.plural(r.ordenesControladas, 'orden', 'órdenes')}`
               + `, ${r.ordenesKo === 0 ? 'ninguna con KO' : this.plural(r.ordenesKo, 'con algún KO', 'con algún KO')}. `
               + 'Al cerrarla se te carga como tarea de Ruta de control y ya no se puede modificar.',
        botonConfirmar: 'Cerrar recorrida',
        botonCancelar: 'Seguir controlando'
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.calidadService.cerrarRuta(r.rcaId, r.observaciones ?? undefined).subscribe({
        next: () => {
          this.snack.open('Recorrida cerrada y cargada como tarea', 'OK', { duration: 4000 });
          this.ruteador.navigate(['/calidad']);
        },
        error: err => this.snack.open(err?.error?.message || 'No se pudo cerrar', 'OK', { duration: 7000 })
      });
    });
  }

  volver(): void {
    this.ruteador.navigate(['/calidad']);
  }

  /** "1 orden" y no "1 órdenes". */
  private plural(cantidad: number, singular: string, plural: string): string {
    return `${cantidad} ${cantidad === 1 ? singular : plural}`;
  }

  claseResultado(resultado: string): string {
    switch (resultado) {
      case 'OK': return 'ok';
      case 'KO': return 'ko';
      case 'NA': return 'na';
      default: return 'pendiente';
    }
  }
}
