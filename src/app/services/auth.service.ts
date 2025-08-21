
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  token?: string;
  access_token?: string;
  username?: string;
  roles?: string[];
  [k: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly AUTH_ENDPOINT = `${environment.apiUrl}/auth/login`;

  login(username: string, password: string) {
    return this.http.post<LoginResponse>(this.AUTH_ENDPOINT, { username, password });
  }

  persistSession(resp: LoginResponse, usernameFallback: string) {
    const token = resp.token || resp.access_token;
    if (!token) throw new Error('No token in response');
    const username = resp.username || usernameFallback;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ username, roles: resp.roles || [] }));
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
