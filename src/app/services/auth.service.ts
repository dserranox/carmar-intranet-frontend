
import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { timer, Subscription } from 'rxjs';

export interface LoginResponse {
  token?: string;
  access_token?: string;
  username?: string;
  authorities?: string[];
  expiresAt: any;
  [k: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly AUTH_ENDPOINT = `${environment.apiUrl}/auth/login`;
  private tokenExpirationTimer: any;
    private zone = inject(NgZone);
  private logoutSub?: Subscription;

  login(username: string, password: string) {
    return this.http.post<LoginResponse>(this.AUTH_ENDPOINT, { username, password });
  }

  persistSession(resp: LoginResponse, usernameFallback: string) {
    const token = resp.token || resp.access_token;
    debugger
    if (!token) throw new Error('No token in response');
    const username = resp.username || usernameFallback;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ username, permissions: resp.authorities || [] }));
    // this.autoLogout(resp.expiresAt);
    this.scheduleAutoLogout(resp.expiresAt);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.logoutSub?.unsubscribe();
    this.logoutSub = undefined;

    this.zone.run(() => this.router.navigate(['/login']));
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  autoLogout(expirationDuration: number) {
    debugger
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expirationDuration);
  }

  scheduleAutoLogout(expiresAtMs: number) {
    // limpiar timer anterior
    this.logoutSub?.unsubscribe();
    this.logoutSub = undefined;

    // diferencia en ms
    const remaining = Math.floor(expiresAtMs - Date.now());

    if (remaining <= 0) {
      // ya expiró → salir de una
      this.logout();
      return;
    }

    // setTimeout tiene límite: 2_147_483_647 ms
    const MAX_TIMEOUT = 2147483647;

    if (remaining > MAX_TIMEOUT) {
      // programamos un “tramo” y luego reintentamos
      this.logoutSub = timer(remaining - MAX_TIMEOUT).subscribe(() => {
        this.scheduleAutoLogout(expiresAtMs);
      });
    } else {
      // programar el logout; usar NgZone para actualizar UI
      this.logoutSub = timer(remaining).subscribe(() => {
        this.zone.run(() => this.logout());
      });
    }
  }
}
