// ─────────────────────────────────────────────────────────────
//  LOGIN POR CELULAR
//  O cliente entra com celular + senha. Por baixo, o Firebase usa o login
//  de "e-mail e senha", com um e-mail interno montado a partir do número
//  (ex.: 27999998888@cliente.mageschi.app). Esse endereço não existe, não
//  recebe nada e o cliente nunca o vê.
//  Contas antigas (criadas com e-mail de verdade) continuam funcionando:
//  o campo de login aceita e-mail também.
// ─────────────────────────────────────────────────────────────

export const DOMINIO_CELULAR = 'cliente.mageschi.app';

// Só dígitos, sem +55 e sem 0 na frente. Ex.: "+55 (27) 99999-8888" → "27999998888"
export function normalizarCelular(texto) {
  let d = String(texto || '').replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
}

// DDD + número: 10 dígitos (fixo) ou 11 (celular começando com 9).
export function celularValido(texto) {
  const d = normalizarCelular(texto);
  return /^[1-9][1-9]\d{8}$/.test(d) || /^[1-9][1-9]9\d{8}$/.test(d);
}

export const emailDoCelular = (texto) => `${normalizarCelular(texto)}@${DOMINIO_CELULAR}`;

export const ehEmailDeCelular = (email) => String(email || '').endsWith('@' + DOMINIO_CELULAR);

export const celularDoEmail = (email) => (ehEmailDeCelular(email) ? email.split('@')[0] : '');

// "27999998888" → "(27) 99999-8888"
export function formatarCelular(texto) {
  const d = normalizarCelular(texto);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return texto || '';
}

// Máscara enquanto digita: (27) 99999-8888
export function mascaraCelular(texto) {
  const bruto = String(texto || '');
  let d = bruto.replace(/\D/g, '');
  // Colado/preenchido com o código do país (+55 27 99999-8888 ou 5527999998888)
  if (d.startsWith('55') && (bruto.trim().startsWith('+') || d.length > 11)) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);   // 027 99999-8888
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Nome para mostrar no topo da tela.
export function identificacao(usuario, nome) {
  if (nome) return nome;
  if (!usuario) return '';
  return ehEmailDeCelular(usuario.email) ? formatarCelular(celularDoEmail(usuario.email)) : usuario.email;
}
