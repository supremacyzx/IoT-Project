import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService, ConfigData } from '../../../../app/services/config.service';
import { LucideAngularModule, Settings, Bell, Wifi, Server, Cpu, Gauge, Save, CheckCircle, AlertCircle } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './config.component.html',
  styleUrl: './config.component.scss'
})
export class ConfigComponent implements OnInit, OnDestroy {
  config: ConfigData | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  private configSubscription: Subscription | null = null;

  // Icons für die verschiedenen Bereiche
  icons = {
    Settings,
    Bell,
    Wifi,
    Server,
    Cpu,
    Gauge,
    Save,
    CheckCircle,
    AlertCircle
  };

  // Temporäre Variablen für Passwörter mit Sternchen
  wifiPassword = '';
  mqttPassword = '';
  showWifiPassword = false;
  showMqttPassword = false;

  constructor(private configService: ConfigService) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  ngOnDestroy(): void {
    // Subscription bereinigen, wenn die Komponente zerstört wird
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
    }
  }

  loadConfig(): void {
    console.log('loadConfig() aufgerufen - nur Daten abrufen');

    // Wenn bereits eine Abfrage läuft, diese abbrechen
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
      this.configSubscription = null;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // take(1) stellt sicher, dass die Observable nur einmal ausgelöst wird
    this.configSubscription = this.configService.getConfig()
      .pipe(take(1))
      .subscribe({
        next: (data) => {
          this.config = data;
          this.wifiPassword = data.value.wifi.password;
          this.mqttPassword = data.value.mqtt.mqttPass;
          this.isLoading = false;
          this.configSubscription = null; // Subscription zurücksetzen
        },
        error: (error) => {
          this.errorMessage = 'Fehler beim Laden der Konfiguration: ' + (error.message || 'Unbekannter Fehler');
          this.isLoading = false;
          this.configSubscription = null; // Subscription zurücksetzen
          console.error('Error loading config:', error);
        }
      });
  }

  saveConfig(): void {
    console.log('saveConfig() aufgerufen - Konfiguration wird gesendet');
    if (!this.config) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Aktualisiere die Passwörter vor dem Speichern
    this.config.value.wifi.password = this.wifiPassword;
    this.config.value.mqtt.mqttPass = this.mqttPassword;

    this.configService.setConfig(this.config.value)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.successMessage = 'Konfiguration erfolgreich gespeichert';
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = 'Fehler beim Speichern der Konfiguration: ' + (error.message || 'Unbekannter Fehler');
          this.isLoading = false;
          console.error('Error saving config:', error);
        }
      });
  }

  toggleWifiPassword(): void {
    this.showWifiPassword = !this.showWifiPassword;
  }

  toggleMqttPassword(): void {
    this.showMqttPassword = !this.showMqttPassword;
  }
}

