import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';

interface LoginResponse {
  access_token: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface UserProfile {
  username: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:5000';
  private loginUrl = `${this.baseUrl}/login`;
  private profileUrl = `${this.baseUrl}/user/profile`;

  // Signals
  isAuthenticated = signal<boolean>(this.hasStoredToken());
  authError = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  userProfile = signal<UserProfile | null>(null);

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<LoginResponse> {
    this.isLoading.set(true);
    this.authError.set(null);

    const loginRequest: LoginRequest = { username, password };

    return this.http.post<LoginResponse>(this.loginUrl, loginRequest).pipe(
      tap(response => {
        localStorage.setItem('auth_token', response.access_token);
        this.isAuthenticated.set(true);
        this.isLoading.set(false);

        // Fetch user profile immediately after login
        this.getProfile().subscribe({
          next: (profile) => this.userProfile.set(profile),
          error: () => this.userProfile.set(null) // Clear profile on error
        });
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);

        if (error.status === 401) {
          const attemptsRemaining = error.error?.attempts_remaining;
          const errorMessage = error.error?.message || 'Invalid username or password';

          if (attemptsRemaining !== undefined) {
            this.authError.set(`${errorMessage}. Attempts remaining: ${attemptsRemaining}`);
          } else {
            this.authError.set(errorMessage);
          }
        } else if (error.status === 429) {
          this.authError.set('Too many login attempts. Please try again later.');
        } else {
          this.authError.set('An error occurred during login. Please try again.');
        }

        return throwError(() => error);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    this.isAuthenticated.set(false);
    this.userProfile.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getProfile(): Observable<UserProfile> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.isLoading.set(true);

    return this.http.get<UserProfile>(this.profileUrl, { headers }).pipe(
      tap(profile => {
        this.userProfile.set(profile);
        this.isLoading.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);

        if (error.status === 401) {
          this.authError.set('Authentication expired. Please login again.');
          this.logout();
        } else {
          this.authError.set('Failed to fetch profile. Please try again.');
        }

        return throwError(() => error);
      })
    );
  }

  private hasStoredToken(): boolean {
    return !!localStorage.getItem('auth_token');
  }
}

