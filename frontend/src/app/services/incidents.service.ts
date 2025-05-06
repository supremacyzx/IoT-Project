import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { IncidentsResponse, Incident, IncidentDetails } from '../models/incidents';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class IncidentsService {
  baseUrl: string = 'http://localhost:5000'; // Set the base URL for the API
  incidentPath: string = '/incidents';
  private websocket: WebSocket | null = null;

  // Observable für Echtzeitdaten
  private incidentsSubject = new BehaviorSubject<Incident[]>([]);
  incidents$ = this.incidentsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeWebSocket();
  }

  private initializeWebSocket(): void {
    this.websocket = new WebSocket('ws://localhost:5000/ws');
    this.websocket.onmessage = (event) => {
      try {
        // Ersetze einfache Anführungszeichen durch doppelte Anführungszeichen für gültiges JSON
        const correctedData = event.data.replace(/'/g, '"');
        const rawData = JSON.parse(correctedData);

        // Prüfen, ob die Nachricht ein Incident ist (hat type-Feld)
        if (rawData.type) {
          const newIncident = this.createIncidentFromWebSocketData(rawData);

          // Aktualisiere die Daten: Neue Daten zu bestehenden Daten hinzufügen
          const currentIncidents = this.incidentsSubject.value;
          const updatedIncidents = [newIncident, ...currentIncidents];

          // Sortiere nach Zeitstempel (neueste zuerst)
          updatedIncidents.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          this.incidentsSubject.next(updatedIncidents);
          console.log('Neues Incident-Ereignis empfangen:', newIncident);
        }
      } catch (error) {
        console.error('Fehler beim Parsen der WebSocket-Nachricht:', error, event.data);
      }
    };
    this.websocket.onopen = () => {
      console.log('WebSocket-Verbindung für Incidents geöffnet.');
    };
    this.websocket.onerror = (error) => {
      console.error('WebSocket-Fehler:', error);
    };
    this.websocket.onclose = () => {
      console.log('WebSocket-Verbindung geschlossen.');
      // Versuche, die Verbindung nach einem kurzen Timeout wieder herzustellen
      setTimeout(() => this.initializeWebSocket(), 3000);
    };
  }

  // Erstelle ein Incident-Objekt aus WebSocket-Daten
  private createIncidentFromWebSocketData(data: any): Incident {
    const details: IncidentDetails = {
      source: data.source || '',
      status: data.status || '',
      type: data.type || ''
    };

    // Füge optionale Felder hinzu, wenn vorhanden
    if (data.ident) {
      details.ident = data.ident;
    }
    if (data.tmp) {
      details.tmp = data.tmp;
    }
    if (data.lf) {
      details.lf = data.lf;
    }

    // Erstelle das Incident-Objekt
    return {
      id: Date.now(), // Verwende Timestamp als temporäre ID
      timestamp: new Date().toISOString(), // Aktuellen Zeitstempel verwenden
      type: data.type || 'log', // Standard ist 'log' wenn nicht angegeben
      details: details
    };
  }

  // Alle Incidents abrufen und mit WebSocket-Daten kombinieren
  getAllIncidents(): Observable<Incident[]> {
    // HTTP-Anfrage für historische Daten
    this.http.get<IncidentsResponse>(`${this.baseUrl}${this.incidentPath}`)
      .pipe(
        map(response => {
          if (response && Array.isArray(response.incidents)) {
            return response.incidents.map(incident => {
              // Stelle sicher, dass das Timestamp-Format einheitlich ist
              if (incident.timestamp && typeof incident.timestamp === 'string') {
                // Konvertiere das Format wenn nötig (2025-05-06 09:05:33.793833 zu ISO-Format)
                if (!incident.timestamp.includes('T')) {
                  incident.timestamp = incident.timestamp.replace(' ', 'T');
                }
              }
              return incident;
            });
          }
          return [];
        })
      ).subscribe(incidents => {
        // Kombiniere mit aktuellen WebSocket-Daten
        const currentIncidents = this.incidentsSubject.value;

        // Prüfe auf Duplikate anhand der ID und füge nur neue hinzu
        const combinedIncidents = [...incidents];
        const existingIds = new Set(incidents.map(incident => incident.id));

        for (const wsIncident of currentIncidents) {
          if (!existingIds.has(wsIncident.id)) {
            combinedIncidents.push(wsIncident);
          }
        }

        // Sortiere nach Zeitstempel absteigend (neueste zuerst)
        combinedIncidents.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        this.incidentsSubject.next(combinedIncidents);
      });

    // Gib das Observable zurück
    return this.incidents$;
  }

  // Incidents nach Typ filtern (log oder alarm)
  getIncidentsByType(type: string): Observable<Incident[]> {
    return this.incidents$.pipe(
      map(incidents => incidents.filter(incident => incident.type === type))
    );
  }

  // Incidents nach Status filtern (granted, denied, start, end)
  getIncidentsByStatus(status: string): Observable<Incident[]> {
    return this.incidents$.pipe(
      map(incidents => incidents.filter(incident => incident.details.status === status))
    );
  }

  // Incidents nach Quelle filtern (Access, temperature, humidity)
  getIncidentsBySource(source: string): Observable<Incident[]> {
    return this.incidents$.pipe(
      map(incidents => incidents.filter(incident => incident.details.source === source))
    );
  }
}

