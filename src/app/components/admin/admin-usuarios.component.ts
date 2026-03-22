import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsuarioService, UsuarioAdminDTO } from '../../services/usuario.service';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTooltipModule,
    MatChipsModule, MatSnackBarModule, MatProgressSpinnerModule
  ],
  templateUrl: './admin-usuarios.component.html',
  styleUrls: ['./admin-usuarios.component.scss']
})
export class AdminUsuariosComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  loading = true;
  filtroUsername = '';

  private allUsuarios: UsuarioAdminDTO[] = [];
  filtered: UsuarioAdminDTO[] = [];

  displayedColumns = ['username', 'email', 'roles', 'fechaCreacion', 'activo', 'acciones'];

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  private cargarUsuarios(): void {
    this.loading = true;
    this.usuarioService.getUsuarios().subscribe({
      next: (data) => {
        this.allUsuarios = data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.snack.open('No se pudo cargar la lista de usuarios.', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onFiltroChange(val: string): void {
    this.filtroUsername = val;
    this.applyFilter();
  }

  limpiarFiltro(): void {
    this.filtroUsername = '';
    this.applyFilter();
  }

  applyFilter(): void {
    const f = this.filtroUsername.toLowerCase().trim();
    this.filtered = f
      ? this.allUsuarios.filter(u => u.username.toLowerCase().includes(f))
      : [...this.allUsuarios];
  }

  nuevoUsuario(): void {
    this.router.navigate(['/admin/usuarios/nuevo']);
  }

  verUsuario(u: UsuarioAdminDTO): void {
    this.router.navigate(['/admin/usuarios', u.id, 'ver']);
  }

  editarUsuario(u: UsuarioAdminDTO): void {
    this.router.navigate(['/admin/usuarios', u.id, 'editar']);
  }

  darDeBaja(u: UsuarioAdminDTO): void {
    this.usuarioService.darDeBaja(u.id).subscribe({
      next: () => {
        u.activo = false;
        this.applyFilter();
        this.snack.open('Usuario dado de baja.', 'OK', { duration: 2500 });
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'No se pudo dar de baja.', 'OK', { duration: 4000 });
      }
    });
  }

  darDeAlta(u: UsuarioAdminDTO): void {
    this.usuarioService.darDeAlta(u.id).subscribe({
      next: () => {
        u.activo = true;
        this.applyFilter();
        this.snack.open('Usuario dado de alta.', 'OK', { duration: 2500 });
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'No se pudo dar de alta.', 'OK', { duration: 4000 });
      }
    });
  }
}
