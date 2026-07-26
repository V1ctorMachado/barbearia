import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PortalService } from '../services/portal.service';
import { AuthService } from '../services/auth.service';
import { Barbeiro, Servico, Agendamento } from '../models';

@Component({
  selector: 'app-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portal.component.html',
  styleUrls: ['./portal.component.css']
})
export class PortalComponent implements OnInit {
  private portal = inject(PortalService);
  private auth = inject(AuthService);
  private router = inject(Router);

  usuarioLogado = this.auth.usuarioLogado;
  aba = signal<'agendar' | 'meus'>('agendar');

  barbeiros = signal<Barbeiro[]>([]);
  servicos = signal<Servico[]>([]);
  meus = signal<Agendamento[]>([]);

  // Seleções do fluxo de agendamento
  barbeiroId = signal<number | null>(null);
  servicoId = signal<number | null>(null);
  data = signal<string>(this.hojeIso());
  horarios = signal<string[]>([]);
  horarioEscolhido = signal<string | null>(null);
  observacoes = '';

  buscando = signal(false);
  enviando = signal(false);
  erro = signal<string | null>(null);
  sucesso = signal<string | null>(null);

  servicoSel = computed(() => this.servicos().find(s => s.id === this.servicoId()));

  // Só dá para buscar horários com barbeiro, serviço e data escolhidos
  podeBuscar = computed(() =>
    this.barbeiroId() !== null && this.servicoId() !== null && !!this.data()
  );

  ngOnInit(): void {
    this.portal.getBarbeiros().subscribe({ next: b => this.barbeiros.set(b) });
    this.portal.getServicos().subscribe({ next: s => this.servicos.set(s) });
  }

  private hojeIso(): string {
    return new Date().toISOString().split('T')[0];
  }

  buscarHorarios(): void {
    if (!this.podeBuscar()) {
      this.erro.set('Escolha o barbeiro, o serviço e a data.');
      return;
    }
    this.buscando.set(true);
    this.erro.set(null);
    this.horarioEscolhido.set(null);
    this.horarios.set([]);

    this.portal.getHorariosLivres(this.barbeiroId()!, this.servicoId()!, this.data()).subscribe({
      next: (h) => { this.horarios.set(h); this.buscando.set(false); },
      error: (e) => {
        this.buscando.set(false);
        this.erro.set(e?.error?.mensagem ?? 'Erro ao buscar horários.');
      }
    });
  }

  escolherHorario(h: string): void {
    this.horarioEscolhido.set(h);
  }

  confirmarAgendamento(): void {
    const h = this.horarioEscolhido();
    if (!h) {
      this.erro.set('Escolha um horário.');
      return;
    }
    this.enviando.set(true);
    this.erro.set(null);
    this.sucesso.set(null);

    this.portal.agendar({
      barbeiroId: this.barbeiroId()!,
      servicoId: this.servicoId()!,
      dataHora: h,
      observacoes: this.observacoes || undefined
    }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.sucesso.set('Pedido enviado! Ele ficará pendente até a barbearia confirmar.');
        this.horarios.set([]);
        this.horarioEscolhido.set(null);
        this.observacoes = '';
      },
      error: (e) => {
        this.enviando.set(false);
        this.erro.set(e?.error?.mensagem ?? 'Não foi possível agendar. O horário pode ter sido ocupado.');
      }
    });
  }

  irParaMeus(): void {
    this.aba.set('meus');
    this.carregarMeus();
  }

  carregarMeus(): void {
    this.portal.meusAgendamentos().subscribe({
      next: (m) => this.meus.set(m),
      error: () => this.erro.set('Erro ao carregar seus agendamentos.')
    });
  }

  cancelar(ag: Agendamento): void {
    this.portal.cancelar(ag.id).subscribe({
      next: () => this.carregarMeus(),
      error: (e) => this.erro.set(e?.error?.mensagem ?? 'Não foi possível cancelar.')
    });
  }

  sair(): void {
    this.auth.logout();
    this.router.navigate(['/login-cliente']);
  }

  formatarHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  formatarDataHora(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }
  rotuloStatus(s: string): string {
    const mapa: Record<string, string> = {
      Pendente: 'Aguardando confirmação',
      Agendado: 'Agendado',
      Confirmado: 'Confirmado',
      Concluido: 'Concluído',
      Cancelado: 'Cancelado',
      Recusado: 'Recusado'
    };
    return mapa[s] ?? s;
  }
  classeStatus(s: string): string {
    return `st-${s.toLowerCase()}`;
  }
  podeCancelar(s: string): boolean {
    return s === 'Pendente' || s === 'Agendado' || s === 'Confirmado';
  }
}
