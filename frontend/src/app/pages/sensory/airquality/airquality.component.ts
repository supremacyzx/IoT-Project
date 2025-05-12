import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Airquality } from '../../../models/airquality';
import { AirqualityService } from '../../../services/airquality.service';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Thermometer, Droplets, Clock, Table2, BarChart3 } from 'lucide-angular';
import { finalize, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-airquality',
  templateUrl: './airquality.component.html',
  imports: [
    NgIf,
    NgFor,
    FormsModule,
    LucideAngularModule
  ],
  styleUrls: ['./airquality.component.scss']
})
export class AirqualityComponent implements OnInit, AfterViewInit, OnDestroy {
  airqualityData: Airquality[] = [];
  latestEntry: Airquality | null = null;
  isLoading = false;
  error: string | null = null;
  viewMode: 'table' | 'graph' = 'table';
  icons = { Thermometer, Droplets, Clock, Table2, BarChart3 };

  filters = {
    limit: 30,
    startDate: '',
    endDate: ''
  };

  private loadingDelay = 300;
  skeletonArray = Array(30).fill(0); // Beibehalten für Table-Skeleton-Loading
  private chart: Chart | null = null;
  private lastProcessedDataId: string | number | null = null;

  constructor(private airqualityService: AirqualityService) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    // Setze das Limit im Service
    this.airqualityService.setDataLimit(this.filters.limit);
    this.loadFilteredData();

