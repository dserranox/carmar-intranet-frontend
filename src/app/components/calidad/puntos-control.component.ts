import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { CalidadService } from '../../services/calidad.service';
import { PuntoControlAbm } from '../../models/calidad';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

/**
 * Los puntos que el responsable chequea en cada orden de la recorrida.
 * Los edita él mismo: no hace falta tocar la base para agregar o sacar uno.
 */
@Component({
  selector: 'app-puntos-control',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatTooltipModule,
    MatSnackBarModule, MatDialogModule, MatSelectModule
  ],
  templateUrl: './puntos-control.component.html',
  styleUrls: ['./puntos-control.component.css']
})
export class PuntosControlComponent implements OnInit {
  /** Cuando se muestra dentro de Criterios no lleva su propio encabezado. */
  @Input() embebido = false;

  private calidadService = inject(CalidadService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  puntos = signal<PuntoControlAbm[]>([]);
  guardando = signal(false);
  puedeEditar = false;

  columnas = ['orden', 'tipo', 'nombre', 'descripcion', 'usos', 'activo', 'acciones'];

  // Alta
  nuevoNombre = '';
  nuevaDescripcion = '';
  /** Lo que se verifica, o lo que se hace sobre la máquina. */
  nuevoTipo: 'CONTROL' | 'PUESTA_A_PUNTO' = 'CONTROL';

  ngOnInit(): void {
    this.puedeEditar = this.tienePermiso('CALIDAD:WRITE');
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
    this.calidadService.getPuntosTodos().subscribe({
      next: lista => this.puntos.set(lista),
      error: () => this.snack.open('No se pudieron cargar los puntos de control', 'OK', { duration: 4000 })
    });
  }

  get puedeAgregar(): boolean {
    return this.puedeEditar && !!this.nuevoNombre.trim();
  }

  agregar(): void {
    if (!this.puedeAgregar) return;
    this.guardando.set(true);
    this.calidadService.guardarPunto({
      nombre: this.nuevoNombre.trim(),
      descripcion: this.nuevaDescripcion.trim() || null,
      tipo: this.nuevoTipo,
      activo: true
    }).subscribe({
      next: punto => {
        this.guardando.set(false);
        this.nuevoNombre = '';
        this.nuevaDescripcion = '';
        this.snack.open(`«${punto.nombre}» agregado`, 'OK', { duration: 3000 });
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo agregar', 'OK', { duration: 6000 });
      }
    });
  }

  /** Se guarda al salir del campo, sin botón de por medio. */
  renombrar(punto: PuntoControlAbm, valor: string): void {
    const nombre = (valor ?? '').trim();
    if (!nombre || nombre.toUpperCase() === (punto.nombre ?? '').toUpperCase()) return;
    this.guardar({ ...punto, nombre });
  }

  cambiarDescripcion(punto: PuntoControlAbm, valor: string): void {
    const descripcion = (valor ?? '').trim() || null;
    if (descripcion === (punto.descripcion ?? null)) return;
    this.guardar({ ...punto, descripcion });
  }

  alternarActivo(punto: PuntoControlAbm, activo: boolean): void {
    this.guardar({ ...punto, activo });
  }

  private guardar(punto: PuntoControlAbm): void {
    this.calidadService.guardarPunto(punto).subscribe({
      next: () => this.cargar(),
      error: err => {
        this.snack.open(err?.error?.message || 'No se pudo guardar', 'OK', { duration: 6000 });
        this.cargar();
      }
    });
  }

  mover(punto: PuntoControlAbm, delta: number): void {
    this.calidadService.moverPunto(punto.pcoId!, delta).subscribe({
      next: lista => this.puntos.set(lista),
      error: err => this.snack.open(err?.error?.message || 'No se pudo mover', 'OK', { duration: 5000 })
    });
  }

  borrar(punto: PuntoControlAbm): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Borrar punto de control',
        mensaje: `¿Borrar «${punto.nombre}»? Dejará de pedirse en las próximas recorridas.`,
        botonConfirmar: 'Borrar',
        botonCancelar: 'Volver'
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.calidadService.borrarPunto(punto.pcoId!).subscribe({
        next: () => { this.snack.open('Punto borrado', 'OK', { duration: 3000 }); this.cargar(); },
        error: err => this.snack.open(err?.error?.message || 'No se pudo borrar', 'OK', { duration: 8000 })
      });
    });
  }

  volver(): void {
    this.router.navigate(['/calidad']);
  }
}
