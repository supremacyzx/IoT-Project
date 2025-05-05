import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  baseUrl: string = 'http://localhost:5000'; // Set the base URL for the API
  constructor() { }
}
