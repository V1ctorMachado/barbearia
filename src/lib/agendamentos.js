import {
  collection, doc, getDoc, runTransaction, writeBatch, query, where, getDocs,
  orderBy, limit, startAfter, Timestamp, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { servicoPorId, periodosDoDia } from './dados';
import { dataLocalDeISO, ehDataPassada, hojeISO } from './datas';
import { lerConfig, dataBloqueada } from './config';

const COL = 'agendamentos';       // gaveta PRIVADA: dados completos (email etc.)
const COL_PUB = 'ocupacoes';      // gaveta PÚBLICA: só horário/duração/status

// Como os IDs funcionam:
//  • ocupacoes/{barbeiro_data_hora} — ID FIXO por horário. É ele que impede
//    agendamento duplo. Guarda "agendamentoId": qual pedido ocupa o horário.
//  • agendamentos/{id automático} — cada pedido tem ID PRÓPRIO e nunca é
//    sobrescrito. Assim, se o horário for cancelado e outra pessoa reservar,
//    o histórico do primeiro cliente continua intacto.
//  Agendamentos antigos (de antes desta mudança) usam o mesmo ID nas duas
//  gavetas; o código abaixo trata esse caso.

// Monta um ID único e determinístico para um horário: barbeiro + data + hora.
// Como o Firestore não deixa criar dois documentos com o MESMO id, isso impede
// que duas pessoas agendem o mesmo horário (o segundo a tentar simplesmente falha).
function idDoHorario(barbeiroId, dataHora) {
  const d = new Date(dataHora);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${barbeiroId}_${ano}-${mes}-${dia}_${hh}${mm}`;
}

// Cria um agendamento de forma SEGURA contra agendamento duplo.
// Usa uma transação: só cria se o horário (documento em 'ocupacoes' com id
// determinístico) ainda não existir. Se duas pessoas tentarem o mesmo horário
// ao mesmo tempo, apenas uma consegue; a outra recebe erro de "horário ocupado".
export async function criarAgendamento({ clienteUid, clienteEmail, clienteNome, barbeiroId, servicoId, dataHora }) {
  const servico = servicoPorId(servicoId);
  if (!servico) throw new Error('Serviço inválido.');

  const ts = Timestamp.fromDate(new Date(dataHora));
  const ocupacaoId = idDoHorario(barbeiroId, dataHora); // id fixo do horário
  const refPub = doc(db, COL_PUB, ocupacaoId);
  const refPriv = doc(collection(db, COL));            // id novo, automático
  const id = refPriv.id;

  await runTransaction(db, async (tx) => {
    // Verifica se o horário já está ocupado (documento público já existe).
    const jaExiste = await tx.get(refPub);
    if (jaExiste.exists()) {
      const st = jaExiste.data().status;
      // Só bloqueia se o agendamento existente estiver ativo (não cancelado/recusado).
      if (st !== 'cancelado' && st !== 'recusado') {
        throw new Error('HORARIO_OCUPADO');
      }
    }

    // Gaveta privada — dados completos.
    tx.set(refPriv, {
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
      ocupacaoId,
      criadoEm: serverTimestamp(),
    });

    // Gaveta pública — só o necessário para o cálculo de horários. Sem dados pessoais.
    tx.set(refPub, {
      barbeiroId,
      dataHora: ts,
      duracaoMin: servico.duracaoMin,
      status: 'pendente',
      agendamentoId: id,
    });
  });

  return { id };
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

// Agendamentos de um dia (painel da equipe).
// A consulta já pede só aquele dia ao Firestore (filtro de intervalo num
// único campo — não exige índice composto).
export async function listarPorDia(data) {
  // Aceita string "YYYY-MM-DD" (do painel) ou Date. Meia-noite LOCAL.
  const inicio = typeof data === 'string' ? dataLocalDeISO(data) : new Date(data);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);  fim.setDate(fim.getDate() + 1);

  const snap = await getDocs(query(
    collection(db, COL),
    where('dataHora', '>=', Timestamp.fromDate(inicio)),
    where('dataHora', '<', Timestamp.fromDate(fim)),
    orderBy('dataHora'),
  ));
  return snap.docs.map(mapear);
}

// Próximos agendamentos (de hoje em diante), em PÁGINAS. É o que o painel
// mostra quando nenhuma data está escolhida. Em vez de baixar o histórico
// inteiro, traz "tamanho" por vez; "cursor" é o último documento da página
// anterior (null na primeira). Devolve { itens, cursor, temMais }.
export const TAMANHO_PAGINA = 50;

export async function listarProximos(cursor = null, tamanho = TAMANHO_PAGINA) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const partes = [
    collection(db, COL),
    where('dataHora', '>=', Timestamp.fromDate(hoje)),
    orderBy('dataHora'),
  ];
  if (cursor) partes.push(startAfter(cursor));
  partes.push(limit(tamanho + 1)); // +1 só para saber se há mais páginas

  const snap = await getDocs(query(...partes));
  const docs = snap.docs.slice(0, tamanho);
  return {
    itens: docs.map(mapear),
    cursor: docs.length ? docs[docs.length - 1] : cursor,
    temMais: snap.docs.length > tamanho,
  };
}

// Atualiza o status nas DUAS gavetas (privada e pública) de uma vez só.
// Se o agendamento foi cancelado/recusado, o horário volta a ficar livre.
// Recebe o agendamento inteiro (precisa do id e do ocupacaoId).
export async function atualizarStatus(ag, status) {
  const pubId = ag.ocupacaoId || ag.id; // agendamentos antigos: mesmo id
  const refPriv = doc(db, COL, ag.id);
  const refPub = doc(db, COL_PUB, pubId);

  let pub = null;
  try { pub = await getDoc(refPub); } catch { /* sem ocupação — segue */ }

  const lote = writeBatch(db);
  lote.update(refPriv, { status });
  // Só mexe na ocupação se ela ainda é DESTE agendamento. Se o horário já
  // foi reservado por outra pessoa, a ocupação dela não pode ser alterada.
  if (pub?.exists() && (pub.data().agendamentoId ?? pubId) === ag.id) {
    lote.update(refPub, { status });
  }
  await lote.commit();
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

  // A consulta pede ao Firestore SÓ o dia escolhido (intervalo em um único
  // campo — não exige índice composto). O filtro por barbeiro é feito aqui,
  // sobre os poucos resultados do dia. Antes, baixava todas as ocupações do
  // barbeiro desde sempre, o que ficava lento com o tempo.
  // Com timeout: se o servidor não responder em 10s, dá erro em vez de travar.
  const snap = await comTimeout(getDocs(query(
    collection(db, COL_PUB),
    where('dataHora', '>=', Timestamp.fromDate(inicio)),
    where('dataHora', '<', Timestamp.fromDate(fim)),
  )));
  return snap.docs
    .filter((d) => d.data().barbeiroId === barbeiroId)
    .map((d) => {
      const x = d.data();
      return {
        dataHora: x.dataHora?.toDate?.() ?? new Date(x.dataHora),
        duracaoMin: x.duracaoMin,
        status: x.status,
      };
    });
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

  // Data bloqueada pela barbearia (feriado, férias): sem horários.
  // (Recebe a data como string "YYYY-MM-DD" para comparação segura.)
  if (typeof data === 'string') {
    const cfg = await lerConfig();
    if (dataBloqueada(data, cfg.bloqueios)) return [];
  }

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
