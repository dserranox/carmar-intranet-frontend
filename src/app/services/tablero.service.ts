import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Tablero } from '../models/tablero';

@Injectable({ providedIn: 'root' })
export class TableroService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/tablero';

  /** Todo el tablero en un solo pedido: la pantalla no hace veinticinco llamadas. */
  get(desde?: string, hasta?: string): Observable<Tablero> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<Tablero>(this.baseUrl, { params });
  }
}
