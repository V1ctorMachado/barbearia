import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
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
      next: () => {
        this.carregando.set(false);
        this.router.navigate(['/agenda']);
      },
      error: (e) => {
        this.carregando.set(false);
        this.erro.set(e?.error?.mensagem ?? 'Não foi possível entrar. Verifique se a API está no ar.');
      }
    });
  }
}
