import { Component } from '@angular/core';
import {AirqualityComponent} from '../../components/airquality/airquality.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    AirqualityComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

}
