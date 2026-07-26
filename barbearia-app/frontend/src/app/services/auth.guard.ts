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
