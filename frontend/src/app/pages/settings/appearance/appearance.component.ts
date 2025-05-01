import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Moon, Sun, Monitor, Computer, AppWindow, Apple } from 'lucide-angular';
@Component({
  selector: 'app-appearance',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    FormsModule
  ],
  templateUrl: './appearance.component.html',
  styleUrl: './appearance.component.scss'
})
export class AppearanceComponent implements OnInit {


  icons = {
    Sun,
    Moon,
    Monitor,
    Computer,
    AppWindow,
    Apple
  };


  constructor() {

  }

  ngOnInit(): void {

  }

}
