import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// ─────────────────────────────────────────────────────────────
//  Configurações da barbearia que o Stevon controla pelo painel.
//  Ficam num único documento: config/geral.
//
//  Leitura: liberada para qualquer um (o botão de WhatsApp e o aviso
//           aparecem para o cliente). Não há nada sensível aqui.
//  Escrita: só a equipe (garantido pelas regras do Firestore).
// ─────────────────────────────────────────────────────────────

const REF = () => doc(db, 'config', 'geral');

// Valores padrão, usados enquanto o Stevon não configurou nada.
const PADRAO = {
  whatsapp: '',        // número com DDD, só dígitos (ex.: 27999998888)
  aviso: '',           // mensagem/recado no topo do site (vazio = sem aviso)
  avisoAtivo: false,   // liga/desliga o aviso sem apagar o texto
};

// Lê as configurações (devolve os padrões se ainda não existir).
export async function lerConfig() {
  try {
    const snap = await getDoc(REF());
    return snap.exists() ? { ...PADRAO, ...snap.data() } : { ...PADRAO };
  } catch {
    return { ...PADRAO };
  }
}

// Salva as configurações (merge: não apaga campos não enviados).
export async function salvarConfig(dados) {
  await setDoc(REF(), dados, { merge: true });
}

// Deixa só os dígitos de um telefone (para montar o link do WhatsApp).
export function soDigitos(texto) {
  return (texto || '').replace(/\D/g, '');
}

// Monta o link do WhatsApp a partir do número configurado.
// Retorna null se não houver número (aí o botão não aparece).
export function linkWhatsApp(numero, mensagem = '') {
  const n = soDigitos(numero);
  if (!n) return null;
  // Adiciona 55 (Brasil) se o número não vier com código do país.
  const completo = n.length <= 11 ? `55${n}` : n;
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : '';
  return `https://wa.me/${completo}${texto}`;
}
