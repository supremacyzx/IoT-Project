# Smarte Gebäudeüberwachung mit Arduino

## Übersicht

Diese Dokumentation beschreibt eine Arduino-basierte Lösung zur smarten Gebäudeüberwachung. Das System umfasst Temperatur- und Feuchtigkeitsmessung, RFID-Zugangskontrolle und MQTT-basierte Datenübertragung zur Fernüberwachung und -steuerung.

**Aktuelle Version:** 1.1.0  
**Autor:** DD

## Funktionen

- **Temperatur- und Feuchtigkeitsmessung** mit DHT-Sensor
- **RFID-Zugangskontrolle** mit MFRC522-Lesegerät
- **LCD-Display** zur Anzeige von Sensordaten und Statusmeldungen
- **Netzwerkverbindung** über WLAN
- **MQTT-Integration** für IoT-Anbindung
- **Konfigurationsmanagement** mit Datenspeicherung in LittleFS
- **LED-Statusanzeige** für Systemstatus (rot/grün)

## Hardware-Anforderungen

- ESP32-basiertes Board
- DHT11/DHT22 Temperatur- und Feuchtigkeitssensor
- MFRC522 RFID-Lesegerät
- I²C LCD-Display (Standard: 16x2)
- Zwei LEDs (rot und grün)
- Stromversorgung

## Software-Abhängigkeiten

Die folgenden Bibliotheken werden benötigt:

- ArduinoMqttClient
- WiFi
- DHT
- MFRC522v2 (inkl. Treiber-Komponenten)
- Wire
- LiquidCrystal_I2C
- LittleFS
- ArduinoJson

## Detaillierte Funktionsweise

### Dateisystem und Konfigurationsmanagement

Das System nutzt LittleFS, ein leichtgewichtiges Dateisystem für Mikrocontroller, um Konfigurationsdaten persistent zu speichern. Bei der Initialisierung des Systems werden zwei zentrale JSON-Dateien verwaltet:

1. **config.json**: Enthält alle systemrelevanten Einstellungen wie WLAN-Zugangsdaten, MQTT-Broker-Informationen, Pin-Konfigurationen und Sensoreinstellungen.

2. **access_ids.json**: Speichert die Liste autorisierter RFID-Karten-IDs für die Zugangskontrolle.

Der Konfigurationsmanagement-Prozess umfasst folgende Schritte:

1. **Initialisierung des Dateisystems**: 
   ```cpp
   initFS()
   ```
   Diese Funktion mountet das LittleFS und formatiert es bei Bedarf.

2. **Laden der Konfiguration**: 
   ```cpp
   loadConfig()
   ```
   Liest die Konfigurationsdatei aus dem Dateisystem und deserialisiert die JSON-Daten in die `config`-Struktur.

3. **Laden der Zugangs-IDs**: 
   ```cpp
   loadAccessIds()
   ```
   Liest die autorisierten RFID-Kartennummern und speichert sie im Arbeitsspeicher für schnellen Zugriff.

Sollten die Konfigurationsdateien fehlen oder korrumpiert sein, werden Standardwerte angewendet und neue Konfigurationsdateien erstellt.

### Initialisierung der Hardware-Komponenten

Die Funktion `initComponents()` übernimmt die Initialisierung aller Hardware-Komponenten basierend auf den geladenen Konfigurationsdaten:

1. **DHT-Sensor**: Wird mit dem konfigurierten Pin und Sensortyp initialisiert.

2. **RFID-Lesegerät**: Das MFRC522-Modul wird über SPI angesteuert, wobei die SS-Pin-Konfiguration aus den Einstellungen übernommen wird.

3. **LCD-Display**: Das I²C-Display wird mit der konfigurierten Adresse sowie Spalten- und Zeilenanzahl initialisiert.

4. **Status-LEDs**: Die Ausgangspins für die rote und grüne LED werden konfiguriert.

### Netzwerkverbindung

Der Netzwerkverbindungsprozess erfolgt in zwei Schritten:

1. **WLAN-Verbindung**: 
   ```cpp
   connectToWifi(config.ssid, config.password)
   ```
   Diese Funktion stellt eine Verbindung zum konfigurierten WLAN-Netzwerk her. Bei fehlgeschlagener Verbindung werden automatisch neue Verbindungsversuche unternommen, bis eine Verbindung hergestellt oder ein Timeout erreicht ist.

2. **MQTT-Verbindung**: 
   ```cpp
   connectToMQTT(config.broker, config.port)
   ```
   Nach erfolgreicher WLAN-Verbindung wird eine Verbindung zum MQTT-Broker aufgebaut. Diese ermöglicht die Übertragung der Sensordaten an ein übergeordnetes System.

### Sensordatenerfassung

Die Funktion `readDHTSensor()` ist für die Erfassung der Umgebungsdaten verantwortlich:

```cpp
SensorData readDHTSensor() {
  SensorData data;
  data.humidity = dht->readHumidity();
  data.temperature = dht->readTemperature();  
  // Fehlerbehandlung...
  return data;
}
```

Die erfassten Daten werden in einer `SensorData`-Struktur zurückgegeben, die sowohl Temperatur als auch Luftfeuchtigkeit enthält. Bei Auslesefehlern werden NaN-Werte zurückgegeben.

### RFID-Zugangskontrolle

Die RFID-Zugangskontrolle arbeitet in mehreren Schritten:

