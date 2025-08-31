import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { TareasDTO } from '../models/tarea';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private baseUrl = environment.apiUrl + "/tareas";

  constructor(private http: HttpClient) {}

  iniciarTarea(payload: any): Observable<any> {
    return this.http.post(this.baseUrl, payload);
  }

  listarTareas(): Observable<TareasDTO[]> {
    return this.http.get<TareasDTO[]>(this.baseUrl + '/byUsername');
  }

  finalizarTarea(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/finalizar-tarea`, payload);
  }

}
