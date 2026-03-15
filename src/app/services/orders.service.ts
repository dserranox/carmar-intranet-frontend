import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OrdenResponseDTO } from '../models/order';
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

  createOrden(orden: OrdenCreateDTO): Observable<OrdenResponseDTO> {
    return this.http.post<OrdenResponseDTO>(this.baseUrl, orden);
  }
}
