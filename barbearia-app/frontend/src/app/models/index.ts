export interface Barbeiro {
  id: number;
  nome: string;
  especialidades?: string;
  fotoUrl?: string;
  ativo: boolean;
}

export interface Servico {
  id: number;
  nome: string;
  descricao?: string;
  preco: number;
  duracaoMinutos: number;
  ativo: boolean;
}

export interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
  dataCadastro?: string;
}

export type StatusAgendamento = 'Agendado' | 'Confirmado' | 'Concluido' | 'Cancelado';

export interface Agendamento {
  id: number;
  dataHora: string;
  status: StatusAgendamento;
  observacoes?: string;
  precoCobrado: number;
  clienteId: number;
  clienteNome: string;
  clienteTelefone: string;
  barbeiroId: number;
  barbeiroNome: string;
  servicoId: number;
  servicoNome: string;
  duracaoMinutos: number;
}

export interface CriarAgendamento {
  dataHora: string;
  clienteId: number;
  barbeiroId: number;
  servicoId: number;
  observacoes?: string;
}
