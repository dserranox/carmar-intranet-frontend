import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ControlEnTarea, ResultadoControl } from '../components/mi-trabajo/control-tarea-dialog.component';
import { Asignacion, AsignarRequest, AsignarResponse } from '../models/asignacion';

@Injectable({ providedIn: 'root' })
export class AsignacionesService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/asignaciones';

  /** Cola del operario logueado. */
  mias(): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(`${this.baseUrl}/mias`);
  }

  /** Arranca una de las actividades habilitadas del código. */
  iniciarActividad(asgId: number, aacId: number): Observable<Asignacion> {
    return this.http.post<Asignacion>(`${this.baseUrl}/${asgId}/actividades/${aacId}/iniciar`, {});
  }

  /** El operario avisa que terminó el código y pasa al siguiente. */
  terminar(asgId: number): Observable<Asignacion> {
    return this.http.post<Asignacion>(`${this.baseUrl}/${asgId}/terminar`, {});
  }

  suspender(asgId: number, subtipo: string, motivo?: string): Observable<Asignacion> {
    return this.http.post<Asignacion>(`${this.baseUrl}/${asgId}/suspender`, { subtipo, motivo });
  }

  /** Para el reloj de la tarea. El tiempo parado no cuenta como producción. */
  pausarTarea(asgId: number, subtipo: string, motivo?: string): Observable<Asignacion> {
    return this.http.post<Asignacion>(`${this.baseUrl}/${asgId}/pausa`, { subtipo, motivo });
  }

  /** Suspende la tarea: se retoma otro día donde quedó. */
  suspenderTarea(asgId: number, motivo?: string): Observable<Asignacion> {
    return this.http.post<Asignacion>(`${this.baseUrl}/${asgId}/tarea/suspender`, { motivo });
  }

  /** Vuelve a arrancar el reloj de una tarea pausada o suspendida. */
  retomarTarea(asgId: number): Observable<Asignacion> {
    return this.http.post<Asignacion>(`${this.baseUrl}/${asgId}/tarea/retomar`, {});
  }

  // --- Controles que el operario hace mientras produce ---

  /** Pausa lo que está haciendo y abre el control como tarea propia. */
  iniciarControl(asgId: number, tipo: string): Observable<ControlEnTarea> {
    return this.http.post<ControlEnTarea>(`${this.baseUrl}/${asgId}/control/iniciar`, { tipo });
  }

  cerrarControl(asgId: number, tareaId: number, datos: ResultadoControl): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${asgId}/control/${tareaId}/cerrar`, datos);
  }

  cancelarControl(asgId: number, tareaId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${asgId}/control/${tareaId}`);
  }

  asignar(request: AsignarRequest): Observable<AsignarResponse> {
    return this.http.post<AsignarResponse>(this.baseUrl, request);
  }

  activas(): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(`${this.baseUrl}/activas`);
  }

  porOrden(ordenId: number): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(`${this.baseUrl}/orden/${ordenId}`);
  }

  deOperario(username: string): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(`${this.baseUrl}/operario/${encodeURIComponent(username)}`);
  }

  /** delta -1 sube en la cola, +1 baja. */
  mover(asgId: number, delta: number): Observable<Asignacion[]> {
    const params = new HttpParams().set('delta', String(delta));
    return this.http.post<Asignacion[]>(`${this.baseUrl}/${asgId}/mover`, {}, { params });
  }

  actualizar(asgId: number, cambios: {
    cantidad?: number; nroMaquina?: number; puesto?: string; observaciones?: string;
  }): Observable<Asignacion> {
    return this.http.put<Asignacion>(`${this.baseUrl}/${asgId}`, cambios);
  }

  cancelar(asgId: number, motivo?: string): Observable<Asignacion> {
    let params = new HttpParams();
    if (motivo) params = params.set('motivo', motivo);
    return this.http.delete<Asignacion>(`${this.baseUrl}/${asgId}`, { params });
  }
}
