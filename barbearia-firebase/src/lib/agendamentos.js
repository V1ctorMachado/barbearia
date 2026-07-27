import {
  collection, addDoc, updateDoc, doc, query, where, getDocs,
  Timestamp, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { servicoPorId, FUNCIONAMENTO } from './dados';

const COL = 'agendamentos';

// Cria um agendamento (sempre entra como "pendente", aguardando a equipe aprovar).
export async function criarAgendamento({ clienteUid, clienteEmail, barbeiroId, servicoId, dataHora, observacoes }) {
  const servico = servicoPorId(servicoId);
  if (!servico) throw new Error('Serviço inválido.');

  return addDoc(collection(db, COL), {
    clienteUid,
    clienteEmail,
    barbeiroId,
    servicoId,
    servicoNome: servico.nome,
    duracaoMin: servico.duracaoMin,
    preco: servico.preco,
    dataHora: Timestamp.fromDate(new Date(dataHora)),
    status: 'pendente',
    observacoes: observacoes || '',
    criadoEm: serverTimestamp(),
  });
}

// Converte um documento do Firestore num objeto simples de usar na tela.
function mapear(d) {
  const dados = d.data();
  return {
    id: d.id,
    ...dados,
    dataHora: dados.dataHora?.toDate?.() ?? new Date(dados.dataHora),
  };
}

// Agendamentos de um cliente (a área "Meus agendamentos").
export async function listarPorCliente(clienteUid) {
  // Sem orderBy na consulta (evita exigir índice composto no Firestore).
  // A ordenação por data é feita aqui embaixo, no navegador.
  const q = query(
    collection(db, COL),
    where('clienteUid', '==', clienteUid),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(mapear)
    .sort((a, b) => b.dataHora - a.dataHora); // mais recentes primeiro
}

// Agendamentos de um dia (painel da equipe). Opcionalmente filtra por barbeiro.
export async function listarPorDia(data, barbeiroId = null) {
  const inicio = new Date(data); inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);  fim.setDate(fim.getDate() + 1);

  // Para nunca exigir índice composto no Firestore, a consulta usa no máximo
  // UM critério. Se há barbeiro, filtramos por ele no banco; senão, filtramos
  // pelo intervalo de datas. O restante do filtro (a "peneira" fina) acontece
  // aqui no navegador, sobre os resultados.
  let snap;
  if (barbeiroId) {
    snap = await getDocs(query(collection(db, COL), where('barbeiroId', '==', barbeiroId)));
  } else {
    snap = await getDocs(query(
      collection(db, COL),
      where('dataHora', '>=', Timestamp.fromDate(inicio)),
      where('dataHora', '<', Timestamp.fromDate(fim)),
    ));
  }

  return snap.docs
    .map(mapear)
    .filter((a) => a.dataHora >= inicio && a.dataHora < fim) // garante o dia certo
    .sort((a, b) => a.dataHora - b.dataHora);
}

export async function atualizarStatus(id, status) {
  await updateDoc(doc(db, COL, id), { status });
}

// ── Cálculo de horários livres ───────────────────────────────
// Fatia o dia (9h–18h) em blocos do tamanho da duração do serviço e
// remove os que colidem com agendamentos existentes do barbeiro.
// Devolve só os horários vagos — nunca os dados de quem ocupou os cheios.
export async function horariosLivres(barbeiroId, servicoId, data) {
  const servico = servicoPorId(servicoId);
  if (!servico) return [];
  const duracao = servico.duracaoMin;

  const diaBase = new Date(data); diaBase.setHours(0, 0, 0, 0);
  const abertura = new Date(diaBase); abertura.setHours(FUNCIONAMENTO.abertura, 0, 0, 0);
  const fechamento = new Date(diaBase); fechamento.setHours(FUNCIONAMENTO.fechamento, 0, 0, 0);

  // Busca ocupações do barbeiro nesse dia (ignora cancelados/recusados).
  const ocupados = (await listarPorDia(diaBase, barbeiroId))
    .filter((a) => a.status !== 'cancelado' && a.status !== 'recusado')
    .map((a) => ({ inicio: a.dataHora, fim: new Date(a.dataHora.getTime() + a.duracaoMin * 60000) }));

  const agora = new Date();
  const livres = [];

  for (let ini = new Date(abertura); ini.getTime() + duracao * 60000 <= fechamento.getTime(); ini = new Date(ini.getTime() + duracao * 60000)) {
    const fim = new Date(ini.getTime() + duracao * 60000);
    if (ini < agora) continue; // não oferece horário no passado

    const colide = ocupados.some((o) => ini < o.fim && o.inicio < fim);
    if (!colide) livres.push(new Date(ini));
  }
  return livres;
}
