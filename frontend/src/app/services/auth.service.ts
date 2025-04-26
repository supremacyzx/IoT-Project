import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError, switchMap } from 'rxjs';
import { ApiService } from './api.service';
import { UserProfile } from '../../models/userProfile.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Signals
  authError = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  userProfile = signal<UserProfile | null>(null);

  constructor(private apiService: ApiService) {
  }

  // Getter für isAuthenticated, der den Wert aus apiService verwendet
  get isAuthenticated() {
    return this.apiService.isAuthenticated;
  }

  login(username: string, password: string): Observable<any> {
    this.isLoading.set(true);
    this.authError.set(null);

    // Erst den Health-Status prüfen
    return this.apiService.checkHealth().pipe(
      switchMap(() => {
        // Falls Backend nicht erreichbar, Error auslösen
        if (!this.apiService.isBackendHealthy()) {
          throw new HttpErrorResponse({
            error: { message: this.apiService.connectionError() || 'Backend ist nicht erreichbar' },
            status: 0,
            statusText: 'Backend nicht erreichbar'
          });
        }

        return this.apiService.login(username, password);
      }),
      tap(() => {
        this.isLoading.set(false);

        // Fetch user profile immediately after login
        this.getProfile().subscribe({
          next: (profile) => this.userProfile.set(profile),
          error: () => this.userProfile.set(null) // Clear profile on error
        });
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);

        if (error.status === 0) {
          // Verbindungsfehler
          this.authError.set(error.error?.message || 'Verbindung zum Backend nicht möglich');
        } else if (error.status === 401) {
          const attemptsRemaining = error.error?.attempts_remaining;
          const errorMessage = error.error?.message || 'Benutzername oder Passwort ungültig';

          if (attemptsRemaining !== undefined) {
            this.authError.set(`${errorMessage}. Verbleibende Versuche: ${attemptsRemaining}`);
          } else {
            this.authError.set(errorMessage);
          }
        } else if (error.status === 429) {
          this.authError.set('Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.');
        } else {
          this.authError.set('Bei der Anmeldung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
        }

        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.apiService.logout();
    this.userProfile.set(null);
  }

  getProfile(): Observable<UserProfile> {
    this.isLoading.set(true);

    // Health-Check vor Profil-Abruf
    return this.apiService.checkHealth().pipe(
      switchMap(() => {
        if (!this.apiService.isBackendHealthy()) {
          throw new HttpErrorResponse({
            error: { message: this.apiService.connectionError() || 'Backend ist nicht erreichbar' },
            status: 0,
            statusText: 'Backend nicht erreichbar'
          });
        }

        return this.apiService.getUserProfile();
      }),
      tap(profile => {
        this.userProfile.set(profile);
        this.isLoading.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);

        if (error.status === 0) {
          this.authError.set('Backend nicht erreichbar. Bitte versuchen Sie es später erneut.');
        } else if (error.status === 401) {
          this.authError.set('Authentifizierung abgelaufen. Bitte melden Sie sich erneut an.');
          this.logout();
        } else {
          this.authError.set('Profil konnte nicht abgerufen werden. Bitte versuchen Sie es erneut.');
        }

        return throwError(() => error);
      })
    );
  }
}

