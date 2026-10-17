import { Component, Input, ViewChild, computed, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

/** Una opción del desplegable. `texto` es lo que se ve y por lo que se busca. */
export interface OpcionBuscable {
  valor: any;
  texto: string;
  /** Texto extra por el que también se puede buscar (ej. la descripción del producto). */
  extra?: string;
}

/** Saca acentos y mayúsculas para que "peron" encuentre "PERÓN". */
function normalizar(texto: string): string {
  return (texto ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Desplegable que además se puede filtrar escribiendo.
 * Se usa igual que un mat-select con [(ngModel)]:
 *
 *   <app-select-buscable label="Cliente" [opciones]="opcionesCliente"
 *                        [(ngModel)]="filtroCliente" (ngModelChange)="aplicar()" />
 */
@Component({
  selector: 'app-select-buscable',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatIconModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectBuscableComponent),
    multi: true
  }],
  template: `
    <mat-form-field appearance="outline" class="campo">
      <mat-label>{{ label }}</mat-label>
      <mat-select [value]="valor()" (selectionChange)="elegir($event.value)"
                  (openedChange)="alAbrirCerrar($event)"
                  [disabled]="deshabilitado()"
                  [multiple]="multiple"
                  [panelClass]="['panel-buscable', claseDelPanel]">

        <!-- Lo que se ve en la cajita cuando está cerrado -->
        <mat-select-trigger>{{ textoSeleccionado() }}</mat-select-trigger>

        <!-- Buscador fijo arriba del panel -->
        <div class="buscador" (click)="$event.stopPropagation()">
          <mat-icon class="lupa">search</mat-icon>
          <input type="text" class="entrada" autocomplete="off" #caja
                 [placeholder]="placeholder"
                 [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)"
                 (keydown)="alTeclear($event)" />
          @if (busqueda()) {
            <button type="button" class="limpiar" (click)="busqueda.set(''); caja.focus()"
                    aria-label="Limpiar búsqueda">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>

        @if (conTodos && !multiple && mostrarTodos()) {
          <mat-option [value]="valorTodos">{{ textoTodos }}</mat-option>
        }

        @for (o of visibles(); track o.valor) {
          <mat-option [value]="o.valor">{{ o.texto }}</mat-option>
        }

        @if (visibles().length === 0) {
          <p class="sin-resultados">Sin resultados para «{{ busqueda() }}»</p>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: [`
    :host { display: block; }
    .campo { width: 100%; }

    .buscador {
      position: sticky; top: 0; z-index: 2;
      display: flex; align-items: center; gap: 6px;
      padding: 6px 10px;
      background: var(--mat-sys-surface-container, #fff);
      border-bottom: 1px solid rgba(0, 0, 0, .12);
    }
    .lupa { color: rgba(0, 0, 0, .45); font-size: 20px; width: 20px; height: 20px; }
    .entrada {
      flex: 1; border: 0; outline: 0; background: transparent;
      font: inherit; font-size: .95rem; padding: 4px 0; color: inherit;
    }
    .limpiar {
      border: 0; background: transparent; cursor: pointer; padding: 0;
      display: flex; align-items: center; color: rgba(0, 0, 0, .45);
    }
    .limpiar mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .sin-resultados {
      margin: 0; padding: 14px 16px;
      color: rgba(0, 0, 0, .55); font-size: .88rem;
    }
  `]
})
export class SelectBuscableComponent implements ControlValueAccessor {
  /** Etiqueta del campo. */
  @Input() label = '';
  /** Texto gris dentro del buscador. */
  @Input() placeholder = 'Escribí para buscar…';
  /** Si se pueden elegir varias opciones a la vez. El valor pasa a ser un arreglo. */
  @Input() multiple = false;
  /** Si se ofrece la opción "todos". No aplica cuando es de selección múltiple. */
  @Input() conTodos = true;
  @Input() textoTodos = 'Todos';
  @Input() valorTodos: any = '';
  /** Lo que se ve cuando es múltiple y no hay nada elegido. */
  @Input() textoVacio = 'Sin asignar';

  @Input() set opciones(lista: OpcionBuscable[]) {
    this._opciones.set(lista ?? []);
  }

  private static contador = 0;
  /** Clase propia de este desplegable, para ubicar su panel en el overlay. */
  readonly claseDelPanel = `panel-buscable-${SelectBuscableComponent.contador++}`;

  @ViewChild(MatSelect) private select?: MatSelect;
  /** Si el operario ya se movió con las flechas, Enter respeta esa elección. */
  private navegoConTeclado = false;

  private _opciones = signal<OpcionBuscable[]>([]);
  busqueda = signal('');
  valor = signal<any>('');
  deshabilitado = signal(false);

  /** Opciones que pasan el filtro de búsqueda. */
  visibles = computed(() => {
    const q = normalizar(this.busqueda());
    const todas = this._opciones();
    if (!q) return todas;
    return todas.filter(o => normalizar(o.texto).includes(q) || normalizar(o.extra ?? '').includes(q));
  });

  /** "Todos" desaparece mientras se busca, salvo que coincida con lo tecleado. */
  mostrarTodos = computed(() => {
    const q = normalizar(this.busqueda());
    return !q || normalizar(this.textoTodos).includes(q);
  });

  /** Texto que se muestra en la cajita cerrada. */
  textoSeleccionado = computed(() => {
    const v = this.valor();
    if (this.multiple) {
      const elegidos: any[] = Array.isArray(v) ? v : [];
      if (elegidos.length === 0) return this.textoVacio;
      return elegidos.map(x => this.textoDe(x)).join(', ');
    }
    if (v === this.valorTodos || v === null || v === undefined || v === '') return this.textoTodos;
    return this.textoDe(v);
  });

  private textoDe(valor: any): string {
    return this._opciones().find(o => o.valor === valor)?.texto ?? String(valor);
  }

  private alCambiar: (valor: any) => void = () => {};
  private alTocar: () => void = () => {};

  elegir(valor: any): void {
    this.valor.set(valor);
    this.alCambiar(valor);
  }

  alAbrirCerrar(abierto: boolean): void {
    this.busqueda.set('');
    this.navegoConTeclado = false;
    if (!abierto) {
      this.alTocar();
      return;
    }
    // El panel vive en el overlay, fuera de la vista del componente: se lo busca ahí
    // una vez que terminó de abrirse, así el operario puede escribir sin hacer otro clic.
    setTimeout(() => {
      const caja = document.querySelector<HTMLInputElement>(`.${this.claseDelPanel} input.entrada`);
      caja?.focus();
    }, 0);
  }

  /**
   * El buscador está dentro del panel del mat-select, así que las teclas se le propagan.
   * Las de escribir se frenan acá (si no, el mat-select las usa para su propio salto por
   * letra); flechas, Escape y Tab siguen de largo y las maneja él.
   */
  alTeclear(evento: KeyboardEvent): void {
    const navegacion = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp', 'Enter', 'Escape', 'Tab'];

    if (!navegacion.includes(evento.key)) {
      evento.stopPropagation();
      return;
    }

    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      this.navegoConTeclado = true;
      return;
    }

    // Enter en una lista múltiple suma o saca lo primero que quedó filtrado,
    // sin cerrar el panel: así se cargan varios de corrido.
    if (evento.key === 'Enter' && this.multiple) {
      const primera = this.visibles()[0];
      if (!primera) return;
      evento.preventDefault();
      evento.stopPropagation();
      const actuales: any[] = Array.isArray(this.valor()) ? [...this.valor()] : [];
      const i = actuales.indexOf(primera.valor);
      if (i >= 0) actuales.splice(i, 1); else actuales.push(primera.valor);
      this.elegir(actuales);
      this.busqueda.set('');
      return;
    }

    // Enter sin haber usado las flechas: se toma lo primero que quedó filtrado,
    // que es lo que uno espera después de escribir el nombre y apretar Enter.
    if (evento.key === 'Enter' && !this.navegoConTeclado) {
      const candidatos: any[] = this.conTodos && this.mostrarTodos()
        ? [this.valorTodos, ...this.visibles().map(o => o.valor)]
        : this.visibles().map(o => o.valor);
      if (candidatos.length > 0) {
        evento.preventDefault();
        evento.stopPropagation();
        this.elegir(candidatos[0]);
        this.select?.close();
      }
    }
  }

  // --- ControlValueAccessor: permite seguir usando [(ngModel)] desde afuera ---
  writeValue(valor: any): void {
    if (this.multiple) {
      this.valor.set(Array.isArray(valor) ? valor : []);
      return;
    }
    this.valor.set(valor ?? this.valorTodos);
  }
  registerOnChange(fn: (valor: any) => void): void { this.alCambiar = fn; }
  registerOnTouched(fn: () => void): void { this.alTocar = fn; }
  setDisabledState(estaDeshabilitado: boolean): void { this.deshabilitado.set(estaDeshabilitado); }
}
