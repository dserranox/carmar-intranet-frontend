
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../services/auth.service';
import { NotificacionesService } from '../services/notificaciones.service';
import { rutaDeInicio } from '../shared/inicio';
import { TareaAbiertaService } from '../shared/tarea-abierta.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatIconModule, MatButtonModule, MatDividerModule,
    MatTooltipModule, MatMenuModule
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private notificaciones = inject(NotificacionesService);
  private tareas = inject(TareaAbiertaService);

  /** Lo que muestra la campanita. */
  readonly sinLeer = this.notificaciones.sinLeer;
  /** La tarea que el operario tiene corriendo, si hay alguna. */
  readonly tareaAbierta = this.tareas.actual;
  private reloj?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.notificaciones.refrescarContador();
    this.tareas.consultar().subscribe();
    // Sin websockets: se relee cada dos minutos, alcanza para un aviso de planta.
    this.reloj = setInterval(() => this.notificaciones.refrescarContador(), 120_000);
  }

  ngOnDestroy(): void {
    if (this.reloj) clearInterval(this.reloj);
  }

  get username(): string {
    try {
      const data = localStorage.getItem('user');
      if (!data) return '';
      const u = JSON.parse(data);
      return u?.username || '';
    } catch { return ''; }
  }

  get isAdmin(): boolean {
    return this.tienePermiso('ORDENES:WRITE');
  }

  /** La pestaña CORTE la ven los operarios de corte y quien administre sábanas. */
  get puedeCortar(): boolean {
    return this.tienePermiso('CORTE:READ');
  }

  /** Alias del rol administrador, para las pestañas que son solo suyas. */
  get esAdmin(): boolean {
    return this.isAdmin;
  }

  /** CALIDAD la ven el responsable de calidad y quien pueda consultar sus registros. */
  get puedeVerCalidad(): boolean {
    return this.tienePermiso('CALIDAD:READ');
  }

  /** Las no conformidades las llevan calidad, el jefe de producción y el admin. */
  get puedeVerNoConformidades(): boolean {
    return this.tienePermiso('NOCONFORMIDADES:READ');
  }

  /** MI TRABAJO es del operario: quien administra asignaciones no la ve. */
  get esOperario(): boolean {
    return this.tienePermiso('ASIGNACIONES:READ') && !this.tienePermiso('ASIGNACIONES:WRITE');
  }

  private tienePermiso(permiso: string): boolean {
    try {
      const data = localStorage.getItem('user');
      if (!data) return false;
      const u = JSON.parse(data);
      const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      return perms.includes(permiso);
    } catch { return false; }
  }

  goHome() { this.router.navigateByUrl(rutaDeInicio()); }
  /**
   * Recarga la aplicación entera, sin caché. Es la salida cuando la pantalla
   * quedó mostrando algo que en el servidor ya cambió.
   */
  actualizar() { window.location.reload(); }

  logout() { this.auth.logout(); }
  irPerfil() { this.router.navigate(['/perfil']); }
  irAdminUsuarios() { this.router.navigate(['/admin/usuarios']); }
}
