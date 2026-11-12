// Dados fixos da barbearia. Como serviços e barbeiro mudam pouco,
// ficam aqui em vez de no banco — simples de editar e não precisa de tela de admin.

import { dataLocalDeISO } from './datas';

export const SERVICOS = [
  // ATENÇÃO: preço e duração também ficam em servicos() no firestore.rules.
  // Mudou aqui? Mude lá e publique as regras (ver FIREBASE.md).
  { id: 'corte',              nome: 'Corte',               preco: 35,  duracaoMin: 30, descricao: 'Corte de cabelo' },
  { id: 'barba',              nome: 'Barba',               preco: 30,  duracaoMin: 20, descricao: 'Aparar e modelar a barba' },
  { id: 'corte-barba',        nome: 'Corte + Barba',       preco: 65,  duracaoMin: 60, descricao: 'Corte de cabelo e barba' },
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
//             até 11:50; ou no sábado começar 14:00 e ir até 15:30).
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
  6: [{ abre: H(8, 30), fecha: H(14, 0) }], // Sábado — período único, sem intervalo; último início 14:00
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

// ── Fase de testes ─────────────────────────────────────────────
// true = mostra o botão "Excluir" (🗑) nos cards do painel da EQUIPE,
// para apagar agendamentos de teste. Clientes nunca veem esse botão,
// e as regras do Firebase só deixam a equipe apagar.
// Quando o site entrar em uso de verdade, troque para false.
export const PERMITIR_EXCLUIR = true;

// ── Mensagem de confirmação pelo WhatsApp ─────────────────────
// Usada no painel: ao clicar no telefone do cliente, o WhatsApp abre com
// este texto já escrito. Para mudar o texto, edite MENSAGEM_CONFIRMACAO.
// Marcadores: {nome} {servico} {dia} {data} {hora} {preco}
export const MENSAGEM_CONFIRMACAO = [
  // Sem emojis nem travessão: alguns aparelhos mostram "?" no lugar deles.
  'Olá, {nome}!',
  'Aqui é da Barbearia Mageschi. Obrigado por agendar com a gente!',
  'Seu horário está confirmado:',
  'Data: {dia}, {data} às {hora}',
  'Serviço: {servico} - R$ {preco}',
  'Por favor, chegue com alguns minutos de antecedência.',
  'Se não puder vir, avise com pelo menos 24 horas de antecedência.',
  'Até lá!',
].join('\n');

export function mensagemConfirmacao(ag) {
  const d = ag.dataHora;
  // Primeiro nome; se começar com tratamento (Seu, Dona, Dr…), usa o nome seguinte.
  const partes = (ag.clienteNome || '').trim().split(/\s+/).filter(Boolean);
  const tratamento = /^(seu|sr\.?|sra\.?|dona|dr\.?|dra\.?|tio|tia)$/i;
  const primeiroNome = (partes.length > 1 && tratamento.test(partes[0]) ? partes[1] : partes[0]) || 'tudo bem';
  const valores = {
    nome: primeiroNome,
    servico: ag.servicoNome || 'seu serviço',
    dia: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    preco: Number(ag.preco ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
  };
  return MENSAGEM_CONFIRMACAO.replace(/\{(\w+)\}/g, (m, k) => valores[k] ?? m);
}

// ── Aviso do CLIENTE para a barbearia (WhatsApp) ───────────────
// Depois de agendar, o cliente vê o botão "Avisar a barbearia no WhatsApp",
// que abre a conversa com a barbearia com este texto já escrito.
// Marcadores: {nome} {servico} {dia} {data} {hora} {preco}
export const MENSAGEM_AVISO_BARBEARIA = [
  // Sem emojis nem travessão: alguns aparelhos mostram "?" no lugar deles.
  'Olá! Acabei de agendar pelo site.',
  'Nome: {nome}',
  'Serviço: {servico} - R$ {preco}',
  'Data: {dia}, {data} às {hora}',
  'Aguardo a confirmação. Obrigado!',
].join('\n');

export function mensagemAvisoBarbearia(ag) {
  const d = ag.dataHora;
  const valores = {
    // Nome completo, sem tratamento no começo ("Seu Jorge Silva" → "Jorge Silva").
    nome: (ag.clienteNome || '').trim().replace(/^(seu|sr\.?|sra\.?|dona|dr\.?|dra\.?|tio|tia)\s+(?=\S)/i, '') || ag.clienteEmail || 'Cliente',
    servico: ag.servicoNome || 'serviço',
    dia: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    preco: Number(ag.preco ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
  };
  return MENSAGEM_AVISO_BARBEARIA.replace(/\{(\w+)\}/g, (m, k) => valores[k] ?? m);
}

// ── Suporte técnico (WhatsApp) ─────────────────────────────────
// Para onde vai o link "Esqueceu a senha?" do login. É quem tem acesso ao
// Firebase para excluir a conta (ver FIREBASE.md). Separado do WhatsApp da
// barbearia (que fica em Configurações e é usado no resto do site).
export const WHATSAPP_SUPORTE = '27988582900';

// ── Endereço (aparece no lembrete da agenda do cliente) ────────
// Deixe '' para não mostrar endereço.
export const ENDERECO_BARBEARIA = 'R. das Acácias, 19 - Vale Encantado, Vila Velha - ES, 29113-759';
