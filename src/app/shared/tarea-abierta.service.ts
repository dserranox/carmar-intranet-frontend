import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/** La tarea que el operario tiene corriendo ahora mismo. */
export interface TareaAbierta {
  tareaId: number;
  operacionNombre: string;
  operacionNombreCorto: string;
  estado: string;
  nroPlan?: string;
  productoCodigo?: string;
  /** Dónde se hace esa tarea: /mi-trabajo o /corte/{sabId}. */
  ruta?: string | null;
}

/**
 * Sabe si hay una tarea corriendo y dónde se hace. Con el reloj corriendo el operario
 * no puede irse a otra pantalla: primero pausa o suspende, porque si no el tiempo
 * seguiría corriendo contra un lote que en realidad dejó de trabajar.
 */
@Injectable({ providedIn: 'root' })
export class TareaAbiertaService {
  private http = inject(HttpClient);
  private url = environment.apiUrl + '/tareas/abierta';

  /** Última respuesta conocida, para mostrarla sin volver a preguntar. */
  readonly actual = signal<TareaAbierta | null>(null);

  /** Pregunta al servidor. Si algo falla, no bloquea: devuelve null. */
  consultar(): Observable<TareaAbierta | null> {
    return this.http.get<TareaAbierta>(this.url, { observe: 'response' }).pipe(
      map(res => (res.status === 204 ? null : res.body)),
      catchError(() => of(null)),
      tap(tarea => this.actual.set(tarea))
    );
  }

  olvidar(): void {
    this.actual.set(null);
  }
}
