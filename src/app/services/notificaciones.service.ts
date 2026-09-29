import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notificacion } from '../models/notificacion';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/notificaciones';

  /** Lo que muestra la campanita; lo comparten el shell y la pantalla. */
  readonly sinLeer = signal(0);

  listar(soloNoLeidas = false): Observable<Notificacion[]> {
    const params = new HttpParams().set('soloNoLeidas', String(soloNoLeidas));
    return this.http.get<Notificacion[]>(this.baseUrl, { params });
  }

  refrescarContador(): void {
    this.http.get<{ sinLeer: number }>(`${this.baseUrl}/sin-leer`)
      .subscribe({
        next: r => this.sinLeer.set(r.sinLeer ?? 0),
        error: () => this.sinLeer.set(0)
      });
  }

  marcarLeida(nodId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${nodId}/leida`, {})
      .pipe(tap(() => this.refrescarContador()));
  }

  marcarTodas(): Observable<{ marcadas: number }> {
    return this.http.post<{ marcadas: number }>(`${this.baseUrl}/leidas`, {})
      .pipe(tap(() => this.sinLeer.set(0)));
  }
}
