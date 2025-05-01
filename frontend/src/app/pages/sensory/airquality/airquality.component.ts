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
  skeletonArray = Array(30).fill(0);
  private chart: Chart | null = null;

  constructor(private airqualityService: AirqualityService) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadAirqualityData();
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

      this.airqualityData = await this.airqualityService.getAirqualityDataAsync();

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
      await new Promise(resolve => {
        of(null).pipe(
          delay(this.loadingDelay),
          finalize(() => resolve(null))
        ).subscribe();
      });

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
      setTimeout(() => this.renderChart(), 0); // Sicherstellen, dass das Canvas-Element verfügbar ist
    }
  }

  setLimit(limit: number): void {
    this.filters.limit = limit;
    this.loadFilteredData().then(() => {
      if (this.viewMode === 'graph' && this.airqualityData.length > 0) {
        setTimeout(() => this.renderChart(), 0); // Chart mit neuen Daten neu rendern
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

    const labels = this.airqualityData.map(entry => new Date(entry.lastUpdate).toLocaleString());
    const temperatureData = this.airqualityData.map(entry => entry.temperature);
    const humidityData = this.airqualityData.map(entry => entry.humidity);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Temperatur (°C)',
            data: temperatureData,
            borderColor: 'rgba(255, 99, 132, 1)', // Moderne Farbe: Rot
            backgroundColor: 'rgba(255, 99, 132, 0.2)', // Transparenter Hintergrund
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
            borderColor: 'rgba(54, 162, 235, 1)', // Moderne Farbe: Blau
            backgroundColor: 'rgba(54, 162, 235, 0.2)', // Transparenter Hintergrund
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
            labels: {
              color: 'white', // Farbe der Legendentexte
              font: {
                size: 14
              },
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: '#1a1a1a',
            titleColor: 'var(--color-primary)', // Farbe des Tooltip-Titels
            bodyColor: 'grey', // Farbe des Tooltip-Textes
            borderColor: '#555555',
            borderWidth: 1,

            usePointStyle: true,
          }
        },
        scales: {
          x: {
            grid: {
              color: 'transparent',
            },
            ticks: {
              color: '#b0b0b0', // Farbe der X-Achsenticks
              maxRotation: 30,
              minRotation: 30,
              padding: 10,
            },
          },
          y: {
            grid: {
              color: '#242424',
            },
            ticks: {
              color: '#b0b0b0', // Farbe der Y-Achsenticks
              padding: 15,
            },
            beginAtZero: true,
          },
        },
      },
    });
  }

  formatTimeAgo(dateStr: string | Date): string {
    const date = dateStr instanceof Date ? dateStr : new Date(dateStr);

    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

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
}