    // Abonniere Echtzeitdaten
    this.airqualityService.airqualityData$.subscribe((data) => {
      // Filtere nur gültige Temperatur/Luftfeuchtigkeitsdaten
      const validData = data.filter(entry => this.isValidTemperatureData(entry));

      if (validData.length > 0) {
        this.airqualityData = validData;
        const newestEntry = validData[0];

        // Prüfe, ob neue Daten vorhanden sind
        const isNewData = this.lastProcessedDataId === null ||
                         (newestEntry.id !== undefined && newestEntry.id !== this.lastProcessedDataId);

        if (this.viewMode === 'graph') {
          // Wenn der Chart existiert
          if (this.chart) {
            // Füge neue Daten hinzu oder aktualisiere den Chart wenn nötig
            this.updateChartWithNewData(newestEntry);
            // Speichere ID für Referenz
            this.lastProcessedDataId = newestEntry.id ?? null;
          } else {
            // Chart initialisieren, falls noch nicht vorhanden
            setTimeout(() => this.renderChart(), 0);
            if (newestEntry.id !== undefined) {
              this.lastProcessedDataId = newestEntry.id;
            }
          }
        }

        if (newestEntry) {
          this.latestEntry = newestEntry;
        }
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.viewMode === 'graph') {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  async loadAirqualityData(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      await new Promise(resolve => {
        of(null).pipe(
          delay(this.loadingDelay),
          finalize(() => resolve(null))
        ).subscribe();
      });

      this.airqualityData = await this.airqualityService.getAirqualityDataAsync(this.filters.limit);

      if (this.airqualityData.length > 0) {
        this.latestEntry = this.airqualityData[0];
      }
    } catch (error) {
      console.error('Fehler beim Laden der Luftqualitätsdaten', error);
      if (error instanceof Error) {
        this.error = `Daten konnten nicht geladen werden: ${error.message}`;
      } else {
        this.error = 'Daten konnten nicht geladen werden: Unbekannter Fehler';
      }
    } finally {
      this.isLoading = false;
    }
  }

  async loadFilteredData(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      // Delay hinzufügen nur für die Tabellenansicht, nicht für den Graph
      if (this.viewMode === 'table') {
        await new Promise(resolve => {
          of(null).pipe(
            delay(this.loadingDelay),
            finalize(() => resolve(null))
          ).subscribe();
        });
      }

      this.airqualityData = await this.airqualityService.getAirqualityDataWithParams(this.filters);

      if (this.airqualityData.length > 0) {
        this.latestEntry = this.airqualityData[0];
      }
    } catch (error) {
      console.error('Fehler beim Laden der gefilterten Luftqualitätsdaten', error);
      if (error instanceof Error) {
        this.error = `Daten konnten nicht geladen werden: ${error.message}`;
      } else {
        this.error = 'Daten konnten nicht geladen werden: Unbekannter Fehler';
      }
    } finally {
      this.isLoading = false;
    }
  }

  setView(view: 'table' | 'graph'): void {
    this.viewMode = view;
    if (view === 'graph' && this.airqualityData.length > 0) {
      // Bei Wechsel zur Graphenansicht vollständig neu rendern
      setTimeout(() => {
        this.lastProcessedDataId = null; // Reset für konsistenten Zustand
        this.renderChart();
        // Speichere die aktuelle ID des neuesten Eintrags
        if (this.airqualityData.length > 0 && this.airqualityData[0].id !== undefined) {
          this.lastProcessedDataId = this.airqualityData[0].id;
        } else {
          this.lastProcessedDataId = null;
        }
      }, 0);
    }
  }

  setLimit(limit: number): void {
    const oldLimit = this.filters.limit;
    this.filters.limit = limit;
    this.airqualityService.setDataLimit(limit);

    this.loadFilteredData().then(() => {
      if (this.viewMode === 'graph' && this.airqualityData.length > 0) {
        // Bei Änderung des Limits vollständig neu rendern
        setTimeout(() => {
          this.lastProcessedDataId = null; // Reset für konsistenten Zustand
          this.renderChart();
          // Speichere die aktuelle ID des neuesten Eintrags
          if (this.airqualityData.length > 0 && this.airqualityData[0].id !== undefined) {
            this.lastProcessedDataId = this.airqualityData[0].id;
          } else {
            this.lastProcessedDataId = null;
          }
        }, 0);
      }
    });
  }

  private renderChart(): void {
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = document.getElementById('airqualityChart') as HTMLCanvasElement;
    if (!ctx) {
      console.error('Canvas-Element nicht gefunden');
      return;
    }

    // Ermittle die tatsächliche Anzahl anzuzeigender Datensätze
    // Bei limit=1 sollen 2 angezeigt werden, ansonsten die ausgewählte Anzahl
    const displayLimit = this.filters.limit === 1 ? 2 : this.filters.limit;

    // Beschränke die Daten auf die berechnete Anzahl
    const limitedData = this.airqualityData.slice(0, displayLimit);

    // Sortiere die Daten chronologisch (älteste zuerst, neueste zuletzt),
    // damit sie von links nach rechts angezeigt werden
    const sortedData = [...limitedData].sort((a, b) => {
      return new Date(a.lastUpdate).getTime() - new Date(b.lastUpdate).getTime();
    });

    const labels = sortedData.map(entry => new Date(entry.lastUpdate).toLocaleString());
    const temperatureData = sortedData.map(entry => entry.temperature);
    const humidityData = sortedData.map(entry => entry.humidity);

    // Farben aus CSS-Variablen für konsistentes Styling
    const getComputedStyle = window.getComputedStyle(document.documentElement);
    const primaryColor = getComputedStyle.getPropertyValue('--color-primary').trim() || '#3b82f6';
    const textColor = getComputedStyle.getPropertyValue('--color-text').trim() || '#e0e0e0';
    const mutedColor = getComputedStyle.getPropertyValue('--color-text-muted').trim() || '#b0b0b0';
    const bgColor = getComputedStyle.getPropertyValue('--color-background').trim() || '#1a1a1a';
    const borderColor = getComputedStyle.getPropertyValue('--color-border').trim() || '#555555';

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Temperatur (°C)',
            data: temperatureData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: 'rgba(255, 99, 132, 1)',
            pointHoverBorderWidth: 2,
          },
          {
            label: 'Luftfeuchtigkeit (%)',
            data: humidityData,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animations: {
          tension: {
            duration: 1000,
            easing: 'easeOutQuad',
            from: 0.5,
            to: 0.4,
          }
        },
        interaction: {
          mode: 'nearest',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'center',
            maxHeight: 80,
            reverse: false,
            fullSize: true,
            rtl: false,
            labels: {
              color: textColor,
              font: {
                size: 14,
                weight: 'bold',
                family: 'Inter, sans-serif',
              },
              padding: 20,
              boxWidth: 30,
              boxHeight: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              pointStyleWidth: 8,
              textAlign: 'left',

              useBorderRadius: true,
              borderRadius: 4
            },
          },
          tooltip: {
            backgroundColor: bgColor,
            titleColor: primaryColor,
            bodyColor: textColor,
            borderColor: borderColor,
            borderWidth: 1,
            cornerRadius: 6,
            usePointStyle: true,
            padding: 12,
            boxPadding: 5,
            titleFont: {
              weight: 'bold',
              size: 14,
            },
            bodyFont: {
              size: 13,
            },
            displayColors: true,
            callbacks: {
              title: (tooltipItems) => {
                const date = new Date(tooltipItems[0].label);
                return date.toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'transparent',
            },
            ticks: {
              color: mutedColor,
              maxRotation: 30,
              minRotation: 30,
              padding: 10,
            },
            display: false
          },
          y: {
            grid: {
              color: borderColor,
              lineWidth: 0.5,

            },
            ticks: {
              color: mutedColor,
              padding: 15,
              font: {
                size: 12,
              }
            },
            beginAtZero: true,
          },
        },
      },
    });
  }

  private updateChartWithNewData(newEntry: Airquality): void {
    if (!this.chart || !this.chart.data.datasets) return;

    // Neues Label für die X-Achse
    const newLabel = new Date(newEntry.lastUpdate).toLocaleString();

    // Füge neue Daten hinzu
    this.chart.data.labels?.push(newLabel);
    this.chart.data.datasets[0].data.push(newEntry.temperature);
    this.chart.data.datasets[1].data.push(newEntry.humidity);

    // Beschränke die Anzahl der angezeigten Datenpunkte auf das festgelegte Limit
    const displayLimit = this.filters.limit === 1 ? 2 : this.filters.limit;

    if (this.chart.data.labels && this.chart.data.labels.length > displayLimit) {
      // Entferne älteste Daten
      this.chart.data.labels = this.chart.data.labels.slice(-displayLimit);
      this.chart.data.datasets.forEach(dataset => {
        dataset.data = dataset.data.slice(-displayLimit);
      });
    }

    // Aktualisiere den Chart mit Animation
    this.chart.update();
  }

  formatTimeAgo(dateStr: string | Date): string {
    const date = dateStr instanceof Date ? dateStr : new Date(dateStr);

    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 1) {
      return 'jetzt gerade'; // Deutsch: "just now"
    }

    if (diffInSeconds < 60) {
      return `vor ${diffInSeconds} Sekunden`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `vor ${diffInMinutes} Minuten`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `vor ${diffInHours} Stunden`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `vor ${diffInDays} Tagen`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `vor ${diffInWeeks} Wochen`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `vor ${diffInMonths} Monaten`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `vor ${diffInYears} Jahren`;
  }

  // Methode zum Formatieren von Zahlen auf eine Dezimalstelle
  formatToOneDecimal(value: number): string {
    return value.toFixed(1);
  }

  // Neue Hilfsfunktion zur Überprüfung gültiger Temperaturdaten
  private isValidTemperatureData(data: any): boolean {
    // Prüfe zuerst, ob es sich um ein gültiges Airquality-Objekt handelt
    if (!data) return false;

    // Prüfe, ob es sich um einen Alarm- oder Log-Eintrag handelt (diese ignorieren)
    if (data.type === 'alarm' || data.type === 'log') return false;

    // Prüfe, ob Temperatur- und Luftfeuchtigkeitswerte vorhanden sind
    // Sie können entweder als tmp/lf oder als temperature/humidity vorliegen
    const hasTemperature = (data.tmp !== undefined || data.temperature !== undefined);
    const hasHumidity = (data.lf !== undefined || data.humidity !== undefined);

    return hasTemperature && hasHumidity;
  }
}
