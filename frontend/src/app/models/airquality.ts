export interface ApiResponse {
  data: AirqualityEntry[];
}

export interface AirqualityEntry {
  data: {
    lf: number;  // Luftfeuchtigkeit
    tmp: number; // Temperatur
    locked: boolean;
  };
  timestamp: string;
  id?: string | number; // Optional für eingehende API-Daten
}

export interface Airquality {
  temperature: number;     // tmp aus der API
  humidity: number;        // lf aus der API
  lastUpdate: string;      // timestamp aus der API
  id?: string | number;    // Eindeutige ID zur Identifizierung neuer Einträge
}
