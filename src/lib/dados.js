// Dados fixos da barbearia. Como serviços e barbeiro mudam pouco,
// ficam aqui em vez de no banco — simples de editar e não precisa de tela de admin.

import { dataLocalDeISO } from './datas';

export const SERVICOS = [
  // ATENÇÃO: preço e duração também ficam em servicos() no firestore.rules.
  // Mudou aqui? Mude lá e publique as regras (ver FIREBASE.md).
  { id: 'corte',              nome: 'Corte',               preco: 35,  duracaoMin: 30, descricao: 'Corte de cabelo' },
  { id: 'barba',              nome: 'Barba',               preco: 30,  duracaoMin: 20, descricao: 'Aparar e modelar a barba' },
  { id: 'corte-barba',        nome: 'Corte + Barba',       preco: 65,  duracaoMin: 50, descricao: 'Corte de cabelo e barba' },
  { id: 'pezinho',            nome: 'Pezinho',             preco: 10,  duracaoMin: 10, descricao: 'Acabamento do pezinho' },
  { id: 'pigmentacao-avulsa', nome: 'Pigmentação',         preco: 25,  duracaoMin: 20, descricao: 'Pigmentação (sem corte)' },
  { id: 'pigmentacao',        nome: 'Corte + Pigmentação', preco: 60,  duracaoMin: 50, descricao: 'Corte com pigmentação' },
  { id: 'luzes',              nome: 'Luzes',               preco: 100, duracaoMin: 90, descricao: 'Luzes no cabelo' },
  { id: 'descoloracao',       nome: 'Descoloração',        preco: 130, duracaoMin: 90, descricao: 'Descoloração capilar' },
];

export const BARBEIROS = [
  { id: 'stevon', nome: 'Stevon', especialidades: '' },
];

// ─────────────────────────────────────────────────────────────
//  Horário de funcionamento POR DIA DA SEMANA.
//  Cada dia tem uma LISTA de períodos (para suportar o intervalo de
//  almoço nos dias de semana). Valores em MINUTOS desde a meia-noite
//  (para permitir :30, ex.: 8:30 = 510).
//
//  Em cada período:
//    "abre":  minuto em que o período começa.
//    "fecha": minuto do ÚLTIMO atendimento poder COMEÇAR (um serviço
//             longo pode terminar depois — ex.: começar 11:00 e ir
//             até 11:50; ou no sábado começar 11:30 e ir até 13:00).
//  Dias fechados: lista vazia [].
//
//  Índice: 0=Domingo, 1=Segunda, ..., 6=Sábado (padrão do JavaScript).
// ─────────────────────────────────────────────────────────────
const H = (hora, min = 0) => hora * 60 + min;

// Manhã e tarde dos dias de semana (terça a sexta), com intervalo de almoço.
const DIA_SEMANA = [
  { abre: H(8, 30), fecha: H(11, 0) },   // manhã: último início 11:00
  { abre: H(13, 30), fecha: H(19, 0) },  // tarde: último início 19:00
];

export const FUNCIONAMENTO_SEMANA = {
  0: [],                                    // Domingo — fechado
  1: [],                                    // Segunda — fechado
  2: DIA_SEMANA,                            // Terça
  3: DIA_SEMANA,                            // Quarta
  4: DIA_SEMANA,                            // Quinta
  5: DIA_SEMANA,                            // Sexta
  6: [{ abre: H(8, 30), fecha: H(12, 0) }], // Sábado — período único, sem intervalo
};

// Devolve a lista de períodos de uma data (lista vazia se fechado).
export function periodosDoDia(data) {
  // Aceita tanto string "YYYY-MM-DD" quanto objeto Date.
  const d = typeof data === 'string' ? dataLocalDeISO(data) : new Date(data);
  const diaSemana = d.getDay();
  return FUNCIONAMENTO_SEMANA[diaSemana] ?? [];
}

// True se a barbearia abre nesse dia (tem ao menos um período).
export function abreNoDia(data) {
  return periodosDoDia(data).length > 0;
}

// Rótulos amigáveis para cada status
export const STATUS_LABEL = {
  pendente:   'Aguardando confirmação',
  agendado:   'Agendado',
  confirmado: 'Confirmado',
  concluido:  'Concluído',
  cancelado:  'Cancelado',
  recusado:   'Recusado',
};

export const servicoPorId = (id) => SERVICOS.find((s) => s.id === id);
export const barbeiroPorId = (id) => BARBEIROS.find((b) => b.id === id);
