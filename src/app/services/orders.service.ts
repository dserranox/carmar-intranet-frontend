import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OrdenResponseDTO } from '../models/order';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/orders';

  listByYear(year: number) {
    return this.http.get<OrdenResponseDTO[]>(this.baseUrl, { params: { year } as any });
  }

  finalizarOrden(id: number) {
    return this.http.post(`${this.baseUrl}/finalizar-orden`, { id });
  }
}
