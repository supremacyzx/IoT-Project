import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, LogIn, LayoutDashboard, Thermometer, Droplets, BarChart3, Bell } from 'lucide-angular';
import {SlideContentModel} from '../../../models/slideContent.model';
import { SlideshowComponent } from '../../components/slideshow/slideshow.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    SlideshowComponent
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  // Lucide Icons
  icons = {
    LogIn,
    LayoutDashboard,
    Thermometer,
    Droplets,
    BarChart3,
    Bell
  };

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

  constructor(private router: Router) {}

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}

