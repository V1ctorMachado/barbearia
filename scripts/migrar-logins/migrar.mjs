// ─────────────────────────────────────────────────────────────
//  MIGRAÇÃO DE LOGINS: e-mail → celular  (rodar uma vez)
//
//  Contas criadas antes do login por celular entram com e-mail. Este script
//  troca o "usuário" de cada uma para <celular>@cliente.mageschi.app, usando
//  o telefone do cadastro (coleção "clientes").
//    • A SENHA NÃO MUDA (o Firebase guarda a senha separada do e-mail).
//    • A CONTA É A MESMA (mesmo UID): o histórico de agendamentos continua.
//    • Contas da EQUIPE (roles/{uid}.staff) não são tocadas.
//
//  Uso (dentro desta pasta):
//    npm install
//    npm run simular     → só mostra o que seria feito (não altera nada)
//    npm run aplicar     → faz a migração
//    Para deixar contas de fora (ex.: contas de teste):
//      node migrar.mjs --aplicar --pular=teste@x.com,outro@y.com
//
//  Precisa da chave de administrador do Firebase salva aqui como
//  "chave-servico.json" (ver FIREBASE.md). NUNCA envie essa chave a ninguém
//  nem suba para o GitHub.
// ─────────────────────────────────────────────────────────────
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import admin from 'firebase-admin';

