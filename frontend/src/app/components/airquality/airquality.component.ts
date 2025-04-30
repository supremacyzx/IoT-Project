import {Component, inject, OnInit} from '@angular/core';
import { ApiService, DataResponse } from '../../services/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-airquality',
  imports: [CommonModule],
  templateUrl: './airquality.component.html',
  styleUrl: './airquality.component.scss'
})
export class AirqualityComponent implements OnInit {

  protected apiService = inject(ApiService);

  airQualityData: DataResponse | null = null;

  ngOnInit(): void {
    this.apiService.getData().subscribe({
      next: (data: DataResponse) => {
        this.airQualityData = data;
      },
      error: (err) => {
        console.error('Fehler beim Abrufen der Luftqualitätsdaten:', err);
      }
    });
  }
}
