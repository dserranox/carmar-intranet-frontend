import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  iniciarTarea(payload: any): Observable<any> {
    debugger;
    return this.http.post(`${this.baseUrl}/tareas`, payload);
    // console.log('StartTask payload', payload);
    // return of({ ok: true });
  }
}
