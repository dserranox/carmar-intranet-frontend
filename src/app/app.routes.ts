
import { Routes } from '@angular/router';
import { rutaDeInicio } from './shared/inicio';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './auth/auth.guard';
import { tareaAbiertaGuard } from './shared/tarea-abierta.guard';
import { permisoGuard } from './shared/permiso.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  // { path: 'ordenes', canActivate: [authGuard], loadComponent: () => import('./components/orders/orders-table.component').then(m => m.OrdersTableComponent) },
  // { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    // Primero se valida el permiso de la pantalla y después, si corresponde,
    // que no haya una tarea corriendo: con el reloj abierto no se navega.
    canActivateChild: [permisoGuard, tareaAbiertaGuard],
    children: [
      { path: 'tablero', loadComponent: () => import('./components/tablero/tablero.component').then(m => m.TableroComponent) },
      { path: 'ordenes', loadComponent: () => import('./components/orders/orders-table.component').then(m => m.OrdersTableComponent) },
      { path: 'tareas', loadComponent: () => import('./components/tareas/tareas.component').then(m => m.TareasComponent) },
      { path: 'mi-trabajo', loadComponent: () => import('./components/mi-trabajo/mi-trabajo.component').then(m => m.MiTrabajoComponent) },
      { path: 'corte', loadComponent: () => import('./components/corte/corte.component').then(m => m.CorteComponent) },
      { path: 'corte/config/traccion', loadComponent: () => import('./components/corte/traccion-minima.component').then(m => m.TraccionMinimaComponent) },
      { path: 'corte/:sabId', loadComponent: () => import('./components/corte/corte-visor.component').then(m => m.CorteVisorComponent) },
      { path: 'picking', loadComponent: () => import('./components/picking/picking.component').then(m => m.PickingComponent) },
      { path: 'picking/:pckId', loadComponent: () => import('./components/picking/picking-preparacion.component').then(m => m.PickingPreparacionComponent) },
      { path: 'calidad', loadComponent: () => import('./components/calidad/calidad.component').then(m => m.CalidadComponent) },
      { path: 'calidad/puntos-control', loadComponent: () => import('./components/calidad/puntos-control.component').then(m => m.PuntosControlComponent) },
      { path: 'calidad/ruta/:rcaId', loadComponent: () => import('./components/calidad/ruta-visor.component').then(m => m.RutaVisorComponent) },
      { path: 'notificaciones', loadComponent: () => import('./components/notificaciones/notificaciones.component').then(m => m.NotificacionesComponent) },
      { path: 'no-conformidades', loadComponent: () => import('./components/no-conformidades/no-conformidades.component').then(m => m.NoConformidadesComponent) },
      { path: 'no-conformidades/nueva', loadComponent: () => import('./components/no-conformidades/no-conformidad-form.component').then(m => m.NoConformidadFormComponent) },
      { path: 'no-conformidades/:ncfId', loadComponent: () => import('./components/no-conformidades/no-conformidad-form.component').then(m => m.NoConformidadFormComponent) },
      { path: 'perfil', loadComponent: () => import('./components/perfil/perfil.component').then(m => m.PerfilComponent) },
      { path: 'admin/operarios', loadComponent: () => import('./components/operarios/operarios.component').then(m => m.OperariosComponent) },
      { path: 'admin/usuarios', loadComponent: () => import('./components/admin/admin-usuarios.component').then(m => m.AdminUsuariosComponent) },
      { path: 'admin/roles', loadComponent: () => import('./components/admin/admin-roles.component').then(m => m.AdminRolesComponent) },
      { path: 'admin/usuarios/nuevo', loadComponent: () => import('./components/admin/admin-usuario-form.component').then(m => m.AdminUsuarioFormComponent), data: { mode: 'nuevo' } },
      { path: 'admin/usuarios/:id/ver', loadComponent: () => import('./components/admin/admin-usuario-form.component').then(m => m.AdminUsuarioFormComponent), data: { mode: 'ver' } },
      { path: 'admin/usuarios/:id/editar', loadComponent: () => import('./components/admin/admin-usuario-form.component').then(m => m.AdminUsuarioFormComponent), data: { mode: 'editar' } },
      { path: '', pathMatch: 'full', redirectTo: () => rutaDeInicio() }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
