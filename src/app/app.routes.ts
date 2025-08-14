import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { TareasComponent } from './components/tareas/tareas.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'tareas', component: TareasComponent },
  { path: '**', redirectTo: 'login' }
];
