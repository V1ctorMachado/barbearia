import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { Barbeiro, Servico, Cliente, Agendamento, StatusAgendamento } from '../models';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit {
  barbeiros = signal<Barbeiro[]>([]);
  servicos = signal<Servico[]>([]);
  clientes = signal<Cliente[]>([]);
  agendamentos = signal<Agendamento[]>([]);

  dataSelecionada = signal<string>(this.hojeIso());
  filtroBarbeiro = signal<number | null>(null);
  carregando = signal(false);
  erro = signal<string | null>(null);

  // Formulário de novo agendamento
  mostrarForm = signal(false);
  form = {
    clienteId: null as number | null,
    barbeiroId: null as number | null,
    servicoId: null as number | null,
    dataHora: '',
    observacoes: ''
  };

  // Novo cliente inline
  novoCliente = { nome: '', telefone: '', email: '' };
  criandoCliente = signal(false);

  agendamentosFiltrados = computed(() => {
    const bId = this.filtroBarbeiro();
    return bId
      ? this.agendamentos().filter(a => a.barbeiroId === bId)
      : this.agendamentos();
  });

  faturamentoDia = computed(() =>
    this.agendamentosFiltrados()
      .filter(a => a.status !== 'Cancelado')
      .reduce((soma, a) => soma + a.precoCobrado, 0)
  );

  private auth = inject(AuthService);
  private router = inject(Router);

  usuarioLogado = this.auth.usuarioLogado;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.carregarDadosBase();
    this.carregarAgendamentos();
  }

  sair(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private hojeIso(): string {
    return new Date().toISOString().split('T')[0];
  }

  carregarDadosBase(): void {
    this.api.getBarbeiros().subscribe({ next: b => this.barbeiros.set(b) });
    this.api.getServicos().subscribe({ next: s => this.servicos.set(s) });
    this.api.getClientes().subscribe({ next: c => this.clientes.set(c) });
  }

  carregarAgendamentos(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.getAgendamentos(this.dataSelecionada()).subscribe({
      next: a => { this.agendamentos.set(a); this.carregando.set(false); },
      error: () => {
        this.erro.set('Não foi possível carregar a agenda. Verifique se a API está no ar.');
        this.carregando.set(false);
      }
    });
  }

  onDataChange(valor: string): void {
    this.dataSelecionada.set(valor);
    this.carregarAgendamentos();
  }

  abrirForm(): void {
    this.mostrarForm.set(true);
    this.form.dataHora = `${this.dataSelecionada()}T09:00`;
  }

  fecharForm(): void {
    this.mostrarForm.set(false);
    this.form = { clienteId: null, barbeiroId: null, servicoId: null, dataHora: '', observacoes: '' };
    this.erro.set(null);
  }

  servicoSelecionado = computed(() =>
    this.servicos().find(s => s.id === this.form.servicoId)
  );

  salvarAgendamento(): void {
    if (!this.form.clienteId || !this.form.barbeiroId || !this.form.servicoId || !this.form.dataHora) {
      this.erro.set('Preencha cliente, barbeiro, serviço e horário.');
      return;
    }

    this.carregando.set(true);
    this.api.criarAgendamento({
      clienteId: this.form.clienteId,
      barbeiroId: this.form.barbeiroId,
      servicoId: this.form.servicoId,
      dataHora: new Date(this.form.dataHora).toISOString(),
      observacoes: this.form.observacoes || undefined
    }).subscribe({
      next: () => {
        this.carregando.set(false);
        this.fecharForm();
        this.carregarAgendamentos();
      },
      error: (e) => {
        this.carregando.set(false);
        this.erro.set(e?.error?.mensagem ?? 'Erro ao criar agendamento.');
      }
    });
  }

  criarClienteRapido(): void {
    if (!this.novoCliente.nome || !this.novoCliente.telefone) {
      this.erro.set('Nome e telefone do cliente são obrigatórios.');
      return;
    }
    this.api.criarCliente(this.novoCliente).subscribe({
      next: (c) => {
        this.clientes.update(lista => [...lista, c]);
        this.form.clienteId = c.id;
        this.criandoCliente.set(false);
        this.novoCliente = { nome: '', telefone: '', email: '' };
        this.erro.set(null);
      },
      error: () => this.erro.set('Erro ao cadastrar cliente.')
    });
  }

  mudarStatus(ag: Agendamento, status: StatusAgendamento): void {
    this.api.atualizarStatus(ag.id, status).subscribe({
      next: () => this.carregarAgendamentos(),
      error: () => this.erro.set('Erro ao atualizar status.')
    });
  }

  formatarHora(dataHora: string): string {
    return new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  classeStatus(status: StatusAgendamento): string {
    return `status-${status.toLowerCase()}`;
  }
}
