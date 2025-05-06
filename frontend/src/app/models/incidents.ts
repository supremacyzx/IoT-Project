export interface IncidentDetails {
    ident?: string;
    source: string;
    status: string;
    type: string;
    tmp?: string;  // Bei Temperatur-Alarmen
    lf?: string;   // Bei Feuchtigkeits-Alarmen
}

export interface Incident {
    id: number;
    timestamp: string;
    type: string;  // "log" oder "alarm"
    details: IncidentDetails;
}

export interface IncidentsResponse {
    incidents: Incident[];
}
