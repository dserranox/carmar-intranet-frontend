import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AsignacionesService } from '../../services/asignaciones.service';
import { OperationsService } from '../../services/operations.service';
import { UsuarioService, UsuarioAdminDTO } from '../../services/usuario.service';
import { OperacionesDTO } from '../../models/operacion';
import { Asignacion, AsignarItem } from '../../models/asignacion';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

export interface AsignarDialogData {
  ordenId: number;
  nroPlan: string;
  productoCodigo?: string;
  productoDescripcion?: string;
  cantidad?: number | null;
}

/**
 * Reparte el trabajo de una orden: una fila por actividad y operario, con la
 * cantidad que le toca a cada uno y el puesto o máquina donde va a trabajar.
 * Pensado para la pantalla del administrador (PC).
 */
@Component({
  selector: 'app-asignar-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatTooltipModule
  ],
  templateUrl: './asignar-dialog.component.html',
  styleUrls: ['./asignar-dialog.component.css']
})
export class AsignarDialogComponent implements OnInit {
  private asignacionesService = inject(AsignacionesService);
  private operacionesService = inject(OperationsService);
  private usuarioService = inject(UsuarioService);
  private ref = inject(MatDialogRef<AsignarDialogComponent, boolean>);
  private dialog = inject(MatDialog);

  operaciones = signal<OperacionesDTO[]>([]);
  operarios = signal<UsuarioAdminDTO[]>([]);
  yaAsignadas = signal<Asignacion[]>([]);
  guardando = signal(false);
  error = signal<string | null>(null);
  advertencias = signal<string[]>([]);

  filas: AsignarItem[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: AsignarDialogData) {}

  ngOnInit(): void {
    // Una asignación repartida entre cuatro operarios son varios minutos de
    // trabajo: un clic al costado no se los puede llevar sin preguntar.
    this.ref.disableClose = true;
    this.ref.backdropClick().subscribe(() => this.intentarCerrar());
    this.ref.keydownEvents().subscribe(e => {
      if (e.key === 'Escape') this.intentarCerrar();
    });

    this.operacionesService.getAsignables().subscribe({
      next: ops => this.operaciones.set(ops || []),
      error: () => this.operaciones.set([])
    });
    this.usuarioService.getAsignables().subscribe({
      next: us => this.operarios.set(us || []),
      error: () => this.operarios.set([])
    });
    this.cargarAsignadas();
    this.agregarFila();
  }

  private cargarAsignadas(): void {
    this.asignacionesService.porOrden(this.data.ordenId).subscribe({
      next: a => this.yaAsignadas.set((a || []).filter(x => x.estado !== 'CANCELADA')),
      error: () => this.yaAsignadas.set([])
    });
  }

  agregarFila(): void {
    this.filas.push({
      operacionIds: [], operario: "", cantidad: this.cantidadSugerida(), nroMaquina: null, puesto: ""
    });
  }

  /** Por defecto propone lo que falta asignar de la orden. */
  private cantidadSugerida(): number | null {
    return this.data.cantidad ?? null;
  }

  quitarFila(i: number): void {
    this.filas.splice(i, 1);
    if (!this.filas.length) this.agregarFila();
  }

  /** Divide la cantidad de la orden en partes iguales entre las filas cargadas. */
  repartirParejo(): void {
    const total = this.data.cantidad;
    if (!total || !this.filas.length) return;
    const base = Math.floor(total / this.filas.length);
    const resto = total % this.filas.length;
    this.filas.forEach((f, i) => f.cantidad = base + (i < resto ? 1 : 0));
  }

  nombreOperacion(id: number | null): string {
    return this.operaciones().find(o => o.opeId === id)?.opeNombre || '';
  }

  /** Cuántas unidades ya hay asignadas de esa actividad en la orden. */
  asignadoEn(operacionId: number): number {
    return this.yaAsignadas()
      .flatMap(a => a.actividades || [])
      .filter(act => act.operacionId === operacionId)
      .reduce((total, act) => total + (act.cantidad || 0), 0);
  }

  /** Aviso por fila: qué actividades de las elegidas ya tienen unidades repartidas. */
  avisoCantidad(fila: AsignarItem): string | null {
    const conAsignado = fila.operacionIds
      .map(id => ({ id, unidades: this.asignadoEn(id) }))
      .filter(x => x.unidades > 0);
    if (!conAsignado.length) return null;
    return conAsignado
      .map(x => `${this.nombreOperacion(x.id)}: ya hay ${x.unidades} u.`)
      .join(' · ');
  }

  get filasValidas(): boolean {
    return this.filas.length > 0
      && this.filas.every(f => f.operacionIds.length > 0 && !!f.operario
           && (f.cantidad == null || f.cantidad > 0));
  }

  guardar(): void {
    if (!this.filasValidas) {
      this.error.set('Cada fila necesita al menos la actividad y el operario.');
      return;
    }
    this.guardando.set(true);
    this.error.set(null);

    this.asignacionesService.asignar({
      ordenId: this.data.ordenId,
      items: this.filas.map(f => ({
        operacionIds: f.operacionIds,
        operario: f.operario,
        cantidad: f.cantidad,
        nroMaquina: f.nroMaquina,
        puesto: f.puesto
      }))
    }).subscribe({
      next: res => {
        this.guardando.set(false);
        this.advertencias.set(res.advertencias || []);
        if (res.advertencias?.length) {
          // Se guardó igual: se muestran los avisos y se refresca para que los vea.
          this.filas = [];
          this.agregarFila();
          this.cargarAsignadas();
        } else {
          this.ref.close(true);
        }
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.message || 'No se pudieron guardar las asignaciones');
      }
    });
  }

  cerrar(): void {
    this.ref.close(this.yaAsignadas().length > 0);
  }

  /** ¿Hay algo escrito que se perdería al cerrar? */
  private hayCambiosSinGuardar(): boolean {
    return this.filas.some(f =>
      (f.operacionIds?.length ?? 0) > 0
      || !!f.operario
      || !!f.nroMaquina
      || !!(f.puesto && f.puesto.trim()));
  }

  /** Cerrar desde afuera: si hay algo cargado, se pregunta antes de descartarlo. */
  private intentarCerrar(): void {
    if (!this.hayCambiosSinGuardar()) {
      this.cerrar();
      return;
    }
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Descartar la asignación',
        mensaje: 'Tenés cargada una asignación sin guardar. Si cerrás, se pierde.',
        botonConfirmar: 'Descartar',
        botonCancelar: 'Seguir cargando'
      }
    }).afterClosed().subscribe(ok => {
      if (ok) this.cerrar();
    });
  }
}
