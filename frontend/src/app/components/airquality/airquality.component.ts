import { Component } from '@angular/core';
import { airQuality } from '../../../../../shared/models/airquality.model';

@Component({
  selector: 'app-airquality',
  imports: [],
  templateUrl: './airquality.component.html',
  styleUrl: './airquality.component.scss'
})
export class AirqualityComponent {
  airQualityData: airQuality[] = [
    {
      sensorId: '1',
      roomName: 'Office Room 1',
      temperature: 22,
      humidity: 45,
      lastUpdate: new Date()
    }
  ];
}
