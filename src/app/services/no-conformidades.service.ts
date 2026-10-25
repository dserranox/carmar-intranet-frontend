import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdjuntoNC, BorradorNC, NoConformidad } from '../models/no-conformidad';

@Injectable({ providedIn: 'root' })
export class NoConformidadesService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/no-conformidades';

  listar(filtros: { estado?: string; origen?: string; tipo?: string } = {}): Observable<NoConformidad[]> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor) params = params.set(clave, valor);
    });
    return this.http.get<NoConformidad[]>(this.baseUrl, { params });
  }

  get(ncfId: number): Observable<NoConformidad> {
    return this.http.get<NoConformidad>(`${this.baseUrl}/${ncfId}`);
  }

  guardar(nc: NoConformidad): Observable<NoConformidad> {
    return nc.ncfId
      ? this.http.put<NoConformidad>(`${this.baseUrl}/${nc.ncfId}`, nc)
      : this.http.post<NoConformidad>(this.baseUrl, nc);
  }

  /** Sí era una no conformidad: desde acá cuenta en los indicadores. */
  validar(ncfId: number): Observable<NoConformidad> {
    return this.http.post<NoConformidad>(`${this.baseUrl}/${ncfId}/validar`, {});
  }

  /** No era una no conformidad. Queda con el motivo, afuera de los indicadores. */
  rechazar(ncfId: number, motivo: string): Observable<NoConformidad> {
    return this.http.post<NoConformidad>(`${this.baseUrl}/${ncfId}/rechazar`, { motivo });
  }

  /** Estaba mal cargada o repetida. No se borra: el número queda reservado. */
  anular(ncfId: number, motivo: string): Observable<NoConformidad> {
    return this.http.post<NoConformidad>(`${this.baseUrl}/${ncfId}/anular`, { motivo });
  }

  cerrar(ncfId: number): Observable<NoConformidad> {
    return this.http.post<NoConformidad>(`${this.baseUrl}/${ncfId}/cerrar`, {});
  }

  reabrir(ncfId: number, motivo: string): Observable<NoConformidad> {
    return this.http.post<NoConformidad>(`${this.baseUrl}/${ncfId}/reabrir`, { motivo });
  }

  // --- Fotos ---

  subirAdjunto(ncfId: number, archivo: File, descripcion?: string): Observable<AdjuntoNC> {
    const datos = new FormData();
    datos.append('archivo', archivo, archivo.name);
    if (descripcion) datos.append('descripcion', descripcion);
    return this.http.post<AdjuntoNC>(`${this.baseUrl}/${ncfId}/adjuntos`, datos);
  }

  borrarAdjunto(ncaId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/adjuntos/${ncaId}`);
  }

  /** La imagen se pide con el token, así que se trae como blob. */
  verAdjunto(ncaId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/adjuntos/${ncaId}`, { responseType: 'blob' });
  }

  // --- Formulario FQ-02 ---

  descargarFormulario(ncfId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${ncfId}/formulario`, { responseType: 'blob' });
  }

  /** Lo que propone el sistema cuando un KO obliga a abrir una NC. */
  borradorDeKo(rccId: number): Observable<BorradorNC> {
    return this.http.get<BorradorNC>(`${environment.apiUrl}/calidad/controles/${rccId}/borrador-nc`);
  }
}
