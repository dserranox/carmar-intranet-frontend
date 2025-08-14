import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { OrdersTableComponent } from './components/orders/orders-table.component';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'ordenes', canActivate: [authGuard], component: OrdersTableComponent },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
