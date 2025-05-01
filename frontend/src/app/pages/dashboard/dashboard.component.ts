import { Component } from '@angular/core';
import {SlideshowComponent} from '../../components/slideshow/slideshow.component';
import { SlideContentModel } from '../../../models/slideContent.model';

@Component({
  selector: 'app-dashboard',
  imports: [
    SlideshowComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  techStack: SlideContentModel[] = [
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
      image: 'images/sqlite.svg',
      link: 'https://sqlite.org/'
    }
  ];

  hardwareStack: SlideContentModel[] = [
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
