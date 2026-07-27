import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BARBEIROS, STATUS_LABEL, barbeiroPorId } from '../lib/dados';
import { listarPorDia, atualizarStatus } from '../lib/agendamentos';
import './Painel.css';

const hojeIso = () => new Date().toISOString().split('T')[0];
const fmtHora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Painel() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(hojeIso());
  const [filtroBarbeiro, setFiltroBarbeiro] = useState('');
  const [ags, setAgs] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function carregar() {
    setCarregando(true); setErro('');
    try {
      const lista = await listarPorDia(new Date(data), filtroBarbeiro || null);
      setAgs(lista);
    } catch {
      setErro('Não foi possível carregar a agenda.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [data, filtroBarbeiro]);

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

  const faturamento = ags
    .filter((a) => !['cancelado', 'recusado'].includes(a.status))
    .reduce((s, a) => s + (a.preco || 0), 0);

  return (
    <div className="painel-shell">
      <header className="topbar">
        <div className="pole" />
        <div className="brand">
          <h1 className="marca">Navalha &amp; Cia</h1>
          <span className="tagline">Painel da equipe</span>
        </div>
        <div className="pole" />
        <div className="usuario-box">
          <span className="usuario-nome">{usuario?.email}</span>
          <button className="btn-sair" onClick={sairApp}>Sair</button>
        </div>
      </header>

      <section className="controls">
        <div className="control-group">
          <label>Data</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="control-group">
          <label>Barbeiro</label>
          <select value={filtroBarbeiro} onChange={(e) => setFiltroBarbeiro(e.target.value)}>
            <option value="">Todos</option>
            {BARBEIROS.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>
        <div className="spacer" />
        <div className="faturamento">
          <span className="fat-label">Faturamento do dia</span>
          <span className="fat-valor">{brl(faturamento)}</span>
        </div>
      </section>

      {erro && <div className="alerta">{erro}</div>}

      <main className="lista">
        {carregando && <div className="carregando">Carregando…</div>}
        {!carregando && ags.length === 0 && (
          <div className="vazio">Nenhum agendamento para esta data.</div>
        )}

        {ags.map((ag) => (
          <article key={ag.id} className={`card st-${ag.status}`}>
            <div className="faixa-status" />
            <div className="card-hora">
              <span className="hora">{fmtHora(ag.dataHora)}</span>
              <span className="duracao">{ag.duracaoMin}min</span>
            </div>
            <div className="card-info">
              <h3>{ag.clienteEmail}</h3>
              <p className="servico">{ag.servicoNome} · {barbeiroPorId(ag.barbeiroId)?.nome || ag.barbeiroId}</p>
              {ag.observacoes && <p className="obs">{ag.observacoes}</p>}
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
    </div>
  );
}
