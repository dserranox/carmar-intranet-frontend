import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OrdenResponseDTO } from '../models/order';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  listByYear(year: number) {
    return this.http.get<OrdenResponseDTO[]>(`${this.baseUrl}/api/orders`, { params: { year } as any });
  }
}
