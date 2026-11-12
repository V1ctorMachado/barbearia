// ─────────────────────────────────────────────────────────────
//  LEMBRETE NA AGENDA DO CELULAR
//  Um site não pode criar eventos na agenda sozinho: o cliente toca no botão
//  e o calendário abre com o evento pronto.
//   • iPhone (e outros apps de agenda): arquivo .ics, com aviso no dia,
//     1 hora antes do horário.
//   • Android: link do Google Agenda com o evento preenchido.
// ─────────────────────────────────────────────────────────────
import { ENDERECO_BARBEARIA } from './dados';

const NOME = 'Barbearia Mageschi';

// Quantos dias faltam para o agendamento ser "distante" (destaque do lembrete).
export const DIAS_PARA_LEMBRETE = 3;

// Dias de calendário até a data (amanhã = 1, mesmo se faltarem poucas horas).
export const diasAte = (data) => {
  const meiaNoite = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  return Math.round((meiaNoite(data) - meiaNoite(new Date())) / 86400000);
};

export const ehIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// 2026-11-12T13:30:00.000Z → 20261112T133000Z
const utc = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function dadosEvento(ag) {
  const inicio = new Date(ag.dataHora);
  const fim = new Date(inicio.getTime() + (Number(ag.duracaoMin) || 30) * 60000);
  const preco = Number(ag.preco ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  return {
    inicio, fim,
    titulo: `${NOME} - ${ag.servicoNome || 'Atendimento'}`,
    descricao: [
      `Serviço: ${ag.servicoNome || ''} - R$ ${preco}`,
      'Por favor, chegue com alguns minutos de antecedência.',
      'Se não puder vir, avise com pelo menos 24 horas de antecedência.',
    ].join('\n'),
  };
}

// Escapa texto para o formato iCalendar.
const esc = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function icsDoAgendamento(ag) {
  const e = dadosEvento(ag);
  const linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Barbearia Mageschi//Agendamento//PT-BR',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ag.id || utc(e.inicio)}@barbearia-mageschi`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(e.inicio)}`,
    `DTEND:${utc(e.fim)}`,
    `SUMMARY:${esc(e.titulo)}`,
    `DESCRIPTION:${esc(e.descricao)}`,
    ...(ENDERECO_BARBEARIA ? [`LOCATION:${esc(ENDERECO_BARBEARIA)}`] : []),
    // Aviso no dia, 1 hora antes do horário (agendado às 11h → aviso às 10h)
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.titulo)} em 1 hora`, 'TRIGGER:-PT1H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return linhas.map(dobrar).join('\r\n') + '\r\n';
}

// Linhas do iCalendar com mais de 75 bytes são quebradas (continuação com espaço).
function dobrar(linha) {
  const enc = new TextEncoder();
  const partes = []; let atual = '';
  for (const ch of linha) {
    const limite = partes.length ? 74 : 75;
    if (enc.encode(atual + ch).length > limite) { partes.push(atual); atual = ch; } else atual += ch;
  }
  partes.push(atual);
  return partes.join('\r\n ');
}

export function linkGoogleAgenda(ag) {
  const e = dadosEvento(ag);
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.titulo,
    dates: `${utc(e.inicio)}/${utc(e.fim)}`,
    details: e.descricao,
    ctz: 'America/Sao_Paulo',
  });
  if (ENDERECO_BARBEARIA) p.set('location', ENDERECO_BARBEARIA);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

// Baixa/abre o .ics (no iPhone, abre direto o "Adicionar ao Calendário").
export function abrirIcs(ag) {
  const blob = new Blob([icsDoAgendamento(ag)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'agendamento-barbearia-mageschi.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
