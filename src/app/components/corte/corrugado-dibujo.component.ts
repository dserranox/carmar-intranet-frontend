import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Corte } from '../../models/corte';

/**
 * Dibuja el corrugado del corte: el tubo con sus nervaduras, el largo total y el
 * diámetro acotados, y la ranura longitudinal cuando es abierto. Es todo lo que el
 * operario necesita mirar para cargar la máquina y controlar lo que sale.
 */
@Component({
  selector: 'app-corrugado-dibujo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './corrugado-dibujo.component.html',
  styleUrls: ['./corrugado-dibujo.component.css']
})
export class CorrugadoDibujoComponent {
  private _corte = signal<Corte | null>(null);

  @Input({ required: true }) set corte(value: Corte | null) {
    this._corte.set(value);
  }
  get corte(): Corte | null { return this._corte(); }

  // Geometría del dibujo, en unidades del viewBox.
  readonly ancho = 1200;
  readonly alto = 250;
  /** Deja lugar a la izquierda para la cota del diámetro, que puede decir "Ø 1 1/4". */
  readonly tuboX = 240;
  readonly tuboFin = 1075;
  readonly centroY = 112;

  /** Paso de las nervaduras: el corrugado fino se dibuja más apretado. */
  readonly pasoNervadura = 24;

  get tuboAncho(): number { return this.tuboFin - this.tuboX; }

  /**
   * El alto del tubo sigue al diámetro para que se note la diferencia entre un
   * 7 mm y un 25 mm, pero acotado para que siempre entre en la pantalla.
   */
  get tuboAlto(): number {
    const d = Number(this._corte()?.diametro ?? 0);
    if (!d) return 56;
    return Math.min(132, Math.max(34, 26 + d * 3.6));
  }

  get tuboY(): number { return this.centroY - this.tuboAlto / 2; }
  get tuboYFin(): number { return this.tuboY + this.tuboAlto; }

  get esAbierto(): boolean { return this._corte()?.tipoCorrugado === 'ABIERTO'; }

  /** Lo que se muestra es como lo nombra la sábana: 1/2, 3/4, 13 mm… */
  get diametro(): string {
    const c = this._corte();
    return c?.diametroTxt ?? (c?.diametro != null ? String(c.diametro) : '—');
  }

  /** La equivalencia en mm, para el que trabaja con la medida real. */
  get diametroMm(): string {
    const c = this._corte();
    if (!c?.diametro || c.diametroTxt == null) return '';
    const mm = Number(c.diametro);
    return `${mm.toFixed(mm % 1 ? 1 : 0)} mm`;
  }

  /** Posición de cada nervadura a lo largo del tubo. */
  get nervaduras(): number[] {
    const paso = this.pasoNervadura;
    const desde = this.tuboX + paso;
    const posiciones: number[] = [];
    for (let x = desde; x < this.tuboFin - paso / 2; x += paso) posiciones.push(x);
    return posiciones;
  }

  /** La ranura del corrugado abierto: una franja sobre el lomo del tubo. */
  get ranuraY(): number { return this.tuboY + 6; }
  get ranuraAlto(): number { return Math.max(7, this.tuboAlto * 0.13); }

  /** Cota del largo, debajo del tubo. */
  get cotaY(): number { return this.tuboYFin + 46; }

  /** Cota del diámetro, a la izquierda del tubo. */
  get cotaDiametroX(): number { return this.tuboX - 40; }

  /** Dónde termina el texto del diámetro: pegado a la flecha de la cota. */
  get textoDiametroX(): number { return this.cotaDiametroX - 18; }

  get etiquetaTipo(): string {
    const t = this._corte()?.tipoCorrugado;
    if (t === 'ABIERTO') return 'ABIERTO · con ranura';
    if (t === 'CERRADO') return 'CERRADO · sin ranura';
    return 'TIPO SIN DATO';
  }
}
