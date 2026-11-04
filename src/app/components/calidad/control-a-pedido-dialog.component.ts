import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { forkJoin } from 'rxjs';

import { CalidadService } from '../../services/calidad.service';
import { OrdersService } from '../../services/orders.service';
import { ControlAPedido, TipoControlAPedido } from '../../models/calidad';
import { OrdenResponseDTO } from '../../models/order';

/** Los estados que sacan a un plan de la lista: ya no se controla nada ahí. */
const CERRADAS = ['TERMINADO', 'CANCELADO'];

const TIPOS: { clave: TipoControlAPedido; etiqueta: string; icono: string }[] = [
  { clave: 'VISUAL', etiqueta: 'Control visual', icono: 'visibility' },
  { clave: 'LIBERACION', etiqueta: 'Liberación', icono: 'verified' },
  { clave: 'PUESTA_A_PUNTO', etiqueta: 'Puesta a punto', icono: 'tune' }
];

/**
 * El control que calidad hace cuando se le acercan a pedírselo.
 *
 * Se abre desde el botón CONTROL, que está siempre a la vista: el operario ya
 * está parado al lado esperando, así que buscar el plan tiene que ser lo
 * primero y lo único. Al empezar, la tarea que el responsable venía haciendo
 * queda en pausa; al cerrar el control, vuelve sola.
 */
