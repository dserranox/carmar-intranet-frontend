
import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  // { path: 'ordenes', canActivate: [authGuard], loadComponent: () => import('./components/orders/orders-table.component').then(m => m.OrdersTableComponent) },
  // { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: 'ordenes', loadComponent: () => import('./components/orders/orders-table.component').then(m => m.OrdersTableComponent) },
      { path: 'tareas', loadComponent: () => import('./components/tareas/tareas.component').then(m => m.TareasComponent) },
      { path: 'perfil', loadComponent: () => import('./components/perfil/perfil.component').then(m => m.PerfilComponent) },
      { path: 'admin/usuarios', loadComponent: () => import('./components/admin/admin-usuarios.component').then(m => m.AdminUsuariosComponent) },
      { path: 'admin/usuarios/nuevo', loadComponent: () => import('./components/admin/admin-usuario-form.component').then(m => m.AdminUsuarioFormComponent), data: { mode: 'nuevo' } },
      { path: 'admin/usuarios/:id/ver', loadComponent: () => import('./components/admin/admin-usuario-form.component').then(m => m.AdminUsuarioFormComponent), data: { mode: 'ver' } },
      { path: 'admin/usuarios/:id/editar', loadComponent: () => import('./components/admin/admin-usuario-form.component').then(m => m.AdminUsuarioFormComponent), data: { mode: 'editar' } },
      { path: '', pathMatch: 'full', redirectTo: 'ordenes' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
