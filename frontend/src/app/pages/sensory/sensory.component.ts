import { Component } from '@angular/core';
import {LucideAngularModule} from 'lucide-angular';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-sensory',
  imports: [
    LucideAngularModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  templateUrl: './sensory.component.html',
  styleUrl: './sensory.component.scss'
})
export class SensoryComponent {

}
