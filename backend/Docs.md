# Backend-Dokumentation

## Übersicht
Diese Dokumentation beschreibt den Flask-basierten Backend-Server für das MQTT-Daten-Dashboard-System. Der Server verwaltet Authentifizierung mittels JWT, stellt Schnittstellen für Daten- und Vorfallabfragen bereit und implementiert Sicherheitsmaßnahmen wie Ratenbegrenzung für Login-Versuche.

## Inhaltsverzeichnis
1. [Systemarchitektur](#systemarchitektur)
2. [Konfiguration](#konfiguration)
3. [API-Endpunkte](#api-endpunkte)
4. [Sicherheitsmaßnahmen](#sicherheitsmaßnahmen)
5. [Datenbankstruktur](#datenbankstruktur)
6. [Fehlerbehandlung](#fehlerbehandlung)
7. [Installation und Ausführung](#installation-und-ausführung)

## Systemarchitektur
Der Backend-Server ist eine Flask-Anwendung, die als zentraler Datenverwalter zwischen der MQTT-Dateneingabe und dem Frontend dient. Er nutzt SQLite zur Datenspeicherung und JWT für sichere Authentifizierung.

```
┌────────────┐     ┌─────────────┐     ┌───────────┐
│ MQTT-Broker│────▶│ Backend-API │◀───▶│ Frontend  │
└────────────┘     └─────────────┘     └───────────┘
                         │
                         ▼
                   ┌───────────┐
                   │  SQLite   │
                   │ Datenbank │
                   └───────────┘
```

## Konfiguration
Die Anwendung verwendet folgende Umgebungsvariablen:

| Variable | Standardwert | Beschreibung |
|----------|--------------|--------------|
| JWT_SECRET_KEY | grp5-secret-key-boys | Schlüssel für JWT-Token-Signierung |
| PORT | 5000 | Server-Port |
| DATABASE | local.db | Datenbankpfad (aus MQTT-Handler) |

**Wichtig:** In einer Produktionsumgebung sollte JWT_SECRET_KEY durch einen sicheren Schlüssel ersetzt werden.

## API-Endpunkte

### Authentifizierung
#### POST /login
Authentifiziert einen Benutzer und gibt ein JWT-Token zurück.

**Anfrageparameter (JSON):**
```json
{
  "username": "string",
  "password": "string"
}
```

**Erfolgreiche Antwort (200 OK):**
```json
{
  "access_token": "string"
}
```

**Fehlerantworten:**
- 401 Unauthorized: Ungültige Anmeldeinformationen
- 429 Too Many Requests: Zu viele fehlgeschlagene Anmeldeversuche

### Datenanfragen
#### GET /data
Ruft Dashboard-Daten aus der Datenbank ab.

**Anfrageparameter (Query):**
- `start_date` (optional): Filtert Daten ab diesem Datum
- `end_date` (optional): Filtert Daten bis zu diesem Datum
- `limit` (optional, Standard: 100): Maximale Anzahl zurückgegebener Datensätze

**Erfolgreiche Antwort (200 OK):**
```json
{
  "data": [
    {
      "timestamp": "2023-01-01T12:00:00",
      "data": { ... }
    },
    ...
  ]
}
```

**Authentifizierung:** JWT-Bearer-Token erforderlich

#### GET /incidents
Ruft Vorfallsdaten aus der Datenbank ab.

**Anfrageparameter (Query):**
- `start_date` (optional): Filtert Vorfälle ab diesem Datum
- `end_date` (optional): Filtert Vorfälle bis zu diesem Datum
- `limit` (optional, Standard: 100): Maximale Anzahl zurückgegebener Vorfälle

**Erfolgreiche Antwort (200 OK):**
```json
{
  "incidents": [
    {
      "timestamp": "2023-01-01T12:00:00",
      "data": { ... }
    },
    ...
  ]
}
```

**Authentifizierung:** JWT-Bearer-Token erforderlich

#### GET /user/profile
Ruft Benutzerprofilinformationen ab.

**Erfolgreiche Antwort (200 OK):**
```json
{
  "username": "string",
  "message": "Profile fetched successfully"
}
```

**Authentifizierung:** JWT-Bearer-Token erforderlich

#### GET /health
Überprüft den Status des Servers.

**Erfolgreiche Antwort (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T12:00:00"
}
```

## Sicherheitsmaßnahmen

### JWT-Authentifizierung
Alle geschützten Endpunkte erfordern ein gültiges JWT-Token im Authorization-Header:
```
Authorization: Bearer <token>
```

Tokens sind 12 Stunden gültig und enthalten die Benutzeridentität.

### Ratenbegrenzung für Login-Versuche
Um Brute-Force-Angriffe zu verhindern, implementiert der Server eine IP-basierte Ratenbegrenzung:

- Nach 5 fehlgeschlagenen Anmeldeversuchen wird die IP-Adresse für 5 Minuten gesperrt
- Bei jedem fehlgeschlagenen Versuch wird die Anzahl der verbleibenden Versuche mitgeteilt
- Nach einer erfolgreichen Anmeldung wird der Fehlversuchszähler zurückgesetzt

## Datenbankstruktur
Die SQLite-Datenbank enthält folgende Tabellen:

### users
- `id`: INTEGER PRIMARY KEY
- `username`: TEXT UNIQUE NOT NULL
- `password`: TEXT NOT NULL (gehashtes Passwort)

### dashboard_data
- `id`: INTEGER PRIMARY KEY
- `timestamp`: TIMESTAMP NOT NULL
- `value`: TEXT NOT NULL (JSON-Daten)

### incidents
- `id`: INTEGER PRIMARY KEY
- `timestamp`: TIMESTAMP NOT NULL
- `value`: TEXT NOT NULL (JSON-Daten)

## Fehlerbehandlung
Der Server implementiert eine konsistente Fehlerbehandlung mit standardisierten JSON-Antworten:

```json
{
  "message": "Beschreibung des Fehlers",
  "error": "Detaillierte Fehlermeldung (nur bei serverseitigen Fehlern)"
}
```

## Installation und Ausführung

### Voraussetzungen
- Python 3.7+
- Pip (Python-Paketmanager)

### Installation
1. Abhängigkeiten installieren:
```bash
pip install -r requirements.txt
```

2. Umgebungsvariablen konfigurieren (optional):
```bash
export JWT_SECRET_KEY=dein-sicherer-schlüssel
export PORT=5000
```

### Ausführung
Starten Sie den Server mit:
```bash
python app.py
```

Der Server ist dann unter `http://localhost:5000` (oder dem konfigurierten Port) erreichbar.

---

© 2025 Projektgruppe 5. Version 1.0.