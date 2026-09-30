import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MotivoFaltante, PendienteCompra, Picking, PickingImportResult
} from '../models/picking';

@Injectable({ providedIn: 'root' })
export class PickingService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/picking';

  listar(estado?: string, plan?: string): Observable<Picking[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    if (plan) params = params.set('plan', plan);
    return this.http.get<Picking[]>(this.baseUrl, { params });
  }

  getPicking(pckId: number): Observable<Picking> {
    return this.http.get<Picking>(`${this.baseUrl}/${pckId}`);
  }

  /** Lee el Excel y devuelve lo que se va a crear. No escribe nada. */
  previsualizar(archivo: File): Observable<PickingImportResult> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<PickingImportResult>(`${this.baseUrl}/importar/previsualizar`, form);
  }

  importar(archivo: File, reemplazar: string[] = []): Observable<PickingImportResult> {
    const form = new FormData();
    form.append('archivo', archivo);
    let params = new HttpParams();
    reemplazar.forEach(p => params = params.append('reemplazar', p));
    return this.http.post<PickingImportResult>(`${this.baseUrl}/importar`, form, { params });
  }

  iniciar(pckId: number): Observable<Picking> {
    return this.http.post<Picking>(`${this.baseUrl}/${pckId}/iniciar`, {});
  }

  finalizar(pckId: number, segundos?: number): Observable<Picking> {
    return this.http.post<Picking>(`${this.baseUrl}/${pckId}/finalizar`, { segundos });
  }

  /** Sin cantidad se lleva el total; con una menor, la línea queda parcial. */
  retirar(pkdId: number, cantidad?: number, observaciones?: string): Observable<Picking> {
    return this.http.put<Picking>(`${this.baseUrl}/lineas/${pkdId}/retirar`, { cantidad, observaciones });
  }

  marcarFaltante(pkdId: number, motivo: MotivoFaltante, observaciones?: string): Observable<Picking> {
    return this.http.put<Picking>(`${this.baseUrl}/lineas/${pkdId}/faltante`, { motivo, observaciones });
  }

  entregar(pkdId: number): Observable<Picking> {
    return this.http.put<Picking>(`${this.baseUrl}/lineas/${pkdId}/entregar`, {});
  }

  pendientesDeCompra(): Observable<PendienteCompra[]> {
    return this.http.get<PendienteCompra[]>(`${this.baseUrl}/pendientes-compra`);
  }

  marcarPedido(codigo: string, pedido: boolean): Observable<unknown> {
    const params = new HttpParams().set('pedido', String(pedido));
    return this.http.put(`${this.baseUrl}/pendientes-compra/${encodeURIComponent(codigo)}/pedido`, {}, { params });
  }

  eliminar(pckId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${pckId}`);
  }
}