1. **Erkennung einer Karte**:
   ```cpp
   mfrc522->PICC_IsNewCardPresent()
   ```
   Prüft, ob eine neue Karte in den Lesebereich gebracht wurde.

2. **Auslesen der Karten-ID**:
   ```cpp
   readCard()
   ```
   Liest die hexadezimale ID der Karte aus und konvertiert sie in einen String.

3. **Zugangsprüfung**:
   ```cpp
   checkAccess(cardID)
   ```
   Vergleicht die ausgelesene ID mit der Liste autorisierter IDs und gibt entsprechend ein Zugangsergebnis zurück.

4. **Statussänderung**:
   Bei erfolgreichem Zugang wird der Sicherheitsstatus umgeschaltet (`armed = !armed`).

### MQTT-Datenübertragung

Die Sensordaten und der Systemstatus werden regelmäßig über MQTT publiziert:

```cpp
publishMessage("RZ/data", 
  "{\"tmp\":" + String(sensorData.temperature) + 
  ", \"lf\":" + String(sensorData.humidity) + 
  ", \"locked\":" + String(armed) + "}");
```

Die Daten werden im JSON-Format übertragen, was eine einfache Integration in andere Systeme ermöglicht. Das verwendete Topic "RZ/data" kann als Sammelpunkt für alle relevanten Sensordaten betrachtet werden.

### Hauptablauf

Der Hauptablauf im `loop()`-Teil des Programms folgt diesem Muster:

1. Sensordaten auslesen und auf dem LCD-Display anzeigen
2. Status-LEDs entsprechend dem aktuellen Sicherheitsstatus aktualisieren
3. Sensordaten und Status via MQTT übertragen (falls WLAN verbunden)
4. Prüfen, ob eine RFID-Karte präsentiert wurde
5. Bei erkannter Karte:
   - Karten-ID auslesen
   - Zugriffsberechtigung prüfen
   - Bei erfolgreicher Authentifizierung den Sicherheitsstatus umschalten

Dieser Ablauf wird kontinuierlich wiederholt, wobei zwischen den Durchläufen eine kurze Verzögerung von 1 Sekunde eingebaut ist.

## Datenflussdiagramm

```
                        +---------------+
                        | DHT-Sensor    |
                        | (Temp & Hum)  |
                        +-------+-------+
                                |
                                v
+---------------+      +--------+--------+      +---------------+
| RFID-Leser    +----->|                |      | LCD-Display    |
| (Karten-ID)   |      |    ESP32       +----->| (Sensordaten & |
+---------------+      | Controller     |      |  Status)       |
                       |                |      +---------------+
                       +--------+-------+
                                |                 +---------------+
                                |                 | Status-LEDs   |
                                +---------------->| (rot/grün)    |
                                |                 +---------------+
                                |
                                v
                       +--------+-------+
                       |    WLAN       |
                       | (Netzwerk)    |
                       +--------+-------+
                                |
                                v
                       +--------+-------+
                       | MQTT-Broker    |
                       | (Datenempfang) |
                       +----------------+
```

## Datenaustauschformate

### MQTT-Nachrichten

Die Sensordaten und der Systemstatus werden in folgendem JSON-Format übertragen:

```json
{
  "tmp": 23.5,    // Temperatur in °C
  "lf": 45.2,     // Luftfeuchtigkeit in %
  "locked": true  // Sicherheitsstatus (true = aktiviert, false = deaktiviert)
}
```

Diese Daten werden zum Topic "RZ/data" publiziert.

### Konfigurationsdateien

#### config.json
Die Konfigurationsdatei enthält vier Hauptbereiche:
- **wifi**: WLAN-Zugangsdaten und Aktivierungsstatus
- **mqtt**: Broker-Adresse und Port
- **pins**: Pin-Zuweisungen für alle Hardware-Komponenten
- **sensors**: Spezifische Sensoreinstellungen

#### access_ids.json
Enthält ein JSON-Array mit allen autorisierten RFID-Karten-IDs.

## Fehlerbehandlung und Robustheit

Das System implementiert mehrere Mechanismen zur Fehlerbehandlung:

1. **Fehlerhafte Sensordaten**: Bei nicht lesbaren DHT-Sensor-Werten werden NaN-Werte zurückgegeben und entsprechend behandelt.

2. **Fehlende Konfigurationsdateien**: Bei fehlenden oder beschädigten Konfigurationsdateien werden Standardwerte verwendet.

3. **WLAN-Verbindungsprobleme**: Das System versucht wiederholt, eine WLAN-Verbindung herzustellen, falls diese unterbrochen wird.

4. **MQTT-Verbindungsprobleme**: Es werden mehrere Verbindungsversuche zum MQTT-Broker unternommen, bevor aufgegeben wird.

## Technische Details

### Speichermanagement

Da ESP32-Boards begrenzten Speicher haben, verwendet das System dynamische Speicherzuweisung für variable Datenstrukturen wie die Liste der Zugangs-IDs. Speicherbereinigung erfolgt vor jeder Neuzuweisung, um Speicherlecks zu vermeiden.

### Energiemanagement

Das System implementiert keine speziellen Energiesparmaßnahmen und bleibt kontinuierlich aktiv. Die Verzögerung von einer Sekunde zwischen den Schleifen-Iterationen dient zur Reduzierung der CPU-Last & der MQTT Übertragungen.