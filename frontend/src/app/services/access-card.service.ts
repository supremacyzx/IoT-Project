import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AccessCardService {
  private baseUrl = "http://localhost:5000";

  constructor(private http: HttpClient) { }

  addAccessId(cardId?: string): Observable<any> {
    const payload = cardId ? { cardId } : {};

    // Responsetyp als 'text' definieren, da der Server "OK" als String zurückgibt
    return this.http.post(`${this.baseUrl}/addAccessID`, payload, {
      responseType: 'text'
    });
  }
}
