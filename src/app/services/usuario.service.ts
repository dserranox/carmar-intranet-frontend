import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PerfilResponse {
  username: string;
  email: string | null;
}

export interface PerfilUpdateRequest {
  email: string;
  passwordActual?: string | null;
  passwordNueva?: string | null;
}

export interface UsuarioAdminDTO {
  id: number;
  username: string;
  email: string | null;
  roles: string[];
  fechaCreacion: string | null;
  activo: boolean;
}

export interface UsuarioAdminUpdateRequest {
  email: string | null;
  roles: string[];
  passwordNueva?: string | null;
}

export interface UsuarioCreateRequest {
  username: string;
  email: string;
  password: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/usuario`;

  getPerfil(): Observable<PerfilResponse> {
    return this.http.get<PerfilResponse>(`${this.base}/perfil`);
  }

  updatePerfil(dto: PerfilUpdateRequest): Observable<PerfilResponse> {
    return this.http.put<PerfilResponse>(`${this.base}/perfil`, dto);
  }

  getUsuarios(): Observable<UsuarioAdminDTO[]> {
    return this.http.get<UsuarioAdminDTO[]>(`${this.base}/admin`);
  }

  getUsuariosActivos(): Observable<UsuarioAdminDTO[]> {
    return this.http.get<UsuarioAdminDTO[]>(`${this.base}/activos`);
  }

  getUsuario(id: number): Observable<UsuarioAdminDTO> {
    return this.http.get<UsuarioAdminDTO>(`${this.base}/admin/${id}`);
  }

  updateUsuario(id: number, dto: UsuarioAdminUpdateRequest): Observable<UsuarioAdminDTO> {
    return this.http.put<UsuarioAdminDTO>(`${this.base}/admin/${id}`, dto);
  }

  darDeBaja(id: number): Observable<void> {
    return this.http.put<void>(`${this.base}/admin/${id}/baja`, {});
  }

  darDeAlta(id: number): Observable<void> {
    return this.http.put<void>(`${this.base}/admin/${id}/alta`, {});
  }

  createUsuario(dto: UsuarioCreateRequest): Observable<UsuarioAdminDTO> {
    return this.http.post<UsuarioAdminDTO>(`${this.base}/admin`, dto);
  }
}
