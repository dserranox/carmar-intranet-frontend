import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Corte, ControlCalidad, EventoCorte, RegistrarCorteRequest, RegistrarCorteResponse,
  RegistrarEventoRequest, SabanaImportResult, SabanaResumen, TraccionMinima
} from '../models/corte';

@Injectable({ providedIn: 'root' })
export class CorteService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/corte';

  misSabanas(): Observable<SabanaResumen[]> {
    return this.http.get<SabanaResumen[]>(`${this.baseUrl}/sabanas`);
  }

  todasLasSabanas(): Observable<SabanaResumen[]> {
    return this.http.get<SabanaResumen[]>(`${this.baseUrl}/sabanas/todas`);
  }

  getSabana(sabId: number): Observable<SabanaResumen> {
    return this.http.get<SabanaResumen>(`${this.baseUrl}/sabanas/${sabId}`);
  }

  getCortes(sabId: number): Observable<Corte[]> {
    return this.http.get<Corte[]>(`${this.baseUrl}/sabanas/${sabId}/cortes`);
  }

  /** 204 sin cuerpo cuando la sábana ya no tiene cortes pendientes. */
  corteActual(sabId: number): Observable<Corte | null> {
    return this.http.get<Corte | null>(`${this.baseUrl}/sabanas/${sabId}/actual`);
  }

  registrarCorte(scdId: number, payload: RegistrarCorteRequest): Observable<RegistrarCorteResponse> {
    return this.http.post<RegistrarCorteResponse>(`${this.baseUrl}/cortes/${scdId}/registrar`, payload);
  }

  getControles(sabId: number): Observable<ControlCalidad[]> {
    return this.http.get<ControlCalidad[]>(`${this.baseUrl}/sabanas/${sabId}/controles`);
  }

  /** Registra un set up (cambio de bobina o terminal) o una pausa operativa. */
  registrarEvento(scdId: number, payload: RegistrarEventoRequest): Observable<EventoCorte> {
    return this.http.post<EventoCorte>(`${this.baseUrl}/cortes/${scdId}/evento`, payload);
  }

  getEventos(sabId: number): Observable<EventoCorte[]> {
    return this.http.get<EventoCorte[]>(`${this.baseUrl}/sabanas/${sabId}/eventos`);
  }

  /** Deja la sábana suspendida, guardando el tiempo del corte en curso. */
  suspender(sabId: number, datos: { subtipo: string; motivo?: string; scdId?: number; segundos?: number }):
      Observable<SabanaResumen> {
    return this.http.post<SabanaResumen>(`${this.baseUrl}/sabanas/${sabId}/suspender`, datos);
  }

  getTraccionMinima(): Observable<TraccionMinima[]> {
    return this.http.get<TraccionMinima[]>(`${this.baseUrl}/traccion-minima`);
  }

  guardarTraccionMinima(valor: TraccionMinima): Observable<TraccionMinima> {
    return this.http.post<TraccionMinima>(`${this.baseUrl}/traccion-minima`, valor);
  }

  eliminarTraccionMinima(trmId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/traccion-minima/${trmId}`);
  }

  importar(archivo: File, opciones: {
    nombre?: string; operario?: string; nroMaquina?: number;
    toleranciaInf?: number; toleranciaSup?: number; forzar?: boolean;
    tipo?: 'CABLE' | 'CORRUGADO';
  } = {}): Observable<SabanaImportResult> {
    const form = new FormData();
    form.append('archivo', archivo);
    let params = new HttpParams();
    Object.entries(opciones).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.post<SabanaImportResult>(`${this.baseUrl}/sabanas/importar`, form, { params });
  }

  asignar(sabId: number, operario: string | null, nroMaquina?: number): Observable<SabanaResumen> {
    return this.http.put<SabanaResumen>(`${this.baseUrl}/sabanas/${sabId}/asignar`, { operario, nroMaquina });
  }

  eliminar(sabId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/sabanas/${sabId}`);
  }
}
