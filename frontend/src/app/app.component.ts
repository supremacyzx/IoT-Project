import { Component, inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { JsonPipe, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [
    NgIf,
    FormsModule,
    JsonPipe
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'frontend';
  username = '';
  password = '';

  protected authService = inject(AuthService);

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.authService.getProfile().subscribe({
        error: () => {
          // Handle errors if fetching the profile fails
          this.authService.logout();
        }
      });
    }
  }

  login(username: string, password: string): void {
    this.authService.login(username, password).subscribe({
      next: () => {
        this.authService.getProfile().subscribe(); // Fetch user profile after login
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
