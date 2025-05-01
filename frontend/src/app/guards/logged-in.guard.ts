import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoggedInGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.isLoggedIn().pipe(
      map(isLoggedIn => {
        if (!isLoggedIn) {
          // Nur Zugriff erlauben, wenn der Benutzer NICHT angemeldet ist
          return true;
        }
        // Wenn der Benutzer bereits angemeldet ist, zum Dashboard umleiten
        return this.router.createUrlTree(['/dashboard']);
      })
    );
  }
}
