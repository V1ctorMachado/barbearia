import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Interceptor funcional (Angular 15+): roda em toda requisição HTTP.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  // Anexa o cabeçalho Authorization quando há token válido.
  // Não mexe nas chamadas de login (que não têm token ainda).
  const requisicao = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(requisicao).pipe(
    catchError((erro: HttpErrorResponse) => {
      // 401 = token inválido/expirado → desloga e manda pro login
      if (erro.status === 401 && !req.url.includes('/auth/login')) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => erro);
    })
  );
};
