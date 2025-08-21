
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule]
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.errorMessage = '';
    this.loading = true;
    this.auth.login(this.username, this.password).subscribe({
      next: (resp) => {
        try {
          this.auth.persistSession(resp, this.username);
          this.router.navigate(['/ordenes']);
        } catch (e: any) {
          this.errorMessage = e?.message || 'Error de autenticación';
        }
      },
      error: (err) => {
        const msg = err?.error?.message || err?.statusText || 'Usuario o contraseña incorrectos';
        this.errorMessage = msg;
      },
      complete: () => this.loading = false
    });
  }
}
