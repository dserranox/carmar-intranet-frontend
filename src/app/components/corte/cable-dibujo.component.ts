import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Corte } from '../../models/corte';

/** Colores de cable más usados, para pintar el dibujo. */
const COLORES: Record<string, string> = {
  'NEGRO': '#212121', 'BLANCO': '#f7f7f7', 'ROJO': '#d32f2f', 'AZUL': '#1565c0',
  'VERDE': '#2e7d32', 'AMARILLO': '#f5c400', 'NARANJA': '#ef6c00', 'GRIS': '#9e9e9e',
  'MARRON': '#6d4c41', 'MARRÓN': '#6d4c41', 'VIOLETA': '#7b1fa2', 'ROSA': '#ec407a',
  'CELESTE': '#4fc3f7', 'BEIGE': '#d7ccc8', 'NA': '#ef6c00', 'BL': '#f7f7f7'
};
const COLOR_DESCONOCIDO = '#bdbdbd';
const COBRE = '#c77b30';
const COBRE_OSCURO = '#a35f1c';
const METAL = '#9aa7b0';
const METAL_OSCURO = '#6b7b86';

interface Segmento {
  x: number;
  ancho: number;
  clase: 'pvc' | 'cobre' | 'terminal';
  relleno: string;
}

interface ExtremoDibujo {
  segmentos: Segmento[];
  etiqueta: string;       // PELADO 13 · GAP 4
  detalle: string;        // PVC 4 mm + cobre 9 mm  |  despunte 100%
  terminal?: string;
  alerta: boolean;
}

/**
 * Dibuja el cable del corte: color de la bobina, impresión, y en cada extremo
 * el pelado, el gap y el terminal. Cuando el gap deja PVC en la punta se ve el
 * plástico sobre el cobre; con despunte total, el cobre queda expuesto entero.
 */
@Component({
  selector: 'app-cable-dibujo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cable-dibujo.component.html',
  styleUrls: ['./cable-dibujo.component.css']
})
export class CableDibujoComponent {
  private _corte = signal<Corte | null>(null);

  @Input({ required: true }) set corte(value: Corte | null) {
    this._corte.set(value);
  }
  get corte(): Corte | null { return this._corte(); }

  // Geometría del dibujo, en unidades del viewBox.
  readonly ancho = 1200;
  readonly alto = 200;
  readonly cableY = 62;
  readonly cableAlto = 74;
  readonly zonaExtremo = 190;   // ancho reservado a cada punta
  readonly margen = 16;

  get cuerpoX(): number { return this.margen + this.zonaExtremo; }
  get cuerpoAncho(): number { return this.ancho - 2 * (this.margen + this.zonaExtremo); }
  get cableYFin(): number { return this.cableY + this.cableAlto; }
  get cableYMedio(): number { return this.cableY + this.cableAlto / 2; }

  /** Colores del cuerpo: uno solo, o dos para los bicolor tipo ROJO/BLANCO. */
  readonly colores = computed<string[]>(() => {
    const nombre = this._corte()?.color;
    if (!nombre) return [COLOR_DESCONOCIDO];
    return nombre.split('/').map(p => COLORES[p.trim().toUpperCase()] || COLOR_DESCONOCIDO);
  });

  get esBicolor(): boolean { return this.colores().length > 1; }
  get colorPrincipal(): string { return this.colores()[0]; }
  get colorSecundario(): string { return this.colores()[1] || this.colores()[0]; }

  /** Texto de la impresión repetido a lo largo del cuerpo. */
  get repeticionesImpresion(): number[] {
    return this._corte()?.impresion ? [0, 1, 2] : [];
  }

  posicionImpresion(i: number): number {
    return this.cuerpoX + this.cuerpoAncho * (0.2 + i * 0.3);
  }

  get colorTextoImpresion(): string {
    const claros = ['BLANCO', 'AMARILLO', 'GRIS', 'BEIGE', 'CELESTE', 'BL', 'NARANJA'];
    const primero = (this._corte()?.color || '').split('/')[0].trim().toUpperCase();
    return claros.includes(primero) ? '#212121' : '#ffffff';
  }

  get extremoA(): ExtremoDibujo {
    const c = this._corte();
    return this.armarExtremo(
      'A', c?.peladoA, c?.gapA, c?.cobreA, c?.pvcPuntaA, c?.despunteA, c?.terminalA, !!c?.alertaCrimpadoA);
  }

  get extremoB(): ExtremoDibujo {
    const c = this._corte();
    return this.armarExtremo(
      'B', c?.peladoB, c?.gapB, c?.cobreB, c?.pvcPuntaB, c?.despunteB, c?.terminalB, !!c?.alertaCrimpadoB);
  }

  /**
   * Arma los segmentos de una punta, de afuera hacia adentro. Con terminal, el
   * agrafe ocupa la punta; sin terminal se ve el cobre, y si el despunte es
   * parcial queda primero el trozo de PVC que deja la máquina.
   */
  private armarExtremo(lado: 'A' | 'B', pelado?: number, gap?: number, cobre?: number,
                       pvc?: number, despunte?: string, terminal?: string, alerta = false): ExtremoDibujo {
    const izquierda = lado === 'A';
    const zonaInicio = izquierda ? this.margen : this.ancho - this.margen - this.zonaExtremo;
    const segmentos: Segmento[] = [];

    if (!pelado) {
      return { segmentos, etiqueta: 'sin pelado', detalle: '', terminal: terminal || undefined, alerta };
    }

    const total = despunte !== 'PARCIAL';
    const largoPvc = pvc ?? 0;
    const largoCobre = cobre ?? pelado;

    // Anchos en pantalla: el terminal ocupa un ancho fijo, el resto se reparte
    // en proporción al pelado real.
    const anchoTerminal = terminal ? 96 : 0;
    const restante = this.zonaExtremo - anchoTerminal;
    const anchoPvc = total ? 0 : Math.round(restante * (largoPvc / pelado));
    const anchoCobre = restante - anchoPvc;

    // De la punta hacia adentro
    let x = zonaInicio;
    const orden: Array<{ clase: Segmento['clase']; ancho: number; relleno: string }> = [];
    if (terminal) orden.push({ clase: 'terminal', ancho: anchoTerminal, relleno: METAL });
    if (anchoPvc > 0) orden.push({ clase: 'pvc', ancho: anchoPvc, relleno: this.colorPrincipal });
    orden.push({ clase: 'cobre', ancho: anchoCobre, relleno: COBRE });

    const secuencia = izquierda ? orden : [...orden].reverse();
    if (!izquierda) {
      // A la derecha la punta está al final, así que se dibuja al revés.
      x = zonaInicio;
    }
    for (const s of secuencia) {
      segmentos.push({ x, ancho: s.ancho, clase: s.clase, relleno: s.relleno });
      x += s.ancho;
    }

    const etiqueta = `PELADO ${pelado}` + (gap != null ? ` · GAP ${gap}` : '');
    const detalle = total
      ? 'despunte 100% — cobre a la vista'
      : `PVC ${largoPvc} mm en la punta + ${largoCobre} mm de cobre`;

    return { segmentos, etiqueta, detalle, terminal: terminal || undefined, alerta };
  }

  colorDeBorde(clase: Segmento['clase']): string {
    if (clase === 'cobre') return COBRE_OSCURO;
    if (clase === 'terminal') return METAL_OSCURO;
    return 'rgba(0,0,0,.35)';
  }
}
