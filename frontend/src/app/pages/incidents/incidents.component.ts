import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Incident } from '../../models/incidents';
import { IncidentsService } from '../../services/incidents.service';
import { LucideAngularModule, Clock, Tag, Database, BarChart, Info, Filter } from 'lucide-angular';
import { finalize, of, Subscription } from 'rxjs';
import { delay } from 'rxjs/operators';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './incidents.component.html',
  styleUrls: ['./incidents.component.scss']
})
export class IncidentsComponent implements OnInit, OnDestroy {
  incidents: Incident[] = [];
  filteredIncidents: Incident[] = [];
  isLoading = false;
  error: string | null = null;
  selectedTypeFilter: 'all' | 'log' | 'alarm' = 'all';
  selectedSourceFilter: 'all' | 'Access' | 'temperature' | 'humidity' = 'all';
  icons = { Clock, Tag, Database, BarChart, Info, Filter };

  private subscription: Subscription | null = null;
  private loadingDelay = 300;
  skeletonArray = Array(10).fill(0); // 10 Elemente für Skeleton-Loading

  constructor(private incidentsService: IncidentsService) {}

  ngOnInit(): void {
    this.loadIncidents();

    // Abonnieren der Echtzeitdaten
    this.subscription = this.incidentsService.incidents$.subscribe(
      (newIncidents) => {
        this.incidents = newIncidents;
        this.applyFilters();  // Stelle sicher, dass Filter angewendet werden, wenn neue Daten ankommen
      },
      (error) => {
        console.error('Fehler beim Abonnieren der Incidents:', error);
        this.error = 'Fehler beim Empfangen der Echtzeitdaten.';
      }
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadIncidents(): void {
    this.isLoading = true;
    this.error = null;

    // Füge einen kurzen Delay ein, um die Skeleton-Animation zu zeigen
    of(null).pipe(
      delay(this.loadingDelay),
      finalize(() => {
        this.incidentsService.getAllIncidents().subscribe(
          (incidents) => {
            this.incidents = incidents;
            this.applyFilters();  // Stelle sicher, dass Filter angewendet werden, wenn Daten geladen werden
            this.isLoading = false;
          },
          (error) => {
            console.error('Fehler beim Laden der Incidents:', error);
            this.error = 'Daten konnten nicht geladen werden.';
            this.isLoading = false;
          }
        );
      })
    ).subscribe();
  }

  filterByType(type: 'all' | 'log' | 'alarm'): void {
    this.selectedTypeFilter = type;
    this.applyFilters(); // Filter direkt anwenden
  }

  filterBySource(source: 'all' | 'Access' | 'temperature' | 'humidity'): void {
    this.selectedSourceFilter = source;
    this.applyFilters(); // Filter direkt anwenden
  }

  applyFilters(): void {
    let result = this.incidents;

    // Filter nach Typ
    if (this.selectedTypeFilter !== 'all') {
      result = result.filter(incident => incident.type === this.selectedTypeFilter);
    }

    // Filter nach Quelle - Wir suchen nach dem source-Feld in details
    if (this.selectedSourceFilter !== 'all') {
      result = result.filter(incident => incident.details.source === this.selectedSourceFilter);
    }

    // Sortiere nach Zeitstempel (neueste zuerst)
    result = [...result].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    this.filteredIncidents = result;
  }

  getSourceLabel(source: string): string {
    switch (source) {
      case 'Access': return 'Zugang';
      case 'temperature': return 'Temperatur';
      case 'humidity': return 'Luftfeuchtigkeit';
      default: return source;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'granted': return 'Gewährt';
      case 'denied': return 'Verweigert';
      case 'start': return 'Beginn';
      case 'end': return 'Ende';
      default: return status;
    }
  }

  formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 1) {
      return 'jetzt gerade';
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
}
