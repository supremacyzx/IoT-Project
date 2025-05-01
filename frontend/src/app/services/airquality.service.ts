import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Airquality, ApiResponse, AirqualityEntry } from '../models/airquality';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AirqualityService {
  private apiUrl = 'http://localhost:5000';
  private apiSegment = '/data';
  private dataLimit = 30;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /**
   * Transformiert die API-Daten in das Airquality-Format
   */
  private transformData(entry: AirqualityEntry): Airquality {
    return {
      temperature: entry.data.tmp,
      humidity: entry.data.lf,
      lastUpdate: entry.timestamp
    };
  }

  /**
   * Holt die aktuellen Luftqualitätsdaten vom Server mit async/await
   */
  async getAirqualityDataAsync(): Promise<Airquality[]> {
    try {
      const url = `${this.apiUrl}${this.apiSegment}?limit=${this.dataLimit}`;
      const response = await lastValueFrom(this.http.get<ApiResponse>(url));

      // Transformiere die Antwort in das benötigte Format
      return response.data.map(entry => this.transformData(entry));
    } catch (error) {
      console.error('Fehler beim Abrufen der Luftqualitätsdaten:', error);
      throw error; // Re-throw für besseres Error-Handling in der aufrufenden Komponente
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
      const url = `${this.apiUrl}${this.apiSegment}?limit=${limit}`;
      const response = await lastValueFrom(this.http.get<ApiResponse>(url));

      // Transformiere die Antwort in das benötigte Format
      return response.data.map(entry => this.transformData(entry));
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
      const queryParams = new URLSearchParams(params).toString();
      const url = `${this.apiUrl}${this.apiSegment}?${queryParams}`;
      const response = await lastValueFrom(this.http.get<ApiResponse>(url));

      // Transformiere die Antwort in das benötigte Format
      return response.data.map(entry => this.transformData(entry));
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

