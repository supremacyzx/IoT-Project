import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { LoginResponse, LoginRequest } from '../../models/login.model';
import { HealthResponse } from '../../models/health.model';
import { io, Socket } from 'socket.io-client';

interface DataItem {
  timestamp: string;
  data: any;
}

export interface DataResponse {
  data: DataItem[];
}

interface IncidentResponse {
  incidents: DataItem[];
}

interface UserProfileResponse {
  username: string;
  message: string;
}

interface DataQueryParams {
  start_date?: string;
  end_date?: string;
  limit?: number;
  [key: string]: string | number | undefined;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://10.93.140.165:5000'; // Lets use the actual app server
  private healthUrl = `${this.baseUrl}/health`;
  private tokenKey = 'auth_token';
  private socket: Socket | null = null;

  // Signal für den Gesundheitsstatus des Backends
  isBackendHealthy = signal<boolean>(false);
  lastHealthCheck = signal<string | null>(null);
  connectionError = signal<string | null>(null);
  isAuthenticated = signal<boolean>(false);

  // WebSocket-bezogene Signals
  isSocketConnected = signal<boolean>(false);
  lastSocketMessage = signal<any>(null);
  realtimeData = signal<DataItem[]>([]);

  constructor(private http: HttpClient) {
    // Initial health check beim Start
    this.checkHealth().subscribe();

    // Prüfen, ob bereits ein Token vorhanden ist
    this.isAuthenticated.set(this.getToken() !== null);

    // Automatische WebSocket-Verbindung, wenn bereits authentifiziert
    if (this.isAuthenticated()) {
      this.connectWebSocket();
    }
  }

  /**
   * Prüft die Verbindung zum Backend
   * @returns Observable mit der Health-Response
   */
  checkHealth(): Observable<HealthResponse> {
    this.connectionError.set(null);

    return this.http.get<HealthResponse>(this.healthUrl).pipe(
      tap(response => {
        this.isBackendHealthy.set(response.status === 'healthy');
        this.lastHealthCheck.set(response.timestamp);
      }),
      catchError((error: HttpErrorResponse) => {
        this.isBackendHealthy.set(false);
        this.connectionError.set(`Verbindung zum Backend nicht möglich: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Startet regelmäßige Health-Checks
   * @param intervalMs Intervall in Millisekunden
   */
  startPeriodicHealthCheck(intervalMs: number = 30000): void {
    setInterval(() => {
      this.checkHealth().subscribe();
    }, intervalMs);
  }

  /**
   * Authentifiziert einen Benutzer und speichert das JWT-Token
   * @param username Benutzername
   * @param password Passwort
   * @returns Observable mit Login-Response
   */
  login(username: string, password: string): Observable<LoginResponse> {
    const loginData: LoginRequest = { username, password };
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, loginData).pipe(
      tap(response => {
        this.saveToken(response.access_token);
        this.isAuthenticated.set(true);
        // WebSocket-Verbindung nach erfolgreicher Anmeldung herstellen
        this.connectWebSocket();
      }),
      catchError((error: HttpErrorResponse) => {
        this.isAuthenticated.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Beendet die Benutzersitzung
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.isAuthenticated.set(false);
    // WebSocket-Verbindung beim Logout trennen
    this.disconnectWebSocket();
  }

  /**
   * Ruft Dashboard-Daten vom Backend ab
   * @param params Optionale Abfrageparameter (Datum, Limit)
   * @returns Observable mit Daten-Response
   */
  getData(params?: DataQueryParams): Observable<DataResponse> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.get<DataResponse>(`${this.baseUrl}/data`, { params: httpParams }).pipe(
      catchError(this.handleAuthError)
    );
  }

  /**
   * Ruft Vorfallsdaten vom Backend ab
   * @param params Optionale Abfrageparameter (Datum, Limit)
   * @returns Observable mit Vorfalls-Response
   */
  getIncidents(params?: DataQueryParams): Observable<IncidentResponse> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.get<IncidentResponse>(`${this.baseUrl}/incidents`, { params: httpParams }).pipe(
      catchError(this.handleAuthError)
    );
  }

  /**
   * Ruft Benutzerprofilinformationen ab
   * @returns Observable mit Benutzerprofil-Response
   */
  getUserProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.baseUrl}/user/profile`).pipe(
      catchError(this.handleAuthError)
    );
  }

  /**
   * Behandelt Authentifizierungsfehler
   */
  private handleAuthError = (error: HttpErrorResponse) => {
    if (error.status === 401) {
      // Token abgelaufen oder ungültig
      this.isAuthenticated.set(false);
      localStorage.removeItem(this.tokenKey);
    }
    return throwError(() => error);
  };

  /**
   * Speichert das JWT-Token im localStorage
   * @param token JWT-Token
   */
  private saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Gibt das gespeicherte JWT-Token zurück
   * @returns JWT-Token oder null, wenn nicht vorhanden
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Stellt eine WebSocket-Verbindung zum Backend her
   */
  connectWebSocket(): void {
    if (this.socket) {
      this.disconnectWebSocket(); // Bestehende Verbindung trennen, falls vorhanden
    }

    const token = this.getToken();
    if (!token) {
      console.error('Keine Authentifizierung für WebSocket-Verbindung');
      return;
    }

    this.socket = io(this.baseUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket verbunden');
      this.isSocketConnected.set(true);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket getrennt');
      this.isSocketConnected.set(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket Verbindungsfehler:', error);
      this.isSocketConnected.set(false);
    });

    // Standard-Events abonnieren
    this.subscribeToDataUpdates();
    this.subscribeToIncidents();
  }

  /**
   * Trennt die WebSocket-Verbindung
   */
  disconnectWebSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isSocketConnected.set(false);
    }
  }

  /**
   * Abonniert Echtzeit-Daten-Updates vom Server
   */
  private subscribeToDataUpdates(): void {
    if (!this.socket) return;

    this.socket.on('data_update', (data) => {
      this.lastSocketMessage.set(data);

      // Aktuelle Daten aktualisieren und an den Anfang stellen
      const updatedData = [...this.realtimeData()];
      updatedData.unshift({
        timestamp: new Date().toISOString(),
        data
      });

      // Begrenze die Anzahl der gespeicherten Einträge (z.B. auf die letzten 50)
      if (updatedData.length > 50) {
        updatedData.pop();
      }

      this.realtimeData.set(updatedData);
    });
  }

  /**
   * Abonniert Echtzeit-Vorfallsmeldungen vom Server
   */
  private subscribeToIncidents(): void {
    if (!this.socket) return;

    this.socket.on('incident', (incident) => {
      console.log('Neuer Vorfall empfangen:', incident);
      // Hier könnten weitere Aktionen bei neuen Vorfällen ausgeführt werden
    });
  }

  /**
   * Sendet Daten über WebSocket an den Server
   * @param event Event-Name
   * @param data Zu sendende Daten
   */
  sendSocketMessage(event: string, data: any): void {
    if (!this.socket || !this.isSocketConnected()) {
      console.error('Keine aktive WebSocket-Verbindung');
      return;
    }

    this.socket.emit(event, data);
  }
}
