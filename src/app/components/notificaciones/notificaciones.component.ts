import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { NotificacionesService } from '../../services/notificaciones.service';
import { Notificacion } from '../../models/notificacion';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule, MatButtonModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.css']
})
export class NotificacionesComponent implements OnInit {
  private servicio = inject(NotificacionesService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  todas = signal<Notificacion[]>([]);
  cargando = signal(false);
  soloNoLeidas = signal(false);

  visibles = computed(() => {
    const lista = this.todas();
    return this.soloNoLeidas() ? lista.filter(n => !n.leida) : lista;
  });

  sinLeer = computed(() => this.todas().filter(n => !n.leida).length);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.listar(false).subscribe({
      next: lista => {
        this.cargando.set(false);
        this.todas.set(lista);
        this.servicio.refrescarContador();
      },
      error: () => {
        this.cargando.set(false);
        this.snack.open('No se pudieron cargar las notificaciones', 'OK', { duration: 4000 });
      }
    });
  }

  alternarFiltro(): void {
    this.soloNoLeidas.set(!this.soloNoLeidas());
  }

  marcarLeida(n: Notificacion): void {
    if (n.leida) return;
    this.servicio.marcarLeida(n.nodId).subscribe({
      next: () => {
        n.leida = true;
        this.todas.set([...this.todas()]);
      },
      error: () => this.snack.open('No se pudo marcar como leída', 'OK', { duration: 3000 })
    });
  }

  marcarTodas(): void {
    this.servicio.marcarTodas().subscribe({
      next: r => {
        const texto = r.marcadas === 0 ? 'No había pendientes'
          : r.marcadas === 1 ? '1 marcada como leída'
          : `${r.marcadas} marcadas como leídas`;
        this.snack.open(texto, 'OK', { duration: 3000 });
        this.cargar();
      },
      error: () => this.snack.open('No se pudo marcar todas', 'OK', { duration: 3000 })
    });
  }

  /** Lleva al lugar donde pasó el problema. */
  irAlOrigen(n: Notificacion): void {
    this.marcarLeida(n);
    if (n.origenTipo === 'RUTA_CALIDAD' && n.origenId) {
      this.router.navigate(['/calidad/ruta', n.origenId]);
    } else if (n.origenTipo === 'CORTE') {
      this.router.navigate(['/calidad']);
    }
  }

  icono(n: Notificacion): string {
    switch (n.tipo) {
      case 'CALIDAD_KO': return 'report';
      case 'CONTROL_NO_CONFORME': return 'straighten';
      default: return 'notifications';
    }
  }

  etiquetaTipo(n: Notificacion): string {
    switch (n.tipo) {
      case 'CALIDAD_KO': return 'Recorrida de calidad';
      case 'CONTROL_NO_CONFORME': return 'Control de corte';
      default: return n.tipo;
    }
  }
}
