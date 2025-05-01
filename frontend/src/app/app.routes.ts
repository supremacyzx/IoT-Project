import { Routes } from '@angular/router';
import { SettingsComponent } from './pages/settings/settings.component';
import { AppearanceComponent } from './pages/settings/appearance/appearance.component';
import { SystemComponent } from './pages/settings/system/system.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SensoryComponent } from './pages/sensory/sensory.component';
import { AirqualityComponent } from './pages/sensory/airquality/airquality.component';
import { AuthComponent } from './pages/auth/auth.component';
import { AuthGuard } from './guards/auth.guard';
import { LoggedInGuard } from './guards/logged-in.guard';


export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    component: AuthComponent,
    canActivate: [LoggedInGuard]
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'sensory',
    component: SensoryComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'airquality',
        pathMatch: 'full'
      },
      {
        path: 'airquality',
        component: AirqualityComponent,

      }
    ]
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'system',
        pathMatch: 'full'
      },
      {
        path: 'appearance',
        component: AppearanceComponent
      },
      {
        path: 'system',
        component: SystemComponent
      }
    ]
  }
];

