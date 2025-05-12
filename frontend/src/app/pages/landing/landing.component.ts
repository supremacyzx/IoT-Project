import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, LogIn, LayoutDashboard, Thermometer, Bell, Lock } from 'lucide-angular';
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
    Lock,
    Bell
  };

  techStack: SlideContentModel[] = [
    {
      image: 'images/angular.svg',
      link: 'https://angular.io/'
    },
    {
      image: 'images/python.svg',
      link: 'https://www.python.org/'
    },
    {
      image: 'images/docker.svg',
      link: 'https://www.docker.com/'
    },
    {
      image: 'images/sqlite.svg',
      link: 'https://sqlite.org/'
    },
    {
      image: 'images/proxmox.svg',
      link: 'https://www.proxmox.com/'
    },
    {
      image: 'images/mqtt.svg',
      link: 'https://mqtt.org/'
    },
    {
      image: 'images/ntfy.svg',
      link: 'https://ntfy.sh/'
    }
  ];

  constructor(private router: Router) {}

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
