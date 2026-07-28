// ─────────────────────────────────────────────────────────────
//  Utilitários de data — à prova de fuso horário.
//
//  O PROBLEMA que isto resolve: o input <input type="date"> devolve
//  uma string tipo "2026-07-29". Se você faz new Date("2026-07-29"),
//  o navegador interpreta como meia-noite em UTC — e no Brasil (UTC-3)
//  isso vira 21h do dia ANTERIOR (28/07). Resultado: a data "pulava"
//  um dia para trás em algumas telas.
//
//  A SOLUÇÃO: sempre converter a string quebrando ano/mês/dia à mão,
//  criando a data no fuso LOCAL. E gerar "hoje" sem passar por UTC.
// ─────────────────────────────────────────────────────────────

// Converte "YYYY-MM-DD" numa Date à meia-noite LOCAL (não UTC).
export function dataLocalDeISO(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 0, 0, 0, 0);
}

// Devolve a data de HOJE como "YYYY-MM-DD", no fuso local (sem UTC).
export function hojeISO() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// True se a data (string "YYYY-MM-DD" ou Date) é anterior a hoje.
export function ehDataPassada(data) {
  const d = typeof data === 'string' ? dataLocalDeISO(data) : new Date(data);
  d.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return d < hoje;
}
