import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Cliente } from '../models/cliente';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/clientes';

  getAll(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.baseUrl);
  }

  /**
   * Solo id y razón social, para los desplegables. La ficha con el CUIT es de
   * quien administra clientes; esto lo puede leer también calidad, que necesita
   * decir qué cliente emitió una no conformidad.
   */
  getNombres(): Observable<{ id: number; razonSocial: string }[]> {
    return this.http.get<{ id: number; razonSocial: string }[]>(`${this.baseUrl}/nombres`);
  }

  crear(cliente: { razonSocial: string; cuit: string }): Observable<Cliente> {
    return this.http.post<Cliente>(this.baseUrl, cliente);
  }
}
