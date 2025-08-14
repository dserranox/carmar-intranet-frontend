import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './../../services/auth.service';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [FormsModule]
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    debugger;
    if (this.authService.login(this.username, this.password)) {
      this.router.navigate(['/tareas']);
    } else {
      this.errorMessage = 'Usuario o contraseña incorrectos';
    }
  }
}
