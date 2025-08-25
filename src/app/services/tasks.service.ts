import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private baseUrl = 'http://localhost:8090';

  constructor(private http: HttpClient) {}

  startTask(payload: any): Observable<any> {
    // return this.http.post(`${this.baseUrl}/api/tasks/start`, payload);
    console.log('StartTask payload', payload);
    return of({ ok: true });
  }
}
