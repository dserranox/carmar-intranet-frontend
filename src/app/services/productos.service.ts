import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Producto } from '../models/producto';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/productos';

  buscar(filtro: string): Observable<Producto[]> {
    if (!filtro || filtro.trim().length < 2) {
      return of([]);
    }
    const params = new HttpParams().set('filtro', filtro.trim());
    return this.http.get<Producto[]>(`${this.baseUrl}`, { params });
  }

  getAll(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.baseUrl}`);
  }
}
