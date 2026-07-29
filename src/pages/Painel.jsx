import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { STATUS_LABEL } from '../lib/dados';
import { listarPorDia, listarTodos, atualizarStatus } from '../lib/agendamentos';
import BotaoWhatsApp from '../components/BotaoWhatsApp';
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
  const [data, setData] = useState(''); // vazio = todos os dias
  const [filtro, setFiltro] = useState('ativos'); // padrão: os que precisam de atenção
  const [ags, setAgs] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function carregar() {
    setCarregando(true); setErro('');
    try {
      // Sem data escolhida → todos os dias. Com data → só aquele dia.
      const lista = data ? await listarPorDia(data) : await listarTodos();
      setAgs(lista);
    } catch {
      setErro('Não foi possível carregar a agenda.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [data]);

  async function mudar(id, status) {
    try {
      await atualizarStatus(id, status);
      carregar();
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
      <header className="topbar">
        <div className="pole" />
        <div className="brand">
          <h1 className="marca">Barbearia Mageschi</h1>
          <span className="tagline">Painel</span>
        </div>
        <div className="pole" />
        <div className="usuario-box">
          <span className="usuario-nome">{usuario?.email}</span>
          <Link to="/configuracoes" className="btn-sair" style={{ textDecoration: 'none' }}>⚙ Config</Link>
          <button className="btn-sair" onClick={sairApp}>Sair</button>
        </div>
      </header>

      <section className="controls">
        <div className="control-group">
          <label>Data {data ? '' : '(todos os dias)'}</label>
          <div className="data-linha-painel">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            {data && (
              <button className="btn-limpar-data" onClick={() => setData('')} title="Ver todos os dias">
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
        <div className="spacer" />
        <div className="faturamento">
          <span className="fat-label">{data ? 'Faturamento do dia' : 'Faturamento total'}</span>
          <span className="fat-valor">{brl(faturamento)}</span>
        </div>
      </section>

      {erro && <div className="alerta">{erro}</div>}

      <main className="lista">
        {carregando && <div className="carregando">Carregando…</div>}
        {!carregando && visiveis.length === 0 && (
          <div className="vazio">
            {data ? 'Nenhum cliente nessa situação para esta data.' : 'Nenhum cliente nessa situação.'}
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
              {ag.clienteNome && <p className="cliente-email">{ag.clienteEmail}</p>}
              <p className="servico">{ag.servicoNome}</p>
            </div>
            <div className="card-lado">
              <span className="preco">{brl(ag.preco)}</span>
              <span className="badge">{STATUS_LABEL[ag.status]}</span>
              <div className="acoes">
                {ag.status === 'pendente' && (
                  <>
                    <button className="aprovar" onClick={() => mudar(ag.id, 'agendado')}>Aprovar</button>
                    <button className="danger" onClick={() => mudar(ag.id, 'recusado')}>Recusar</button>
                  </>
                )}
                {ag.status === 'agendado' && (
                  <button onClick={() => mudar(ag.id, 'confirmado')} title="Confirmar">✓</button>
                )}
                {ag.status === 'confirmado' && (
                  <button onClick={() => mudar(ag.id, 'concluido')} title="Concluir">✓✓</button>
                )}
                {['agendado', 'confirmado'].includes(ag.status) && (
                  <button className="danger" onClick={() => mudar(ag.id, 'cancelado')} title="Cancelar">✕</button>
                )}
              </div>
            </div>
          </article>
        ))}
      </main>
      <BotaoWhatsApp />
    </div>
  );
}
