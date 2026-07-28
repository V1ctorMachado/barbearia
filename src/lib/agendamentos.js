import {
  collection, updateDoc, doc, setDoc, query, where, getDocs,
  Timestamp, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { servicoPorId, periodosDoDia } from './dados';
import { dataLocalDeISO, ehDataPassada } from './datas';

const COL = 'agendamentos';       // gaveta PRIVADA: dados completos (email etc.)
const COL_PUB = 'ocupacoes';      // gaveta PÚBLICA: só horário/duração/status

// Cria um agendamento. Escreve em DUAS coleções com o MESMO id:
//  - 'agendamentos' (privada): tudo, inclusive email — só dono e equipe leem.
//  - 'ocupacoes'   (pública): só o necessário para calcular horários livres,
//                             sem nenhum dado pessoal.
export async function criarAgendamento({ clienteUid, clienteEmail, clienteNome, barbeiroId, servicoId, dataHora }) {
  const servico = servicoPorId(servicoId);
  if (!servico) throw new Error('Serviço inválido.');

  const ts = Timestamp.fromDate(new Date(dataHora));
  const ref = doc(collection(db, COL));   // gera um id novo, usado nas duas gavetas
  const id = ref.id;

  // Gaveta privada — dados completos.
  await setDoc(ref, {
    clienteUid,
    clienteEmail,
    clienteNome: clienteNome || '',
    barbeiroId,
    servicoId,
    servicoNome: servico.nome,
    duracaoMin: servico.duracaoMin,
    preco: servico.preco,
    dataHora: ts,
    status: 'pendente',
    criadoEm: serverTimestamp(),
  });

  // Gaveta pública — só o que o cálculo de horários precisa. Sem email/nome.
  await setDoc(doc(db, COL_PUB, id), {
    barbeiroId,
    dataHora: ts,
    duracaoMin: servico.duracaoMin,
    status: 'pendente',
  });

  return ref;
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
  // Aceita string "YYYY-MM-DD" (do painel) ou Date. Meia-noite LOCAL.
  const inicio = typeof data === 'string' ? dataLocalDeISO(data) : new Date(data);
  inicio.setHours(0, 0, 0, 0);
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

// Lista TODOS os agendamentos (todos os dias), para o painel da equipe
// quando nenhuma data está filtrada. Ordena do mais próximo ao mais distante.
export async function listarTodos() {
  const snap = await getDocs(query(collection(db, COL)));
  return snap.docs
    .map(mapear)
    .sort((a, b) => a.dataHora - b.dataHora); // data crescente
}

// Atualiza o status nas DUAS gavetas (privada e pública), para não
// dessincronizar. Se o agendamento foi cancelado/recusado, ele deixa de
// contar como horário ocupado.
export async function atualizarStatus(id, status) {
  await updateDoc(doc(db, COL, id), { status });
  // A gaveta pública pode não existir para dados muito antigos; ignora erro.
  try {
    await updateDoc(doc(db, COL_PUB, id), { status });
  } catch { /* documento público ausente (agendamento antigo) — sem problema */ }
}

// Lê as OCUPAÇÕES (gaveta pública) de um barbeiro num dia. Não traz
// nenhum dado pessoal — só horário e duração. É o que o cálculo de
// horários usa, para não precisar ler os dados privados dos clientes.
// Corre uma promessa contra um tempo limite. Se estourar, rejeita —
// assim a busca nunca fica "pendurada" para sempre.
function comTimeout(promessa, ms = 10000) {
  return Promise.race([
    promessa,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo esgotado ao consultar o servidor.')), ms)),
  ]);
}

async function ocupacoesDoDia(barbeiroId, dataDate) {
  const inicio = new Date(dataDate); inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio); fim.setDate(fim.getDate() + 1);

  // Uma só condição na consulta (por barbeiro) para não exigir índice composto.
  // Com timeout: se o servidor não responder em 10s, dá erro em vez de travar.
  const snap = await comTimeout(getDocs(query(collection(db, COL_PUB), where('barbeiroId', '==', barbeiroId))));
  return snap.docs
    .map((d) => {
      const x = d.data();
      return {
        dataHora: x.dataHora?.toDate?.() ?? new Date(x.dataHora),
        duracaoMin: x.duracaoMin,
        status: x.status,
      };
    })
    .filter((o) => o.dataHora >= inicio && o.dataHora < fim);
}

// ── Cálculo de horários livres ───────────────────────────────
// Usa os PERÍODOS de funcionamento do dia da semana (manhã e tarde,
// com intervalo de almoço nos dias de semana). Em cada período, fatia
// em blocos do tamanho do serviço e remove os que colidem com
// agendamentos existentes. Devolve só os horários vagos.
export async function horariosLivres(barbeiroId, servicoId, data) {
  const servico = servicoPorId(servicoId);
  if (!servico) return [];
  const duracao = servico.duracaoMin;

  // Data no passado: não há o que buscar. Retorna vazio na hora, sem
  // consultar o banco (evita qualquer risco de a busca ficar pendurada).
  if (ehDataPassada(data)) return [];

  const periodos = periodosDoDia(data);
  if (periodos.length === 0) return []; // fechado nesse dia

  // Base do dia à meia-noite LOCAL (evita o bug de fuso que puxava
  // a data para o dia anterior).
  const diaBase = typeof data === 'string' ? dataLocalDeISO(data) : new Date(data);
  diaBase.setHours(0, 0, 0, 0);

  // Busca ocupações do barbeiro (da gaveta PÚBLICA — sem dados pessoais).
  const ocupados = (await ocupacoesDoDia(barbeiroId, diaBase))
    .filter((a) => a.status !== 'cancelado' && a.status !== 'recusado')
    .map((a) => ({ inicio: a.dataHora, fim: new Date(a.dataHora.getTime() + a.duracaoMin * 60000) }));

  const agora = new Date();
  const livres = [];

  // Percorre cada período (manhã, tarde) gerando os horários possíveis.
  for (const p of periodos) {
    const abertura = new Date(diaBase.getTime() + p.abre * 60000);
    const ultimoInicio = new Date(diaBase.getTime() + p.fecha * 60000); // último início permitido

    for (let ini = new Date(abertura); ini.getTime() <= ultimoInicio.getTime(); ini = new Date(ini.getTime() + duracao * 60000)) {
      const fim = new Date(ini.getTime() + duracao * 60000);
      if (ini < agora) continue; // não oferece horário no passado

      const colide = ocupados.some((o) => ini < o.fim && o.inicio < fim);
      if (!colide) livres.push(new Date(ini));
    }
  }
  return livres;
}
