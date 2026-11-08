import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { STATUS_LABEL, PERMITIR_EXCLUIR, mensagemConfirmacao } from '../lib/dados';
import { listarPorDia, listarProximos, atualizarStatus, excluirAgendamento } from '../lib/agendamentos';
import { linkWhatsApp } from '../lib/config';
import AgendarCliente from '../components/AgendarCliente';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import './Painel.css';

const fmtHora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDataCurta = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Opções do filtro de clientes (por situação do agendamento).
const FILTROS = [
  { id: 'ativos',     label: 'Aguardando, agendados e confirmados', status: ['pendente', 'agendado', 'confirmado'] },
  { id: 'pendente',   label: 'Só aguardando confirmação',           status: ['pendente'] },
  { id: 'agendado',   label: 'Só agendados',                         status: ['agendado'] },
  { id: 'confirmado', label: 'Só confirmados',                       status: ['confirmado'] },
  { id: 'todos',      label: 'Todos (inclui concluídos/cancelados)', status: null },
];

export default function Painel() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(''); // vazio = de hoje em diante
  const [filtro, setFiltro] = useState('ativos'); // padrão: os que precisam de atenção
  const [ags, setAgs] = useState([]);
  const [telefones, setTelefones] = useState({}); // uid → telefone do cadastro
  const [carregando, setCarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState('');
  const [agendando, setAgendando] = useState(false); // janela "Agendar cliente"
  const [okMsg, setOkMsg] = useState('');

  // Paginação (só quando nenhuma data está escolhida).
  const [cursor, setCursor] = useState(null);
  const [temMais, setTemMais] = useState(false);

  // Telefones já buscados (ou em busca) — evita buscar o mesmo cliente de novo.
  const telefonesBuscados = useRef(new Set());

  async function carregar() {
    setCarregando(true); setErro('');
    try {
      if (data) {
        // Data escolhida → só aquele dia (pode ser passado ou futuro).
        const lista = await listarPorDia(data);
        setAgs(lista); setCursor(null); setTemMais(false);
        carregarTelefones(lista);
      } else {
        // Sem data → próximos agendamentos, primeira página.
        const pag = await listarProximos();
        setAgs(pag.itens); setCursor(pag.cursor); setTemMais(pag.temMais);
        carregarTelefones(pag.itens);
      }
    } catch (e) {
      console.error('Erro ao carregar agenda:', e);
      setErro('Não foi possível carregar a agenda.');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarMais() {
    setCarregandoMais(true); setErro('');
    try {
      const pag = await listarProximos(cursor);
      setAgs((atual) => [...atual, ...pag.itens]);
      setCursor(pag.cursor); setTemMais(pag.temMais);
      carregarTelefones(pag.itens);
    } catch (e) {
      console.error('Erro ao carregar mais:', e);
      setErro('Não foi possível carregar mais agendamentos.');
    } finally {
      setCarregandoMais(false);
    }
  }

  // Busca o telefone do cadastro de cada cliente que aparece na lista
  // (só os que ainda não foram buscados).
  async function carregarTelefones(lista) {
    const faltam = [...new Set(lista.map((a) => a.clienteUid))]
      .filter((uid) => uid && !telefonesBuscados.current.has(uid));
    if (faltam.length === 0) return;
    faltam.forEach((uid) => telefonesBuscados.current.add(uid));
    const pares = await Promise.all(faltam.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, 'clientes', uid));
        return [uid, snap.exists() ? (snap.data().telefone || '') : ''];
      } catch {
        return [uid, ''];
      }
    }));
    setTelefones((t) => ({ ...t, ...Object.fromEntries(pares) }));
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [data]);

  // Fase de testes: apaga o agendamento de vez (pedido + horário).
  async function excluir(ag) {
    const quando = fmtDataCurta(ag.dataHora) + ' ' + fmtHora(ag.dataHora);
    const quem = ag.clienteNome || ag.clienteEmail || 'cliente';
    if (!window.confirm(`EXCLUIR de vez o agendamento de ${quem} (${quando})?\n\nIsso não pode ser desfeito.`)) return;
    try {
      await excluirAgendamento(ag);
      setAgs((atual) => atual.filter((a) => a.id !== ag.id));
    } catch (e) {
      console.error('Erro ao excluir:', e);
      setErro('Não foi possível excluir o agendamento.');
    }
  }

  // Ações que tiram o cliente da agenda pedem confirmação.
  const PERGUNTA = { recusado: 'Recusar este pedido?', cancelado: 'Cancelar este agendamento?' };

  async function mudar(ag, status) {
    if (PERGUNTA[status] && !window.confirm(PERGUNTA[status])) return;
    try {
      await atualizarStatus(ag, status);
      // Atualiza só o card na tela — sem recarregar a lista inteira do banco
      // (e sem perder as páginas já carregadas).
      setAgs((atual) => atual.map((a) => (a.id === ag.id ? { ...a, status } : a)));
    } catch {
      setErro('Não foi possível atualizar o status.');
    }
  }

  async function sairApp() {
    await sair();
    navigate('/staff');
  }

  // Aplica o filtro de situação escolhido.
  const filtroAtual = FILTROS.find((f) => f.id === filtro) ?? FILTROS[0];
  const visiveis = filtroAtual.status
    ? ags.filter((a) => filtroAtual.status.includes(a.status))
    : ags;

  const faturamento = visiveis
    .filter((a) => !['cancelado', 'recusado'].includes(a.status))
    .reduce((s, a) => s + (a.preco || 0), 0);

  return (
    <div className="painel-shell">
      <header className="topbar topbar-logo">
        <div className="brand-logo">
          <img src="/logo.png" alt="Barbearia Mageschi" className="logo-img" />
          <span className="tagline">Painel</span>
        </div>
        <div className="usuario-box">
          <span className="usuario-nome">{usuario?.email}</span>
          <Link to="/faturamento" className="btn-sair" style={{ textDecoration: 'none' }}>📊 Faturamento</Link>
          <Link to="/configuracoes" className="btn-sair" style={{ textDecoration: 'none' }}>⚙ Config</Link>
          <button className="btn-sair" onClick={sairApp}>Sair</button>
        </div>
      </header>

      <section className="controls">
        <div className="control-group">
          <label>Data {data ? '' : '(de hoje em diante)'}</label>
          <div className="data-linha-painel">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            {data && (
              <button className="btn-limpar-data" onClick={() => setData('')} title="Voltar para os próximos agendamentos">
                ×
              </button>
            )}
          </div>
        </div>
        <div className="control-group">
          <label>Clientes</label>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            {FILTROS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <button className="btn btn-agendar" onClick={() => { setOkMsg(''); setAgendando(true); }}>
          + Agendar cliente
        </button>
        <div className="spacer" />
        <div className="faturamento">
          <span className="fat-label">{data ? 'Faturamento do dia' : 'Faturamento (lista exibida)'}</span>
          <span className="fat-valor">{brl(faturamento)}</span>
        </div>
      </section>

      {erro && <div className="alerta">{erro}</div>}
      {okMsg && <div className="aviso-ok">{okMsg}</div>}

      {agendando && (
        <AgendarCliente
          staffUid={usuario?.uid}
          onFechar={() => setAgendando(false)}
          onAgendado={() => {
            setAgendando(false);
            setOkMsg('Agendamento criado. Ele já aparece na agenda como "Agendado".');
            carregar();
          }}
        />
      )}

      <main className="lista">
        {carregando && <div className="carregando">Carregando…</div>}
        {!carregando && visiveis.length === 0 && (
          <div className="vazio">
            {data ? 'Nenhum cliente nessa situação para esta data.' : 'Nenhum cliente nessa situação nos próximos agendamentos.'}
          </div>
        )}

        {visiveis.map((ag) => (
          <article key={ag.id} className={`card st-${ag.status}`}>
            <div className="faixa-status" />
            <div className="card-hora">
              <span className="card-data">{fmtDataCurta(ag.dataHora)}</span>
              <span className="hora">{fmtHora(ag.dataHora)}</span>
              <span className="duracao">{ag.duracaoMin}min</span>
            </div>
            <div className="card-info">
              <h3>{ag.clienteNome || ag.clienteEmail}</h3>
              {ag.clienteNome && ag.clienteEmail && <p className="cliente-email">{ag.clienteEmail}</p>}
              {(telefones[ag.clienteUid] || ag.clienteTelefone) && (
                <p className="cliente-email">
                  {/* Abre o WhatsApp do cliente com a mensagem de confirmação pronta */}
                  <a href={linkWhatsApp((telefones[ag.clienteUid] || ag.clienteTelefone), mensagemConfirmacao(ag))}
                     target="_blank" rel="noopener noreferrer"
                     className="cliente-tel" title="Enviar mensagem de confirmação no WhatsApp">
                    💬 {(telefones[ag.clienteUid] || ag.clienteTelefone)}
                  </a>
                </p>
              )}
              <p className="servico">{ag.servicoNome}</p>
            </div>
            <div className="card-lado">
              <span className="preco">{brl(ag.preco)}</span>
              <span className="badge">{STATUS_LABEL[ag.status]}</span>
              <div className="acoes">
                {ag.status === 'pendente' && (
                  <>
                    <button className="aprovar" onClick={() => mudar(ag, 'agendado')}>Aprovar</button>
                    <button className="danger" onClick={() => mudar(ag, 'recusado')}>Recusar</button>
                  </>
                )}
                {ag.status === 'agendado' && (
                  <button onClick={() => mudar(ag, 'confirmado')} title="Confirmar">✓</button>
                )}
                {ag.status === 'confirmado' && (
                  <button onClick={() => mudar(ag, 'concluido')} title="Concluir">✓✓</button>
                )}
                {['agendado', 'confirmado'].includes(ag.status) && (
                  <button className="danger" onClick={() => mudar(ag, 'cancelado')} title="Cancelar">✕</button>
                )}
                {PERMITIR_EXCLUIR && (
                  <button className="excluir" onClick={() => excluir(ag)} title="Excluir de vez (fase de testes)">🗑</button>
                )}
              </div>
            </div>
          </article>
        ))}

        {!carregando && temMais && (
          <button className="btn-carregar-mais" onClick={carregarMais} disabled={carregandoMais}>
            {carregandoMais ? 'Carregando…' : 'Carregar mais'}
          </button>
        )}
      </main>
    </div>
  );
}
