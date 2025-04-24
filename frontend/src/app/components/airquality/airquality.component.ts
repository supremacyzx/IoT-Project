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
    },
    {
      sensorId: '2',
      roomName: 'Office Hallway',
      temperature: 20,
      humidity: 50,
      lastUpdate: new Date()
    },
    {
      sensorId: '3',
      roomName: 'Meeting Room 2',
      temperature: 24,
      humidity: 40,
      lastUpdate: new Date()
    }
  ];
}
