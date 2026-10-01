import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Una pantalla del catálogo, como se la muestra a quien arma un rol. */
export interface Pantalla {
  clave: string;
  etiqueta: string;
  descripcion: string;
  ruta: string | null;
  tieneEdicion: boolean;
}

export interface PantallaDelRol {
  clave: string;
  ver: boolean;
  editar: boolean;
}

export interface Rol {
  id?: number;
  nombre: string;
  descripcion?: string | null;
  usuarios?: number;
  protegido?: boolean;
  pantallas: PantallaDelRol[];
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/roles';

  getPantallas(): Observable<Pantalla[]> {
    return this.http.get<Pantalla[]>(`${this.baseUrl}/pantallas`);
  }

  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(this.baseUrl);
  }

  crear(rol: Rol): Observable<Rol> {
    return this.http.post<Rol>(this.baseUrl, rol);
  }

  actualizar(id: number, rol: Rol): Observable<Rol> {
    return this.http.put<Rol>(`${this.baseUrl}/${id}`, rol);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
