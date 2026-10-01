
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OperacionesDTO } from '../models/operacion';

@Injectable({ providedIn: 'root' })
export class OperationsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/operaciones';

  getAll(): Observable<OperacionesDTO[]> {
    return this.http.get<OperacionesDTO[]>(`${this.baseUrl}/get-all`);
  }

  /** Las que se reparten a mano: sin la ruta de control, los controles ni el picking. */
  getAsignables(): Observable<OperacionesDTO[]> {
    return this.http.get<OperacionesDTO[]>(`${this.baseUrl}/asignables`);
  }
}
