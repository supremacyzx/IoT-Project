import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',

})
export class AppComponent implements OnInit {
  isAuthenticated = false;
  isAuthPage = false;
  isLandingPage = false; // Neue Variable für die Landing-Seite

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.setDarkTheme(true); // Enable dark theme by default
  }

  ngOnInit(): void {
    // Überwache den Authentifizierungsstatus
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      this.isAuthenticated = isAuthenticated;
    });

    // Überwache URL-Änderungen, um festzustellen, ob wir auf der Auth- oder Landing-Seite sind
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isAuthPage = event.url === '/auth';
      this.isLandingPage = event.url === '/'; // Landing-Seite prüfen
    });
  }

  setDarkTheme(enable: boolean): void {
    const htmlElement = document.documentElement;
    if (enable) {
      htmlElement.classList.add('dark-theme');
    } else {
      htmlElement.classList.remove('dark-theme');
    }
  }
}

