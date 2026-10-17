import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ControlRuta, OrdenAbierta, PuntoControl, PuntoControlAbm, ResumenCalidad, RutaCalidad } from '../models/calidad';

@Injectable({ providedIn: 'root' })
export class CalidadService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/calidad';

  // --- Controles que cargan los operarios ---

  getRegistros(filtros: {
    desde?: string; hasta?: string; tipo?: string; resultado?: string; usuario?: string;
  }): Observable<ResumenCalidad> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor) params = params.set(clave, valor);
    });
    return this.http.get<ResumenCalidad>(`${this.baseUrl}/registros`, { params });
  }

  getPuntosControl(): Observable<PuntoControl[]> {
    return this.http.get<PuntoControl[]>(`${this.baseUrl}/puntos-control`);
  }

  // --- ABM de puntos de control ---

  getPuntosTodos(): Observable<PuntoControlAbm[]> {
    return this.http.get<PuntoControlAbm[]>(`${this.baseUrl}/puntos-control/todos`);
  }

  guardarPunto(punto: PuntoControlAbm): Observable<PuntoControlAbm> {
    return punto.pcoId
      ? this.http.put<PuntoControlAbm>(`${this.baseUrl}/puntos-control/${punto.pcoId}`, punto)
      : this.http.post<PuntoControlAbm>(`${this.baseUrl}/puntos-control`, punto);
  }

  borrarPunto(pcoId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/puntos-control/${pcoId}`);
  }

  moverPunto(pcoId: number, delta: number): Observable<PuntoControlAbm[]> {
    const params = new HttpParams().set('delta', String(delta));
    return this.http.post<PuntoControlAbm[]>(`${this.baseUrl}/puntos-control/${pcoId}/mover`, {}, { params });
  }

  // --- Recorridas ---

  getRutas(desde?: string, hasta?: string): Observable<RutaCalidad[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<RutaCalidad[]>(`${this.baseUrl}/rutas`, { params });
  }

  getRuta(rcaId: number): Observable<RutaCalidad> {
    return this.http.get<RutaCalidad>(`${this.baseUrl}/rutas/${rcaId}`);
  }

  /** Devuelve 204 (null) si el usuario no dejó ninguna recorrida abierta. */
  getRutaEnCurso(): Observable<RutaCalidad | null> {
    return this.http.get<RutaCalidad | null>(`${this.baseUrl}/rutas/en-curso`);
  }

  iniciarRuta(fecha?: string, numero?: number): Observable<RutaCalidad> {
    return this.http.post<RutaCalidad>(`${this.baseUrl}/rutas`, { fecha, numero });
  }

  getOrdenesAbiertas(rcaId: number): Observable<OrdenAbierta[]> {
    return this.http.get<OrdenAbierta[]>(`${this.baseUrl}/rutas/${rcaId}/ordenes-abiertas`);
  }

  agregarOrden(rcaId: number, ordenId: number): Observable<RutaCalidad> {
    return this.http.post<RutaCalidad>(`${this.baseUrl}/rutas/${rcaId}/ordenes/${ordenId}`, {});
  }

  guardarControl(rcaId: number, control: ControlRuta): Observable<RutaCalidad> {
    return this.http.put<RutaCalidad>(`${this.baseUrl}/rutas/${rcaId}/controles/${control.rccId}`, {
      puesto: control.puesto,
      operario: control.operario,
      observaciones: control.observaciones,
      items: control.items.map(i => ({
        puntoId: i.puntoId,
        resultado: i.resultado,
        observaciones: i.observaciones
      }))
    });
  }

  quitarOrden(rcaId: number, rccId: number): Observable<RutaCalidad> {
    return this.http.delete<RutaCalidad>(`${this.baseUrl}/rutas/${rcaId}/controles/${rccId}`);
  }

  cerrarRuta(rcaId: number, observaciones?: string): Observable<RutaCalidad> {
    return this.http.post<RutaCalidad>(`${this.baseUrl}/rutas/${rcaId}/cerrar`, { observaciones });
  }

  /** Dejarla sin terminar, con el motivo anotado: la salida cuando no se puede cerrar. */
  suspenderRuta(rcaId: number, motivo: string): Observable<RutaCalidad> {
    return this.http.post<RutaCalidad>(`${this.baseUrl}/rutas/${rcaId}/suspender`, { motivo });
  }
}
