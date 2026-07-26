import { Routes } from '@angular/router';
import { LoginComponent } from './components/login.component';
import { AgendaComponent } from './components/agenda.component';
import { LoginClienteComponent } from './components/login-cliente.component';
import { CadastroClienteComponent } from './components/cadastro-cliente.component';
import { PortalComponent } from './components/portal.component';
import { staffGuard, clienteGuard } from './services/auth.guard';

export const routes: Routes = [
  // Área do cliente (pública)
  { path: 'login-cliente', component: LoginClienteComponent },
  { path: 'cadastro', component: CadastroClienteComponent },
  { path: 'portal', component: PortalComponent, canActivate: [clienteGuard] },

  // Painel interno (staff)
  { path: 'login', component: LoginComponent },
  { path: 'agenda', component: AgendaComponent, canActivate: [staffGuard] },

  // Raiz leva o cliente para a área pública
  { path: '', redirectTo: 'portal', pathMatch: 'full' },
  { path: '**', redirectTo: 'portal' }
];
