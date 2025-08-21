
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
      { path: '', pathMatch: 'full', redirectTo: 'ordenes' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
