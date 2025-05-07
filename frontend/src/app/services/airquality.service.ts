import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, BehaviorSubject } from 'rxjs';
import { Airquality, ApiResponse, AirqualityEntry } from '../models/airquality';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AirqualityService {
  private apiUrl = 'http://localhost:5000';
  private apiSegment = '/data';
  private dataLimit = 30; // Standardwert auf 30 geändert
  private websocket: WebSocket | null = null;

  // Observable für Echtzeitdaten
  private airqualityDataSubject = new BehaviorSubject<Airquality[]>([]);
  airqualityData$ = this.airqualityDataSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.initializeWebSocket();
  }

  private initializeWebSocket(): void {
    this.websocket = new WebSocket('ws://localhost:5000/ws');
    this.websocket.onmessage = (event) => {
      try {
        // Ersetze einfache Anführungszeichen durch doppelte Anführungszeichen
        const correctedData = event.data.replace(/'/g, '"');
        const rawData = JSON.parse(correctedData);
        const newEntry: Airquality = {
          id: Date.now(), // Füge eine eindeutige ID hinzu
          temperature: rawData.tmp,
          humidity: rawData.lf,
          lastUpdate: new Date().toISOString()
        };

        // Aktuelle Daten aktualisieren: Neue Daten zu den geladenen Daten hinzufügen
        const currentData = this.airqualityDataSubject.value;
        const updatedData = [newEntry, ...currentData].slice(0, this.dataLimit); // Begrenze auf das Limit
        this.airqualityDataSubject.next(updatedData);

        console.log('Neue WebSocket-Nachricht empfangen:', newEntry);
      } catch (error) {
        console.error('Fehler beim Parsen der WebSocket-Nachricht:', error, event.data);
      }
    };
    this.websocket.onopen = () => {
      console.log('WebSocket-Verbindung geöffnet.');
    };
    this.websocket.onerror = (error) => {
      console.error('WebSocket-Fehler:', error);
    };
    this.websocket.onclose = () => {
      console.log('WebSocket-Verbindung geschlossen.');
    };
  }

  /**
   * Transformiert die API-Daten in das Airquality-Format
   */
  private transformData(entry: AirqualityEntry): Airquality {
    return {
      id: entry.id || Date.now(), // ID vom Server verwenden oder eine generieren
      temperature: entry.data.tmp,
      humidity: entry.data.lf,
      lastUpdate: entry.timestamp
    };
  }

  /**
   * Holt die aktuellen Luftqualitätsdaten vom Server mit async/await
   */
  async getAirqualityDataAsync(limit: number = this.dataLimit): Promise<Airquality[]> {
    try {
      const url = `${this.apiUrl}${this.apiSegment}?limit=${limit}`;
      const response = await lastValueFrom(this.http.get<ApiResponse>(url));

      // Transformiere die Antwort in das benötigte Format
      const transformedData = response.data.map(entry => this.transformData(entry));

      // Initialisiere die Daten im BehaviorSubject
      this.airqualityDataSubject.next(transformedData);

      return transformedData;
    } catch (error) {
      console.error('Fehler beim Abrufen der Luftqualitätsdaten:', error);
      throw error;
    }
  }

  /**
   * Holt den neuesten Eintrag
   */
  async getLatestEntryAsync(): Promise<Airquality | null> {
    try {
      const data = await this.getAirqualityDataAsync();
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Fehler beim Abrufen des neuesten Eintrags:', error);
      throw error;
    }
  }

  /**
   * Holt historische Luftqualitätsdaten mit angegebenem Limit mit async/await
   */
  async getHistoricalDataAsync(limit: number = this.dataLimit): Promise<Airquality[]> {
    try {
      return this.getAirqualityDataAsync(limit);
    } catch (error) {
      console.error('Fehler beim Abrufen der historischen Daten:', error);
      throw error;
    }
  }

  /**
   * Holt Luftqualitätsdaten basierend auf Parametern
   */
  async getAirqualityDataWithParams(params: { [key: string]: any }): Promise<Airquality[]> {
    try {
      // Aktualisiere das dataLimit, wenn ein Limit in den Parametern angegeben ist
      if (params['limit']) {
        this.setDataLimit(params['limit']);
      }

      const queryParams = new URLSearchParams(params).toString();
      const url = `${this.apiUrl}${this.apiSegment}?${queryParams}`;
      const response = await lastValueFrom(this.http.get<ApiResponse>(url));

      // Transformiere die Antwort in das benötigte Format
      const transformedData = response.data.map(entry => this.transformData(entry));

      // Aktualisiere die Daten im BehaviorSubject
      this.airqualityDataSubject.next(transformedData);

      return transformedData;
    } catch (error) {
      console.error('Fehler beim Abrufen der Luftqualitätsdaten mit Parametern:', error);
      throw error;
    }
  }

  /**
   * Setzt das Standard-Datenlimit für Abfragen
   */
  setDataLimit(limit: number): void {
    this.dataLimit = limit;
  }
}

