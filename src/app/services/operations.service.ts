
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OperacionesDTO } from '../models/operacion';

@Injectable({ providedIn: 'root' })
export class OperationsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getAll(): Observable<OperacionesDTO[]> {
    return this.http.get<OperacionesDTO[]>(`${this.baseUrl}/operaciones/get-all`);
  }
}
