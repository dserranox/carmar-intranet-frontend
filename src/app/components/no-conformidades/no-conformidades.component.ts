import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { NoConformidadesService } from '../../services/no-conformidades.service';
import {
  NoConformidad, ORIGENES_EXTERNOS, ORIGENES_INTERNOS, etiquetaOrigen
} from '../../models/no-conformidad';
import { OpcionBuscable, SelectBuscableComponent } from '../../shared/select-buscable.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { MotivoDialogComponent, MotivoDialogData } from '../../shared/motivo-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

/** Seguimiento: qué no conformidades hay, de dónde salieron y cómo van. */
@Component({
  selector: 'app-no-conformidades',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, MatTableModule, MatIconModule,
    MatButtonModule, MatTooltipModule, MatSnackBarModule, MatDialogModule, SelectBuscableComponent
  ],
  templateUrl: './no-conformidades.component.html',
  styleUrls: ['./no-conformidades.component.css']
})
export class NoConformidadesComponent implements OnInit {
  private servicio = inject(NoConformidadesService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  todas = signal<NoConformidad[]>([]);
  cargando = signal(false);
  puedeEscribir = false;

  filtroEstado = '';
  filtroOrigen = '';
  filtroTipo = '';

  columnas = ['numero', 'fecha', 'tipo', 'origen', 'producto', 'descripcion', 'responsables', 'estado', 'acciones'];

  opcionesEstado: OpcionBuscable[] = [
    { valor: 'PENDIENTE', texto: 'Pendiente de validación' },
    { valor: 'ABIERTA', texto: 'Abierta' },
    { valor: 'CERRADA', texto: 'Cerrada' },
    { valor: 'NO_PROCEDENTE', texto: 'No procedente' },
    { valor: 'ANULADA', texto: 'Anulada' }
  ];
  opcionesTipo: OpcionBuscable[] = [
    { valor: 'INTERNA', texto: 'Interna' },
    { valor: 'EXTERNA', texto: 'Externa' }
  ];
  opcionesOrigen: OpcionBuscable[] = [...ORIGENES_INTERNOS, ...ORIGENES_EXTERNOS]
    .map(o => ({ valor: o.valor, texto: o.texto }));

  abiertas = computed(() => this.todas().filter(n => n.estado === 'ABIERTA').length);
  cerradas = computed(() => this.todas().filter(n => n.estado === 'CERRADA').length);
  sinAccion = computed(() => this.todas()
    .filter(n => n.estado === 'ABIERTA' && !n.accionInmediata).length);
  /** Reportadas que todavía nadie confirmó que sean no conformidades. */
  pendientes = computed(() => this.todas().filter(n => n.estado === 'PENDIENTE').length);

  /** Calidad, jefe de producción y administrador deciden si una NC procede. */
  puedeValidar = false;

  ngOnInit(): void {
    this.puedeEscribir = this.tienePermiso('NOCONFORMIDADES:WRITE');
    this.puedeValidar = this.tienePermiso('NC:VALIDAR');
    this.cargar();
  }

  // ------------------------------------------------- validación y anulación

  validar(nc: NoConformidad): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        titulo: `Validar la no conformidad N° ${nc.numero}`,
        mensaje: 'Confirmás que esto es una no conformidad. A partir de ahora cuenta en los '
               + 'indicadores y se avisa al resto. ¿Seguimos?',
        botonConfirmar: 'Validar',
        botonCancelar: 'Volver',
        peligroso: false
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.servicio.validar(nc.ncfId!).subscribe({
        next: () => { this.snack.open('No conformidad validada', 'OK', { duration: 3000 }); this.cargar(); },
        error: err => this.snack.open(err?.error?.message || 'No se pudo validar', 'OK', { duration: 5000 })
      });
    });
  }

  rechazar(nc: NoConformidad): void {
    this.dialog.open<MotivoDialogComponent, MotivoDialogData, string>(MotivoDialogComponent, {
      data: {
        titulo: `La N° ${nc.numero} no procede`,
        nota: 'No se borra: queda registrada con tu motivo y afuera de los indicadores. '
            + 'Quien la cargó recibe el aviso.',
        etiqueta: 'Por qué no procede',
        botonConfirmar: 'No procede',
        botonCancelar: 'Volver'
      }
    }).afterClosed().subscribe(motivo => {
      if (!motivo) return;
      this.servicio.rechazar(nc.ncfId!, motivo).subscribe({
        next: () => { this.snack.open('Marcada como no procedente', 'OK', { duration: 3000 }); this.cargar(); },
        error: err => this.snack.open(err?.error?.message || 'No se pudo rechazar', 'OK', { duration: 5000 })
      });
    });
  }

  anular(nc: NoConformidad): void {
    this.dialog.open<MotivoDialogComponent, MotivoDialogData, string>(MotivoDialogComponent, {
      data: {
        titulo: `Anular la no conformidad N° ${nc.numero}`,
        nota: 'Para una NC mal cargada o repetida. No se borra y el número queda reservado: '
            + 'va a seguir estando a la vista, anulada y con tu motivo.',
        etiqueta: 'Por qué se anula',
        botonConfirmar: 'Anular',
        botonCancelar: 'Volver',
        peligroso: true
      }
    }).afterClosed().subscribe(motivo => {
      if (!motivo) return;
      this.servicio.anular(nc.ncfId!, motivo).subscribe({
        next: () => { this.snack.open('No conformidad anulada', 'OK', { duration: 3000 }); this.cargar(); },
        error: err => this.snack.open(err?.error?.message || 'No se pudo anular', 'OK', { duration: 5000 })
      });
    });
  }

  private tienePermiso(permiso: string): boolean {
    try {
      const data = localStorage.getItem('user');
      if (!data) return false;
      const perms = JSON.parse(data)?.permissions;
      return Array.isArray(perms) && perms.includes(permiso);
    } catch { return false; }
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.listar({
      estado: this.filtroEstado || undefined,
      origen: this.filtroOrigen || undefined,
      tipo: this.filtroTipo || undefined
    }).subscribe({
      next: lista => { this.cargando.set(false); this.todas.set(lista); },
      error: () => {
        this.cargando.set(false);
        this.snack.open('No se pudieron cargar las no conformidades', 'OK', { duration: 4000 });
      }
    });
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroOrigen = '';
    this.filtroTipo = '';
    this.cargar();
  }

  nueva(): void {
    this.router.navigate(['/no-conformidades/nueva']);
  }

  abrir(nc: NoConformidad): void {
    this.router.navigate(['/no-conformidades', nc.ncfId]);
  }

  origen(nc: NoConformidad): string {
    const base = etiquetaOrigen(nc.origen);
    return nc.origenOtro ? `${base}: ${nc.origenOtro}` : base;
  }

  producto(nc: NoConformidad): string {
    const partes = [nc.productoCodigo, nc.nroPlan ? `plan ${nc.nroPlan}` : null].filter(Boolean);
    return partes.length ? partes.join(' · ') : '—';
  }

  descargar(nc: NoConformidad): void {
    this.servicio.descargarFormulario(nc.ncfId!).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FQ-02 NO CONFORMIDAD N${nc.numero} ${nc.tipo === 'INTERNA' ? 'Interna' : 'Externa'}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: err => this.snack.open(err?.error?.message || 'No se pudo generar el formulario',
        'OK', { duration: 6000 })
    });
  }
}
