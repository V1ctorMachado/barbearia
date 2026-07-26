import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Bloqueia o acesso a rotas protegidas se o usuário não estiver logado.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estaLogado()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

// Só staff (atendente/admin) acessa o painel interno.
// Cliente logado é redirecionado para a área dele.
export const staffGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaLogado()) {
    router.navigate(['/login']);
    return false;
  }
  if (auth.ehStaff()) {
    return true;
  }
  router.navigate(['/portal']);
  return false;
};

// Só cliente acessa a área pública logada.
// Staff logado é redirecionado para o painel.
export const clienteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaLogado()) {
    router.navigate(['/login-cliente']);
    return false;
  }
  if (auth.ehCliente()) {
    return true;
  }
  router.navigate(['/agenda']);
  return false;
};
