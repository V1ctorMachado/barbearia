import { Routes } from '@angular/router';
import { LoginComponent } from './components/login.component';
import { AgendaComponent } from './components/agenda.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'agenda', component: AgendaComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'agenda', pathMatch: 'full' },
  { path: '**', redirectTo: 'agenda' }
];
