import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login-cliente.component.html',
  styleUrls: ['./portal-shared.css']
})
export class LoginClienteComponent {
  usuario = '';
  senha = '';
  carregando = signal(false);
  erro = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

  entrar(): void {
    if (!this.usuario || !this.senha) {
      this.erro.set('Informe usuário e senha.');
      return;
    }
    this.carregando.set(true);
    this.erro.set(null);

    this.auth.login(this.usuario, this.senha).subscribe({
      next: (resp) => {
        this.carregando.set(false);
        // Se por engano uma conta de staff logar aqui, manda pro painel
        if (resp.papel === 'Cliente') {
          this.router.navigate(['/portal']);
        } else {
          this.router.navigate(['/agenda']);
        }
      },
      error: (e) => {
        this.carregando.set(false);
        this.erro.set(e?.error?.mensagem ?? 'Não foi possível entrar.');
      }
    });
  }
}
