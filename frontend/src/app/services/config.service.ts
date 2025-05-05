import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConfigData {
  command: string;
  msgID: number;
  value: {
    alarm: {
      isLfSilent: boolean;
      isTmpSilent: boolean;
      lfThreshold: number;
      tmpThreshold: number;
    };
    mqtt: {
      broker: string;
      mqttID: string;
      mqttPass: string;
      mqttUser: string;
      port: number;
    };
    pins: {
      buzzerpin: number;
      dht: number;
      ledGreen: number;
      ledRed: number;
      rfidSS: number;
      scl: number;
      sda: number;
    };
    sensors: {
      dhtType: number;
      lcdAddress: number;
      lcdCols: number;
      lcdRows: number;
    };
    wifi: {
      enabled: boolean;
      password: string;
      ssid: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  baseUrl: string = 'http://localhost:5000'; // Set the base URL for the API

  constructor(private http: HttpClient) { }

  getConfig(): Observable<ConfigData> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    return this.http.get<ConfigData>(`${this.baseUrl}/getConfig`, { headers });
  }

  setConfig(config: any): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    return this.http.post(`${this.baseUrl}/setConfig`, config, {
      headers,
      responseType: 'text'
    });
  }

  addAccessId(): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    return this.http.post(`${this.baseUrl}/addAccessID`, {}, {
      headers,
      responseType: 'text'
    });
  }
}
