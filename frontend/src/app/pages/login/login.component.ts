import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { JsonPipe, NgClass, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [
    NgIf,
    FormsModule,
    JsonPipe,
    NgClass
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';

  protected authService = inject(AuthService);
  protected apiService = inject(ApiService);
  private router = inject(Router);

  constructor() {}

  ngOnInit(): void {
    // Prüfe die Backend-Verbindung beim Start
    this.checkBackendHealth();

    // Starte regelmäßige Health-Checks alle 30 Sekunden
    this.apiService.startPeriodicHealthCheck(30000);

    if (this.authService.isAuthenticated()) {
      this.authService.getProfile().subscribe({
        error: () => {
          // Handle errors if fetching the profile fails
          this.authService.logout();
        }
      });
    }
  }

  checkBackendHealth(): void {
    this.apiService.checkHealth().subscribe({
      error: () => {
        // Fehlerbehandlung (bereits im Service implementiert)
      }
    });
  }

  login(username: string, password: string): void {
    this.authService.login(username, password).subscribe({
      next: () => {
        // Nach erfolgreichem Login zum Dashboard navigieren
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        // Additional error handling if needed
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
