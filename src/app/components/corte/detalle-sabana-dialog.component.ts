import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CorteService } from '../../services/corte.service';
import { Corte, SabanaResumen } from '../../models/corte';

/**
 * La sábana entera, para mirar sin tocar nada.
 *
 * Hasta ahora la única forma de ver qué cortes tenía una sábana era empezarla,
 * y eso abre una tarea. Quien quiere saber si un largo está en la lista, o qué
 * quedó sin hacer, necesita leerla y nada más.
 *
 * Las columnas cambian según el tipo: el corrugado no tiene color, ni terminales,
 * ni pelado, y mostrar esas columnas vacías solo ensucia.
 */
@Component({
  selector: 'app-detalle-sabana-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule
  ],
  templateUrl: './detalle-sabana-dialog.component.html',
  styleUrls: ['./detalle-sabana-dialog.component.css']
})
export class DetalleSabanaDialogComponent {
  private corteSvc = inject(CorteService);
  ref = inject(MatDialogRef<DetalleSabanaDialogComponent>);
  sabana: SabanaResumen = inject(MAT_DIALOG_DATA);

  cortes = signal<Corte[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  filtro = signal('');

  get esCorrugado(): boolean { return this.sabana.tipo === 'CORRUGADO'; }

  /** Lo que se ve: el filtro busca por cualquier dato que se lea en la fila. */
  visibles = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    if (!texto) return this.cortes();
    return this.cortes().filter(c => this.textoDeFila(c).includes(texto));
  });

  hechos = computed(() => this.cortes().filter(c => c.estado === 'HECHO').length);

  constructor() {
    this.corteSvc.getCortes(this.sabana.sabId).subscribe({
      next: (cortes) => { this.cortes.set(cortes ?? []); this.cargando.set(false); },
      error: () => { this.error.set('No se pudo leer la sábana.'); this.cargando.set(false); }
    });
  }

  private textoDeFila(c: Corte): string {
    return [
      c.nroCorte, c.nroPlan, c.codigo, c.nroCable, c.color, c.seccion,
      c.origenA, c.posicionA, c.terminalA, c.longitud, c.terminalB, c.destinoB,
      c.posicionB, c.impresion, c.diametroTxt, c.tipoCorrugado, c.programa
    ].filter(v => v !== null && v !== undefined).join(' ').toLowerCase();
  }

  /** El conector con su posición: «C5 · pos 2», «S2 · DER». */
  punta(donde?: string, posicion?: string): string {
    const lugar = (donde ?? '').trim();
    const pos = (posicion ?? '').trim();
    if (!lugar) return '—';
    if (!pos) return lugar;
    return /^\d+$/.test(pos) ? `${lugar} · pos ${pos}` : `${lugar} · ${pos}`;
  }

  claseEstado(estado?: string): string {
    return 'pastilla ' + (estado ?? 'PENDIENTE').toLowerCase();
  }
}
