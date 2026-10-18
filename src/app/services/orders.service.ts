import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CambioMasivoResultado, OrdenResponseDTO } from '../models/order';
import { OrdenCreateDTO } from '../models/orden-create';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/orders';

  getYears() {
    return this.http.get<number[]>(`${this.baseUrl}/years`);
  }

  listByYear(year: number) {
    return this.http.get<OrdenResponseDTO[]>(this.baseUrl, { params: { year } as any });
  }

  avanzarOrden(orden: OrdenResponseDTO) {
    return this.http.post<OrdenResponseDTO>(`${this.baseUrl}/avanzar-orden`, orden);
  }

  /**
   * Varias órdenes al mismo estado de una vez. El servidor valida cada una y
   * contesta cuáles movió y cuáles no, así se puede decir por qué.
   */
  avanzarMasivo(ids: number[], situacionClave: string): Observable<CambioMasivoResultado> {
    return this.http.post<CambioMasivoResultado>(`${this.baseUrl}/avanzar-masivo`,
      { ids, situacionClave });
  }

  /** El administrador le pone el cliente a una orden que se cargó sin él. */
  asignarCliente(ordenId: number, clienteId: number | null): Observable<OrdenResponseDTO> {
    return this.http.put<OrdenResponseDTO>(`${this.baseUrl}/${ordenId}/cliente`, { clienteId });
  }

  createOrden(orden: OrdenCreateDTO): Observable<OrdenResponseDTO> {
    return this.http.post<OrdenResponseDTO>(this.baseUrl, orden);
  }
}
