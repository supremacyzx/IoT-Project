import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlideshowComponent } from '../../components/slideshow/slideshow.component';
import { SlidecontentModel } from '../../../models/slidecontent.model';
import {AirqualityComponent} from '../../components/airquality/airquality.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SlideshowComponent,
    AirqualityComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  techStack: SlidecontentModel[] = [
    {
      image: 'images/angular.svg',
      link: 'https://angular.io/'
    },
    {
      image: 'images/flask.svg',
      link: 'https://flask.palletsprojects.com/'
    },
    {
      image: 'images/go.svg',
      link: 'https://golang.org/'
    },
    {
      image: 'images/docker.svg',
      link: 'https://www.docker.com/'
    },
    {
      image: 'images/redis.svg',
      link: 'https://redis.io/'
    }
  ];

  hardwareStack: SlidecontentModel[] = [
    {
      image: 'images/proxmox.svg',
      link: 'https://www.proxmox.com/'
    },
    {
      image: 'images/hetzner.svg',
      link: 'https://www.hetzner.com/'
    },
    {
      image: 'images/cloudflare.svg',
      link: 'https://www.cloudflare.com/'
    },
    {
      image: 'images/mqtt.svg',
      link: 'https://mqtt.org/'
    },
    {
      image: 'images/zigbee.svg',
      link: 'https://zigbeealliance.org/'
    }
  ];
}
