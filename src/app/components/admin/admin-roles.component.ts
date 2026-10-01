import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Pantalla, Rol, RolesService } from '../../services/roles.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

/**
 * Los roles los arma el administrador: le pone un nombre y marca qué pantallas ve.
 * Tildar «editar» prende «ver» solo, porque no se puede cargar algo que no se ve.
 *
 * El rol del administrador no se toca: es la llave de la casa y se muestra como
 * referencia nada más.
 */
@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatCheckboxModule, MatTooltipModule,
    MatSnackBarModule, MatDialogModule, MatProgressSpinnerModule
  ],
  templateUrl: './admin-roles.component.html',
  styleUrls: ['./admin-roles.component.css']
})
export class AdminRolesComponent implements OnInit {
  private servicio = inject(RolesService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  pantallas = signal<Pantalla[]>([]);
  roles = signal<Rol[]>([]);
  cargando = signal(true);
  guardando = signal(false);

  /** El rol que se está editando, o uno nuevo. Null = no hay nada abierto. */
  editando = signal<Rol | null>(null);
  esNuevo = computed(() => !this.editando()?.id);

  puedeEditar = this.tienePermiso('USUARIOS:WRITE');

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.servicio.getPantallas().subscribe({
      next: ps => this.pantallas.set(ps || []),
      error: () => this.pantallas.set([])
    });
    this.servicio.getRoles().subscribe({
      next: rs => { this.roles.set(rs || []); this.cargando.set(false); },
      error: err => {
        this.cargando.set(false);
        this.snack.open(err?.error?.message || 'No se pudieron cargar los roles', 'OK',
          { duration: 5000 });
      }
    });
  }

  // ==================== edición ====================

  nuevo(): void {
    this.editando.set({ nombre: '', descripcion: '', pantallas: [] });
  }

  editar(rol: Rol): void {
    if (rol.protegido) return;
    this.editando.set({ ...rol, pantallas: rol.pantallas.map(p => ({ ...p })) });
  }

  cancelar(): void {
    this.editando.set(null);
  }

  cambiarNombre(nombre: string): void {
    const rol = this.editando();
    if (rol) this.editando.set({ ...rol, nombre });
  }

  cambiarDescripcion(descripcion: string): void {
    const rol = this.editando();
    if (rol) this.editando.set({ ...rol, descripcion });
  }

  /** Cómo está marcada una pantalla en el rol que se está editando. */
  estado(clave: string): { ver: boolean; editar: boolean } {
    const encontrada = this.editando()?.pantallas.find(p => p.clave === clave);
    return { ver: !!encontrada?.ver, editar: !!encontrada?.editar };
  }

  marcar(clave: string, campo: 'ver' | 'editar', valor: boolean): void {
    const rol = this.editando();
    if (!rol) return;

    const pantallas = [...rol.pantallas];
    const i = pantallas.findIndex(p => p.clave === clave);
    const actual = i >= 0 ? { ...pantallas[i] } : { clave, ver: false, editar: false };

    if (campo === 'editar') {
      actual.editar = valor;
      // Editar implica ver; si se destilda editar, la pantalla se sigue viendo.
      if (valor) actual.ver = true;
    } else {
      actual.ver = valor;
      // Si se saca la pantalla entera, tampoco se edita.
      if (!valor) actual.editar = false;
    }

    if (!actual.ver && !actual.editar) {
      if (i >= 0) pantallas.splice(i, 1);
    } else if (i >= 0) {
      pantallas[i] = actual;
    } else {
      pantallas.push(actual);
    }

    this.editando.set({ ...rol, pantallas });
  }

  guardar(): void {
    const rol = this.editando();
    if (!rol) return;
    if (!rol.nombre?.trim()) {
      this.snack.open('Ponele un nombre al rol', 'OK', { duration: 4000 });
      return;
    }
    if (!rol.pantallas.length) {
      this.snack.open('Marcale al menos una pantalla: si no, el rol no sirve para nada',
        'OK', { duration: 5000 });
      return;
    }

    this.guardando.set(true);
    const pedido = rol.id
      ? this.servicio.actualizar(rol.id, rol)
      : this.servicio.crear(rol);

    pedido.subscribe({
      next: () => {
        this.guardando.set(false);
        this.snack.open(rol.id ? 'Rol guardado' : `Rol ${rol.nombre.toUpperCase()} creado`,
          'OK', { duration: 3000 });
        this.editando.set(null);
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo guardar el rol', 'OK',
          { duration: 8000 });
      }
    });
  }

  eliminar(rol: Rol): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Eliminar el rol',
        mensaje: `¿Eliminar el rol ${rol.nombre}? Esto no se puede deshacer.`,
        botonConfirmar: 'Eliminar',
        botonCancelar: 'Volver'
      }
    }).afterClosed().subscribe(ok => {
      if (!ok || !rol.id) return;
      this.servicio.eliminar(rol.id).subscribe({
        next: () => {
          this.snack.open('Rol eliminado', 'OK', { duration: 3000 });
          this.cargar();
        },
        error: err => this.snack.open(err?.error?.message || 'No se pudo eliminar', 'OK',
          { duration: 8000 })
      });
    });
  }

  /** Para el listado: las pantallas que ve un rol, en texto. */
  resumen(rol: Rol): string {
    if (!rol.pantallas.length) return 'Sin pantallas';
    return rol.pantallas
      .map(p => {
        const pantalla = this.pantallas().find(x => x.clave === p.clave);
        const nombre = pantalla?.etiqueta ?? p.clave;
        return p.editar ? `${nombre} (edita)` : nombre;
      })
      .join(' · ');
  }

  private tienePermiso(permiso: string): boolean {
    try {
      const data = localStorage.getItem('user');
      if (!data) return false;
      const perms = JSON.parse(data)?.permissions;
      return Array.isArray(perms) && perms.includes(permiso);
    } catch { return false; }
  }
}
