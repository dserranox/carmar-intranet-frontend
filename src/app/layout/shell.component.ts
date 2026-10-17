
import {
  AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild,
  computed, inject, signal
} from '@angular/core';
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
import { EntradaDeMenu, menuVisible } from '../shared/pantallas';
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
export class ShellComponent implements OnInit, AfterViewInit, OnDestroy {
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
    this.observador?.disconnect();
  }

  get username(): string {
    try {
      const data = localStorage.getItem('user');
      if (!data) return '';
      const u = JSON.parse(data);
      return u?.username || '';
    } catch { return ''; }
  }

  /** El acceso a la pantalla de usuarios y roles, en el menú de la derecha. */
  get puedeAdministrarUsuarios(): boolean {
    return this.tienePermiso('USUARIOS:READ');
  }

  /**
   * El menú sale de los permisos del usuario, no de adivinar su rol: si no tiene
   * la pantalla, no se la ofrecemos. Lo que se pueda ver lo decide la pantalla
   * de roles.
   */
  readonly menu: EntradaDeMenu[] = menuVisible();

  /**
   * Con diez pantallas el menú no entra en una notebook y las últimas quedaban
   * cortadas contra el borde. Se mide el ancho disponible y lo que no entra pasa
   * al botón de los puntitos.
   */
  private readonly cuantasEntran = signal(this.menu.length);
  readonly visibles = computed(() => this.menu.slice(0, this.cuantasEntran()));
  readonly ocultas = computed(() => this.menu.slice(this.cuantasEntran()));

  @ViewChild('nav') private nav?: ElementRef<HTMLElement>;
  /** El ancho de cada entrada, medido una sola vez con todas a la vista. */
  private anchos: number[] = [];
  private observador?: ResizeObserver;

  ngAfterViewInit(): void {
    this.acomodarMenu();
    const elemento = this.nav?.nativeElement;
    if (!elemento) return;
    this.observador = new ResizeObserver(() => this.acomodarMenu());
    this.observador.observe(elemento);
    // Las tipografías llegan después del primer dibujo y cambian los anchos.
    (document as any).fonts?.ready?.then(() => { this.anchos = []; this.acomodarMenu(); });
  }

  private acomodarMenu(): void {
    const elemento = this.nav?.nativeElement;
    if (!elemento || this.menu.length === 0) return;

    // Los anchos se miden una sola vez, cuando están todas las entradas puestas.
    if (this.anchos.length !== this.menu.length) {
      const items = Array.from(elemento.querySelectorAll<HTMLElement>('a.item'));
      if (items.length !== this.menu.length) return;
      this.anchos = items.map(i => i.getBoundingClientRect().width);
    }

    // Entre dos entradas hay un gap, la rayita y otro gap. Antes de la primera,
    // nada: por eso el separador se cuenta una vez menos que las entradas.
    const separador = 12 + 2 + 12;
    const anchoDelBoton = 48;
    const disponible = elemento.clientWidth;

    let usado = 0;
    let entran = 0;
    for (let i = 0; i < this.anchos.length; i++) {
      const conSeparador = usado + (i > 0 ? separador : 0) + this.anchos[i];
      const quedanAfuera = i < this.anchos.length - 1;
      if (conSeparador + (quedanAfuera ? separador + anchoDelBoton : 0) > disponible) break;
      usado = conSeparador;
      entran++;
    }
    // Con una sola que entre no vale la pena: mejor todas adentro del botón.
    this.cuantasEntran.set(Math.max(entran, 1));
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
