
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatIconModule, MatButtonModule, MatDividerModule, MatTooltipModule
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  get username(): string {
    try {
      const data = localStorage.getItem('user');
      if (!data) return '';
      const u = JSON.parse(data);
      return u?.username || '';
    } catch { return ''; }
  }

  goHome() { this.router.navigate(['/ordenes']); }
  logout() { this.auth.logout(); }
}
