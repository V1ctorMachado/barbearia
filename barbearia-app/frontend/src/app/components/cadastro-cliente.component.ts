import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-cadastro-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cadastro-cliente.component.html',
  styleUrls: ['./portal-shared.css']
})
export class CadastroClienteComponent {
  form = { nome: '', telefone: '', email: '', usuario: '', senha: '', confirmar: '' };
  carregando = signal(false);
  erro = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

  cadastrar(): void {
    const f = this.form;
    if (!f.nome || !f.telefone || !f.usuario || !f.senha) {
      this.erro.set('Preencha nome, telefone, usuário e senha.');
      return;
    }
    if (f.senha.length < 6) {
      this.erro.set('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (f.senha !== f.confirmar) {
      this.erro.set('As senhas não conferem.');
      return;
    }

    this.carregando.set(true);
    this.erro.set(null);

    this.auth.registrarCliente({
      nome: f.nome,
      telefone: f.telefone,
      email: f.email || undefined,
      usuario: f.usuario,
      senha: f.senha
    }).subscribe({
      next: () => {
        this.carregando.set(false);
        this.router.navigate(['/portal']); // já loga e entra na área do cliente
      },
      error: (e) => {
        this.carregando.set(false);
        this.erro.set(e?.error?.mensagem ?? 'Não foi possível criar a conta.');
      }
    });
  }
}