const DOMINIO = 'cliente.mageschi.app';          // igual a src/lib/celular.js
const APLICAR = process.argv.includes('--aplicar');
const PULAR = new Set((process.argv.find((a) => a.startsWith('--pular=')) || '')
  .replace('--pular=', '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
const aqui = dirname(fileURLToPath(import.meta.url));

// ── Conexão ──────────────────────────────────────────────────
const emulador = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (emulador) {
  admin.initializeApp({ projectId: process.env.PROJETO || 'demo-barbearia' });
} else {
  const caminho = join(aqui, 'chave-servico.json');
  if (!existsSync(caminho)) {
    console.error('\n✖ Arquivo "chave-servico.json" não encontrado nesta pasta.');
    console.error('  Firebase Console → ⚙ Configurações do projeto → Contas de serviço →');
    console.error('  "Gerar nova chave privada" → salve aqui como chave-servico.json\n');
    process.exit(1);
  }
  const chave = JSON.parse(readFileSync(caminho, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(chave) });
}
const auth = admin.auth();
const db = admin.firestore();

// ── Celular (mesmas regras de src/lib/celular.js) ────────────
function normalizar(texto) {
  let d = String(texto || '').replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
}
const valido = (d) => /^[1-9][1-9]\d{8}$/.test(d) || /^[1-9][1-9]9\d{8}$/.test(d);
const formatar = (d) => (d.length === 11
  ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`);

// ── Coleta ───────────────────────────────────────────────────
async function todosUsuarios() {
  const lista = []; let token;
  do {
    const r = await auth.listUsers(1000, token);
    lista.push(...r.users); token = r.pageToken;
  } while (token);
  return lista;
}

const usuarios = await todosUsuarios();
const staff = new Set((await db.collection('roles').get()).docs.filter((d) => d.data().staff === true).map((d) => d.id));
const perfis = new Map((await db.collection('clientes').get()).docs.map((d) => [d.id, d.data()]));
const emailsExistentes = new Set(usuarios.map((u) => (u.email || '').toLowerCase()));

// ── Plano ────────────────────────────────────────────────────
const plano = [];          // { uid, emailAntigo, nome, telefoneOriginal, celular, novoEmail, situacao }
for (const u of usuarios) {
  const email = (u.email || '').toLowerCase();
  const perfil = perfis.get(u.uid) || {};
  const base = { uid: u.uid, emailAntigo: u.email || '', nome: perfil.nome || '', telefoneOriginal: perfil.telefone || perfil.celular || '' };
  if (email.endsWith('@' + DOMINIO)) { plano.push({ ...base, situacao: 'ja-migrado' }); continue; }
  if (staff.has(u.uid)) { plano.push({ ...base, situacao: 'equipe' }); continue; }
  if (PULAR.has(email)) { plano.push({ ...base, situacao: 'pulada' }); continue; }
  const cel = normalizar(base.telefoneOriginal);
  if (!base.telefoneOriginal) { plano.push({ ...base, situacao: 'sem-telefone' }); continue; }
  if (!valido(cel)) { plano.push({ ...base, celular: cel, situacao: 'telefone-invalido' }); continue; }
  plano.push({ ...base, celular: cel, novoEmail: `${cel}@${DOMINIO}`, situacao: 'migrar' });
}

// Conflitos: o mesmo celular em mais de uma conta antiga, ou já usado numa conta nova.
const porCelular = new Map();
plano.filter((p) => p.situacao === 'migrar').forEach((p) => porCelular.set(p.celular, [...(porCelular.get(p.celular) || []), p]));
for (const [, grupo] of porCelular) {
  for (const p of grupo) {
    if (grupo.length > 1) p.situacao = 'conflito-duplicado';
    else if (emailsExistentes.has(p.novoEmail)) p.situacao = 'conflito-ja-existe-conta-nova';
  }
}

// ── Execução ─────────────────────────────────────────────────
let migradas = 0, falhas = 0;
if (APLICAR) {
  for (const p of plano.filter((x) => x.situacao === 'migrar')) {
    try {
      await auth.updateUser(p.uid, { email: p.novoEmail });
      await db.collection('clientes').doc(p.uid).set(
        { celular: p.celular, telefone: formatar(p.celular), emailAntigo: p.emailAntigo, migradoEm: new Date() },
        { merge: true });
      p.situacao = 'migrado'; migradas++;
    } catch (e) {
      p.situacao = 'erro: ' + (e.code || e.message); falhas++;
    }
  }
}

// ── Relatório ────────────────────────────────────────────────
const NOMES = {
  'migrar': 'SERÁ MIGRADA', 'migrado': 'MIGRADA', 'ja-migrado': 'já usa celular',
  'equipe': 'equipe (não mexe)', 'pulada': 'pulada (--pular)', 'sem-telefone': 'SEM TELEFONE no cadastro',
  'telefone-invalido': 'TELEFONE INVÁLIDO', 'conflito-duplicado': 'CONFLITO: celular repetido em outra conta antiga',
  'conflito-ja-existe-conta-nova': 'CONFLITO: já existe conta nova com esse celular',
};
console.log(`\n${APLICAR ? 'MIGRAÇÃO APLICADA' : 'SIMULAÇÃO (nada foi alterado)'}${emulador ? ' — EMULADOR' : ''}\n`);
console.table(plano.map((p) => ({
  situacao: NOMES[p.situacao] || p.situacao, nome: p.nome, emailAntigo: p.emailAntigo,
  telefone: p.telefoneOriginal, 'entra com': p.celular && valido(p.celular) ? formatar(p.celular) : '',
})));
const conta = (s) => plano.filter((p) => p.situacao.startsWith(s)).length;
console.log(`Total: ${plano.length} contas | ${APLICAR ? `migradas: ${migradas}, falhas: ${falhas}` : `a migrar: ${conta('migrar')}`}`
  + ` | já com celular: ${conta('ja-migrado')} | equipe: ${conta('equipe')}`
  + ` | sem telefone: ${conta('sem-telefone')} | inválido: ${conta('telefone-invalido')} | conflitos: ${conta('conflito')}`);

const csv = ['situacao;nome;email_antigo;telefone;entra_com;uid',
  ...plano.map((p) => [NOMES[p.situacao] || p.situacao, p.nome, p.emailAntigo, p.telefoneOriginal,
    p.celular && valido(p.celular) ? formatar(p.celular) : '', p.uid].map((v) => String(v).replace(/;/g, ',')).join(';'))].join('\n');
const arq = join(aqui, APLICAR ? 'relatorio-migracao.csv' : 'relatorio-simulacao.csv');
writeFileSync(arq, '﻿' + csv, 'utf8');
console.log(`Relatório salvo em ${arq} (abre no Excel)\n`);
if (!APLICAR) console.log('Para aplicar de verdade: npm run aplicar\n');
process.exit(falhas ? 1 : 0);