@Component({
  selector: 'app-control-a-pedido-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title class="titulo">
      <mat-icon>fact_check</mat-icon>
      {{ control() ? control()!.tipoNombre + ' en curso' : 'Control a pedido' }}
    </h2>

    <mat-dialog-content class="contenido">

      <!-- ─────────── Paso 1: qué plan y qué control ─────────── -->
      @if (!control()) {

        <mat-form-field appearance="outline" class="buscador">
          <mat-label>Buscar el plan</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="busqueda" (ngModelChange)="buscar($event)"
                 placeholder="Número de plan o código" cdkFocusInitial />
        </mat-form-field>

        @if (cargandoPlanes()) {
          <div class="esperando"><mat-spinner diameter="28"></mat-spinner> Buscando planes…</div>
        } @else if (elegida()) {
          <div class="plan-elegido">
            <div class="plan-datos">
              <span class="plan">{{ elegida()!.ordNroPlan }}</span>
              <span class="codigo">{{ elegida()!.productoCodigo }}</span>
              <span class="desc">{{ elegida()!.productoDescripcion }}</span>
            </div>
            <button mat-stroked-button (click)="elegida.set(null)">Cambiar</button>
          </div>
        } @else if (busqueda.trim().length >= 2) {
          <div class="resultados">
            @for (o of resultados(); track o.id) {
              <button type="button" class="resultado" (click)="elegir(o)">
                <span class="plan">{{ o.ordNroPlan }}</span>
                <span class="codigo">{{ o.productoCodigo }}</span>
                <span class="desc">{{ o.productoDescripcion }}</span>
                <span class="situacion">{{ o.situacionClave }}</span>
              </button>
            }
            @if (!resultados().length) {
              <p class="sin-resultados">
                Ningún plan activo coincide con «{{ busqueda }}».
                Los terminados y los cancelados no se listan.
              </p>
            }
          </div>
        } @else {
          <p class="ayuda">
            Escribí el número de plan o el código del producto.
            Se buscan sólo los planes activos.
          </p>
        }

        <div class="tipos">
          @for (t of tipos; track t.clave) {
            <button type="button" class="tipo" [class.activo]="tipo() === t.clave"
                    (click)="tipo.set(t.clave)">
              <mat-icon>{{ t.icono }}</mat-icon>
              <span>{{ t.etiqueta }}</span>
            </button>
          }
        </div>

        <p class="nota">
          Mientras dure el control, lo que estés haciendo queda en pausa y el tiempo
          se le imputa al plan que controlás. Al terminar volvés solo a tu tarea.
        </p>
      }

      <!-- ─────────── Paso 2: el control corriendo ─────────── -->
      @if (control(); as c) {
        <div class="en-curso">
          <div class="plan-datos">
            <span class="plan">{{ c.nroPlan }}</span>
            <span class="codigo">{{ c.codigoProducto }}</span>
            <span class="desc">{{ c.descripcionProducto }}</span>
          </div>
          <span class="reloj">{{ reloj() }}</span>
        </div>

        <div class="campos">
          <mat-form-field appearance="outline">
            <mat-label>Quién lo pidió</mat-label>
            <input matInput [(ngModel)]="solicitante" placeholder="Opcional" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Puesto o máquina</mat-label>
            <input matInput [(ngModel)]="puesto" placeholder="Opcional" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="obs">
          <mat-label>Observaciones</mat-label>
          <textarea matInput rows="2" [(ngModel)]="observaciones"
                    placeholder="Obligatorias si el control no pasa"></textarea>
        </mat-form-field>

        @if (c.vuelveA) {
          <p class="nota">
            Al cerrarlo volvés a {{ c.vuelveA }}@if (c.vuelveAPlan) { del plan {{ c.vuelveAPlan }} }.
          </p>
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @if (!control()) {
        <button mat-button (click)="ref.close()">Cancelar</button>
        <button mat-flat-button class="btn-empezar"
                [disabled]="!elegida() || !tipo() || guardando()"
                (click)="empezar()">
          <mat-icon>play_arrow</mat-icon>
          Empezar control
        </button>
      } @else {
        <button mat-button class="descartar" [disabled]="guardando()" (click)="descartar()">
          Descartar
        </button>
        <span class="espaciador"></span>
        <button mat-flat-button class="btn-no-ok" [disabled]="guardando()" (click)="cerrar(false)">
          <mat-icon>close</mat-icon>
          NO OK
        </button>
        <button mat-flat-button class="btn-ok" [disabled]="guardando()" (click)="cerrar(true)">
          <mat-icon>check</mat-icon>
          OK
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .titulo { display: flex; align-items: center; gap: 10px; }
    .contenido { min-width: 560px; max-width: 680px; }
    @media (max-width: 700px) { .contenido { min-width: 0; } }

    .buscador { width: 100%; }
    .buscador mat-icon[matPrefix] { margin-right: 8px; color: rgba(0,0,0,.45); }

    .esperando { display: flex; align-items: center; gap: 10px; padding: 8px 0; color: rgba(0,0,0,.6); }
    .ayuda, .sin-resultados { margin: 0 0 10px; color: rgba(0,0,0,.55); font-size: .88rem; }

    .resultados { max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
    .resultado {
      display: grid; grid-template-columns: 90px 90px 1fr auto; gap: 10px; align-items: baseline;
      text-align: left; cursor: pointer; font: inherit;
      padding: 10px 12px; border-radius: 9px;
      border: 1px solid rgba(0,0,0,.12); background: #fff;
    }
    .resultado:hover { background: #e0f2f1; border-color: #26a69a; }
    /* El estado a la vista: deja claro de un vistazo que la lista son los vivos. */
    .situacion {
      font-size: .68rem; font-weight: 700; letter-spacing: .03em; white-space: nowrap;
      color: rgba(0,0,0,.5); background: rgba(0,0,0,.06);
      padding: 2px 8px; border-radius: 999px;
    }

    .plan-elegido, .en-curso {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px; border-radius: 10px; background: #e0f2f1; margin-bottom: 12px;
    }
    .plan-datos { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
    .plan { font-size: 1.1rem; font-weight: 800; color: #00695c; }
    .codigo { font-weight: 700; color: #1a1a2e; }
    .desc { font-size: .82rem; color: rgba(0,0,0,.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .reloj { font-size: 1.5rem; font-weight: 800; color: #00695c; font-variant-numeric: tabular-nums; }

    .tipos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 4px 0 12px; }
    .tipo {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      cursor: pointer; font: inherit; font-size: .86rem; font-weight: 600;
      padding: 12px 8px; border-radius: 10px;
      border: 2px solid rgba(0,0,0,.12); background: #fff; color: rgba(0,0,0,.7);
    }
    .tipo.activo { border-color: #00695c; background: #e0f2f1; color: #00695c; }

    .campos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .campos mat-form-field, .obs { width: 100%; }

    .nota { margin: 4px 0 0; font-size: .84rem; color: rgba(0,0,0,.55); line-height: 1.45; }

    .espaciador { flex: 1; }
    .btn-empezar { background: #00695c; color: #fff; }
    .btn-ok { background: #2e7d32; color: #fff; }
    .btn-no-ok { background: #c62828; color: #fff; }
    .descartar { color: rgba(0,0,0,.55); }
    button[disabled] { opacity: .5; }
  `]
})
export class ControlAPedidoDialogComponent implements OnInit, OnDestroy {
  private calidadService = inject(CalidadService);
  private ordersService = inject(OrdersService);
  private snack = inject(MatSnackBar);
  ref = inject(MatDialogRef<ControlAPedidoDialogComponent, boolean>);

  tipos = TIPOS;

  control = signal<ControlAPedido | null>(null);
  tipo = signal<TipoControlAPedido | null>(null);
  elegida = signal<OrdenResponseDTO | null>(null);
  guardando = signal(false);
  cargandoPlanes = signal(true);

  busqueda = '';
  solicitante = '';
  puesto = '';
  observaciones = '';

  private planes: OrdenResponseDTO[] = [];
  private filtro = signal('');
  private ahora = signal(Date.now());
  private cronometro?: ReturnType<typeof setInterval>;

  /** Lo que coincide con lo tipeado, acotado para que entre en la pantalla. */
  resultados = computed<OrdenResponseDTO[]>(() => {
    const texto = this.filtro().trim().toLowerCase();
    if (texto.length < 2) return [];
    return this.planes
      .filter(o => `${o.ordNroPlan} ${o.productoCodigo} ${o.productoDescripcion}`
        .toLowerCase().includes(texto))
      .slice(0, 30);
  });

  reloj = computed(() => {
    const c = this.control();
    if (!c) return '00:00';
    const s = Math.max(0, Math.floor((this.ahora() - new Date(c.fechaInicio).getTime()) / 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    const h = Math.floor(s / 3600);
    return (h > 0 ? h + ':' : '') + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
  });

  ngOnInit(): void {
    // Si quedó uno abierto —se le apagó la tablet, cerró sin guardar— se sigue
    // con ese: el reloj del plan ya está corriendo.
    this.calidadService.controlAPedidoAbierto().subscribe({
      next: c => { if (c) this.control.set(c); },
      error: () => {}
    });

    this.cargarPlanes();
    this.cronometro = setInterval(() => this.ahora.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    if (this.cronometro) clearInterval(this.cronometro);
  }

  /**
   * Sólo los planes vivos.
   *
   * Un control se pide sobre algo que se está haciendo o que está por hacerse.
   * Las terminadas y las canceladas sólo alargan la lista —en producción son más
   * de la mitad— y encima dejan elegir un plan al que ya no tiene sentido
   * imputarle tiempo.
   *
   * Se traen los dos últimos años porque un plan viejo todavía abierto existe,
   * aunque sea raro: el filtro por estado ya deja la lista corta.
   */
  private cargarPlanes(): void {
    this.ordersService.getYears().subscribe({
      next: años => {
        const ordenados = [...(años ?? [])].sort((a, b) => b - a);
        const aTraer = ordenados.length ? ordenados.slice(0, 2) : [new Date().getFullYear()];
        forkJoin(aTraer.map(a => this.ordersService.listByYear(a))).subscribe({
          next: listas => {
            this.planes = listas.flat().filter(o => this.estaActiva(o));
            this.cargandoPlanes.set(false);
          },
          error: () => this.cargandoPlanes.set(false)
        });
      },
      error: () => this.cargandoPlanes.set(false)
    });
  }

  private estaActiva(orden: OrdenResponseDTO): boolean {
    const estado = (orden.situacionClave ?? '').toUpperCase().trim();
    return !CERRADAS.includes(estado);
  }

  buscar(texto: string): void {
    this.filtro.set(texto ?? '');
  }

  elegir(orden: OrdenResponseDTO): void {
    this.elegida.set(orden);
  }

  empezar(): void {
    const orden = this.elegida();
    const tipo = this.tipo();
    if (!orden || !tipo) return;

    this.guardando.set(true);
    this.calidadService.iniciarControlAPedido(orden.id, tipo).subscribe({
      next: c => { this.control.set(c); this.guardando.set(false); },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo empezar el control', 'OK',
          { duration: 6000 });
      }
    });
  }

  cerrar(conforme: boolean): void {
    const c = this.control();
    if (!c) return;
    if (!conforme && !this.observaciones.trim()) {
      this.snack.open('Si el control no pasó, contá qué encontraste.', 'OK', { duration: 5000 });
      return;
    }

    this.guardando.set(true);
    this.calidadService.cerrarControlAPedido(c.tareaId, {
      conforme,
      observaciones: this.observaciones.trim() || undefined,
      solicitante: this.solicitante.trim() || undefined,
      puesto: this.puesto.trim() || undefined
    }).subscribe({
      next: () => {
        this.snack.open(
          conforme ? 'Control conforme guardado.' : 'Control no conforme guardado. Se avisó a calidad.',
          'OK', { duration: 5000 });
        this.ref.close(true);
      },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo guardar el control', 'OK',
          { duration: 7000 });
      }
    });
  }

  /** No era un control: se borra y la tarea de antes vuelve a arrancar. */
  descartar(): void {
    const c = this.control();
    if (!c) { this.ref.close(false); return; }
    this.guardando.set(true);
    this.calidadService.cancelarControlAPedido(c.tareaId).subscribe({
      next: () => this.ref.close(false),
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo descartar', 'OK', { duration: 6000 });
      }
    });
  }
}
