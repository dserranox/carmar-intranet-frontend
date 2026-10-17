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

/** Seguimiento: qué no conformidades hay, de dónde salieron y cómo van. */
@Component({
  selector: 'app-no-conformidades',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, MatTableModule, MatIconModule,
    MatButtonModule, MatTooltipModule, MatSnackBarModule, SelectBuscableComponent
  ],
  templateUrl: './no-conformidades.component.html',
  styleUrls: ['./no-conformidades.component.css']
})
export class NoConformidadesComponent implements OnInit {
  private servicio = inject(NoConformidadesService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  todas = signal<NoConformidad[]>([]);
  cargando = signal(false);
  puedeEscribir = false;

  filtroEstado = '';
  filtroOrigen = '';
  filtroTipo = '';

  columnas = ['numero', 'fecha', 'tipo', 'origen', 'producto', 'descripcion', 'responsables', 'estado', 'acciones'];

  opcionesEstado: OpcionBuscable[] = [
    { valor: 'ABIERTA', texto: 'Abierta' },
    { valor: 'CERRADA', texto: 'Cerrada' }
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

  ngOnInit(): void {
    this.puedeEscribir = this.tienePermiso('NOCONFORMIDADES:WRITE');
    this.cargar();
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
