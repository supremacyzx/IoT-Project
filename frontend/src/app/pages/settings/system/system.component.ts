import { Component } from '@angular/core';
import { LucideAngularModule, Monitor, Globe, Power, Link } from 'lucide-angular';


@Component({
  selector: 'app-system',
  standalone: true,
  imports: [
    LucideAngularModule,

  ],
  templateUrl: './system.component.html',
  styleUrl: './system.component.scss'
})
export class SystemComponent {
  icons = { Monitor, Globe, Power, Link };

}
