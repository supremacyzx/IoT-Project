import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import { LucideAngularModule, House, MessageCircle, User, Users, ChartColumn, Cog, Activity } from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  // Kann später um Navigation und aktive Route-Funktionalität erweitert werden
  icons = { House, MessageCircle, Users, User, ChartColumn, Cog, Activity };


}
