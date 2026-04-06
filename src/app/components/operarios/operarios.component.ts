import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { TasksService } from '../../services/tasks.service';
import { OperarioEstadoDTO } from '../../models/operario-estado';

@Component({
  selector: 'app-operarios',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    MatTableModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule
  ],
  templateUrl: './operarios.component.html',
  styleUrls: ['./operarios.component.css']
})
export class OperariosComponent implements OnInit {
  private tasksService = inject(TasksService);
  private snack = inject(MatSnackBar);

  allOperarios: OperarioEstadoDTO[] = [];
  filtered: OperarioEstadoDTO[] = [];

  filtroUsuario = signal<string>('');

  displayedColumns = ['usuario', 'estado', 'fechaInicio', 'nroPlan', 'productoCodigo', 'productoDescripcion', 'operacion', 'nroMaquina'];

  get usuariosUnicos(): string[] {
    return this.allOperarios.map(o => o.username).sort((a, b) => a.localeCompare(b));
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.tasksService.getOperariosActivos().subscribe({
      next: (data) => {
        this.allOperarios = data || [];
        this.applyFilters();
      },
      error: () => {
        this.allOperarios = [];
        this.filtered = [];
        this.snack.open('No se pudo cargar el estado de operarios', 'OK', { duration: 3000 });
      }
    });
  }

  onUsuarioChange(val: string): void {
    this.filtroUsuario.set(val || '');
    this.applyFilters();
  }

  limpiarFiltros(): void {
    this.filtroUsuario.set('');
    this.applyFilters();
  }

  private applyFilters(): void {
    const user = this.filtroUsuario().toLowerCase().trim();
    this.filtered = this.allOperarios.filter(o => {
      if (user && !o.username.toLowerCase().includes(user)) return false;
      return true;
    });
  }

  estadoClass(row: OperarioEstadoDTO): string {
    return row.fechaInicio != null ? 'status en-curso' : 'status libre';
  }

  estadoLabel(row: OperarioEstadoDTO): string {
    return row.fechaInicio != null ? 'EN CURSO' : 'LIBRE';
  }
}
