import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';

import { TraccionMinimaComponent } from '../corte/traccion-minima.component';
import { PuntosControlComponent } from './puntos-control.component';

/**
 * Los criterios con los que se controla: las fuerzas mínimas de tracción, los
 * puntos que se chequean en la recorrida y las tolerancias de corte. Estaban
 * repartidos entre Corte y Calidad; acá quedan todos juntos, que es donde la
 * gente los busca.
 */
@Component({
  selector: 'app-criterios',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatExpansionModule,
    TraccionMinimaComponent, PuntosControlComponent
  ],
  template: `
    <div class="criterios">
      <p class="intro">
        Los valores con los que se decide si algo está conforme. Lo que se cambie acá
        rige para los próximos controles; lo ya registrado no se toca.
      </p>

      <mat-accordion multi>
        <mat-expansion-panel expanded>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>speed</mat-icon> Fuerzas mínimas de tracción</mat-panel-title>
            <mat-panel-description>Newtons exigidos por sección, con excepciones por terminal</mat-panel-description>
          </mat-expansion-panel-header>
          <app-traccion-minima [embebido]="true" />
        </mat-expansion-panel>

        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>checklist</mat-icon> Puntos de control de la recorrida</mat-panel-title>
            <mat-panel-description>Qué se chequea en cada orden durante la recorrida</mat-panel-description>
          </mat-expansion-panel-header>
          <app-puntos-control [embebido]="true" />
        </mat-expansion-panel>

        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>straighten</mat-icon> Tolerancias de corte</mat-panel-title>
            <mat-panel-description>Cuánto se admite de desvío en la longitud</mat-panel-description>
          </mat-expansion-panel-header>

          <div class="tolerancias">
            <p>
              Hoy la tolerancia se define <b>en cada sábana al importarla</b>, y por defecto es
              <b>0% para abajo y 1,5% para arriba</b>. Un corte de 1000 mm es válido entre
              1000 y 1015 mm.
            </p>
            <p class="nota">
              <mat-icon>info</mat-icon>
              Cuando tengamos datos reales de planta ajustamos el valor por defecto, y si hace
              falta lo abrimos por sección o por producto.
            </p>
          </div>
        </mat-expansion-panel>
      </mat-accordion>
    </div>
  `,
  styles: [`
    .criterios { padding: 4px 0; }
    .intro { margin: 0 0 14px; font-size: .88rem; color: rgba(0, 0, 0, .6); }

    mat-panel-title { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    mat-panel-title mat-icon { font-size: 20px; width: 20px; height: 20px; color: #00695c; }
    mat-panel-description { color: rgba(0, 0, 0, .55); font-size: .84rem; }

    .tolerancias p { margin: 0 0 10px; font-size: .9rem; }
    .nota {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 12px; border-radius: 9px; background: #e3f2fd; color: #0d47a1;
      font-size: .85rem;
    }
    .nota mat-icon { font-size: 19px; width: 19px; height: 19px; flex: 0 0 auto; }
  `]
})
export class CriteriosComponent {}
